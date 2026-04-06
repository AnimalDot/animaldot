import SwiftUI

// MARK: - Login View

struct AuthView: View {
    @EnvironmentObject var vm: VitalsViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var loading = false
    @State private var errorMessage = ""
    @State private var showCreateAccount = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Text("Welcome Back")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundStyle(AppColors.text)
                        .padding(.bottom, 8)

                    Text("Sign in to your account")
                        .font(.body)
                        .foregroundStyle(AppColors.textSecondary)
                        .padding(.bottom, 32)

                    // Email
                    InputField(label: "Email", text: $email, placeholder: "your@email.com", keyboardType: .emailAddress)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)

                    // Password
                    InputField(label: "Password", text: $password, placeholder: "\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}", isSecure: true)

                    if !errorMessage.isEmpty {
                        Text(errorMessage)
                            .font(.subheadline)
                            .foregroundStyle(AppColors.error)
                            .padding(.bottom, 16)
                    }

                    PrimaryButton(title: "Sign In", loading: loading) {
                        handleLogin()
                    }
                    .padding(.top, 16)
                    .padding(.bottom, 24)

                    // Divider
                    HStack {
                        Rectangle().fill(AppColors.border).frame(height: 1)
                        Text("or").font(.subheadline).foregroundStyle(AppColors.textMuted)
                        Rectangle().fill(AppColors.border).frame(height: 1)
                    }
                    .padding(.bottom, 24)

                    PrimaryButton(title: "Create Account", variant: .outline) {
                        showCreateAccount = true
                    }
                }
                .padding(24)
            }
            .background(AppColors.background)
            .navigationBarHidden(true)
            .navigationDestination(isPresented: $showCreateAccount) {
                CreateAccountView()
            }
            .overlay {
                if loading {
                    LoadingOverlayView(message: "Signing in...")
                }
            }
        }
    }

    private func handleLogin() {
        guard !email.isEmpty, !password.isEmpty else {
            errorMessage = "Please enter email and password"
            return
        }
        loading = true
        errorMessage = ""

        // Simulate network delay, then check local accounts
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            if let user = vm.getAccountByEmail(email) {
                vm.login(user: user)
            } else {
                errorMessage = "No account found with this email. Please create an account."
            }
            loading = false
        }
    }
}

// MARK: - Create Account View

struct CreateAccountView: View {
    @EnvironmentObject var vm: VitalsViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var agreedToTerms = false
    @State private var showTermsModal = false
    @State private var loading = false
    @State private var errors: [String: String] = [:]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                InputField(label: "Name", text: $name, placeholder: "Full Name", error: errors["name"])
                InputField(label: "Email", text: $email, placeholder: "your@email.com", keyboardType: .emailAddress, error: errors["email"])
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                InputField(label: "Password", text: $password, placeholder: "\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}", isSecure: true, error: errors["password"])
                InputField(label: "Confirm Password", text: $confirmPassword, placeholder: "\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}\u{2022}", isSecure: true, error: errors["confirmPassword"])

                // Terms checkbox
                HStack(alignment: .top, spacing: 12) {
                    Button {
                        agreedToTerms.toggle()
                    } label: {
                        RoundedRectangle(cornerRadius: 6)
                            .fill(agreedToTerms ? AppColors.primary : .clear)
                            .frame(width: 24, height: 24)
                            .overlay(
                                RoundedRectangle(cornerRadius: 6)
                                    .stroke(agreedToTerms ? AppColors.primary : AppColors.border, lineWidth: 2)
                            )
                            .overlay {
                                if agreedToTerms {
                                    Image(systemName: "checkmark")
                                        .font(.caption.bold())
                                        .foregroundStyle(.white)
                                }
                            }
                    }

                    HStack(spacing: 0) {
                        Text("I agree to the ")
                            .font(.subheadline)
                            .foregroundStyle(AppColors.text)
                        Button("Terms and Privacy Policy") {
                            showTermsModal = true
                        }
                        .font(.subheadline)
                        .foregroundStyle(AppColors.primary)
                    }
                }
                .padding(.bottom, 16)

                if let termsError = errors["terms"] {
                    Text(termsError)
                        .font(.subheadline)
                        .foregroundStyle(AppColors.error)
                        .padding(.bottom, 16)
                }

