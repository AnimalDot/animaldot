import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var vm: VitalsViewModel

    var body: some View {
        NavigationStack {
            Form {
                // MARK: Device
                Section {
                    LabeledContent("MAC Address") {
                        Text(vm.macAddress)
                            .font(.system(.body, design: .monospaced))
                            .foregroundStyle(.secondary)
                    }
                    LabeledContent("Broker") {
                        Text("\(vm.brokerHost):\(vm.brokerPort)")
                            .foregroundStyle(.secondary)
                    }
                    LabeledContent("Transport") {
                        Text(vm.selectedTransport.label)
                            .foregroundStyle(.secondary)
                    }
                } header: {
                    Text("Device")
                } footer: {
                    Text("Change connection settings in the Device tab.")
                }

                // MARK: Heart rate alerts
                Section {
                    HStack {
                        Image(systemName: "heart.fill")
                            .foregroundStyle(.red)
                            .frame(width: 24)
                        Text("Low BPM")
                        Spacer()
                        TextField("40", value: $vm.hrAlertLow, format: .number)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 60)
                    }
                    HStack {
                        Image(systemName: "heart.fill")
                            .foregroundStyle(.red)
                            .frame(width: 24)
                        Text("High BPM")
                        Spacer()
                        TextField("120", value: $vm.hrAlertHigh, format: .number)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 60)
                    }
                } header: {
                    Text("Heart Rate Alerts")
                } footer: {
                    Text("You will be notified when heart rate goes below \(Int(vm.hrAlertLow)) or above \(Int(vm.hrAlertHigh)) BPM.")
                }

                // MARK: Respiratory rate alerts
                Section {
                    HStack {
                        Image(systemName: "lungs.fill")
                            .foregroundStyle(.cyan)
                            .frame(width: 24)
                        Text("Low BrPM")
                        Spacer()
                        TextField("10", value: $vm.rrAlertLow, format: .number)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 60)
                    }
                    HStack {
                        Image(systemName: "lungs.fill")
                            .foregroundStyle(.cyan)
                            .frame(width: 24)
                        Text("High BrPM")
                        Spacer()
                        TextField("40", value: $vm.rrAlertHigh, format: .number)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 60)
                    }
                } header: {
                    Text("Respiratory Rate Alerts")
                }

                // MARK: Notifications
                Section {
                    Toggle(isOn: $vm.notificationsEnabled) {
                        Label("Enable Notifications", systemImage: "bell.badge")
                    }
                } header: {
                    Text("Notifications")
                } footer: {
                    Text("When enabled, AnimalDot will send a local notification if vitals go outside the alert ranges. Alerts are throttled to at most once per minute.")
                }

                // MARK: About
                Section {
                    LabeledContent("Version", value: "1.0.0")
                    LabeledContent("Build", value: Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1")
                } header: {
                    Text("About")
                } footer: {
                    Text("AnimalDot — Passive pet vital-sign monitoring.\nUniversity of Georgia Capstone Project.")
                }
            }
            .navigationTitle("Settings")
        }
    }
}
