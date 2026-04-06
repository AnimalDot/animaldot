import SwiftUI
import UniformTypeIdentifiers

struct SettingsView: View {
    @EnvironmentObject var vm: VitalsViewModel
    @State private var editField: EditField? = nil
    @State private var editValue = ""
    @State private var showExportSheet = false
    @State private var exportText = ""
    @State private var showClearHistoryAlert = false
    @State private var showLogoutAlert = false
    @State private var showDeleteAccountAlert = false
    @State private var showTerms = false
    @State private var showPrivacy = false
    @State private var showAppInfo = false

    enum EditField: Identifiable {
        case petName, breed, age, baselineWeight, medicalNotes
        var id: Self { self }
    }

    var body: some View {
        NavigationStack {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 16) {
                    accountSection
                    petProfileSection
                    preferencesSection
                    dataSection
                    bluetoothSection
                    aboutSection
                    logoutSection
                }
                .padding(16)
                .padding(.bottom, 32)
            }
            .background(AppColors.background)
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(AppColors.background, for: .navigationBar)
            .sheet(item: $editField) { field in
                editSheet(for: field)
            }
            .sheet(isPresented: $showExportSheet) {
                ShareSheet(text: exportText)
            }
            .sheet(isPresented: $showTerms) { TermsModalView() }
            .alert("Clear History", isPresented: $showClearHistoryAlert) {
                Button("Cancel", role: .cancel) {}
                Button("Clear", role: .destructive) {
                    vm.clearHistory()
                }
            } message: {
                Text("Are you sure you want to clear all historical data? This action cannot be undone.")
            }
            .alert("Log Out", isPresented: $showLogoutAlert) {
                Button("Cancel", role: .cancel) {}
                Button("Log Out", role: .destructive) { vm.logout() }
            } message: {
                Text("Are you sure you want to log out?")
            }
            .alert("Delete Account", isPresented: $showDeleteAccountAlert) {
                Button("Cancel", role: .cancel) {}
                Button("Delete", role: .destructive) {}
            } message: {
                Text("To delete your account, please contact support@animaldot.com")
            }
            .alert("AnimalDot", isPresented: $showAppInfo) {
                Button("OK") {}
            } message: {
                Text("Version 1.0.0\n\nDeveloped by the UGA Capstone Team:\nBryce, Caleb, Colby, Grant, Jalen, Naman\n\nAdvisors:\nDr. Peter Kner, Dr. Jorge Rodriguez\n\nSponsors:\nDr. Ben Brainard, Dr. Wenzhan Song\n\n\u{00A9} 2026 University of Georgia")
            }
        }
    }

    // MARK: - Account Section

    private var accountSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            SectionHeaderView(title: "Account")
            VStack(spacing: 0) {
                SettingRowView(
                    icon: "\u{1F464}",
                    title: vm.currentUser?.name ?? "User",
                    subtitle: vm.currentUser?.email ?? "user@animaldot.com"
                )
                settingDivider
                SettingRowView(icon: "\u{1F510}", title: "Change Password") {}
            }
            .settingsCard()
        }
    }

    // MARK: - Pet Profile Section

    private var petProfileSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            SectionHeaderView(title: "Pet Profile")
            VStack(spacing: 0) {
                SettingRowView(icon: "\u{1F415}", title: "Pet Name", subtitle: vm.petProfile.name.isEmpty ? "Not set" : vm.petProfile.name) {
                    editValue = vm.petProfile.name
                    editField = .petName
                }
                settingDivider
                SettingRowView(icon: "\u{1F3F7}\u{FE0F}", title: "Breed", subtitle: vm.petProfile.breed.isEmpty ? "Not set" : vm.petProfile.breed) {
                    editValue = vm.petProfile.breed
                    editField = .breed
                }
                settingDivider
                SettingRowView(icon: "\u{1F382}", title: "Age", subtitle: vm.petProfile.age > 0 ? "\(vm.petProfile.age) years" : "Not set") {
                    editValue = vm.petProfile.age > 0 ? "\(vm.petProfile.age)" : ""
                    editField = .age
                }
                settingDivider
                SettingRowView(icon: "\u{2696}\u{FE0F}", title: "Baseline Weight", subtitle: baselineWeightSubtitle) {
                    let display = vm.weightForDisplay(vm.petProfile.baselineWeight)
                    editValue = display.map { $0 > 0 ? String(format: "%.1f", $0) : "" } ?? ""
                    editField = .baselineWeight
                }
                settingDivider
                SettingRowView(icon: "\u{1F4DD}", title: "Medical Notes", subtitle: vm.petProfile.medicalNotes.isEmpty ? "No notes" : vm.petProfile.medicalNotes) {
                    editValue = vm.petProfile.medicalNotes
                    editField = .medicalNotes
                }
            }
            .settingsCard()
        }
    }

    private var baselineWeightSubtitle: String {
        let display = vm.weightForDisplay(vm.petProfile.baselineWeight)
        if let d = display, d > 0 {
            return "\(String(format: "%.1f", d)) \(vm.weightUnitLabel)"
        }
        return "Not set"
    }

    // MARK: - Preferences Section

    private var preferencesSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            SectionHeaderView(title: "Preferences")
            VStack(spacing: 0) {
                SettingRowView(
                    icon: "\u{2696}\u{FE0F}",
                    title: "Weight Units",
                    subtitle: vm.appSettings.weightUnit == .lbs ? "Pounds (lbs)" : "Kilograms (kg)",
                    showChevron: false
                ) {
                    Toggle("", isOn: Binding(
                        get: { vm.appSettings.weightUnit == .kg },
                        set: { vm.appSettings.weightUnit = $0 ? .kg : .lbs }
                    )).tint(AppColors.primary)
                }
                settingDivider
                SettingRowView(
                    icon: "\u{1F321}\u{FE0F}",
                    title: "Temperature Units",
                    subtitle: vm.appSettings.temperatureUnit == .celsius ? "Celsius (\u{00B0}C)" : "Fahrenheit (\u{00B0}F)",
                    showChevron: false
                ) {
                    Toggle("", isOn: Binding(
                        get: { vm.appSettings.temperatureUnit == .celsius },
                        set: { vm.appSettings.temperatureUnit = $0 ? .celsius : .fahrenheit }
                    )).tint(AppColors.primary)
                }
                settingDivider
                SettingRowView(
                    icon: "\u{1F514}",
                    title: "Notifications",
                    subtitle: "Alert when vitals are abnormal",
                    showChevron: false
                ) {
                    Toggle("", isOn: $vm.appSettings.notificationsEnabled)
                        .tint(AppColors.primary)
                }
                settingDivider
                SettingRowView(
                    icon: "\u{1F4F6}",
                    title: "Auto-connect",
                    subtitle: "Automatically connect to last device",
                    showChevron: false
                ) {
                    Toggle("", isOn: $vm.appSettings.bluetoothAutoConnect)
                        .tint(AppColors.primary)
                }
            }
            .settingsCard()
        }
    }

    // MARK: - Data Section

    private var dataSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            SectionHeaderView(title: "Data")
            VStack(spacing: 0) {
                SettingRowView(icon: "\u{1F4E4}", title: "Export Data", subtitle: "Download your pet's health data") {
                    handleExport()
                }
                settingDivider
                SettingRowView(icon: "\u{1F5D1}\u{FE0F}", title: "Clear History", subtitle: "Remove all historical data") {
                    showClearHistoryAlert = true
                }
            }
            .settingsCard()
        }
    }

    // MARK: - Bluetooth Section

    private var bluetoothSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            SectionHeaderView(title: "Bluetooth")
            VStack(spacing: 0) {
                SettingRowView(icon: "\u{1F4E1}", title: "Bluetooth Settings", subtitle: "Manage device connections") {}
            }
            .settingsCard()
        }
    }

    // MARK: - About Section

    private var aboutSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            SectionHeaderView(title: "About")
            VStack(spacing: 0) {
                SettingRowView(icon: "\u{2139}\u{FE0F}", title: "App Information", subtitle: "Version 1.0.0") {
                    showAppInfo = true
                }
                settingDivider
                SettingRowView(icon: "\u{1F512}", title: "Privacy Policy") {
                    showTerms = true
                }
                settingDivider
                SettingRowView(icon: "\u{1F4C4}", title: "Terms of Service") {
                    showTerms = true
                }
            }
            .settingsCard()
        }
    }

    // MARK: - Logout

    private var logoutSection: some View {
        VStack(spacing: 16) {
            PrimaryButton(title: "Log Out", variant: .outline) {
                showLogoutAlert = true
            }

            Button {
                showDeleteAccountAlert = true
            } label: {
                Text("Delete Account")
                    .font(.subheadline)
                    .foregroundStyle(AppColors.error)
            }
        }
        .padding(.top, 8)
    }

    // MARK: - Export

    private func handleExport() {
        guard vm.hasExportData else { return }
        exportText = vm.exportCSV()
        showExportSheet = true
    }

    // MARK: - Divider helper

    private var settingDivider: some View {
        Divider().padding(.leading, 64)
    }

    // MARK: - Edit Sheet

    private func editSheet(for field: EditField) -> some View {
        NavigationStack {
            VStack(spacing: 20) {
                Text(editTitle(for: field))
                    .font(.title2.weight(.semibold))

                if field == .medicalNotes {
                    TextEditor(text: $editValue)
                        .frame(height: 100)
                        .padding(4)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppColors.border))
                } else {
                    TextField(editPlaceholder(for: field), text: $editValue)
                        .textFieldStyle(.roundedBorder)
                        .keyboardType(field == .age || field == .baselineWeight ? .decimalPad : .default)
                }

                HStack(spacing: 12) {
                    PrimaryButton(title: "Cancel", variant: .outline) { editField = nil }
                    PrimaryButton(title: "Save") {
                        saveEdit(field: field)
                        editField = nil
                    }
                }

                Spacer()
            }
            .padding(24)
        }
        .presentationDetents([.medium])
    }

    private func editTitle(for field: EditField) -> String {
        switch field {
        case .petName: return "Edit Pet Name"
        case .breed: return "Edit Breed"
        case .age: return "Edit Age"
        case .baselineWeight: return "Edit Baseline Weight"
        case .medicalNotes: return "Edit Medical Notes"
        }
    }

    private func editPlaceholder(for field: EditField) -> String {
        switch field {
        case .petName: return "Enter pet name"
        case .breed: return "Enter breed"
        case .age: return "Enter age in years"
        case .baselineWeight: return "Enter weight (\(vm.weightUnitLabel))"
        case .medicalNotes: return "Enter medical notes"
        }
    }

    private func saveEdit(field: EditField) {
        var profile = vm.petProfile
        switch field {
        case .petName: profile.name = editValue.trimmingCharacters(in: .whitespaces)
        case .breed: profile.breed = editValue.trimmingCharacters(in: .whitespaces)
        case .age: profile.age = Int(editValue) ?? profile.age
        case .baselineWeight:
            let val = Double(editValue) ?? 0
            profile.baselineWeight = vm.appSettings.weightUnit == .kg ? val / 0.453592 : val
        case .medicalNotes: profile.medicalNotes = editValue.trimmingCharacters(in: .whitespaces)
        }
        profile.updatedAt = Date()
        vm.petProfile = profile
    }
}

// MARK: - Settings Card Modifier

extension View {
    func settingsCard() -> some View {
        self
            .background(AppColors.card)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

// MARK: - Share Sheet (UIActivityViewController)

struct ShareSheet: UIViewControllerRepresentable {
    let text: String

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: [text], applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
