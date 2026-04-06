import Foundation
import CoreBluetooth
import Combine

/// BLE transport that scans for peripherals, connects, and streams raw data packets.
///
/// Two modes:
/// 1. **Scan mode** — lists all nearby peripherals with name + RSSI.
/// 2. **Connect mode** — connects to a saved peripheral UUID, subscribes to a notify
///    characteristic, and publishes raw `Data` through the `VitalsTransport` protocol.
///
/// The characteristic UUID is user-configurable (set `notifyCharacteristicUUID`).
/// Auto-reconnects to `savedPeripheralUUID` on launch and on unexpected disconnect.
final class BLEService: NSObject, VitalsTransport {

    // MARK: - Configuration

    /// UUID of the BLE notify characteristic to subscribe to.
    /// Unknown until the device is inspected — the user sets this in Device Setup.
    var notifyCharacteristicUUID: CBUUID?

    /// Peripheral UUID to auto-reconnect to on launch.
    var savedPeripheralUUID: UUID? {
        didSet {
            if let uuid = savedPeripheralUUID {
                UserDefaults.standard.set(uuid.uuidString, forKey: "BLE_savedPeripheralUUID")
            } else {
                UserDefaults.standard.removeObject(forKey: "BLE_savedPeripheralUUID")
            }
        }
    }

    // MARK: - Scan results

    struct DiscoveredPeripheral: Identifiable {
        let id: UUID
        let name: String
        let rssi: Int
    }

    /// Live list of discovered peripherals during a scan.
    @Published private(set) var discoveredPeripherals: [DiscoveredPeripheral] = []

    /// Whether we are currently scanning.
    @Published private(set) var isScanning = false

    // MARK: - CoreBluetooth

    private var centralManager: CBCentralManager!
    /// The currently connected peripheral (internal for calibration writes).
    private(set) var connectedPeripheral: CBPeripheral?
    private var targetCharacteristic: CBCharacteristic?
    private var pendingConnectUUID: UUID?
    private var shouldAutoReconnect = false

    // MARK: - Combine

    private let _packetSubject = PassthroughSubject<Data, Never>()
    private let _connectionStateSubject = CurrentValueSubject<TransportConnectionState, Never>(.disconnected)

    var packetPublisher: AnyPublisher<Data, Never> {
        _packetSubject.eraseToAnyPublisher()
    }

    var connectionStatePublisher: AnyPublisher<TransportConnectionState, Never> {
        _connectionStateSubject.eraseToAnyPublisher()
    }

    var connectionState: TransportConnectionState {
        _connectionStateSubject.value
    }

    // MARK: - Init

    override init() {
        super.init()
        // Dispatch queue keeps all BLE work off the main thread.
        centralManager = CBCentralManager(delegate: self, queue: DispatchQueue(label: "com.animaldot.ble", qos: .userInitiated))

        // Restore saved peripheral UUID
        if let str = UserDefaults.standard.string(forKey: "BLE_savedPeripheralUUID") {
            savedPeripheralUUID = UUID(uuidString: str)
        }
    }

    // MARK: - Scan mode

