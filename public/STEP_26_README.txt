# AI Sleep Monitor - Public Files

This ZIP contains the updated `public` folder.

Step 26 integration:
- Dashboard reads the latest Firebase sleep record.
- If that record has no `sleep_quality`, it calls `/api/predict`.
- The AI result and confidence are saved back to the same Firebase record.
- History reads the saved `sleep_quality` and `confidence`.
- Reports uses the saved AI result and only generates a new prediction when none exists.
- The Firebase path remains `users/<uid>/sleep_data`.

Run:
1. Start Flask ML API:
   `cd D:\AI_SLEEP_MONITOR\ml`
   `python ml_api.py`
2. Start Node:
   `cd D:\AI_SLEEP_MONITOR`
   `npm run dev`
3. Open:
   `http://localhost:3000/dashboard.html`

Do not place Firebase credentials or secrets inside this ZIP.
