import SwiftUI

struct DeviceSetupView: View {
    @EnvironmentObject var vm: VitalsViewModel
    @State private var portText: String = ""

    var body: some View {
        NavigationStack {
            Form {
                // MARK: Transport picker
                Section {
                    Picker("Transport", selection: $vm.selectedTransport) {
                        ForEach(TransportType.allCases) { type in
                            Text(type.label).tag(type)
                        }
                    }
                    .pickerStyle(.segmented)
                } header: {
                    Text("Connection Type")
                }

                // MARK: MQTT config
                if vm.selectedTransport == .mqtt {
                    Section {
                        HStack {
                            Text("Host")
                                .foregroundStyle(.secondary)
                                .frame(width: 60, alignment: .leading)
                            TextField("sensorweb.us", text: $vm.brokerHost)
                                .textContentType(.URL)
                                .autocorrectionDisabled()
                                .textInputAutocapitalization(.never)
                        }
                        HStack {
                            Text("Port")
                                .foregroundStyle(.secondary)
                                .frame(width: 60, alignment: .leading)
                            TextField("1883", text: $portText)
                                .keyboardType(.numberPad)
                                .onAppear { portText = String(vm.brokerPort) }
                                .onChange(of: portText) { val in
                                    if let p = UInt16(val) { vm.brokerPort = p }
                                }
                        }
                        HStack {
                            Text("MAC")
                                .foregroundStyle(.secondary)
                                .frame(width: 60, alignment: .leading)
                            TextField("3030f9723ae8", text: $vm.macAddress)
                                .autocorrectionDisabled()
                                .textInputAutocapitalization(.never)
                                .font(.system(.body, design: .monospaced))
                        }
                    } header: {
                        Text("MQTT Broker")
                    } footer: {
                        Text("Topic: /sensorweb/\(vm.macAddress)/geophone")
                            .font(.caption2)
                    }
                }

                // MARK: BLE config
                if vm.selectedTransport == .ble {
                    Section {
                        HStack {
                            Text("Char UUID")
                                .foregroundStyle(.secondary)
                            Spacer()
                            TextField("Notify UUID", text: $vm.bleCharacteristicUUID)
                                .multilineTextAlignment(.trailing)
                                .autocorrectionDisabled()
                                .textInputAutocapitalization(.never)
                                .font(.system(.caption, design: .monospaced))
                                .frame(maxWidth: 240)
                        }
                    } header: {
                        Text("BLE Characteristic")
                    } footer: {
                        Text("Set the notify characteristic UUID from your BedDot device.")
                    }

                    Section {
                        if vm.isBLEScanning {
                            HStack {
                                ProgressView()
                                    .padding(.trailing, 4)
                                Text("Scanning for devices...")
                                    .foregroundStyle(.secondary)
                            }
                        }

                        if vm.discoveredPeripherals.isEmpty && !vm.isBLEScanning {
                            Text("No devices found. Tap Scan to search.")
                                .foregroundStyle(.secondary)
                                .font(.subheadline)
                        }

                        ForEach(vm.discoveredPeripherals) { peripheral in
                            Button {
                                vm.selectBLEPeripheral(id: peripheral.id)
                            } label: {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(peripheral.name)
                                            .font(.body.weight(.medium))
                                            .foregroundStyle(.primary)
                                        Text(peripheral.id.uuidString)
                                            .font(.system(.caption2, design: .monospaced))
                                            .foregroundStyle(.secondary)
                                            .lineLimit(1)
                                    }
                                    Spacer()
                                    rssiView(peripheral.rssi)
                                }
                            }
                        }

                        Button {
                            if vm.isBLEScanning {
                                vm.stopBLEScan()
                            } else {
                                vm.startBLEScan()
                            }
                        } label: {
                            Label(
                                vm.isBLEScanning ? "Stop Scan" : "Scan for Devices",
                                systemImage: vm.isBLEScanning ? "stop.circle" : "magnifyingglass"
                            )
                        }
                    } header: {
                        Text("Nearby Peripherals")
                    }
                }

                // MARK: Connection status & button
                Section {
                    HStack {
                        Text("Status")
                        Spacer()
                        HStack(spacing: 6) {
                            Circle()
                                .fill(statusColor)
                                .frame(width: 8, height: 8)
                            Text(vm.connectionState.rawValue.capitalized)
                                .foregroundStyle(.secondary)
                        }
                    }

                    Button(role: vm.connectionState == .disconnected ? nil : .destructive) {
                        if vm.connectionState == .disconnected {
                            vm.connectTransport()
                        } else {
                            vm.disconnectTransport()
                        }
                    } label: {
                        HStack {
                            Spacer()
                            if vm.connectionState == .connecting {
                                ProgressView()
                                    .padding(.trailing, 6)
                            }
                            Text(connectButtonLabel)
                                .fontWeight(.semibold)
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle("Device Setup")
        }
    }

    // MARK: - Helpers

    private var statusColor: Color {
        switch vm.connectionState {
        case .connected: return .green
        case .connecting: return .yellow
        case .disconnected: return .red
        }
    }

    private var connectButtonLabel: String {
        switch vm.connectionState {
        case .connected: return "Disconnect"
        case .connecting: return "Connecting..."
        case .disconnected: return "Connect"
        }
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
        return bar < strength ? .green : .gray.opacity(0.3)
    }
}
