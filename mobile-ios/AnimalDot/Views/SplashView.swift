import SwiftUI

struct SplashView: View {
    var body: some View {
        ZStack {
            AppColors.primary.ignoresSafeArea()

            VStack(spacing: 24) {
                Spacer()

                // Logo
                ZStack {
                    Circle()
                        .fill(.white.opacity(0.2))
                        .frame(width: 120, height: 120)
                    Circle()
                        .fill(.white.opacity(0.3))
                        .frame(width: 80, height: 80)
                }

                Text("AnimalDot")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundStyle(.white)

                Text("Smart Animal Bed Monitoring")
                    .font(.body)
                    .foregroundStyle(.white.opacity(0.8))

                Spacer()

                ProgressView()
                    .tint(.white)
                    .scaleEffect(1.2)

                Text("Loading...")
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.8))

                Spacer()
                    .frame(height: 48)
            }
        }
    }
}
