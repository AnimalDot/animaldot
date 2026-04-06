import Foundation

// MARK: - Vitals Snapshot

struct VitalsSnapshot {
    let heartRateBPM: Double?
    let respiratoryRPM: Double?
    let timestamp: Date
}

// MARK: - Session Record

struct SessionRecord: Identifiable, Codable {
    let id: UUID
    let startDate: Date
    var endDate: Date
    var avgBPM: Double
    var avgRPM: Double
    var sampleCount: Int
}

// MARK: - Transport Type

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

// MARK: - User

struct AppUser: Identifiable, Codable, Equatable {
    let id: String
    var name: String
    var email: String
    var createdAt: Date
}

// MARK: - Pet Profile

struct PetProfile: Identifiable, Codable, Equatable {
    var id: String
    var name: String
    var breed: String
    var age: Int
    var baselineWeight: Double // stored in lbs
    var medicalNotes: String
    var createdAt: Date
    var updatedAt: Date
}

// MARK: - App Settings

struct AppSettings: Codable, Equatable {
    var temperatureUnit: TemperatureUnit = .fahrenheit
    var weightUnit: WeightUnit = .lbs
    var notificationsEnabled: Bool = true
    var bluetoothAutoConnect: Bool = true
    var dataExportEnabled: Bool = true
    var lastConnectedDeviceId: String? = nil

    enum TemperatureUnit: String, Codable {
        case fahrenheit = "F"
        case celsius = "C"

        var label: String {
            switch self {
            case .fahrenheit: return "\u{00B0}F"
            case .celsius: return "\u{00B0}C"
            }
        }
    }

    enum WeightUnit: String, Codable {
        case lbs
        case kg

        var label: String { rawValue }
    }
}

// MARK: - Environment Data

struct EnvironmentData: Equatable {
    var temperature: Double? // Fahrenheit
    var humidity: Double?
    var timestamp: Date = Date()
}

// MARK: - Weight Data

struct WeightData: Equatable {
    var weight: Double? // lbs
    var isStable: Bool = false
    var timestamp: Date = Date()
}

// MARK: - Device Status

struct DeviceHardwareStatus: Equatable {
    var geophoneConnected: Bool = false
    var loadCellsConnected: Bool = false
    var temperatureSensorConnected: Bool = false
    var bluetoothConnected: Bool = false
    var firmwareVersion: String = "1.0.0"
    var batteryLevel: Int? = nil
    var errorCode: Int = 0
}

// MARK: - Data Point (for charts)

struct DataPoint: Identifiable {
    let id = UUID()
    let timestamp: Date
    let value: Double
}

// MARK: - BLE Device

struct AnimalDotDevice: Identifiable, Equatable {
    let id: String
    let name: String
    let rssi: Int
    var isConnected: Bool = false
    var isPaired: Bool = false
    var lastSeen: Date = Date()
}

// MARK: - Calibration Commands

enum CalibrationCommand: UInt8 {
    case tareWeight = 0x01
    case setTempOffset = 0x02
    case setWeightFactor = 0x03
}

// MARK: - BLE UUIDs

enum BLEUUIDs {
    static let animalDotService = "12345678-1234-5678-1234-56789ABCDEF0"
    static let heartRateChar    = "12345678-1234-5678-1234-56789ABCDEF1"
    static let respRateChar     = "12345678-1234-5678-1234-56789ABCDEF2"
    static let temperatureChar  = "12345678-1234-5678-1234-56789ABCDEF3"
    static let humidityChar     = "12345678-1234-5678-1234-56789ABCDEF4"
    static let weightChar       = "12345678-1234-5678-1234-56789ABCDEF5"
    static let deviceStatusChar = "12345678-1234-5678-1234-56789ABCDEF6"
    static let calibrationChar  = "12345678-1234-5678-1234-56789ABCDEF7"
    static let rawGeophoneChar  = "12345678-1234-5678-1234-56789ABCDEF8"
}

// MARK: - Normal Ranges

enum NormalRanges {
    static let heartRateMin: Double = 60
    static let heartRateMax: Double = 120
    static let respiratoryRateMin: Double = 15
    static let respiratoryRateMax: Double = 30
    static let temperatureMinF: Double = 100
    static let temperatureMaxF: Double = 102.5
}

// MARK: - Cloud Vitals Payload

struct CloudVitalsPayload: Codable {
    let deviceId: String?
    let heartRate: Double?
    let respiratoryRate: Double?
    let temperatureF: Double?
    let weightLbs: Double?
    let signalQuality: Double?
    let qualityLevel: String?
    let recordedAt: String?
}
