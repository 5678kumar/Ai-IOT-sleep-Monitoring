
import { watchDailySummaries, watchSleepData, dailyFromRecords, setText, num, confidenceText, showRecommendations } from "./app.js";
document.getElementById("printReport")?.addEventListener("click",()=>window.print());
let rendered=false;
function render(s, recordsCount=0){
  rendered=true;
  const q=s.sleep_quality||s.quality||"Sleep session summary";
  setText("reportQuality",q);
  setText("reportSubtitle","AI-assisted summary generated from the latest authenticated sleep session.");
  setText("reportDate",s.date_key||"--");
  setText("reportRecords",`${s.records_used||recordsCount} records`);
  setText("rHR",num(s.heart_rate ?? s.Heart_Rate,1));
  setText("rSpO2",num(s.spo2 ?? s.SpO2,1));
  setText("rDuration",num(s.sleep_duration_hours ?? s.Sleep_Duration_Hours,2));
  setText("rConfidence",confidenceText(s.confidence));
  setText("rTemp",num(s.temperature_c ?? s.Temperature_C,1)+" °C");
  setText("rHumidity",num(s.humidity_percent ?? s.Humidity_pct,0)+" %");
  setText("rMovement",num(s.movement ?? s.Movement,2));
  setText("rNoise",num(s.noise_index ?? s.Noise_dB,0)+" index");
  setText("rRecords2",s.records_used||recordsCount);
  showRecommendations({
    sleep_duration_hours:Number(s.sleep_duration_hours ?? s.Sleep_Duration_Hours)||0,
    noise_index:Number(s.noise_index ?? s.Noise_dB)||0,
    movement:Number(s.movement ?? s.Movement)||0,
    humidity_percent:Number(s.humidity_percent ?? s.Humidity_pct)||0
  });
}
watchDailySummaries(data=>{
  const arr=Object.values(data||{}).sort((a,b)=>String(a.date_key||"").localeCompare(String(b.date_key||"")));
  if(arr.length) render(arr[arr.length-1]);
});
watchSleepData(records=>{
  if(rendered)return;
  const daily=dailyFromRecords(records);
  if(daily.length) render(daily[daily.length-1],records.length);
});
