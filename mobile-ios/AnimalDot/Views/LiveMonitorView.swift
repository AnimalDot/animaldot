import SwiftUI

struct LiveDashboardView: View {
    @EnvironmentObject var vm: VitalsViewModel

    var body: some View {
        NavigationStack {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 12) {
                    headerSection
                    metricsGrid
                    signalQualityCard
                    environmentCard
                    alertCards
                }
                .padding(16)
            }
            .background(AppColors.background)
            .navigationTitle("Live Dashboard")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(AppColors.background, for: .navigationBar)
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(vm.petProfile.name)
                    .font(.title2.weight(.bold))
                    .foregroundStyle(AppColors.text)
                Text("Last updated: \(lastUpdateText)")
                    .font(.caption)
                    .foregroundStyle(AppColors.textMuted)
            }
            Spacer()
            StatusBadgeView(
                status: connectionStatus,
                label: dataSourceLabel
            )
        }
        .padding(.bottom, 8)
    }

    private var connectionStatus: String {
        switch vm.connectionState {
        case .connected: return "stable"
        case .connecting: return "alert"
        case .disconnected: return "disconnected"
        }
    }

    private var dataSourceLabel: String {
        switch vm.dataSource {
        case "ble": return "BLE"
        case "mqtt": return "MQTT"
        case "cloud": return "Cloud"
        default: return "Disconnected"
        }
    }

    private var lastUpdateText: String {
        if vm.currentBPM != nil {
            return "Just now"
        }
        return "Never"
    }

    // MARK: - Metrics Grid (2x2)

    private var metricsGrid: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                MetricCardView(
                    title: "Heart Rate",
                    value: vm.currentBPM.map { "\(Int($0))" } ?? "--",
                    unit: "bpm",
                    subtitle: "Normal: \(Int(NormalRanges.heartRateMin))-\(Int(NormalRanges.heartRateMax)) bpm",
                    color: AppColors.heartRate
                )
                MetricCardView(
                    title: "Respiration Rate",
                    value: vm.currentRPM.map { "\(Int($0))" } ?? "--",
                    unit: "rpm",
                    subtitle: "Normal: \(Int(NormalRanges.respiratoryRateMin))-\(Int(NormalRanges.respiratoryRateMax)) rpm",
                    color: AppColors.respRate
                )
            }

            HStack(spacing: 12) {
                MetricCardView(
                    title: "Temperature",
                    value: vm.temperatureForDisplay(vm.environment.temperature)
                        .map { String(format: "%.1f", $0) } ?? "--",
                    unit: vm.temperatureUnitLabel,
                    subtitle: temperatureSubtitle,
                    color: AppColors.temperature
                )
                MetricCardView(
                    title: "Weight",
                    value: vm.weightForDisplay(vm.weightData.weight)
                        .map { String(format: "%.1f", $0) } ?? "--",
                    unit: vm.weightUnitLabel,
                    subtitle: weightSubtitle,
                    color: AppColors.weight
                )
            }
        }
    }

    private var temperatureSubtitle: String {
        if vm.appSettings.temperatureUnit == .celsius {
            let minC = (NormalRanges.temperatureMinF - 32) * 5 / 9
            let maxC = (NormalRanges.temperatureMaxF - 32) * 5 / 9
            return "Normal: \(String(format: "%.1f", minC))-\(String(format: "%.1f", maxC))\u{00B0}C"
        }
        return "Normal: \(String(format: "%.1f", NormalRanges.temperatureMinF))-\(String(format: "%.1f", NormalRanges.temperatureMaxF))\u{00B0}F"
    }

    private var weightSubtitle: String {
        let baseline = vm.weightForDisplay(vm.petProfile.baselineWeight)
        if let b = baseline, b > 0 {
            return "Baseline: \(String(format: "%.1f", b)) \(vm.weightUnitLabel)"
        }
        return "Baseline: -- \(vm.weightUnitLabel)"
    }

    // MARK: - Signal Quality

    private var signalQualityCard: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(vm.dataSource == "ble" ? "\u{1F4E1}" : "\u{2601}\u{FE0F}")
                Text("Signal Quality: \(signalQualityText)")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(AppColors.text)
            }
            Text("Data source: \(dataSourceLabel)\(dataSourceDetail)")
                .font(.caption)
                .foregroundStyle(AppColors.textMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(AppColors.card)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }

    private var signalQualityText: String {
        if vm.signalQuality >= 0.7 { return "Good" }
        if vm.signalQuality >= 0.4 { return "Fair" }
        if vm.signalQuality > 0 { return "Poor" }
        return "No Signal"
    }

    private var dataSourceDetail: String {
        switch vm.dataSource {
        case "ble": return " \u{2014} direct Bluetooth connection"
        case "mqtt": return " \u{2014} raw geophone processing"
        case "cloud": return " \u{2014} streamed via BedDot system"
        default: return ""
        }
    }

    // MARK: - Environment

    @ViewBuilder
    private var environmentCard: some View {
        if vm.environment.temperature != nil || vm.environment.humidity != nil {
            VStack(alignment: .leading, spacing: 12) {
                Text("Environment")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(AppColors.text)

                HStack {
                    VStack(spacing: 4) {
                        Text("Humidity")
                            .font(.caption)
                            .foregroundStyle(AppColors.textMuted)
                        Text(vm.environment.humidity.map { "\(Int($0))%" } ?? "--%")
                            .font(.title3.weight(.semibold))
                            .foregroundStyle(AppColors.text)
                    }
                    .frame(maxWidth: .infinity)

                    VStack(spacing: 4) {
                        Text("Bed Temp")
                            .font(.caption)
                            .foregroundStyle(AppColors.textMuted)
                        Text(vm.temperatureForDisplay(vm.environment.temperature)
                            .map { String(format: "%.1f%@", $0, vm.temperatureUnitLabel) } ?? "--")
                            .font(.title3.weight(.semibold))
                            .foregroundStyle(AppColors.text)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(AppColors.card)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
        }
    }

    // MARK: - Alert Cards

    @ViewBuilder
    private var alertCards: some View {
        // Bed empty alert
        if vm.bedEmpty && vm.dataSource == "mqtt" {
            alertBanner(
                title: "Bed appears empty",
                message: "Signal level is too low to detect vitals. The pet may not be on the bed.",
                color: AppColors.warning
            )
        }

        // MQTT info
        if vm.dataSource == "mqtt" && !vm.bedEmpty {
            infoBanner(
                title: "MQTT Direct Processing",
                message: "Processing raw geophone data locally. Vitals are computed on-device from the signal processor."
            )
        }

        // Cloud fallback
        if vm.dataSource == "cloud" {
            infoBanner(
                title: "\u{2601}\u{FE0F} Using Cloud Data",
                message: "BLE is not connected. Showing vitals from the cloud. Connect via BLE in the Device tab for direct streaming."
            )
        }

        // No connection
        if vm.connectionState == .disconnected && vm.dataSource == "none" {
            alertBanner(
                title: "\u{26A0}\u{FE0F} No Connection",
                message: "No BLE or cloud connection available. Check that your AnimalDot bed is powered on and connected to WiFi.",
                color: AppColors.warning
            )
        }
    }

    private func alertBanner(title: String, message: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.body.weight(.semibold))
                .foregroundStyle(color)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(AppColors.text)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(color.opacity(0.12))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(color, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func infoBanner(title: String, message: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.body.weight(.semibold))
                .foregroundStyle(Color(hex: "1565C0"))
            Text(message)
                .font(.subheadline)
                .foregroundStyle(AppColors.text)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color(hex: "E3F2FD"))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color(hex: "2196F3"), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
