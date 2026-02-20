// AnimalDot BLE Config Uploader
// Accepts calibration offsets from BLE client

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

float tempOffset = 0.0;
float weightOffset = 0.0;

BLECharacteristic configChar("34f99dba-105c-45ff-845f-23a6d6e9aa33", BLECharacteristic::PROPERTY_WRITE);

class ConfigCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pChar) override {
    std::string val = pChar->getValue();
    if (!val.empty()) {
      sscanf(val.c_str(), "T:%f,W:%f", &tempOffset, &weightOffset);
      Serial.printf("Offsets set -> Temp: %.2f, Weight: %.2f\n", tempOffset, weightOffset);
    }
  }
};

void setup() {
  Serial.begin(115200);
  BLEDevice::init("AnimalDotConfig");
  BLEServer *server = BLEDevice::createServer();
  BLEService *service = server->createService("f35f3333-5fc1-4fd7-a5e3-2332e9b929e1");

  configChar.setCallbacks(new ConfigCallback());
  service->addCharacteristic(&configChar);
  configChar.addDescriptor(new BLE2902());
  service->start();
  BLEDevice::getAdvertising()->addServiceUUID(service->getUUID());
  BLEDevice::getAdvertising()->start();
}

void loop() {
  delay(1000);
}
