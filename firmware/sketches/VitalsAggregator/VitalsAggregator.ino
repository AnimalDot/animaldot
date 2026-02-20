// AnimalDot Vitals Aggregator
// Collects HR, temp, weight and sends single BLE packet

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define HEART_RATE_PIN A0
#define TEMP_SENSOR_PIN A1
#define LOAD_CELL_PIN A2

BLECharacteristic vitalsCharacteristic("beb5483e-36e1-4688-b7f5-ea07361b26a8", BLECharacteristic::PROPERTY_NOTIFY);

void setupBLE() {
  BLEDevice::init("AnimalDotVitals");
  BLEServer *server = BLEDevice::createServer();
  BLEService *service = server->createService("4fafc201-1fb5-459e-8fcc-c5c9c331914b");
  service->addCharacteristic(&vitalsCharacteristic);
  vitalsCharacteristic.addDescriptor(new BLE2902());
  service->start();
  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(service->getUUID());
  advertising->start();
}

float readHR() {
  return map(analogRead(HEART_RATE_PIN), 0, 1023, 40, 180);
}

float readTemp() {
  float voltage = analogRead(TEMP_SENSOR_PIN) * (5.0 / 1023.0);
  return (voltage - 0.5) * 100.0;
}

float readWeight() {
  return analogRead(LOAD_CELL_PIN) / 10.0;
}

void setup() {
  Serial.begin(115200);
  setupBLE();
}

void loop() {
  float hr = readHR();
  float temp = readTemp();
  float wt = readWeight();
  char buf[64];
  snprintf(buf, sizeof(buf), "HR:%.1f,T:%.1f,W:%.1f", hr, temp, wt);
  vitalsCharacteristic.setValue(buf);
  vitalsCharacteristic.notify();
  Serial.println(buf);
  delay(1000);
}
