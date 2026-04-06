import Foundation
import Combine

/// Cloud fallback service: REST + WebSocket for vitals when BLE/MQTT are not connected.
final class CloudService: ObservableObject {
    static let shared = CloudService()

    @Published private(set) var latestVitals: CloudVitalsPayload?
    @Published private(set) var isConnected = false

    private var apiBase: String {
        // configurable via environment or defaults
        ProcessInfo.processInfo.environment["ANIMALDOT_API_BASE"] ?? "http://localhost:3000/api"
    }

    private var wsTask: URLSessionWebSocketTask?
    private var reconnectWorkItem: DispatchWorkItem?
    private var session = URLSession.shared

    // MARK: - REST

    func fetchLatestVitals(deviceId: String = "default") async -> CloudVitalsPayload? {
        let urlString = "\(apiBase)/vitals/latest?deviceId=\(deviceId)"
        guard let url = URL(string: urlString) else { return nil }

        do {
            let (data, response) = try await session.data(from: url)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { return nil }
            let payload = try JSONDecoder().decode(CloudVitalsPayload.self, from: data)
            await MainActor.run { self.latestVitals = payload }
            return payload
        } catch {
            return nil
        }
    }

    // MARK: - WebSocket

    func connectWebSocket() {
        disconnectWebSocket()

        let base = apiBase.replacingOccurrences(of: "/api", with: "")
        let wsBase = base.replacingOccurrences(of: "http", with: "ws")
        guard let url = URL(string: "\(wsBase)/vitals") else { return }

        wsTask = session.webSocketTask(with: url)
        wsTask?.resume()
        isConnected = true
        receiveMessage()
    }

    func disconnectWebSocket() {
        reconnectWorkItem?.cancel()
        reconnectWorkItem = nil
        wsTask?.cancel(with: .goingAway, reason: nil)
        wsTask = nil
        isConnected = false
    }

    private func receiveMessage() {
        wsTask?.receive { [weak self] result in
            switch result {
            case .success(let message):
                if case .string(let text) = message {
                    self?.handleMessage(text)
                }
                self?.receiveMessage() // continue listening
            case .failure:
                DispatchQueue.main.async {
                    self?.isConnected = false
                    self?.scheduleReconnect()
                }
            }
        }
    }

    private func handleMessage(_ text: String) {
        guard let data = text.data(using: .utf8) else { return }

        struct WsMessage: Codable {
            let type: String?
            let payload: CloudVitalsPayload?
        }

        if let msg = try? JSONDecoder().decode(WsMessage.self, from: data),
           msg.type == "vitals", let payload = msg.payload {
            DispatchQueue.main.async {
                self.latestVitals = payload
            }
        }
    }

    private func scheduleReconnect() {
        reconnectWorkItem?.cancel()
        let work = DispatchWorkItem { [weak self] in
            self?.connectWebSocket()
        }
        reconnectWorkItem = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 5, execute: work)
    }
}
