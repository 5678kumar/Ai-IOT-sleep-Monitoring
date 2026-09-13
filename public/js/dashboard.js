
import { database, watchSleepData, latestRecord, latestSession, num, setText, average, maxValue, confidenceText, ref, onValue } from "./app.js";
import { getDatabase, ref as dbRef, set } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

let charts = {};
let lastPredictionKey = "";

function makeChart(id, labels, datasets) {
  const canvas = document.getElementById(id);
  if (!canvas || !window.Chart) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(canvas, {
    type:"line",
    data:{labels,datasets:datasets.map(d=>({label:d.label,data:d.data,tension:.35,borderWidth:2,pointRadius:2,fill:false}))},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom",labels:{boxWidth:12,font:{size:11}}}},scales:{x:{grid:{display:false}},y:{beginAtZero:false}}}
  });
}
async function requestDailyPrediction(user, sessionRecords) {
  if (!sessionRecords.length) return;
  const last = sessionRecords[sessionRecords.length-1];
  const signature = `${last.session_id||""}_${sessionRecords.length}_${last.device_millis||last.timestamp||""}`;
  if (signature === lastPredictionKey) return;
  lastPredictionKey = signature;
  setText("predictionStatus","Sending session to AI model…");
  try {
    const response = await fetch("/api/predict-daily",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      session_id:last.session_id||"unknown_session",
      date_key:last.date_key||"",
      records:sessionRecords
    })});
    const result = await response.json();
    if (!response.ok) throw new Error(result.message||"Prediction failed");
    setText("sleepQuality",result.sleep_quality||"Unknown");
    setText("confidence",confidenceText(result.confidence));
    setText("predictionStatus",`${result.records_used||sessionRecords.length} records aggregated for this session`);
    const dateKey = last.date_key || new Date().toISOString().slice(0,10);
    await set(dbRef(getDatabase(),`users/${user.uid}/daily_summaries/${dateKey}`),{
      ...result,
      date_key:dateKey,
      session_id:last.session_id||"",
      updated_at:new Date().toISOString()
    });
  } catch(err) {
    console.error(err);
    setText("predictionStatus","AI service unavailable — sensor data is still live.");
  }
}
watchSleepData(async (records,user)=>{
  const sorted = records.sort((a,b)=>(Number(a.device_millis||0)-Number(b.device_millis||0)));
  const latest = latestRecord(records);
  if (!latest) {
    setText("dataStatus","No sensor data");
    return;
  }
  setText("dataStatus","Firebase live");
  setText("recordCount",records.length);
  setText("heartRate",num(latest.heart_rate,1));
  setText("spo2",num(latest.spo2,1));
  setText("temperature",num(latest.temperature_c,1));
  setText("humidity",num(latest.humidity_percent,1));
  setText("movement",num(latest.movement,2));
  setText("noise",num(latest.noise_index ?? latest.microphone_adc,0));
  setText("sleepDuration",num(latest.sleep_duration_hours,2));
  setText("sessionId",latest.session_id||"--");
  setText("dateKey",latest.date_key||"--");
  const labels = sorted.slice(-80).map((r,i)=>r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : String(i+1));
  makeChart("heartRateChart",labels,[{label:"Heart rate (BPM)",data:sorted.slice(-80).map(r=>Number(r.heart_rate)||0)}]);
  makeChart("environmentChart",labels,[
    {label:"Temperature °C",data:sorted.slice(-80).map(r=>Number(r.temperature_c)||0)},
    {label:"Humidity %",data:sorted.slice(-80).map(r=>Number(r.humidity_percent)||0)}
  ]);
  makeChart("movementChart",labels,[{label:"Movement index",data:sorted.slice(-80).map(r=>Number(r.movement)||0)}]);
  makeChart("noiseChart",labels,[{label:"Noise index",data:sorted.slice(-80).map(r=>Number(r.noise_index ?? r.microphone_adc)||0)}]);
  const session = latestSession(records);
  await requestDailyPrediction(user,session);
});
