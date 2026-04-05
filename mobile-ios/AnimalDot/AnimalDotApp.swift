import SwiftUI

@main
struct AnimalDotApp: App {
    @StateObject private var vm = VitalsViewModel()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(vm)
                .onChange(of: scenePhase) { phase in
                    if phase == .background {
                        vm.appDidEnterBackground()
                    }
                }
                .onAppear {
                    vm.requestNotificationPermission()
                }
        }
    }
}
