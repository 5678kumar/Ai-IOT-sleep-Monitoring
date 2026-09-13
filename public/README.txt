# SleepCare AI - Redesigned 7-page website

This is a frontend redesign for the existing AI + IoT Sleep Quality Monitoring System.

Pages:
- index.html - Login
- register.html - Register
- dashboard.html - Live dashboard + charts + daily AI prediction
- sleep-analysis.html - AI interpretation
- history.html - Daily history
- reports.html - Printable report
- profile.html - Firebase account profile

Backend compatibility:
- Firebase Authentication: Email/Password
- Firebase Realtime Database: users/<uid>/sleep_data
- Daily summaries: users/<uid>/daily_summaries
- Node.js: /api/predict-daily
- Flask ML: existing /predict-daily endpoint behind Node.js

IMPORTANT:
1. Replace js/firebase-config.js with your existing working Firebase web configuration.
2. Keep your current server/server.js and ml/ml_api.py.
3. The website expects Node.js to serve /public and proxy /api/predict-daily.
4. Run from http://localhost:3000 rather than opening HTML files directly.
5. Noise is displayed as a digital noise index, not real dB.
6. MAX30102/MPU6050 simulated values should be labelled as simulation data in your project demo if those sensors are not currently producing real measurements.

Design direction:
Modern healthcare/wellness interface inspired by the supplied KidsCare reference: dark green/navy branding, soft cream background, rounded cards, large hero, moon/sleep visual language, clean dashboard panels, and responsive layouts.
