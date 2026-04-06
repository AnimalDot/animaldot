import Foundation

/// Parsed header from a BedDot geophone packet.
struct BedDotHeader {
    let mac: Data          // 6 bytes
    let sampleCount: UInt16
    let timestamp: UInt64
    let interval: UInt32
}

/// Parses raw BedDot geophone packets.
///
/// Packet format: 20-byte header + 100 × Int32 little-endian samples = 420 bytes.
/// Some firmware revisions send 424 bytes — the extra 4 bytes are ignored.
enum PacketParser {

    /// Minimum valid packet size: 20-byte header + 100 × 4-byte samples.
    static let headerSize = 20
    static let expectedSamples = 100
    static let minimumPacketSize = headerSize + expectedSamples * MemoryLayout<Int32>.size  // 420

    /// Parse the 20-byte header. Returns nil on malformed data.
    static func parseHeader(from data: Data) -> BedDotHeader? {
        guard data.count >= headerSize else { return nil }

        let mac = Data(data[data.startIndex ..< data.startIndex + 6])

        let sampleCount: UInt16 = data.loadLittleEndian(fromByteOffset: 6)
        let timestamp: UInt64   = data.loadLittleEndian(fromByteOffset: 8)
        let interval: UInt32    = data.loadLittleEndian(fromByteOffset: 16)

        return BedDotHeader(
            mac: mac,
            sampleCount: sampleCount,
            timestamp: timestamp,
            interval: interval
        )
    }

    /// Parse a full packet and return 100 Int32 samples, or nil on bad input.
    static func parseSamples(from data: Data) -> [Int32]? {
        guard data.count >= minimumPacketSize else { return nil }

        var samples = [Int32](repeating: 0, count: expectedSamples)
        for i in 0 ..< expectedSamples {
            let offset = headerSize + i * MemoryLayout<Int32>.size
            guard offset + MemoryLayout<Int32>.size <= data.count else { return nil }
            samples[i] = data.loadLittleEndian(fromByteOffset: offset)
        }
        return samples
    }
}

// MARK: - Data helpers

private extension Data {
    /// Read a fixed-width little-endian integer at the given byte offset.
    func loadLittleEndian<T: FixedWidthInteger>(fromByteOffset offset: Int) -> T {
        let size = MemoryLayout<T>.size
        guard offset + size <= count else { return 0 }
        var value: T = 0
        _ = Swift.withUnsafeMutableBytes(of: &value) { dest in
            copyBytes(to: dest, from: (startIndex + offset) ..< (startIndex + offset + size))
        }
        return T(littleEndian: value)
    }
}
