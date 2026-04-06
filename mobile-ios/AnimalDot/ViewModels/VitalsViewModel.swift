import Foundation
import Combine
import UserNotifications

/// Central view model that owns the transport, signal processor, and all published UI state.
@MainActor
final class VitalsViewModel: ObservableObject {

    // MARK: - Navigation / App State

    enum AppScreen {
        case splash, auth, devicePairing, petProfile, main
    }

    @Published var currentScreen: AppScreen = .splash
    @Published var isLoading = true

    // MARK: - Auth

    @Published var currentUser: AppUser? {
        didSet { Self.saveUser(currentUser) }
    }
    var isAuthenticated: Bool { currentUser != nil }

    // MARK: - Published UI state

    @Published var rawSamples: [Double] = []
    @Published var respSamples: [Double] = []
    @Published var hrSamples: [Double] = []
    @Published var currentBPM: Double?
    @Published var currentRPM: Double?
    @Published var connectionState: TransportConnectionState = .disconnected
    @Published var bedEmpty: Bool = false

    // MARK: - Pet Profile

    @Published var petProfile: PetProfile {
        didSet { Self.savePetProfile(petProfile, userId: currentUser?.id) }
    }

    // MARK: - App Settings

    @Published var appSettings: AppSettings {
        didSet { Self.saveAppSettings(appSettings, userId: currentUser?.id) }
    }

    // MARK: - Environment & Weight

    @Published var environment: EnvironmentData = EnvironmentData()
    @Published var weightData: WeightData = WeightData()
    @Published var hardwareStatus: DeviceHardwareStatus = DeviceHardwareStatus()
    @Published var signalQuality: Double = 0
    @Published var dataSource: String = "none" // "ble", "mqtt", "cloud", "none"
    @Published var lastUpdate: Date? = nil

    // MARK: - History data (for Trends)

    @Published var heartRateHistory: [DataPoint] = []
    @Published var respRateHistory: [DataPoint] = []
    @Published var temperatureHistory: [DataPoint] = []

    // MARK: - Transport selection

    @Published var selectedTransport: TransportType {
        didSet {
            UserDefaults.standard.set(selectedTransport.rawValue, forKey: Keys.transportType)
            switchTransport()
        }
    }

    // MARK: - Connection settings (persisted)

    @Published var brokerHost: String {
        didSet { UserDefaults.standard.set(brokerHost, forKey: Keys.brokerHost) }
    }
    @Published var brokerPort: UInt16 {
        didSet { UserDefaults.standard.set(Int(brokerPort), forKey: Keys.brokerPort) }
    }
    @Published var macAddress: String {
        didSet { UserDefaults.standard.set(macAddress, forKey: Keys.macAddress) }
    }
    @Published var bleCharacteristicUUID: String {
        didSet { UserDefaults.standard.set(bleCharacteristicUUID, forKey: Keys.bleCharUUID) }
    }

    // Alert thresholds
    @Published var hrAlertLow: Double {
        didSet { UserDefaults.standard.set(hrAlertLow, forKey: Keys.hrAlertLow) }
    }
    @Published var hrAlertHigh: Double {
        didSet { UserDefaults.standard.set(hrAlertHigh, forKey: Keys.hrAlertHigh) }
    }
    @Published var rrAlertLow: Double {
        didSet { UserDefaults.standard.set(rrAlertLow, forKey: Keys.rrAlertLow) }
    }
    @Published var rrAlertHigh: Double {
        didSet { UserDefaults.standard.set(rrAlertHigh, forKey: Keys.rrAlertHigh) }
    }
    @Published var notificationsEnabled: Bool {
        didSet { UserDefaults.standard.set(notificationsEnabled, forKey: Keys.notificationsEnabled) }
    }

    // MARK: - Session history

    @Published var sessions: [SessionRecord] = [] {
        didSet { Self.saveSessions(sessions) }
    }

    // MARK: - BLE scan results

