from flask import Flask, request, jsonify
import pandas as pd
import joblib
import numpy as np

app = Flask(__name__)

# ============================================================
# LOAD TRAINED MODEL
# ============================================================

MODEL_PATH = "../model/sleep_quality_model.pkl"

package = joblib.load(MODEL_PATH)

model = package["model"]
encoder = package["encoder"]
features = package["features"]

print("========================================")
print("AI Sleep Monitor ML API")
print("Model loaded successfully")
print("Features:", features)
print("========================================")


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def clean_number(value, default=0.0):
    """
    Convert Firebase values into numbers safely.
    """
    try:
        if value is None:
            return default

        number = float(value)

        if np.isnan(number) or np.isinf(number):
            return default

        return number

    except (ValueError, TypeError):
        return default


def calculate_average(records, field):
    """
    Calculate average of valid non-zero values.
    """

    values = []

    for record in records:

        value = clean_number(record.get(field), 0)

        # Ignore zero values because some sensors
        # may return 0 when data is unavailable.
        if value != 0:
            values.append(value)

    if len(values) == 0:
        return 0.0

    return round(float(np.mean(values)), 2)


def calculate_max(records, field):
    """
    Get maximum value from a cumulative field.

    Sleep duration is cumulative, so we use MAX
    instead of average.
    """

    values = []

    for record in records:

        value = clean_number(record.get(field), 0)

        if value > 0:
            values.append(value)

    if len(values) == 0:
        return 0.0

    return round(float(max(values)), 2)


# ============================================================
# HOME
# ============================================================

@app.route("/")
def home():

    return jsonify({
        "status": "success",
        "message": "AI Sleep Monitor ML API is running"
    })


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/health")
def health():

    return jsonify({
        "status": "success",
        "model_loaded": True,
        "features": features
    })


# ============================================================
# EXISTING SINGLE-RECORD PREDICTION
# ============================================================

@app.route("/predict", methods=["POST"])
def predict():

    try:

        data = request.get_json()

        if not data:
            return jsonify({
                "status": "error",
                "message": "No JSON data received"
            }), 400

        # ----------------------------------------------------
        # Create one-row dataframe
        # ----------------------------------------------------

        input_data = pd.DataFrame([[
            clean_number(data.get("Heart_Rate")),
            clean_number(data.get("SpO2")),
            clean_number(data.get("Movement")),
            clean_number(data.get("Temperature_C")),
            clean_number(data.get("Humidity_pct")),
            clean_number(data.get("Noise_dB")),
            clean_number(data.get("Sleep_Duration_Hours"))
        ]], columns=features)

        # ----------------------------------------------------
        # Prediction
        # ----------------------------------------------------

        prediction = model.predict(input_data)

        result = encoder.inverse_transform(prediction)[0]

        # ----------------------------------------------------
        # Confidence
        # ----------------------------------------------------

        confidence = None

        if hasattr(model, "predict_proba"):

            probabilities = model.predict_proba(input_data)[0]

            predicted_index = prediction[0]

            confidence = float(
                probabilities[predicted_index]
            ) * 100

            confidence = round(confidence, 2)

        # ----------------------------------------------------
        # Response
        # ----------------------------------------------------

        return jsonify({
            "status": "success",
            "sleep_quality": result,
            "confidence": confidence
        })

    except Exception as e:

        print("Prediction error:", str(e))

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400


# ============================================================
# DAILY / SESSION PREDICTION
# ============================================================

