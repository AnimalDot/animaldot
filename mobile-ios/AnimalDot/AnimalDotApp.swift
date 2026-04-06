import SwiftUI

@main
struct AnimalDotApp: App {
    @StateObject private var vm = VitalsViewModel()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(vm)
                .onChange(of: scenePhase) { phase in
                    if phase == .background {
                        vm.appDidEnterBackground()
                    }
                }
                .onAppear {
                    vm.requestNotificationPermission()
                    vm.onAppLaunch()
                }
        }
    }
}

// MARK: - Root Navigation View

struct RootView: View {
    @EnvironmentObject var vm: VitalsViewModel

    var body: some View {
        Group {
            switch vm.currentScreen {
            case .splash:
                SplashView()
                    .transition(.opacity)

            case .auth:
                AuthView()
                    .transition(.move(edge: .trailing))

            case .devicePairing:
                DevicePairingView()
                    .transition(.move(edge: .trailing))

            case .petProfile:
                NavigationStack {
                    PetProfileSetupView()
                }
                .transition(.move(edge: .trailing))

            case .main:
                ContentView()
                    .transition(.move(edge: .trailing))
            }
        }
        .animation(.easeInOut(duration: 0.3), value: vm.currentScreen)
    }
}

// Make AppScreen Equatable for animation
extension VitalsViewModel.AppScreen: Equatable {}
