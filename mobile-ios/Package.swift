// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "AnimalDotDeps",
    platforms: [.iOS(.v16)],
    products: [],
    dependencies: [
        .package(url: "https://github.com/emqx/CocoaMQTT", from: "2.1.6"),
    ],
    targets: []
)
