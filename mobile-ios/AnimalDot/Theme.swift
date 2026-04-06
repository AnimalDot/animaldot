import SwiftUI

// MARK: - Color Theme (matches mobile/src/components/UI.tsx)

enum AppColors {
    static let primary = Color(hex: "3A7BFF")
    static let primaryLight = Color(hex: "5B92FF")
    static let primaryDark = Color(hex: "2563EB")
    static let secondary = Color(hex: "D6E4FF")
    static let background = Color(hex: "F5F7FA")
    static let card = Color.white
    static let text = Color(hex: "1F1F1F")
    static let textSecondary = Color(hex: "1F1F1F").opacity(0.7)
    static let textMuted = Color(hex: "1F1F1F").opacity(0.5)
    static let border = Color(hex: "E5E7EB")
    static let success = Color(hex: "3CCB7F")
    static let warning = Color(hex: "FFD568")
    static let error = Color(hex: "FF6E6E")

    // Metric-specific
    static let heartRate = Color(hex: "FF6E6E")
    static let respRate = Color(hex: "3CCB7F")
    static let temperature = Color(hex: "FFD568")
    static let weight = Color(hex: "3A7BFF")
}

// MARK: - Color hex initializer

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: UInt64
        (r, g, b) = ((int >> 16) & 0xFF, (int >> 8) & 0xFF, int & 0xFF)
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: 1
        )
    }
}

// MARK: - Reusable Card View

struct CardView<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .background(AppColors.card)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

// MARK: - Metric Card

struct MetricCardView: View {
    let title: String
    let value: String
    let unit: String
    let subtitle: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.subheadline)
                .foregroundStyle(AppColors.text)

            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(value)
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(color)
                Text(unit)
                    .font(.subheadline)
                    .foregroundStyle(AppColors.text)
            }

            Text(subtitle)
                .font(.caption2)
                .foregroundStyle(AppColors.textMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(AppColors.card)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

// MARK: - Status Badge

struct StatusBadgeView: View {
    let status: String // "connected", "disconnected", "stable", "alert"
    let label: String

    private var color: Color {
        switch status {
        case "connected", "stable": return AppColors.success
        case "alert": return AppColors.warning
        default: return AppColors.textMuted
        }
    }

    var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)
            Text(label)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(color)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(color.opacity(0.15))
        .clipShape(Capsule())
    }
}

// MARK: - Section Header

struct SectionHeaderView: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.headline)
            .foregroundStyle(AppColors.text)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.bottom, 4)
    }
}

// MARK: - Setting Row

struct SettingRowView<Trailing: View>: View {
    let icon: String
    let title: String
    var subtitle: String? = nil
    var showChevron: Bool = true
    var action: (() -> Void)? = nil
    @ViewBuilder var trailing: () -> Trailing

    init(
        icon: String,
        title: String,
        subtitle: String? = nil,
        showChevron: Bool = true,
        action: (() -> Void)? = nil,
        @ViewBuilder trailing: @escaping () -> Trailing = { EmptyView() }
    ) {
        self.icon = icon
        self.title = title
        self.subtitle = subtitle
        self.showChevron = showChevron
        self.action = action
        self.trailing = trailing
    }

    var body: some View {
        Button {
            action?()
        } label: {
            HStack(spacing: 12) {
                Text(icon)
                    .font(.title3)
                    .frame(width: 36, height: 36)
                    .background(AppColors.background)
                    .clipShape(RoundedRectangle(cornerRadius: 8))

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.body)
                        .foregroundStyle(AppColors.text)
                    if let subtitle {
                        Text(subtitle)
                            .font(.caption)
                            .foregroundStyle(AppColors.textSecondary)
                    }
                }

                Spacer()

                trailing()

                if showChevron && action != nil {
                    Image(systemName: "chevron.right")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(AppColors.textMuted)
                }
            }
            .padding(16)
        }
        .buttonStyle(.plain)
        .disabled(action == nil)
    }
}

// MARK: - Primary Button

struct PrimaryButton: View {
    let title: String
    var variant: Variant = .primary
    var loading: Bool = false
    var disabled: Bool = false
    let action: () -> Void

    enum Variant {
        case primary, outline, secondary, destructive
    }

    var body: some View {
        Button(action: action) {
            HStack {
                if loading {
                    ProgressView()
                        .tint(variant == .primary ? .white : AppColors.primary)
                        .padding(.trailing, 4)
                }
                Text(title)
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .padding(.horizontal, 24)
            .background(backgroundColor)
            .foregroundStyle(foregroundColor)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay {
                if variant == .outline {
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(AppColors.primary, lineWidth: 2)
                }
            }
        }
        .disabled(disabled || loading)
        .opacity(disabled ? 0.5 : 1)
    }

    private var backgroundColor: Color {
        switch variant {
        case .primary: return AppColors.primary
        case .outline: return .clear
        case .secondary: return AppColors.secondary
        case .destructive: return AppColors.error
        }
    }

    private var foregroundColor: Color {
        switch variant {
        case .primary, .destructive: return .white
        case .outline: return AppColors.primary
        case .secondary: return AppColors.primary
        }
    }
}
