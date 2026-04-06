import SwiftUI

struct DeviceStatusView: View {
    @EnvironmentObject var vm: VitalsViewModel
    @State private var showWeightCalibration = false
    @State private var showTempCalibration = false
    @State private var calibrationValue = ""
    @State private var isTaring = false

    private var isConnected: Bool {
        vm.connectionState == .connected
    }

    var body: some View {
        NavigationStack {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 16) {
                    connectionCard
                    hardwareComponentsSection
                    signalStrengthSection
                    calibrationSection
                    transportConfigSection
                    deviceInfoSection
                }
                .padding(16)
            }
            .background(AppColors.background)
            .navigationTitle("Device Status")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(AppColors.background, for: .navigationBar)
        }
    }

    // MARK: - Connection Card

    private var connectionCard: some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(isConnected ? "AnimalDot Bed" : "No Device Connected")
                        .font(.headline)
                        .foregroundStyle(AppColors.text)
                    if isConnected {
                        Text("ID: \(vm.macAddress)")
                            .font(.caption)
                            .foregroundStyle(AppColors.textSecondary)
                    }
                }
                Spacer()
                StatusBadgeView(
                    status: isConnected ? "connected" : "disconnected",
                    label: isConnected ? "Connected" : "Disconnected"
                )
            }

            VStack(spacing: 8) {
                infoRow(label: "Last Updated:", value: isConnected ? "Just now" : "Never")
                infoRow(label: "Signal Quality:", value: signalQualityLabel, valueColor: signalQualityColor)
            }

            if isConnected {
                PrimaryButton(title: "Disconnect", variant: .outline) {
                    vm.disconnectTransport()
                }
            } else {
                PrimaryButton(title: vm.connectionState == .connecting ? "Connecting..." : "Connect", loading: vm.connectionState == .connecting) {
                    vm.connectTransport()
                }
            }
        }
        .padding(16)
        .background(AppColors.card)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }

    // MARK: - Hardware Components

    private var hardwareComponentsSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            SectionHeaderView(title: "Hardware Components")

            VStack(spacing: 0) {
                componentRow(icon: "\u{1F4E1}", name: "Geophone", description: "Vibration sensor for HR/RR", connected: vm.hardwareStatus.geophoneConnected)
                Divider().padding(.leading, 68)
                componentRow(icon: "\u{2696}\u{FE0F}", name: "Load Cells", description: "Weight measurement (5x FX29)", connected: vm.hardwareStatus.loadCellsConnected)
                Divider().padding(.leading, 68)
                componentRow(icon: "\u{1F321}\u{FE0F}", name: "Temperature Sensor", description: "DHT22 temp/humidity", connected: vm.hardwareStatus.temperatureSensorConnected)
                Divider().padding(.leading, 68)
                componentRow(icon: "\u{1F4F6}", name: "Bluetooth", description: "BLE communication module", connected: isConnected)
            }
            .background(AppColors.card)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
        }
    }

    private func componentRow(icon: String, name: String, description: String, connected: Bool) -> some View {
        HStack(spacing: 12) {
            Text(icon)
                .font(.title3)
                .frame(width: 40, height: 40)
                .background(AppColors.background)
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(name)
                    .font(.body.weight(.medium))
                    .foregroundStyle(AppColors.text)
                Text(description)
                    .font(.caption)
                    .foregroundStyle(AppColors.textSecondary)
            }

            Spacer()

            HStack(spacing: 6) {
                Circle()
                    .fill(connected ? AppColors.success : AppColors.error)
                    .frame(width: 8, height: 8)
                Text(connected ? "Connected" : "Disconnected")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(connected ? AppColors.success : AppColors.error)
            }
        }
        .padding(16)
    }

    // MARK: - Signal Strength

    private var signalStrengthSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            SectionHeaderView(title: "Signal Strength")

            VStack(spacing: 16) {
                HStack(spacing: 12) {
                    HStack(alignment: .bottom, spacing: 3) {
                        ForEach(0..<5, id: \.self) { index in
                            RoundedRectangle(cornerRadius: 2)
                                .fill(Double(index + 1) * 0.2 <= (vm.signalQuality > 0 ? vm.signalQuality : 0) + 0.1 ? signalQualityColor : AppColors.border)
                                .frame(width: 12, height: CGFloat(10 + index * 8))
                        }
                    }
                    Text(signalQualityLabel)
                        .font(.headline)
                        .foregroundStyle(AppColors.text)
                }
                .frame(maxWidth: .infinity)

                Text("Signal quality affects the accuracy of heart rate and respiratory rate measurements. Ensure proper contact between the pet and the bed for best results.")
                    .font(.caption)
                    .foregroundStyle(AppColors.textSecondary)
                    .multilineTextAlignment(.center)
            }
            .padding(16)
            .background(AppColors.card)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
        }
    }

    // MARK: - Calibration

    private var calibrationSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            SectionHeaderView(title: "Calibration")

            VStack(spacing: 12) {
                Text("Calibrate sensors for accurate measurements. Ensure the bed is properly set up before calibrating.")
                    .font(.subheadline)
                    .foregroundStyle(AppColors.textSecondary)

                PrimaryButton(title: isTaring ? "Taring..." : "Tare Weight", loading: isTaring, disabled: !isConnected) {
                    isTaring = true
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                        isTaring = false
                    }
                }

                PrimaryButton(title: "Calibrate Weight", variant: .secondary, disabled: !isConnected) {
                    showWeightCalibration = true
                }

                PrimaryButton(title: "Calibrate Temperature", variant: .outline, disabled: !isConnected) {
                    showTempCalibration = true
                }
            }
            .padding(16)
            .background(AppColors.card)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
        }
        .sheet(isPresented: $showWeightCalibration) {
            calibrationSheet(type: "weight")
        }
        .sheet(isPresented: $showTempCalibration) {
            calibrationSheet(type: "temperature")
        }
    }

    private func calibrationSheet(type: String) -> some View {
        NavigationStack {
            VStack(spacing: 20) {
                Text(type == "weight" ? "Calibrate Weight" : "Calibrate Temperature")
                    .font(.title2.weight(.semibold))

                Text(type == "weight"
                     ? "Place a known weight on the bed and enter the actual weight in \(vm.weightUnitLabel). This will adjust the calibration factor."
                     : "Enter the temperature offset in \(vm.temperatureUnitLabel) to correct sensor readings. Use a reference thermometer for accuracy.")
                    .font(.subheadline)
                    .foregroundStyle(AppColors.textSecondary)
                    .multilineTextAlignment(.center)

                TextField(type == "weight" ? "Known weight (\(vm.weightUnitLabel))" : "Temperature offset (\(vm.temperatureUnitLabel))", text: $calibrationValue)
                    .keyboardType(.decimalPad)
                    .textFieldStyle(.roundedBorder)
                    .padding(.horizontal)

                HStack(spacing: 12) {
                    PrimaryButton(title: "Cancel", variant: .outline) {
                        showWeightCalibration = false
                        showTempCalibration = false
                        calibrationValue = ""
                    }
                    PrimaryButton(title: "Calibrate") {
                        showWeightCalibration = false
                        showTempCalibration = false
                        calibrationValue = ""
                    }
                }
                .padding(.horizontal)

                Spacer()
            }
            .padding(24)
        }
        .presentationDetents([.medium])
    }

    // MARK: - Transport Config

    private var transportConfigSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            SectionHeaderView(title: "Connection Settings")

            VStack(spacing: 0) {
                // Transport picker
                HStack {
                    Text("Transport")
                        .foregroundStyle(AppColors.text)
                    Spacer()
                    Picker("Transport", selection: $vm.selectedTransport) {
                        ForEach(TransportType.allCases) { type in
                            Text(type.label).tag(type)
                        }
                    }
                    .pickerStyle(.segmented)
                    .frame(width: 160)
                }
                .padding(16)

                Divider().padding(.leading, 16)

                if vm.selectedTransport == .mqtt {
                    configRow(label: "Host", value: vm.brokerHost)
                    Divider().padding(.leading, 16)
                    configRow(label: "Port", value: "\(vm.brokerPort)")
                    Divider().padding(.leading, 16)
                    configRow(label: "MAC", value: vm.macAddress)
                } else {
                    // BLE scanning section
                    if vm.isBLEScanning {
                        HStack {
                            ProgressView()
                                .padding(.trailing, 4)
                            Text("Scanning for devices...")
                                .font(.subheadline)
                                .foregroundStyle(AppColors.textSecondary)
                        }
                        .padding(16)
                    }

                    ForEach(vm.discoveredPeripherals) { peripheral in
                        Button {
                            vm.selectBLEPeripheral(id: peripheral.id)
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(peripheral.name)
                                        .font(.body.weight(.medium))
                                        .foregroundStyle(AppColors.text)
                                    Text(peripheral.id.uuidString)
                                        .font(.caption2.monospaced())
                                        .foregroundStyle(AppColors.textSecondary)
                                        .lineLimit(1)
                                }
                                Spacer()
                                rssiView(peripheral.rssi)
                            }
                            .padding(16)
                        }
                    }

                    Button {
                        if vm.isBLEScanning { vm.stopBLEScan() } else { vm.startBLEScan() }
                    } label: {
                        Label(
                            vm.isBLEScanning ? "Stop Scan" : "Scan for Devices",
                            systemImage: vm.isBLEScanning ? "stop.circle" : "magnifyingglass"
                        )
                        .foregroundStyle(AppColors.primary)
                        .padding(16)
                    }
                }
            }
            .background(AppColors.card)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
        }
    }

    private func configRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .foregroundStyle(AppColors.textSecondary)
            Spacer()
            Text(value)
                .font(.system(.body, design: .monospaced))
                .foregroundStyle(AppColors.text)
        }
        .padding(16)
    }

    // MARK: - Device Info

    private var deviceInfoSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            SectionHeaderView(title: "Device Information")

            VStack(spacing: 0) {
                infoSectionRow(label: "Firmware Version:", value: vm.hardwareStatus.firmwareVersion)
                Divider().padding(.leading, 16)
                infoSectionRow(label: "Battery Level:", value: vm.hardwareStatus.batteryLevel.map { "\($0)%" } ?? "N/A (Plugged In)")
                Divider().padding(.leading, 16)
                infoSectionRow(label: "Data Sync:", value: "UGA SensorWeb")
            }
            .background(AppColors.card)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
        }
    }

    private func infoSectionRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(AppColors.textSecondary)
            Spacer()
            Text(value)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(AppColors.text)
        }
        .padding(16)
    }

    // MARK: - Helpers

    private func infoRow(label: String, value: String, valueColor: Color = AppColors.text) -> some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(AppColors.textSecondary)
            Spacer()
            Text(value)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(valueColor)
        }
    }

    private var signalQualityLabel: String {
        if vm.signalQuality >= 0.8 { return "Excellent" }
        if vm.signalQuality >= 0.6 { return "Good" }
        if vm.signalQuality >= 0.4 { return "Fair" }
        if vm.signalQuality > 0 { return "Poor" }
        return "Unknown"
    }

    private var signalQualityColor: Color {
        if vm.signalQuality >= 0.8 { return AppColors.success }
        if vm.signalQuality >= 0.6 { return AppColors.primary }
        if vm.signalQuality >= 0.4 { return AppColors.warning }
        if vm.signalQuality > 0 { return AppColors.error }
        return AppColors.textSecondary
    }

    private func rssiView(_ rssi: Int) -> some View {
        HStack(spacing: 2) {
            ForEach(0..<4, id: \.self) { bar in
                RoundedRectangle(cornerRadius: 1)
                    .fill(rssiBarColor(rssi: rssi, bar: bar))
                    .frame(width: 3, height: CGFloat(6 + bar * 4))
            }
        }
    }

    private func rssiBarColor(rssi: Int, bar: Int) -> Color {
        let strength: Int
        if rssi > -50 { strength = 4 }
        else if rssi > -65 { strength = 3 }
        else if rssi > -80 { strength = 2 }
        else { strength = 1 }
        return bar < strength ? AppColors.success : AppColors.border
    }
}
