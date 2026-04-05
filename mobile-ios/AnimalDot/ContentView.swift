import SwiftUI

struct ContentView: View {
    @EnvironmentObject var vm: VitalsViewModel

    var body: some View {
        TabView {
            LiveMonitorView()
                .tabItem {
                    Label("Live", systemImage: "waveform.path.ecg")
                }

            DeviceSetupView()
                .tabItem {
                    Label("Device", systemImage: "antenna.radiowaves.left.and.right")
                }

            HistoryView()
                .tabItem {
                    Label("History", systemImage: "clock.arrow.circlepath")
                }

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape")
                }
        }
        .tint(.red)
    }
}