                PrimaryButton(title: "Create Account", loading: loading) {
                    handleCreateAccount()
                }
                .padding(.top, 16)
            }
            .padding(24)
        }
        .background(AppColors.background)
        .navigationTitle("Create Account")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showTermsModal) {
            TermsModalView()
        }
        .overlay {
            if loading {
                LoadingOverlayView(message: "Creating account...")
            }
        }
    }

    private func handleCreateAccount() {
        var newErrors: [String: String] = [:]
        if name.trimmingCharacters(in: .whitespaces).isEmpty { newErrors["name"] = "Name is required" }
        if email.trimmingCharacters(in: .whitespaces).isEmpty { newErrors["email"] = "Email is required" }
        else if !email.contains("@") || !email.contains(".") { newErrors["email"] = "Invalid email format" }
        if password.isEmpty { newErrors["password"] = "Password is required" }
        else if password.count < 6 { newErrors["password"] = "Password must be at least 6 characters" }
        if password != confirmPassword { newErrors["confirmPassword"] = "Passwords do not match" }
        if !agreedToTerms { newErrors["terms"] = "You must agree to the terms" }

        errors = newErrors
        guard newErrors.isEmpty else { return }

        loading = true

        let user = AppUser(
            id: "\(Int(Date().timeIntervalSince1970 * 1000))",
            name: name.trimmingCharacters(in: .whitespaces),
            email: email.trimmingCharacters(in: .whitespaces),
            createdAt: Date()
        )

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            vm.registerAccount(user)
            vm.login(user: user)
            loading = false
        }
    }
}

// MARK: - Terms Modal

struct TermsModalView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Terms of Service")
                        .font(.headline)
                        .foregroundStyle(AppColors.text)

                    Text("By using AnimalDot you agree to use the app and smart bed system for personal pet health monitoring only. Do not use this device or data as a substitute for professional veterinary care. You are responsible for the accuracy of information you provide and for keeping your account secure.")
                        .font(.subheadline)
                        .foregroundStyle(AppColors.textSecondary)
                        .lineSpacing(4)

                    Text("AnimalDot may update these terms from time to time. Continued use of the app after changes constitutes acceptance.")
                        .font(.subheadline)
                        .foregroundStyle(AppColors.textSecondary)
                        .lineSpacing(4)

                    Text("Privacy Policy")
                        .font(.headline)
                        .foregroundStyle(AppColors.text)
                        .padding(.top, 8)

                    Text("AnimalDot collects pet health data (heart rate, respiration, temperature, weight) from the smart bed sensor. This data is stored locally on your device unless you choose to export or share it.")
                        .font(.subheadline)
                        .foregroundStyle(AppColors.textSecondary)
                        .lineSpacing(4)

                    Text("We do not sell your data. Data may be used to improve our services and may be shared with your veterinarian or other parties only with your explicit consent. We use industry-standard practices to protect your information.")
                        .font(.subheadline)
                        .foregroundStyle(AppColors.textSecondary)
                        .lineSpacing(4)

                    Text("For questions about privacy or terms, contact support@animaldot.com.")
                        .font(.subheadline)
                        .foregroundStyle(AppColors.textSecondary)
                        .lineSpacing(4)
                }
                .padding(24)
            }
            .navigationTitle("Terms & Privacy Policy")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { dismiss() }
                        .foregroundStyle(AppColors.primary)
                }
            }
        }
    }
}

// MARK: - Reusable Input Field

struct InputField: View {
    let label: String
    @Binding var text: String
    var placeholder: String = ""
    var keyboardType: UIKeyboardType = .default
    var isSecure: Bool = false
    var error: String? = nil
    var multiline: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(AppColors.text)

            if isSecure {
                SecureField(placeholder, text: $text)
                    .textFieldStyle(AppTextFieldStyle(hasError: error != nil))
            } else if multiline {
                TextEditor(text: $text)
                    .frame(minHeight: 100)
                    .padding(8)
                    .background(AppColors.background)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(error != nil ? AppColors.error : AppColors.border, lineWidth: 1)
                    )
            } else {
                TextField(placeholder, text: $text)
                    .keyboardType(keyboardType)
                    .textFieldStyle(AppTextFieldStyle(hasError: error != nil))
            }

            if let error {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(AppColors.error)
            }
        }
        .padding(.bottom, 16)
    }
}

struct AppTextFieldStyle: TextFieldStyle {
    var hasError: Bool = false

    func _body(configuration: TextField<_Label>) -> some View {
        configuration
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(AppColors.background)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(hasError ? AppColors.error : AppColors.border, lineWidth: 1)
            )
    }
}

// MARK: - Loading Overlay

struct LoadingOverlayView: View {
    var message: String? = nil

    var body: some View {
        ZStack {
            Color.white.opacity(0.9)
                .ignoresSafeArea()

            VStack(spacing: 16) {
                ProgressView()
                    .scaleEffect(1.5)
                    .tint(AppColors.primary)
                if let message {
                    Text(message)
                        .font(.body)
                        .foregroundStyle(AppColors.text)
                }
            }
        }
    }
}