    /// Start scanning for all nearby BLE peripherals. Results appear in `discoveredPeripherals`.
    func startScan(timeout: TimeInterval = 15) {
        guard centralManager.state == .poweredOn else { return }
        discoveredPeripherals = []
        isScanning = true
        centralManager.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])

        DispatchQueue.main.asyncAfter(deadline: .now() + timeout) { [weak self] in
            self?.stopScan()
        }
    }

    /// Stop an in-progress scan.
    func stopScan() {
        centralManager.stopScan()
        isScanning = false
    }

    // MARK: - Connect mode (VitalsTransport)

    /// Connect to the saved peripheral (or the most recently set `savedPeripheralUUID`).
    func connect() {
        guard let uuid = savedPeripheralUUID else { return }
        connectTo(peripheralUUID: uuid)
    }

    /// Connect to a specific peripheral by UUID.
    func connectTo(peripheralUUID uuid: UUID) {
        guard centralManager.state == .poweredOn else {
            pendingConnectUUID = uuid
            return
        }

        stopScan()
        shouldAutoReconnect = true
        _connectionStateSubject.send(.connecting)

        // Try to retrieve a known peripheral first
        let known = centralManager.retrievePeripherals(withIdentifiers: [uuid])
        if let peripheral = known.first {
            connectedPeripheral = peripheral
            peripheral.delegate = self
            centralManager.connect(peripheral, options: nil)
        } else {
            // Not cached — need to scan and find it
            pendingConnectUUID = uuid
            centralManager.scanForPeripherals(withServices: nil, options: nil)
        }
    }

    func disconnect() {
        shouldAutoReconnect = false
        pendingConnectUUID = nil
        if let peripheral = connectedPeripheral {
            centralManager.cancelPeripheralConnection(peripheral)
        }
        connectedPeripheral = nil
        targetCharacteristic = nil
        _connectionStateSubject.send(.disconnected)
    }

    deinit {
        disconnect()
    }
}

// MARK: - CBCentralManagerDelegate

extension BLEService: CBCentralManagerDelegate {

    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        guard central.state == .poweredOn else { return }

        // Fulfill pending connect request
        if let uuid = pendingConnectUUID {
            pendingConnectUUID = nil
            connectTo(peripheralUUID: uuid)
        }
        // Auto-reconnect to saved peripheral on launch
        else if let uuid = savedPeripheralUUID, connectionState == .disconnected, shouldAutoReconnect {
            connectTo(peripheralUUID: uuid)
        }
    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral,
                         advertisementData: [String: Any], rssi RSSI: NSNumber) {
        let name = peripheral.name ?? advertisementData[CBAdvertisementDataLocalNameKey] as? String ?? "Unknown"
        let rssiVal = RSSI.intValue

        // If we are connecting to a specific UUID via scan
        if let target = pendingConnectUUID, peripheral.identifier == target {
            pendingConnectUUID = nil
            stopScan()
            connectedPeripheral = peripheral
            peripheral.delegate = self
            centralManager.connect(peripheral, options: nil)
            return
        }

        // Otherwise, update the scan results
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            if !self.discoveredPeripherals.contains(where: { $0.id == peripheral.identifier }) {
                self.discoveredPeripherals.append(
                    DiscoveredPeripheral(id: peripheral.identifier, name: name, rssi: rssiVal)
                )
            }
        }
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        _connectionStateSubject.send(.connected)
        peripheral.discoverServices(nil)
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        _connectionStateSubject.send(.disconnected)
        if shouldAutoReconnect {
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
                self?.connect()
            }
        }
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        targetCharacteristic = nil
        _connectionStateSubject.send(.disconnected)
        if shouldAutoReconnect {
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
                self?.connect()
            }
        }
    }
}

// MARK: - CBPeripheralDelegate

extension BLEService: CBPeripheralDelegate {

    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard let services = peripheral.services else { return }
        for service in services {
            peripheral.discoverCharacteristics(nil, for: service)
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        guard let characteristics = service.characteristics else { return }
        for characteristic in characteristics {
            // Subscribe to the user-configured notify characteristic
            if let targetUUID = notifyCharacteristicUUID, characteristic.uuid == targetUUID {
                if characteristic.properties.contains(.notify) {
                    peripheral.setNotifyValue(true, for: characteristic)
                    targetCharacteristic = characteristic
                }
            }
            // If no specific UUID is configured, subscribe to any notify characteristic
            // (useful for initial device inspection)
            else if notifyCharacteristicUUID == nil && characteristic.properties.contains(.notify) {
                peripheral.setNotifyValue(true, for: characteristic)
                if targetCharacteristic == nil {
                    targetCharacteristic = characteristic
                }
            }
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        guard error == nil, let data = characteristic.value else { return }
        _packetSubject.send(data)
    }
}
