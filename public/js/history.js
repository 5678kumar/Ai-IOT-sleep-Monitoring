
import { watchDailySummaries, watchSleepData, dailyFromRecords, setText, num, confidenceText, qualityClass } from "./app.js";
function render(arr) {
  arr.sort((a,b)=>String(b.date_key||"").localeCompare(String(a.date_key||"")));
  const body=document.getElementById("historyTableBody");
  body.innerHTML="";
  if(!arr.length){document.getElementById("historyEmpty").style.display="block";return;}
  document.getElementById("historyEmpty").style.display="none";
  const durations=arr.map(x=>Number(x.sleep_duration_hours||x.Sleep_Duration_Hours||0)).filter(Boolean);
  setText("daysTracked",arr.length);
  setText("bestQuality",arr.find(x=>String(x.sleep_quality||"").toLowerCase().includes("excellent"))?.sleep_quality || arr[0].sleep_quality || "--");
  setText("avgDuration",durations.length?(durations.reduce((a,b)=>a+b,0)/durations.length).toFixed(2):"--");
  setText("latestConfidence",confidenceText(arr[0].confidence));
  arr.forEach((x,i)=>{
    const q=x.sleep_quality||x.quality||"--";
    const tr=document.createElement("tr");
    tr.innerHTML=`<td><strong>Day ${arr.length-i}</strong></td>
      <td>${x.date_key||"--"}</td>
      <td>${num(x.sleep_duration_hours ?? x.Sleep_Duration_Hours,2)} h</td>
      <td>${num(x.heart_rate ?? x.Heart_Rate,1)} BPM</td>
      <td>${num(x.spo2 ?? x.SpO2,1)}%</td>
      <td>${num(x.temperature_c ?? x.Temperature_C,1)} °C / ${num(x.humidity_percent ?? x.Humidity_pct,0)}%</td>
      <td><span class="${qualityClass(q)}">${q}</span></td>
      <td>${confidenceText(x.confidence)}</td>`;
    body.appendChild(tr);
  });
  setText("historyStatus",`${arr.length} daily summaries`);
}
document.getElementById("refreshHistory")?.addEventListener("click",()=>location.reload());
watchDailySummaries((data)=>{
  const arr=Object.values(data||{});
  if(arr.length) render(arr);
});
watchSleepData(records=>{
  const daily=dailyFromRecords(records);
  if(daily.length) render(daily);
});
