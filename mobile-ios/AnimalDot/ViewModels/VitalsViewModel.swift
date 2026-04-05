import Foundation
import Combine
import UserNotifications

/// Central view model that owns the transport, signal processor, and all published UI state.
@MainActor
final class VitalsViewModel: ObservableObject {

    // MARK: - Published UI state

    @Published var rawSamples: [Double] = []
    @Published var respSamples: [Double] = []
    @Published var hrSamples: [Double] = []
    @Published var currentBPM: Double?
    @Published var currentRPM: Double?
    @Published var connectionState: TransportConnectionState = .disconnected
    @Published var bedEmpty: Bool = false

    // MARK: - Transport selection

    @Published var selectedTransport: TransportType {
        didSet {
            UserDefaults.standard.set(selectedTransport.rawValue, forKey: Keys.transportType)
            switchTransport()
        }
    }

    // MARK: - Settings (persisted to UserDefaults)

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

    // MARK: - BLE scan results (forwarded from BLEService)

    @Published var discoveredPeripherals: [BLEService.DiscoveredPeripheral] = []
    @Published var isBLEScanning: Bool = false

    // MARK: - Internal

    private let processor = SignalProcessor()
    private let mqttService: MQTTService
    private let bleService: BLEService
    private var activeTransport: VitalsTransport?
    private var cancellables = Set<AnyCancellable>()

    // Current session tracking
    private var currentSession: SessionRecord?
    private var sessionBPMSum: Double = 0
    private var sessionRPMSum: Double = 0
    private var sessionSampleCount: Int = 0

