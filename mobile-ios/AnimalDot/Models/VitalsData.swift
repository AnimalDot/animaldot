import Foundation

struct VitalsSnapshot {
    let heartRateBPM: Double?
    let respiratoryRPM: Double?
    let timestamp: Date
}

struct SessionRecord: Identifiable, Codable {
    let id: UUID
    let startDate: Date
    var endDate: Date
    var avgBPM: Double
    var avgRPM: Double
    var sampleCount: Int
}

enum TransportType: String, CaseIterable, Identifiable {
    case mqtt
    case ble

    var id: String { rawValue }

    var label: String {
        switch self {
        case .mqtt: return "MQTT"
        case .ble: return "BLE"
        }
    }
}
