import SwiftUI

struct HistoryView: View {
    @EnvironmentObject var vm: VitalsViewModel

    var body: some View {
        NavigationStack {
            Group {
                if vm.sessions.isEmpty {
                    emptyState
                } else {
                    sessionList
                }
            }
            .navigationTitle("History")
        }
    }

    // MARK: - Empty state

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "clock")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text("No sessions yet")
                .font(.title3.weight(.semibold))
                .foregroundStyle(.primary)
            Text("Sessions are recorded when you connect\nto your BedDot and start monitoring.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }

    // MARK: - Session list

    private var sessionList: some View {
        List {
            ForEach(vm.sessions) { session in
                sessionRow(session)
            }
            .onDelete { offsets in
                vm.sessions.remove(atOffsets: offsets)
            }
        }
        .listStyle(.insetGrouped)
    }

    private func sessionRow(_ session: SessionRecord) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            // Date and duration
            HStack {
                Text(session.startDate, style: .date)
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Text(durationString(from: session.startDate, to: session.endDate))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(.secondary.opacity(0.12))
                    .clipShape(Capsule())
            }

            // Time range
            HStack(spacing: 4) {
                Image(systemName: "clock")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Text("\(session.startDate, style: .time) – \(session.endDate, style: .time)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            // Metrics
            HStack(spacing: 20) {
                metricBadge(
                    icon: "heart.fill",
                    value: "\(Int(session.avgBPM))",
                    unit: "BPM",
                    color: .red
                )
                metricBadge(
                    icon: "lungs.fill",
                    value: "\(Int(session.avgRPM))",
                    unit: "BrPM",
                    color: .cyan
                )
                Spacer()
                Text("\(session.sampleCount) samples")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }

    private func metricBadge(icon: String, value: String, unit: String, color: Color) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundStyle(color)
            Text(value)
                .font(.subheadline.weight(.bold).monospacedDigit())
                .foregroundStyle(color)
            Text(unit)
                .font(.caption2)
                .foregroundStyle(color.opacity(0.7))
        }
    }

    // MARK: - Duration

    private func durationString(from start: Date, to end: Date) -> String {
        let seconds = Int(end.timeIntervalSince(start))
        if seconds < 60 { return "\(seconds)s" }
        let minutes = seconds / 60
        let remainingSeconds = seconds % 60
        if minutes < 60 { return "\(minutes)m \(remainingSeconds)s" }
        let hours = minutes / 60
        let remainingMinutes = minutes % 60
        return "\(hours)h \(remainingMinutes)m"
    }
}