    // Notification throttle — don't fire more than once per 60s
    private var lastNotificationDate: Date = .distantPast

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
    }

    // MARK: - Init

    init() {
        let defaults = UserDefaults.standard

        // Restore persisted settings
        let transportRaw = defaults.string(forKey: Keys.transportType) ?? TransportType.mqtt.rawValue
        self.selectedTransport = TransportType(rawValue: transportRaw) ?? .mqtt

        self.brokerHost = defaults.string(forKey: Keys.brokerHost) ?? "sensorweb.us"
        let storedPort = defaults.integer(forKey: Keys.brokerPort)
        self.brokerPort = storedPort > 0 ? UInt16(storedPort) : 1883
        self.macAddress = defaults.string(forKey: Keys.macAddress) ?? "3030f9723ae8"
        self.bleCharacteristicUUID = defaults.string(forKey: Keys.bleCharUUID) ?? ""

        self.hrAlertLow = defaults.object(forKey: Keys.hrAlertLow) as? Double ?? 40
        self.hrAlertHigh = defaults.object(forKey: Keys.hrAlertHigh) as? Double ?? 120
        self.rrAlertLow = defaults.object(forKey: Keys.rrAlertLow) as? Double ?? 10
        self.rrAlertHigh = defaults.object(forKey: Keys.rrAlertHigh) as? Double ?? 40
        self.notificationsEnabled = defaults.object(forKey: Keys.notificationsEnabled) as? Bool ?? true

        // Create services
        self.mqttService = MQTTService(host: brokerHost, port: brokerPort, mac: macAddress)
        self.bleService = BLEService()

        // Load saved sessions
        self.sessions = Self.loadSessions()

        // Bind signal processor outputs to our published properties
        bindProcessor()

        // Bind BLE scan results
        bindBLEScanning()
    }

    // MARK: - Transport Management

    func connectTransport() {
        disconnectTransport()

        switch selectedTransport {
        case .mqtt:
            mqttService.configure(host: brokerHost, port: brokerPort, mac: macAddress)
            activeTransport = mqttService
        case .ble:
            if let uuid = CBUUID.from(string: bleCharacteristicUUID) {
                bleService.notifyCharacteristicUUID = uuid
            }
            activeTransport = bleService
        }

        bindTransport()
        activeTransport?.connect()
        startSession()
    }

    func disconnectTransport() {
        activeTransport?.disconnect()
        cancellables.removeAll()
        bindProcessor()
        bindBLEScanning()
        processor.reset()
        connectionState = .disconnected
        bedEmpty = false
        endSession()
    }

    /// Called when the app backgrounds — end the current session.
    func appDidEnterBackground() {
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

    // MARK: - Notifications

    func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
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

        // Connection state
        transport.connectionStatePublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                self?.connectionState = state
            }
            .store(in: &cancellables)

        // Packets -> parser -> processor
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
                self.updateBedEmpty()
                self.updateSession(bpm: bpm, rpm: self.currentRPM)
                self.checkAlerts(bpm: bpm, rpm: self.currentRPM)
            }
            .store(in: &cancellables)

        processor.$currentRPM
            .receive(on: DispatchQueue.main)
            .sink { [weak self] rpm in
                guard let self else { return }
                self.currentRPM = rpm
                self.updateBedEmpty()
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

    private func updateBedEmpty() {
        bedEmpty = (currentBPM == nil && currentRPM == nil && !rawSamples.isEmpty)
    }

    // MARK: - Alerts

    private func checkAlerts(bpm: Double?, rpm: Double?) {
        guard notificationsEnabled else { return }
        guard Date().timeIntervalSince(lastNotificationDate) > 60 else { return }

        var messages: [String] = []

        if let bpm, bpm < hrAlertLow {
            messages.append("Heart rate is low: \(Int(bpm)) BPM")
        } else if let bpm, bpm > hrAlertHigh {
            messages.append("Heart rate is high: \(Int(bpm)) BPM")
        }

        if let rpm, rpm < rrAlertLow {
            messages.append("Respiratory rate is low: \(Int(rpm)) BrPM")
        } else if let rpm, rpm > rrAlertHigh {
            messages.append("Respiratory rate is high: \(Int(rpm)) BrPM")
        }

        guard !messages.isEmpty else { return }

        lastNotificationDate = Date()

        let content = UNMutableNotificationContent()
        content.title = "AnimalDot Alert"
        content.body = messages.joined(separator: "\n")
        content.sound = .default

        let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
        UNUserNotificationCenter.current().add(request)
    }

    // MARK: - Session Tracking

    private func startSession() {
        let now = Date()
        currentSession = SessionRecord(
            id: UUID(),
            startDate: now,
            endDate: now,
            avgBPM: 0,
            avgRPM: 0,
            sampleCount: 0
        )
        sessionBPMSum = 0
        sessionRPMSum = 0
        sessionSampleCount = 0
    }

    private func updateSession(bpm: Double?, rpm: Double?) {
        guard var session = currentSession else { return }
        guard let bpm, let rpm else { return }

        sessionBPMSum += bpm
        sessionRPMSum += rpm
        sessionSampleCount += 1

        session.endDate = Date()
        session.avgBPM = sessionBPMSum / Double(sessionSampleCount)
        session.avgRPM = sessionRPMSum / Double(sessionSampleCount)
        session.sampleCount = sessionSampleCount
        currentSession = session
    }

    private func endSession() {
        guard let session = currentSession, session.sampleCount > 0 else {
            currentSession = nil
            return
        }
        sessions.insert(session, at: 0)
        // Keep at most 100 sessions
        if sessions.count > 100 { sessions = Array(sessions.prefix(100)) }
        Self.saveSessions(sessions)
        currentSession = nil
    }

    // MARK: - Session Persistence

    private static func loadSessions() -> [SessionRecord] {
        guard let data = UserDefaults.standard.data(forKey: Keys.sessions) else { return [] }
        return (try? JSONDecoder().decode([SessionRecord].self, from: data)) ?? []
    }

    private static func saveSessions(_ sessions: [SessionRecord]) {
        guard let data = try? JSONEncoder().encode(sessions) else { return }
        UserDefaults.standard.set(data, forKey: Keys.sessions)
    }
}

// MARK: - CBUUID helper

import CoreBluetooth

private extension CBUUID {
    static func from(string: String) -> CBUUID? {
        let trimmed = string.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        return CBUUID(string: trimmed)
    }
}