    @Published var discoveredPeripherals: [BLEService.DiscoveredPeripheral] = []
    @Published var isBLEScanning: Bool = false
    @Published var blePermissionReady: Bool = false

    // MARK: - Dev Mode

    @Published var devMode: Bool = false
    private var devMockTimer: Timer?

    // MARK: - Internal

    private let processor = SignalProcessor()
    private let mqttService: MQTTService
    private let bleService: BLEService
    private let cloudService = CloudService.shared
    private var activeTransport: VitalsTransport?
    private var cancellables = Set<AnyCancellable>()

    private var currentSession: SessionRecord?
    private var sessionBPMSum: Double = 0
    private var sessionRPMSum: Double = 0
    private var sessionSampleCount: Int = 0

    private var lastNotificationDate: Date = .distantPast
    private var cloudPollTimer: Timer?

    // MARK: - UserDefaults keys

    private enum Keys {
        static let transportType = "settings.transportType"
        static let brokerHost = "settings.brokerHost"
        static let brokerPort = "settings.brokerPort"
        static let macAddress = "settings.macAddress"
        static let bleCharUUID = "settings.bleCharUUID"
        static let hrAlertLow = "settings.hrAlertLow"
        static let hrAlertHigh = "settings.hrAlertHigh"
        static let rrAlertLow = "settings.rrAlertLow"
        static let rrAlertHigh = "settings.rrAlertHigh"
        static let notificationsEnabled = "settings.notificationsEnabled"
        static let sessions = "settings.sessions"
        static let currentUser = "settings.currentUser"
        static let hasCompletedPairing = "settings.hasCompletedPairing"
        static let registeredAccounts = "settings.registeredAccounts"
    }

    // MARK: - Init

