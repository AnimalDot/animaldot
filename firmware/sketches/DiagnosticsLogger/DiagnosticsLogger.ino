// AnimalDot Diagnostics Logger
// Outputs sensor integrity and value bounds for debugging

#include <Arduino.h>

#define HEART_RATE_PIN A0
#define TEMP_SENSOR_PIN A1
#define LOAD_CELL_PIN A2

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("Diagnostics Logger Started");
}

void loop() {
  int hr = analogRead(HEART_RATE_PIN);
  int temp = analogRead(TEMP_SENSOR_PIN);
  int load = analogRead(LOAD_CELL_PIN);

  if (hr < 50 || hr > 1000) Serial.println("Warning: HR signal abnormal");
  if (temp < 100 || temp > 900) Serial.println("Temp sensor out of range");
  if (load < 0 || load > 1023) Serial.println("Load cell error");

  Serial.printf("Raw HR: %d | Temp: %d | Load: %d\n", hr, temp, load);
  delay(1000);
}
