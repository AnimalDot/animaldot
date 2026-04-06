import SwiftUI

struct PetProfileSetupView: View {
    @EnvironmentObject var vm: VitalsViewModel
    var isEditing: Bool = false

    @State private var name: String = ""
    @State private var breed: String = ""
    @State private var age: String = ""
    @State private var baselineWeight: String = ""
    @State private var medicalNotes: String = ""
    @State private var loading = false
    @State private var errors: [String: String] = [:]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                if !isEditing {
                    Text("Pet Profile")
                        .font(.title2.weight(.bold))
                        .foregroundStyle(AppColors.text)
                        .padding(.bottom, 24)
                }

                InputField(label: "Pet Name", text: $name, placeholder: "e.g., Baxter", error: errors["name"])
                InputField(label: "Breed", text: $breed, placeholder: "e.g., Golden Retriever", error: errors["breed"])
                InputField(label: "Age (years)", text: $age, placeholder: "e.g., 5", keyboardType: .numberPad, error: errors["age"])
                InputField(
                    label: "Weight Baseline (\(vm.weightUnitLabel))",
                    text: $baselineWeight,
                    placeholder: vm.appSettings.weightUnit == .kg ? "e.g., 28" : "e.g., 62",
                    keyboardType: .decimalPad,
                    error: errors["baselineWeight"]
                )
                InputField(label: "Medical Notes", text: $medicalNotes, placeholder: "Any relevant medical information...", multiline: true)

                PrimaryButton(title: "Save Changes", loading: loading) {
                    handleSave()
                }
                .padding(.top, 24)
            }
            .padding(24)
        }
        .background(AppColors.background)
        .navigationTitle(isEditing ? "Edit Pet Profile" : "Pet Profile")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            if isEditing {
                name = vm.petProfile.name
                breed = vm.petProfile.breed
                age = vm.petProfile.age > 0 ? "\(vm.petProfile.age)" : ""
                let display = vm.weightForDisplay(vm.petProfile.baselineWeight)
                baselineWeight = display.map { $0 > 0 ? String(format: "%.1f", $0) : "" } ?? ""
                medicalNotes = vm.petProfile.medicalNotes
            }
        }
        .overlay {
            if loading {
                LoadingOverlayView(message: "Saving...")
            }
        }
    }

    private func handleSave() {
        var newErrors: [String: String] = [:]
        if name.trimmingCharacters(in: .whitespaces).isEmpty { newErrors["name"] = "Pet name is required" }
        if breed.trimmingCharacters(in: .whitespaces).isEmpty { newErrors["breed"] = "Breed is required" }
        if age.isEmpty || Int(age) == nil || (Int(age) ?? -1) < 0 { newErrors["age"] = "Valid age is required" }
        if !baselineWeight.isEmpty, let w = Double(baselineWeight), w < 0 { newErrors["baselineWeight"] = "Invalid weight" }

        errors = newErrors
        guard newErrors.isEmpty else { return }

        loading = true

        let baselineNum = Double(baselineWeight) ?? 0
        let baselineLbs = vm.appSettings.weightUnit == .kg ? baselineNum / 0.453592 : baselineNum

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            var profile = vm.petProfile
            profile.name = name.trimmingCharacters(in: .whitespaces)
            profile.breed = breed.trimmingCharacters(in: .whitespaces)
            profile.age = Int(age) ?? 0
            profile.baselineWeight = baselineLbs
            profile.medicalNotes = medicalNotes.trimmingCharacters(in: .whitespaces)
            profile.updatedAt = Date()
            if !isEditing {
                profile.id = "\(Int(Date().timeIntervalSince1970 * 1000))"
                profile.createdAt = Date()
            }
            vm.petProfile = profile
            vm.completePetProfileSetup()
            loading = false
        }
    }
}
