import SwiftUI
import Charts

private struct ChartPoint: Identifiable {
    let id: Int
    let index: Int
    let value: Double

    init(index: Int, value: Double) {
        self.id = index
        self.index = index
        self.value = value
    }
}

struct LiveMonitorView: View {
    @EnvironmentObject var vm: VitalsViewModel

    // Down-sample to this many points for chart rendering.
    private let chartPoints = 300

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                Color.black.ignoresSafeArea()

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 16) {
                        connectionPill
                        vitalsBanner
                        chartSection(title: "Raw Geophone", data: vm.rawSamples, color: .white)
                        chartSection(title: "Respiration", data: vm.respSamples, color: .cyan)
                        chartSection(title: "Heartbeat (BCG)", data: vm.hrSamples, color: .red)
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 24)
                }
            }
            .navigationBarHidden(true)
        }
    }

    // MARK: - Connection pill

    private var connectionPill: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(pillColor)
                .frame(width: 8, height: 8)
            Text(pillLabel)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.white.opacity(0.85))
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 6)
        .background(pillColor.opacity(0.25))
        .clipShape(Capsule())
        .frame(maxWidth: .infinity, alignment: .trailing)
        .padding(.top, 8)
    }

    private var pillColor: Color {
        switch vm.connectionState {
        case .connected: return .green
        case .connecting: return .yellow
        case .disconnected: return .red
        }
    }

    private var pillLabel: String {
        let transport = vm.selectedTransport.label
        switch vm.connectionState {
        case .connected: return "\(transport) Connected"
        case .connecting: return "\(transport) Connecting..."
        case .disconnected: return "Disconnected"
        }
    }

    // MARK: - Vitals banner

    private var vitalsBanner: some View {
        VStack(spacing: 6) {
            if vm.bedEmpty {
                Text("Bed is empty")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(.gray)
            } else if let bpm = vm.currentBPM {
                HStack(alignment: .firstTextBaseline, spacing: 24) {
                    VStack(spacing: 2) {
                        Text("\(Int(bpm))")
                            .font(.system(size: 54, weight: .bold, design: .rounded))
                            .foregroundStyle(.red)
                        Text("BPM")
                            .font(.caption.weight(.medium))
                            .foregroundStyle(.red.opacity(0.7))
                    }

                    if let rpm = vm.currentRPM {
                        VStack(spacing: 2) {
                            HStack(alignment: .firstTextBaseline, spacing: 2) {
                                Text("~")
                                    .font(.system(size: 30, weight: .medium, design: .rounded))
                                    .foregroundStyle(.cyan.opacity(0.6))
                                Text("\(Int(rpm))")
                                    .font(.system(size: 54, weight: .bold, design: .rounded))
                                    .foregroundStyle(.cyan)
                            }
                            Text("BrPM")
                                .font(.caption.weight(.medium))
                                .foregroundStyle(.cyan.opacity(0.7))
                        }
                    }
                }
            } else {
                Text("Calculating\u{2026}")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(.yellow)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
    }

    // MARK: - Chart section

    private func chartSection(title: String, data: [Double], color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(color.opacity(0.8))

            chartView(data: data, color: color)
                .frame(height: 150)
                .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    @ViewBuilder
    private func chartView(data: [Double], color: Color) -> some View {
        let points = downsample(data).enumerated().map { ChartPoint(index: $0.offset, value: $0.element) }

        Chart(points) { point in
            LineMark(
                x: .value("Sample", point.index),
                y: .value("Amplitude", point.value)
            )
            .foregroundStyle(color)
            .interpolationMethod(.catmullRom)
        }
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
        .chartLegend(.hidden)
        .chartPlotStyle { plot in
            plot.background(.white.opacity(0.04))
        }
    }

    // MARK: - Downsample

    private func downsample(_ data: [Double]) -> [Double] {
        guard data.count > chartPoints else { return data }
        let step = Double(data.count) / Double(chartPoints)
        return (0 ..< chartPoints).map { i in
            data[min(Int(Double(i) * step), data.count - 1)]
        }
    }
}
