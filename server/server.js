const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "../public")
    )
);


// ============================================================
// TEST API
// ============================================================

app.get("/api/test", (req, res) => {

    res.json({
        status: "success",
        message: "AI Sleep Monitor Server is running"
    });

});


// ============================================================
// SINGLE SENSOR PREDICTION
// ============================================================

app.post("/api/predict", async (req, res) => {

    try {

        const sensorData = req.body;

        console.log("Single prediction request received");

        const response = await fetch(
            "http://127.0.0.1:5000/predict",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    Heart_Rate:
                        Number(sensorData.Heart_Rate ?? 0),

                    SpO2:
                        Number(sensorData.SpO2 ?? 0),

                    Movement:
                        Number(sensorData.Movement ?? 0),

                    Temperature_C:
                        Number(sensorData.Temperature_C ?? 0),

                    Humidity_pct:
                        Number(sensorData.Humidity_pct ?? 0),

                    Noise_dB:
                        Number(sensorData.Noise_dB ?? 0),

                    Sleep_Duration_Hours:
                        Number(
                            sensorData.Sleep_Duration_Hours ?? 0
                        )

                })
            }
        );

        const result = await response.json();

        res.status(response.status).json(result);

    }

    catch (error) {

        console.error(
            "ML API Error:",
            error
        );

        res.status(500).json({

            status: "error",

            message:
                "Unable to connect to Flask ML API",

            error:
                error.message

        });

    }

});


// ============================================================
// DAILY / SESSION PREDICTION
// ============================================================

app.post("/api/predict-daily", async (req, res) => {

    try {

        const data = req.body;

        console.log("----------------------------------------");

        console.log(
            "Daily prediction request received"
        );

        console.log(
            "Session ID:",
            data.session_id
        );

        console.log(
            "Date:",
            data.date_key
        );

        console.log(
            "Records:",
            data.records
                ? data.records.length
                : 0
        );

        console.log("----------------------------------------");


        // ----------------------------------------------------
        // Validate records
        // ----------------------------------------------------

        if (!data.records) {

            return res.status(400).json({

                status: "error",

                message:
                    "No sensor records received"

            });

        }


        if (!Array.isArray(data.records)) {

            return res.status(400).json({

                status: "error",

                message:
                    "records must be an array"

            });

        }


        if (data.records.length === 0) {

            return res.status(400).json({

                status: "error",

                message:
                    "No sensor records available"

            });

        }


        // ----------------------------------------------------
        // Send data to Flask
        // ----------------------------------------------------

        const response = await fetch(
            "http://127.0.0.1:5000/predict-daily",
            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body: JSON.stringify({

                    session_id:
                        data.session_id ||
                        "unknown_session",

                    date_key:
                        data.date_key ||
                        "",

                    records:
                        data.records

                })

            }
        );


        // ----------------------------------------------------
        // Get Flask response
        // ----------------------------------------------------

        const result =
            await response.json();


        // ----------------------------------------------------
        // Return result to frontend
        // ----------------------------------------------------

        console.log(
            "Daily prediction result:",
            result
        );


        res.status(response.status)
            .json(result);

    }

    catch (error) {

        console.error(
            "Daily ML API Error:",
            error
        );


        res.status(500).json({

            status: "error",

            message:
                "Unable to connect to Flask daily ML API",

            error:
                error.message

        });

    }

});


// ============================================================
// SERVER START
// ============================================================

app.listen(
    PORT,
    () => {

        console.log(
            "========================================"
        );

        console.log(
            "AI Sleep Monitor Node.js Server"
        );

        console.log(
            "========================================"
        );

        console.log(
            `Server running at http://localhost:${PORT}`
        );

        console.log(
            "Single prediction:"
        );

        console.log(
            "POST http://localhost:3000/api/predict"
        );

        console.log(
            "Daily prediction:"
        );

        console.log(
            "POST http://localhost:3000/api/predict-daily"
        );

        console.log(
            "========================================"
        );

    }
);