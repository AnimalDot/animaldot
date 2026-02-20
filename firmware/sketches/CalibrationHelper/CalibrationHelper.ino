// AnimalDot Calibration Helper
// Prints raw sensor values for manual calibration of load cell and temperature sensor

#define TEMP_SENSOR_PIN A1
#define LOAD_CELL_PIN A2

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("Calibration Helper Initialized");
  Serial.println("Collecting raw sensor data...");
}

void loop() {
  int tempRaw = analogRead(TEMP_SENSOR_PIN);
  int loadRaw = analogRead(LOAD_CELL_PIN);

  float tempVoltage = tempRaw * (5.0 / 1023.0); // For TMP36
  float tempC = (tempVoltage - 0.5) * 100.0;

  float weightEstimate = loadRaw / 10.0; // Placeholder conversion

  Serial.print("Raw Temp (ADC): ");
  Serial.print(tempRaw);
  Serial.print(" | Temp (°C): ");
  Serial.print(tempC);

  Serial.print(" || Raw Load (ADC): ");
  Serial.print(loadRaw);
  Serial.print(" | Weight (Est): ");
  Serial.println(weightEstimate);

  delay(1000);
}
