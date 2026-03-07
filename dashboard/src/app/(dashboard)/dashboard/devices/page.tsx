export default function DevicesPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground">Device Management</h1>
      <p className="mt-2 text-foreground/80">
        BedDot devices and provisioning. Connect via BLE then MQTT.
      </p>
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-foreground/70">
          Device list and OTA status. Backend will bridge MQTT ↔ WebSocket for
          real-time status.
        </p>
      </div>
    </div>
  );
}
