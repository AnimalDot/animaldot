import SwiftUI

struct DevicePairingView: View {
    @EnvironmentObject var vm: VitalsViewModel
    @State private var connecting = false
    @State private var selectedDeviceId: UUID? = nil

    var body: some View {
        VStack(spacing: 0) {
            // Pairing bar when connecting
            if connecting, let name = selectedDeviceName {
                HStack(spacing: 10) {
                    ProgressView().tint(.white)
                    Text("Pairing to \(name)\u{2026}")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(AppColors.primary)
            }

            ScrollView {
                VStack(spacing: 24) {
                    // Instructions
                    Text("Connect to AnimalDot Bed")
                        .font(.title2.weight(.bold))
                        .foregroundStyle(AppColors.text)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    if !vm.blePermissionReady {
                        VStack(spacing: 16) {
                            Text("Requesting Bluetooth access\u{2026}")
                                .font(.body)
                                .foregroundStyle(AppColors.textSecondary)
                            ProgressView()
                                .tint(AppColors.primary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 48)
                    } else if vm.discoveredPeripherals.isEmpty && !vm.isBLEScanning {
                        // Empty state
                        VStack(spacing: 8) {
                            Text("No devices found")
                                .font(.headline)
                                .foregroundStyle(AppColors.text)
                            Text("Make sure your AnimalDot bed is powered on and tap Scan")
                                .font(.subheadline)
                                .foregroundStyle(AppColors.textMuted)
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 48)
                    } else {
                        // Device list
                        VStack(spacing: 12) {
                            ForEach(vm.discoveredPeripherals) { peripheral in
                                deviceRow(peripheral)
                            }
                        }
                    }

                    if vm.isBLEScanning {
                        HStack(spacing: 8) {
                            ProgressView()
                            Text("Scanning for devices...")
                                .font(.subheadline)
                                .foregroundStyle(AppColors.textSecondary)
                        }
                    }

                    // Scan button
                    PrimaryButton(
                        title: vm.isBLEScanning ? "Scanning\u{2026}" : "Scan for devices",
                        loading: vm.isBLEScanning,
                        disabled: connecting
                    ) {
                        vm.startBLEScan()
                    }

                    Text("Make sure the smart bed is powered on and Bluetooth is on")
                        .font(.caption)
                        .foregroundStyle(AppColors.textMuted)
                        .multilineTextAlignment(.center)

                    PrimaryButton(title: "Use Dev Mode (Wi-Fi)", variant: .outline) {
                        vm.skipDevicePairing()
                    }
                }
                .padding(24)
            }
        }
        .background(AppColors.background)
        .overlay {
            if connecting {
                LoadingOverlayView(message: selectedDeviceName.map { "Connecting to \($0)\u{2026}" } ?? "Connecting\u{2026}")
            }
        }
    }

    private var selectedDeviceName: String? {
        guard let id = selectedDeviceId else { return nil }
        return vm.discoveredPeripherals.first { $0.id == id }?.name ?? "AnimalDot Bed"
    }

    private func deviceRow(_ peripheral: BLEService.DiscoveredPeripheral) -> some View {
        Button {
            handleConnect(peripheral)
        } label: {
            HStack(spacing: 16) {
                // Icon
                Text("\u{1F6CF}\u{FE0F}")
                    .font(.title2)
                    .frame(width: 48, height: 48)
                    .background(AppColors.primary.opacity(0.12))
                    .clipShape(Circle())

                VStack(alignment: .leading, spacing: 4) {
                    Text(peripheral.name)
                        .font(.body.weight(.semibold))
                        .foregroundStyle(AppColors.text)
                    Text("Signal: \(signalLabel(peripheral.rssi))")
                        .font(.subheadline)
                        .foregroundStyle(AppColors.textMuted)
                }

                Spacer()

                if selectedDeviceId == peripheral.id && connecting {
                    Text("Connecting...")
                        .font(.subheadline)
                        .foregroundStyle(AppColors.primary)
                }
            }
            .padding(16)
            .background(AppColors.card)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(selectedDeviceId == peripheral.id ? AppColors.primary : .clear, lineWidth: 2)
            )
        }
        .disabled(connecting)
    }

    private func signalLabel(_ rssi: Int) -> String {
        if rssi > -60 { return "Strong" }
        if rssi > -80 { return "Good" }
        return "Weak"
    }

    private func handleConnect(_ peripheral: BLEService.DiscoveredPeripheral) {
        selectedDeviceId = peripheral.id
        connecting = true

        vm.selectBLEPeripheral(id: peripheral.id)

        // Give BLE time to connect
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            vm.connectTransport()
            vm.appSettings.lastConnectedDeviceId = peripheral.id.uuidString
            connecting = false
            vm.completeDevicePairing()
        }
    }
}
