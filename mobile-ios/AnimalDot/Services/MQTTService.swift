import Foundation
import Combine
import CocoaMQTT

/// MQTT transport that connects to the BedDot broker and publishes raw geophone packets.
///
/// Uses MQTT 3.1.1 (the standard `CocoaMQTT` client, not the v5 variant) since the
/// sensorweb.us broker speaks 3.1.1.
///
/// All network work runs on CocoaMQTT's internal dispatch queue — never the main thread.
final class MQTTService: NSObject, VitalsTransport {

    // MARK: - Configuration

    private(set) var host: String
    private(set) var port: UInt16
    private(set) var mac: String

    private var topic: String { "/sensorweb/\(mac)/geophone" }

    // MARK: - MQTT client

    private var mqtt: CocoaMQTT?
    private var reconnectTimer: Timer?
    private let reconnectInterval: TimeInterval = 3.0

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

    init(host: String = "sensorweb.us", port: UInt16 = 1883, mac: String = "3030f9723ae8") {
        self.host = host
        self.port = port
        self.mac = mac
        super.init()
    }

    /// Update connection parameters. Disconnects first if currently connected.
    func configure(host: String, port: UInt16, mac: String) {
        let wasConnected = connectionState == .connected || connectionState == .connecting
        if wasConnected { disconnect() }
        self.host = host
        self.port = port
        self.mac = mac
        if wasConnected { connect() }
    }

    // MARK: - VitalsTransport

    func connect() {
        guard connectionState == .disconnected else { return }
        stopReconnectTimer()

        _connectionStateSubject.send(.connecting)

        let clientID = "AnimalDot-\(UUID().uuidString.prefix(8))"
        let client = CocoaMQTT(clientID: clientID, host: host, port: port)
        client.keepAlive = 60
        client.autoReconnect = false
        client.delegate = self
        mqtt = client

        _ = client.connect()
    }

    func disconnect() {
        stopReconnectTimer()
        let client = mqtt
        mqtt = nil                  // Mark as intentionally disconnected before calling disconnect
        client?.delegate = nil
        client?.disconnect()
        _connectionStateSubject.send(.disconnected)
    }

    // MARK: - Auto-reconnect

    private func scheduleReconnect() {
        stopReconnectTimer()
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.reconnectTimer = Timer.scheduledTimer(withTimeInterval: self.reconnectInterval, repeats: false) { [weak self] _ in
                guard let self else { return }
                self.mqtt = nil
                self.connect()
            }
        }
    }

    private func stopReconnectTimer() {
        reconnectTimer?.invalidate()
        reconnectTimer = nil
    }

    deinit {
        stopReconnectTimer()
        mqtt?.disconnect()
    }
}

// MARK: - CocoaMQTTDelegate

extension MQTTService: CocoaMQTTDelegate {

    func mqtt(_ mqtt: CocoaMQTT, didConnectAck ack: CocoaMQTTConnAck) {
        guard ack == .accept else {
            _connectionStateSubject.send(.disconnected)
            scheduleReconnect()
            return
        }
        _connectionStateSubject.send(.connected)
        mqtt.subscribe(topic, qos: .qos0)
    }

    func mqtt(_ mqtt: CocoaMQTT, didReceiveMessage message: CocoaMQTTMessage, id: UInt16) {
        let data = Data(message.payload)
        guard data.count >= PacketParser.minimumPacketSize else { return }
        _packetSubject.send(data)
    }

    func mqtt(_ mqtt: CocoaMQTT, didPublishMessage message: CocoaMQTTMessage, id: UInt16) {}
    func mqtt(_ mqtt: CocoaMQTT, didPublishAck id: UInt16) {}
    func mqtt(_ mqtt: CocoaMQTT, didSubscribeTopics success: NSDictionary, failed: [String]) {}
    func mqtt(_ mqtt: CocoaMQTT, didUnsubscribeTopics topics: [String]) {}
    func mqttDidPing(_ mqtt: CocoaMQTT) {}
    func mqttDidReceivePong(_ mqtt: CocoaMQTT) {}

    func mqttDidDisconnect(_ mqtt: CocoaMQTT, withError err: Error?) {
        _connectionStateSubject.send(.disconnected)
        // Auto-reconnect unless we intentionally disconnected (self.mqtt is nil)
        if self.mqtt != nil {
            scheduleReconnect()
        }
    }
}
