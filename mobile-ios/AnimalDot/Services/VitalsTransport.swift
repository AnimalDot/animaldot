import Foundation
import Combine

enum TransportConnectionState: String {
    case disconnected
    case connecting
    case connected
}

protocol VitalsTransport: AnyObject {
    func connect()
    func disconnect()
    var packetPublisher: AnyPublisher<Data, Never> { get }
    var connectionStatePublisher: AnyPublisher<TransportConnectionState, Never> { get }
    var connectionState: TransportConnectionState { get }
}
