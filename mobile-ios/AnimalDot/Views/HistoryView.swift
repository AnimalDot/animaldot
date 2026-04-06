import SwiftUI
import Charts

struct TrendsView: View {
    @EnvironmentObject var vm: VitalsViewModel
    @State private var timeRange: TimeRange = .day

    enum TimeRange: String, CaseIterable {
        case day = "Day"
        case week = "Week"
    }

    var body: some View {
        NavigationStack {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 16) {
                    timeRangeToggle
                    heartRateChart
                    respirationChart
                    temperatureChart
                    summaryCard
                }
                .padding(16)
            }
            .background(AppColors.background)
            .navigationTitle("Health Trends")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(AppColors.background, for: .navigationBar)
        }
    }

    // MARK: - Time Range Toggle

    private var timeRangeToggle: some View {
        HStack(spacing: 0) {
            ForEach(TimeRange.allCases, id: \.self) { range in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        timeRange = range
                    }
                } label: {
                    Text(range.rawValue)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(timeRange == range ? .white : AppColors.text)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(timeRange == range ? AppColors.primary : Color.clear)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
        }
        .padding(4)
        .background(AppColors.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Chart Data

    private var heartRateData: [DataPoint] {
        let raw = vm.heartRateHistory.isEmpty ? generateSampleData(count: sampleCount, min: 70, max: 100) : filterByTimeRange(vm.heartRateHistory)
        return downsample(raw, to: displayPoints)
    }

    private var respRateData: [DataPoint] {
        let raw = vm.respRateHistory.isEmpty ? generateSampleData(count: sampleCount, min: 18, max: 28) : filterByTimeRange(vm.respRateHistory)
        return downsample(raw, to: displayPoints)
    }

    private var temperatureData: [DataPoint] {
        let raw = vm.temperatureHistory.isEmpty ? generateSampleData(count: sampleCount, min: 100, max: 102) : filterByTimeRange(vm.temperatureHistory)
        let sampled = downsample(raw, to: displayPoints)
        if vm.appSettings.temperatureUnit == .celsius {
            return sampled.map { DataPoint(timestamp: $0.timestamp, value: ($0.value - 32) * 5 / 9) }
        }
        return sampled
    }

    private var sampleCount: Int { timeRange == .day ? 24 : 168 }
    private var displayPoints: Int { timeRange == .day ? 12 : 7 }

    // MARK: - Charts

    private var heartRateChart: some View {
        chartCard(title: "Heart Rate", subtitle: "bpm", data: heartRateData, color: AppColors.heartRate)
    }

    private var respirationChart: some View {
        chartCard(title: "Respiration Rate", subtitle: "rpm", data: respRateData, color: AppColors.respRate)
    }

    private var temperatureChart: some View {
        chartCard(
            title: "Temperature",
            subtitle: vm.appSettings.temperatureUnit == .celsius ? "\u{00B0}C" : "\u{00B0}F",
            data: temperatureData,
            color: AppColors.temperature,
            decimalPlaces: 1
        )
    }

    private func chartCard(title: String, subtitle: String, data: [DataPoint], color: Color, decimalPlaces: Int = 0) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.body.weight(.semibold))
                .foregroundStyle(AppColors.text)
                .padding(.horizontal, 8)
            Text(subtitle)
                .font(.caption)
                .foregroundStyle(AppColors.textMuted)
                .padding(.horizontal, 8)
                .padding(.bottom, 8)

            Chart(data) { point in
                LineMark(
                    x: .value("Time", point.timestamp),
                    y: .value("Value", point.value)
                )
                .foregroundStyle(color)
                .interpolationMethod(.catmullRom)

                PointMark(
                    x: .value("Time", point.timestamp),
                    y: .value("Value", point.value)
                )
                .foregroundStyle(color)
                .symbolSize(16)
            }
            .chartXAxis {
                AxisMarks(values: .automatic(desiredCount: 5)) { value in
                    AxisValueLabel {
                        if let date = value.as(Date.self) {
                            Text(timeRange == .day ? formatHour(date) : formatWeekday(date))
                                .font(.caption2)
                                .foregroundStyle(AppColors.textMuted)
                        }
                    }
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading) { value in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                        .foregroundStyle(AppColors.border)
                    AxisValueLabel {
                        if let val = value.as(Double.self) {
                            Text(decimalPlaces > 0 ? String(format: "%.1f", val) : "\(Int(val))")
                                .font(.caption2)
                                .foregroundStyle(AppColors.textMuted)
                        }
                    }
                }
            }
            .frame(height: 180)
            .padding(.horizontal, 8)
        }
        .padding(16)
        .background(AppColors.card)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }

    // MARK: - Summary Card

    private var summaryCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(timeRange == .day ? "Today's Summary" : "This Week's Summary")
                .font(.body.weight(.semibold))
                .foregroundStyle(AppColors.text)

            HStack {
                summaryItem(label: "Avg Heart Rate", value: "\(Int(average(heartRateData))) bpm", color: AppColors.heartRate)
                Spacer()
                summaryItem(label: "Avg Resp Rate", value: "\(Int(average(respRateData))) rpm", color: AppColors.respRate)
                Spacer()
                summaryItem(label: "Avg Temperature", value: String(format: "%.1f%@", average(temperatureData), vm.appSettings.temperatureUnit == .celsius ? "\u{00B0}C" : "\u{00B0}F"), color: AppColors.temperature)
            }
        }
        .padding(16)
        .background(AppColors.card)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 2)
    }

    private func summaryItem(label: String, value: String, color: Color) -> some View {
        VStack(spacing: 4) {
            Text(label)
                .font(.caption2)
                .foregroundStyle(AppColors.textMuted)
                .multilineTextAlignment(.center)
            Text(value)
                .font(.body.weight(.semibold))
                .foregroundStyle(color)
        }
    }

    // MARK: - Helpers

    private func average(_ data: [DataPoint]) -> Double {
        guard !data.isEmpty else { return 0 }
        return data.reduce(0) { $0 + $1.value } / Double(data.count)
    }

    private func generateSampleData(count: Int, min: Double, max: Double) -> [DataPoint] {
        let now = Date()
        return (0..<count).map { i in
            DataPoint(
                timestamp: now.addingTimeInterval(-Double(count - i) * 3600),
                value: min + Double.random(in: 0...(max - min))
            )
        }
    }

    private func filterByTimeRange(_ data: [DataPoint]) -> [DataPoint] {
        let cutoff: Date
        if timeRange == .day {
            cutoff = Date().addingTimeInterval(-24 * 3600)
        } else {
            cutoff = Date().addingTimeInterval(-7 * 24 * 3600)
        }
        return data.filter { $0.timestamp > cutoff }
    }

    private func downsample(_ data: [DataPoint], to count: Int) -> [DataPoint] {
        guard data.count > count else { return data }
        let step = max(1, data.count / count)
        return stride(from: 0, to: data.count, by: step).prefix(count).map { data[$0] }
    }

    private func formatHour(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "ha"
        return formatter.string(from: date).lowercased()
    }

    private func formatWeekday(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        return formatter.string(from: date)
    }
}
