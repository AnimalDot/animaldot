import SwiftUI

struct ContentView: View {
    @EnvironmentObject var vm: VitalsViewModel

    var body: some View {
        TabView {
            LiveDashboardView()
                .tabItem {
                    Label("Live", systemImage: "heart.fill")
                }

            TrendsView()
                .tabItem {
                    Label("Trends", systemImage: "chart.line.uptrend.xyaxis")
                }

            DeviceStatusView()
                .tabItem {
                    Label("Device", systemImage: "antenna.radiowaves.left.and.right")
                }

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
        }
        .tint(AppColors.primary)
    }
}
