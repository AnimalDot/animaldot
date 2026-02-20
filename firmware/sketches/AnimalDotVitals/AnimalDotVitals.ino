// BLE Receiver Script for ESP32 (AnimalDotVitals)
// Receives and parses BLE vitals data broadcast from AnimalDot transmitter

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>

String targetName = "AnimalDotVitals";
BLEScan* pBLEScan;
bool newData = false;
String receivedData;

class MyAdvertisedDeviceCallbacks : public BLEAdvertisedDeviceCallbacks {
  void onResult(BLEAdvertisedDevice advertisedDevice) {
    if (advertisedDevice.haveName() && advertisedDevice.getName() == targetName && advertisedDevice.haveServiceData()) {
      receivedData = advertisedDevice.getServiceData().c_str();
      newData = true;
    }
  }
};

void setup() {
  Serial.begin(115200);
  BLEDevice::init("");
  pBLEScan = BLEDevice::getScan();
  pBLEScan->setAdvertisedDeviceCallbacks(new MyAdvertisedDeviceCallbacks());
  pBLEScan->setActiveScan(true);
  pBLEScan->start(5, false);
}

void loop() {
  if (newData) {
    Serial.println("Received Vitals:");
    Serial.println(receivedData);
    newData = false;
  }
  delay(1000);
}