    init() {
        let defaults = UserDefaults.standard

        let transportRaw = defaults.string(forKey: Keys.transportType) ?? TransportType.mqtt.rawValue
        self.selectedTransport = TransportType(rawValue: transportRaw) ?? .mqtt

        let host = defaults.string(forKey: Keys.brokerHost) ?? "sensorweb.us"
        let storedPort = defaults.integer(forKey: Keys.brokerPort)
        let port: UInt16 = storedPort > 0 ? UInt16(storedPort) : 1883
        let mac = defaults.string(forKey: Keys.macAddress) ?? "3030f9723ae8"

        self.brokerHost = host
        self.brokerPort = port
        self.macAddress = mac
        self.bleCharacteristicUUID = defaults.string(forKey: Keys.bleCharUUID) ?? ""

        self.hrAlertLow = defaults.object(forKey: Keys.hrAlertLow) as? Double ?? 40
        self.hrAlertHigh = defaults.object(forKey: Keys.hrAlertHigh) as? Double ?? 120
        self.rrAlertLow = defaults.object(forKey: Keys.rrAlertLow) as? Double ?? 10
        self.rrAlertHigh = defaults.object(forKey: Keys.rrAlertHigh) as? Double ?? 40
        self.notificationsEnabled = defaults.object(forKey: Keys.notificationsEnabled) as? Bool ?? true

        // Load persisted user
        let loadedUser = Self.loadUser()
        self.currentUser = loadedUser

        // Load per-user data
        let userId = loadedUser?.id
        self.petProfile = Self.loadPetProfile(userId: userId)
        self.appSettings = Self.loadAppSettings(userId: userId)

        // Create services
        self.mqttService = MQTTService(host: host, port: port, mac: mac)
        self.bleService = BLEService()

        // Load saved sessions
        self.sessions = Self.loadSessions()

        bindProcessor()
        bindBLEScanning()
        bindCloudService()

        // Check BLE readiness after a moment
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.blePermissionReady = true
        }
    }

    // MARK: - App Lifecycle

    func onAppLaunch() {
        // Splash screen delay, then determine nav
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            self.isLoading = false
            self.navigateToCorrectScreen()
        }
    }

    func appDidEnterBackground() {
        endSession()
    }

    private func navigateToCorrectScreen() {
        guard isAuthenticated else {
            currentScreen = .auth
            return
        }
        let hasPairing = UserDefaults.standard.bool(forKey: Keys.hasCompletedPairing)
        guard hasPairing else {
            currentScreen = .devicePairing
            return
        }
        let hasPet = !petProfile.name.isEmpty && petProfile.name != "Pet"
        guard hasPet else {
            currentScreen = .petProfile
            return
        }
        currentScreen = .main

        // Auto-connect if enabled
        if appSettings.bluetoothAutoConnect, appSettings.lastConnectedDeviceId != nil {
            connectTransport()
        }

        // Start cloud fallback if not BLE connected
        if connectionState != .connected {
            startCloudFallback()
        }
    }

    // MARK: - Auth

    func login(user: AppUser) {
        currentUser = user
        petProfile = Self.loadPetProfile(userId: user.id)
        appSettings = Self.loadAppSettings(userId: user.id)
        navigateToCorrectScreen()
    }

    func logout() {
        stopDevMode()
        disconnectTransport()
        cloudService.disconnectWebSocket()
        currentUser = nil
        petProfile = Self.defaultPetProfile()
        appSettings = AppSettings()
        clearHistory()
        UserDefaults.standard.set(false, forKey: Keys.hasCompletedPairing)
        currentScreen = .auth
    }

    func registerAccount(_ user: AppUser) {
        var accounts = Self.loadRegisteredAccounts()
        if !accounts.contains(where: { $0.email.lowercased() == user.email.lowercased() }) {
            accounts.append(user)
            Self.saveRegisteredAccounts(accounts)
        }
    }

    func getAccountByEmail(_ email: String) -> AppUser? {
        let normalized = email.trimmingCharacters(in: .whitespaces).lowercased()
        return Self.loadRegisteredAccounts().first { $0.email.lowercased() == normalized }
    }

    // MARK: - Navigation completions

    func completeDevicePairing() {
        UserDefaults.standard.set(true, forKey: Keys.hasCompletedPairing)
        let hasPet = !petProfile.name.isEmpty && petProfile.name != "Pet"
        currentScreen = hasPet ? .main : .petProfile
    }

    func skipDevicePairing() {
        UserDefaults.standard.set(true, forKey: Keys.hasCompletedPairing)
        activateDevMode()
        let hasPet = !petProfile.name.isEmpty && petProfile.name != "Pet"
        currentScreen = hasPet ? .main : .petProfile
    }

    // MARK: - Dev Mode

    func activateDevMode() {
        devMode = true
        connectionState = .connected
        dataSource = "wifi"
        signalQuality = 0.85

        // Set all hardware components to connected
        hardwareStatus.geophoneConnected = true
        hardwareStatus.loadCellsConnected = true
        hardwareStatus.temperatureSensorConnected = true
        hardwareStatus.bluetoothConnected = true

        // Generate initial mock values
        generateMockVitals()

        // Start periodic mock data updates (every 3 seconds)
        devMockTimer?.invalidate()
        devMockTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.generateMockVitals()
            }
        }
    }

    func stopDevMode() {
        devMode = false
        devMockTimer?.invalidate()
        devMockTimer = nil
    }

    private func generateMockVitals() {
        // Only set mock values if no real data is present
        if currentBPM == nil || dataSource == "wifi" {
            let mockHR = Double.random(in: 70...100)
            currentBPM = mockHR
            heartRateHistory.append(DataPoint(timestamp: Date(), value: mockHR))
            if heartRateHistory.count > 1440 { heartRateHistory.removeFirst() }
        }
        if currentRPM == nil || dataSource == "wifi" {
            let mockRR = Double.random(in: 18...26)
            currentRPM = mockRR
            respRateHistory.append(DataPoint(timestamp: Date(), value: mockRR))
            if respRateHistory.count > 1440 { respRateHistory.removeFirst() }
        }
        if environment.temperature == nil || dataSource == "wifi" {
            environment.temperature = Double.random(in: 100.5...101.8)
            environment.humidity = Double.random(in: 40...60)
            temperatureHistory.append(DataPoint(timestamp: Date(), value: environment.temperature!))
            if temperatureHistory.count > 1440 { temperatureHistory.removeFirst() }
        }
        if weightData.weight == nil || dataSource == "wifi" {
            weightData.weight = Double.random(in: 25...35)
            weightData.isStable = true
        }
        signalQuality = Double.random(in: 0.75...0.95)
        lastUpdate = Date()
        bedEmpty = false
    }

    func completePetProfileSetup() {
        currentScreen = .main
        if connectionState != .connected {
            startCloudFallback()
        }
    }

    // MARK: - Transport Management

    func connectTransport() {
        // Stop dev mode when real transport connects
        if devMode { stopDevMode() }

        disconnectTransport()

        switch selectedTransport {
        case .mqtt:
            mqttService.configure(host: brokerHost, port: brokerPort, mac: macAddress)
            activeTransport = mqttService
            dataSource = "mqtt"
        case .ble:
            if let uuid = CBUUID.from(string: bleCharacteristicUUID) {
                bleService.notifyCharacteristicUUID = uuid
            }
            activeTransport = bleService
            dataSource = "ble"
        }

        bindTransport()
        activeTransport?.connect()
        startSession()
        cloudService.disconnectWebSocket() // stop cloud when direct transport connected
    }

    func disconnectTransport() {
        activeTransport?.disconnect()
        cancellables.removeAll()
        bindProcessor()
        bindBLEScanning()
        bindCloudService()
        processor.reset()
        connectionState = .disconnected
        bedEmpty = false
        dataSource = "none"
        endSession()
    }

    // MARK: - BLE Scanning

    func startBLEScan() {
        bleService.startScan()
    }

    func stopBLEScan() {
        bleService.stopScan()
    }

    func selectBLEPeripheral(id: UUID) {
        bleService.savedPeripheralUUID = id
        stopBLEScan()
    }

    // MARK: - BLE Calibration Commands

    func sendCalibrationCommand(_ command: CalibrationCommand, value: Float = 0) {
        guard connectionState == .connected,
              let peripheral = bleService.connectedPeripheral,
              let char = findCalibrationCharacteristic() else { return }

        var data = Data()
        data.append(command.rawValue)
        var floatValue = value
        data.append(Data(bytes: &floatValue, count: 4))

        peripheral.writeValue(data, for: char, type: .withResponse)
    }

    private func findCalibrationCharacteristic() -> CBCharacteristic? {
        guard let services = bleService.connectedPeripheral?.services else { return nil }
        let targetUUID = CBUUID(string: BLEUUIDs.calibrationChar)
        for service in services {
            if let char = service.characteristics?.first(where: { $0.uuid == targetUUID }) {
                return char
            }
        }
        return nil
    }

    // MARK: - Cloud Fallback

    private func startCloudFallback() {
        cloudService.connectWebSocket()

        // Also fetch initial data
        Task {
            let vitals = await cloudService.fetchLatestVitals()
            if let v = vitals, connectionState != .connected {
                applyCloudVitals(v)
            }
        }
    }

    private func applyCloudVitals(_ payload: CloudVitalsPayload) {
        if connectionState == .connected && !devMode { return } // direct connection takes priority

        // Real cloud data overrides dev mode
        if devMode { stopDevMode() }

        dataSource = "cloud"
        lastUpdate = Date()

        if let hr = payload.heartRate {
            currentBPM = hr
            heartRateHistory.append(DataPoint(timestamp: Date(), value: hr))
        }
        if let rr = payload.respiratoryRate {
            currentRPM = rr
            respRateHistory.append(DataPoint(timestamp: Date(), value: rr))
        }
        if let temp = payload.temperatureF {
            environment.temperature = temp
            temperatureHistory.append(DataPoint(timestamp: Date(), value: temp))
        }
        if let w = payload.weightLbs {
            weightData.weight = w
        }
        if let sq = payload.signalQuality {
            signalQuality = sq
        }
    }

    // MARK: - Notifications

    func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
    }

    // MARK: - Unit Helpers

    func temperatureForDisplay(_ fahrenheit: Double?) -> Double? {
        guard let f = fahrenheit else { return nil }
        if appSettings.temperatureUnit == .celsius {
            return (f - 32) * 5 / 9
        }
        return f
    }

    func weightForDisplay(_ lbs: Double?) -> Double? {
        guard let w = lbs else { return nil }
        if appSettings.weightUnit == .kg {
            return w * 0.453592
        }
        return w
    }

    var temperatureUnitLabel: String { appSettings.temperatureUnit.label }
    var weightUnitLabel: String { appSettings.weightUnit.label }

    // MARK: - Data Export

    func exportCSV() -> String {
        let tempLabel = appSettings.temperatureUnit == .celsius ? "Temperature (\u{00B0}C)" : "Temperature (\u{00B0}F)"
        var csv = "Timestamp,Heart Rate (bpm),Respiratory Rate (rpm),\(tempLabel)\n"

        let len = max(heartRateHistory.count, respRateHistory.count, temperatureHistory.count)
        for i in 0..<len {
            let ts = (i < heartRateHistory.count ? heartRateHistory[i].timestamp :
                      i < respRateHistory.count ? respRateHistory[i].timestamp :
                      temperatureHistory[i].timestamp)
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
            let tsStr = formatter.string(from: ts)

            let hr = i < heartRateHistory.count ? "\(Int(heartRateHistory[i].value))" : ""
            let rr = i < respRateHistory.count ? "\(Int(respRateHistory[i].value))" : ""
            var temp = ""
            if i < temperatureHistory.count {
                let v = temperatureHistory[i].value
                let display = appSettings.temperatureUnit == .celsius ? (v - 32) * 5 / 9 : v
                temp = String(format: "%.1f", display)
            }
            csv += "\(tsStr),\(hr),\(rr),\(temp)\n"
        }
        return csv
    }

    func exportJSON() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        let isCelsius = appSettings.temperatureUnit == .celsius

        var records: [[String: Any]] = []
        let len = max(heartRateHistory.count, respRateHistory.count, temperatureHistory.count)
        for i in 0..<len {
            var record: [String: Any] = [:]
            let ts = (i < heartRateHistory.count ? heartRateHistory[i].timestamp :
                      i < respRateHistory.count ? respRateHistory[i].timestamp :
                      temperatureHistory[i].timestamp)
            record["timestamp"] = formatter.string(from: ts)
            if i < heartRateHistory.count { record["heartRate"] = heartRateHistory[i].value }
            if i < respRateHistory.count { record["respRate"] = respRateHistory[i].value }
            if i < temperatureHistory.count {
                let v = temperatureHistory[i].value
                record["temperature"] = isCelsius ? (v - 32) * 5 / 9 : v
            }
            records.append(record)
        }

        let payload: [String: Any] = [
            "petName": petProfile.name,
            "exportDate": ISO8601DateFormatter().string(from: Date()),
            "units": ["temperature": isCelsius ? "C" : "F", "weight": appSettings.weightUnit.rawValue],
            "recordCount": records.count,
            "data": records
        ]

        if let data = try? JSONSerialization.data(withJSONObject: payload, options: .prettyPrinted),
           let str = String(data: data, encoding: .utf8) {
            return str
        }
        return "{}"
    }

    var hasExportData: Bool {
        !heartRateHistory.isEmpty || !respRateHistory.isEmpty || !temperatureHistory.isEmpty
    }

    // MARK: - History management

    func clearHistory() {
        heartRateHistory.removeAll()
        respRateHistory.removeAll()
        temperatureHistory.removeAll()
    }

    // MARK: - Private: Bindings

    private func switchTransport() {
        let wasConnected = activeTransport?.connectionState == .connected || activeTransport?.connectionState == .connecting
        if wasConnected {
            connectTransport()
        }
    }

    private func bindTransport() {
        guard let transport = activeTransport else { return }

        transport.connectionStatePublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                self?.connectionState = state
                if state == .connected {
                    self?.stopDevMode()
                    self?.cloudService.disconnectWebSocket()
                } else if state == .disconnected {
                    self?.startCloudFallback()
                }
            }
            .store(in: &cancellables)

        transport.packetPublisher
            .receive(on: DispatchQueue.global(qos: .userInitiated))
            .compactMap { PacketParser.parseSamples(from: $0) }
            .receive(on: DispatchQueue.main)
            .sink { [weak self] samples in
                self?.processor.push(samples: samples)
            }
            .store(in: &cancellables)
    }

    private func bindProcessor() {
        processor.$rawSamples
            .receive(on: DispatchQueue.main)
            .assign(to: &$rawSamples)

        processor.$respSamples
            .receive(on: DispatchQueue.main)
            .assign(to: &$respSamples)

        processor.$hrSamples
            .receive(on: DispatchQueue.main)
            .assign(to: &$hrSamples)

        processor.$currentBPM
            .receive(on: DispatchQueue.main)
            .sink { [weak self] bpm in
                guard let self else { return }
                self.currentBPM = bpm
                self.lastUpdate = Date()
                self.updateBedEmpty()
                self.updateSession(bpm: bpm, rpm: self.currentRPM)
                self.checkAlerts(bpm: bpm, rpm: self.currentRPM)
                if let bpm {
                    self.heartRateHistory.append(DataPoint(timestamp: Date(), value: bpm))
                    if self.heartRateHistory.count > 1440 { self.heartRateHistory.removeFirst() }
                }
            }
            .store(in: &cancellables)

        processor.$currentRPM
            .receive(on: DispatchQueue.main)
            .sink { [weak self] rpm in
                guard let self else { return }
                self.currentRPM = rpm
                self.updateBedEmpty()
                if let rpm {
                    self.respRateHistory.append(DataPoint(timestamp: Date(), value: rpm))
                    if self.respRateHistory.count > 1440 { self.respRateHistory.removeFirst() }
                }
            }
            .store(in: &cancellables)
    }

    private func bindBLEScanning() {
        bleService.$discoveredPeripherals
            .receive(on: DispatchQueue.main)
            .assign(to: &$discoveredPeripherals)

        bleService.$isScanning
            .receive(on: DispatchQueue.main)
            .assign(to: &$isBLEScanning)
    }

    private func bindCloudService() {
        cloudService.$latestVitals
            .receive(on: DispatchQueue.main)
            .compactMap { $0 }
            .sink { [weak self] payload in
                self?.applyCloudVitals(payload)
            }
            .store(in: &cancellables)
    }

    private func updateBedEmpty() {
        bedEmpty = (currentBPM == nil && currentRPM == nil && !rawSamples.isEmpty)
    }

    // MARK: - Alerts

    private func checkAlerts(bpm: Double?, rpm: Double?) {
        guard notificationsEnabled else { return }
        guard Date().timeIntervalSince(lastNotificationDate) > 60 else { return }

        var messages: [String] = []
        if let bpm, bpm < hrAlertLow { messages.append("Heart rate is low: \(Int(bpm)) BPM") }
        else if let bpm, bpm > hrAlertHigh { messages.append("Heart rate is high: \(Int(bpm)) BPM") }
        if let rpm, rpm < rrAlertLow { messages.append("Respiratory rate is low: \(Int(rpm)) BrPM") }
        else if let rpm, rpm > rrAlertHigh { messages.append("Respiratory rate is high: \(Int(rpm)) BrPM") }

        guard !messages.isEmpty else { return }
        lastNotificationDate = Date()

        let content = UNMutableNotificationContent()
        content.title = "AnimalDot Alert"
        content.body = messages.joined(separator: "\n")
        content.sound = .default
        UNUserNotificationCenter.current().add(
            UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
        )
    }

    // MARK: - Session Tracking

    private func startSession() {
        let now = Date()
        currentSession = SessionRecord(id: UUID(), startDate: now, endDate: now, avgBPM: 0, avgRPM: 0, sampleCount: 0)
        sessionBPMSum = 0; sessionRPMSum = 0; sessionSampleCount = 0
    }

    private func updateSession(bpm: Double?, rpm: Double?) {
        guard var session = currentSession, let bpm, let rpm else { return }
        sessionBPMSum += bpm; sessionRPMSum += rpm; sessionSampleCount += 1
        session.endDate = Date()
        session.avgBPM = sessionBPMSum / Double(sessionSampleCount)
        session.avgRPM = sessionRPMSum / Double(sessionSampleCount)
        session.sampleCount = sessionSampleCount
        currentSession = session
    }

    private func endSession() {
        guard let session = currentSession, session.sampleCount > 0 else {
            currentSession = nil; return
        }
        sessions.insert(session, at: 0)
        if sessions.count > 100 { sessions = Array(sessions.prefix(100)) }
        currentSession = nil
    }

    // MARK: - Persistence Helpers

    private static func loadSessions() -> [SessionRecord] {
        guard let data = UserDefaults.standard.data(forKey: "settings.sessions") else { return [] }
        return (try? JSONDecoder().decode([SessionRecord].self, from: data)) ?? []
    }

    private static func saveSessions(_ sessions: [SessionRecord]) {
        guard let data = try? JSONEncoder().encode(sessions) else { return }
        UserDefaults.standard.set(data, forKey: "settings.sessions")
    }

    private static func loadUser() -> AppUser? {
        guard let data = UserDefaults.standard.data(forKey: Keys.currentUser) else { return nil }
        return try? JSONDecoder().decode(AppUser.self, from: data)
    }

    private static func saveUser(_ user: AppUser?) {
        if let user, let data = try? JSONEncoder().encode(user) {
            UserDefaults.standard.set(data, forKey: Keys.currentUser)
        } else {
            UserDefaults.standard.removeObject(forKey: Keys.currentUser)
        }
    }

    private static func defaultPetProfile() -> PetProfile {
        PetProfile(id: UUID().uuidString, name: "Pet", breed: "", age: 0, baselineWeight: 0, medicalNotes: "", createdAt: Date(), updatedAt: Date())
    }

    private static func loadPetProfile(userId: String?) -> PetProfile {
        let key = "settings.petProfile.\(userId ?? "default")"
        guard let data = UserDefaults.standard.data(forKey: key),
              let p = try? JSONDecoder().decode(PetProfile.self, from: data) else {
            return defaultPetProfile()
        }
        return p
    }

    private static func savePetProfile(_ profile: PetProfile, userId: String?) {
        let key = "settings.petProfile.\(userId ?? "default")"
        guard let data = try? JSONEncoder().encode(profile) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }

    private static func loadAppSettings(userId: String?) -> AppSettings {
        let key = "settings.appSettings.\(userId ?? "default")"
        guard let data = UserDefaults.standard.data(forKey: key),
              let s = try? JSONDecoder().decode(AppSettings.self, from: data) else {
            return AppSettings()
        }
        return s
    }

    private static func saveAppSettings(_ settings: AppSettings, userId: String?) {
        let key = "settings.appSettings.\(userId ?? "default")"
        guard let data = try? JSONEncoder().encode(settings) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }

    private static func loadRegisteredAccounts() -> [AppUser] {
        guard let data = UserDefaults.standard.data(forKey: Keys.registeredAccounts) else { return [] }
        return (try? JSONDecoder().decode([AppUser].self, from: data)) ?? []
    }

    private static func saveRegisteredAccounts(_ accounts: [AppUser]) {
        guard let data = try? JSONEncoder().encode(accounts) else { return }
        UserDefaults.standard.set(data, forKey: Keys.registeredAccounts)
    }
}

// MARK: - CBUUID + CBCharacteristic helpers

import CoreBluetooth

private extension CBUUID {
    static func from(string: String) -> CBUUID? {
        let trimmed = string.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        return CBUUID(string: trimmed)
    }
}
