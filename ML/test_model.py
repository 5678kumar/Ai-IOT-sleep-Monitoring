import pandas as pd
import joblib

# Load trained model
package = joblib.load("../model/sleep_quality_model.pkl")

model = package["model"]
encoder = package["encoder"]
features = package["features"]

# Example sensor values
data = {
    "Heart_Rate": [68],
    "SpO2": [98],
    "Movement": [5],
    "Temperature_C": [25.4],
    "Humidity_pct": [57],
    "Noise_dB": [23],
    "Sleep_Duration_Hours": [7.2]
}

input_data = pd.DataFrame(data, columns=features)

# Predict
prediction = model.predict(input_data)

# Convert encoded prediction back to label
sleep_quality = encoder.inverse_transform(prediction)

print("--------------------------------")
print("AI Sleep Quality Prediction")
print("--------------------------------")
print("Heart Rate       :", data["Heart_Rate"][0])
print("SpO2             :", data["SpO2"][0])
print("Movement         :", data["Movement"][0])
print("Temperature      :", data["Temperature_C"][0])
print("Humidity         :", data["Humidity_pct"][0])
print("Noise            :", data["Noise_dB"][0])
print("Sleep Duration   :", data["Sleep_Duration_Hours"][0])
print("--------------------------------")
print("Predicted Quality:", sleep_quality[0])
print("--------------------------------")