@app.route("/predict-daily", methods=["POST"])
def predict_daily():

    try:

        data = request.get_json()

        if not data:
            return jsonify({
                "status": "error",
                "message": "No JSON data received"
            }), 400

        # ====================================================
        # GET SESSION INFORMATION
        # ====================================================

        session_id = data.get("session_id", "unknown_session")

        date_key = data.get("date_key", "")

        records = data.get("records", [])

        # ----------------------------------------------------
        # Validate records
        # ----------------------------------------------------

        if not isinstance(records, list):

            return jsonify({
                "status": "error",
                "message": "records must be a list"
            }), 400

        if len(records) == 0:

            return jsonify({
                "status": "error",
                "message": "No sensor records received"
            }), 400

        print("----------------------------------------")
        print("Daily prediction request")
        print("Session:", session_id)
        print("Date:", date_key)
        print("Records:", len(records))
        print("----------------------------------------")

        # ====================================================
        # CALCULATE DAILY / SESSION FEATURES
        # ====================================================

        # Heart Rate → average
        avg_heart_rate = calculate_average(
            records,
            "heart_rate"
        )

        # SpO2 → average
        avg_spo2 = calculate_average(
            records,
            "spo2"
        )

        # Movement → average
        avg_movement = calculate_average(
            records,
            "movement"
        )

        # Temperature → average
        avg_temperature = calculate_average(
            records,
            "temperature_c"
        )

        # Humidity → average
        avg_humidity = calculate_average(
            records,
            "humidity_percent"
        )

        # Noise → average
        #
        # IMPORTANT:
        # Your ESP32 microphone currently produces
        # noise_index 0 or 100.
        #
        # Therefore this is an INDEX, not actual dB.
        avg_noise = calculate_average(
            records,
            "noise_index"
        )

        # Sleep duration → MAX
        #
        # This value is cumulative.
        # Example:
        #
        # 1.0 hour
        # 2.0 hours
        # 3.0 hours
        #
        # We need 3.0, not the average 2.0.
        sleep_duration = calculate_max(
            records,
            "sleep_duration_hours"
        )

        # ====================================================
        # CREATE DAILY DATAFRAME
        # ====================================================

        daily_data = pd.DataFrame([[
            avg_heart_rate,
            avg_spo2,
            avg_movement,
            avg_temperature,
            avg_humidity,
            avg_noise,
            sleep_duration
        ]], columns=features)

        print("Daily aggregated values:")
        print(daily_data)

        # ====================================================
        # AI PREDICTION
        # ====================================================

        prediction = model.predict(daily_data)

        sleep_quality = encoder.inverse_transform(
            prediction
        )[0]

        # ====================================================
        # AI CONFIDENCE
        # ====================================================

        confidence = None

        if hasattr(model, "predict_proba"):

            probabilities = model.predict_proba(
                daily_data
            )[0]

            predicted_index = prediction[0]

            confidence = float(
                probabilities[predicted_index]
            ) * 100

            confidence = round(confidence, 2)

        # ====================================================
        # RESPONSE
        # ====================================================

        result = {

            "status": "success",

            "prediction_type": "daily",

            "session_id": session_id,

            "date_key": date_key,

            "records_used": len(records),

            # -----------------------------------------------
            # Aggregated sensor values
            # -----------------------------------------------

            "daily_summary": {

                "Heart_Rate": avg_heart_rate,

                "SpO2": avg_spo2,

                "Movement": avg_movement,

                "Temperature_C": avg_temperature,

                "Humidity_pct": avg_humidity,

                "Noise_dB": avg_noise,

                "Sleep_Duration_Hours": sleep_duration
            },

            # -----------------------------------------------
            # AI result
            # -----------------------------------------------

            "sleep_quality": sleep_quality,

            "confidence": confidence
        }

        print("----------------------------------------")
        print("Daily AI Result")
        print("Sleep Quality:", sleep_quality)
        print("Confidence:", confidence)
        print("----------------------------------------")

        return jsonify(result)

    except Exception as e:

        print("Daily prediction error:", str(e))

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400


# ============================================================
# TEST DAILY CALCULATION
# ============================================================

@app.route("/test-daily", methods=["GET"])
def test_daily():

    try:

        # Sample records for testing
        sample_records = [

            {
                "heart_rate": 72,
                "spo2": 98,
                "movement": 10,
                "temperature_c": 27,
                "humidity_percent": 65,
                "noise_index": 0,
                "sleep_duration_hours": 1
            },

            {
                "heart_rate": 70,
                "spo2": 97,
                "movement": 8,
                "temperature_c": 27.5,
                "humidity_percent": 66,
                "noise_index": 100,
                "sleep_duration_hours": 2
            },

            {
                "heart_rate": 68,
                "spo2": 98,
                "movement": 5,
                "temperature_c": 27,
                "humidity_percent": 64,
                "noise_index": 0,
                "sleep_duration_hours": 3
            }

        ]

        # ----------------------------------------------------
        # Calculate values
        # ----------------------------------------------------

        avg_heart_rate = calculate_average(
            sample_records,
            "heart_rate"
        )

        avg_spo2 = calculate_average(
            sample_records,
            "spo2"
        )

        avg_movement = calculate_average(
            sample_records,
            "movement"
        )

        avg_temperature = calculate_average(
            sample_records,
            "temperature_c"
        )

        avg_humidity = calculate_average(
            sample_records,
            "humidity_percent"
        )

        avg_noise = calculate_average(
            sample_records,
            "noise_index"
        )

        sleep_duration = calculate_max(
            sample_records,
            "sleep_duration_hours"
        )

        # ----------------------------------------------------
        # DataFrame
        # ----------------------------------------------------

        daily_data = pd.DataFrame([[
            avg_heart_rate,
            avg_spo2,
            avg_movement,
            avg_temperature,
            avg_humidity,
            avg_noise,
            sleep_duration
        ]], columns=features)

        # ----------------------------------------------------
        # Prediction
        # ----------------------------------------------------

        prediction = model.predict(daily_data)

        result = encoder.inverse_transform(
            prediction
        )[0]

        # ----------------------------------------------------
        # Confidence
        # ----------------------------------------------------

        confidence = None

        if hasattr(model, "predict_proba"):

            probabilities = model.predict_proba(
                daily_data
            )[0]

            predicted_index = prediction[0]

            confidence = float(
                probabilities[predicted_index]
            ) * 100

            confidence = round(confidence, 2)

        return jsonify({

            "status": "success",

            "message": "Daily calculation test successful",

            "records_used": len(sample_records),

            "daily_summary": {

                "Heart_Rate": avg_heart_rate,

                "SpO2": avg_spo2,

                "Movement": avg_movement,

                "Temperature_C": avg_temperature,

                "Humidity_pct": avg_humidity,

                "Noise_dB": avg_noise,

                "Sleep_Duration_Hours": sleep_duration
            },

            "sleep_quality": result,

            "confidence": confidence

        })

    except Exception as e:

        return jsonify({

            "status": "error",

            "message": str(e)

        }), 400


# ============================================================
# START FLASK SERVER
# ============================================================

if __name__ == "__main__":

    print("========================================")
    print("Starting AI Sleep Monitor ML API")
    print("URL: http://127.0.0.1:5000")
    print("========================================")

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )