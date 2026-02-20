#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define SENSOR_PIN A0
BLECharacteristic *heartRateCharacteristic;
int heartRateValue = 0;

int processSignal(int raw) {
  // Placeholder: add actual filtering and peak detection logic
  return map(raw, 0, 1023, 60, 120); // Map raw value to HR range
}

void setup() {
  Serial.begin(115200);
  pinMode(SENSOR_PIN, INPUT);

  BLEDevice::init("AnimalDot_Bed");
  BLEServer *pServer = BLEDevice::createServer();
  BLEService *pService = pServer->createService("180D"); // Heart Rate Service

  heartRateCharacteristic = pService->createCharacteristic(
                            "2A37", // Heart Rate Measurement
                            BLECharacteristic::PROPERTY_READ |
                            BLECharacteristic::PROPERTY_NOTIFY);

  heartRateCharacteristic->addDescriptor(new BLE2902());
  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->start();
}

void loop() {
  int raw = analogRead(SENSOR_PIN); // Simulated geophone reading
  heartRateValue = processSignal(raw); // Assume a basic filtering function
  Serial.println(heartRateValue);

  uint8_t hrmPayload[2] = {0x00, (uint8_t)heartRateValue};
  heartRateCharacteristic->setValue(hrmPayload, 2);
  heartRateCharacteristic->notify();

  delay(1000); // Update every second
}
