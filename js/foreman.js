// ── FOREMAN TAB ──────────────────────────────────────────

const FOREMAN_CHIPS={
  roofing:['Safe to shingle today?','When do winds drop?','Wet roof risk?'],
  concrete:['Good pour conditions?','Will it rain before cure?','Temp OK for mix?'],
  painting:['Can we spray exteriors?','Humidity OK?','Wind safe to spray?'],
  electrical:['Safe for outdoor work?','Storm risk today?','When does rain clear?'],
  plumbing:['Freeze risk tonight?','OK for outdoor work?','Pipe conditions safe?'],
  hvac:['Rooftop conditions safe?','Wind issues today?','Heat risk for crew?'],
  framing:['Wind safe for walls?','When do gusts drop?','Good day to stand walls?'],
  landscaping:['OK to spray today?','Heat risk for crew?','Rain coming?'],
  excavation:['Ground conditions OK?','Rain impact on trenches?','Safe to dig?'],
  farming:['Field conditions OK?','Frost risk tonight?','Safe to spray?'],
  general:['Safe to work today?','Rain coming my way?','When\'s my best window?']
};

function buildConditionsContext(){
  if(!currentData)return'No conditions loaded';
  const c=currentData.current;
  const temp=Math.round(c.temperature_2m);
  const wind=kmh2mph(Math.round(c.wind_speed_10m));
  const wmo=c.weather_code;
  const rh=Math.round(c.relative_humidity_2m);
  const rainPct=currentData.daily?.precipitation_probability_max?.[0]||0;
  const alerts=getTradeAlerts(temp,wind,c.precipitation||0,wmo,rh);
  const now=new Date();
  const timeStr=now.toLocaleTimeString([],{hour:'numeric',minute:'2-digit',hour12:true});
  const sunrise=currentData.daily?.sunrise?.[0]?new Date(currentData.daily.sunrise[0]):null;
  const sunset=currentData.daily?.sunset?.[0]?new Date(currentData.daily.sunset[0]):null;
  const isDaytime=sunrise&&sunset?(now>sunrise&&now<sunset):true;
  const dayPart=isDaytime?'daytime':'nighttime';
  const sunriseStr=sunrise?sunrise.toLocaleTimeString([],{hour:'numeric',minute:'2-digit',hour12:true}):'--';
  const sunsetStr=sunset?sunset.toLocaleTimeString([],{hour:'numeric',minute:'2-digit',hour12:true}):'--';
  const hourlyForecast=currentData.hourly.time.map((t,i)=>({
    t:new Date(t),temp:Math.round(currentData.hourly.temperature_2m[i]),
    wind:kmh2mph(Math.round(currentData.hourly.wind_speed_10m[i])),
    prob:currentData.hourly.precipitation_probability[i]||0,
    precip:currentData.hourly.precipitation?.[i]||0,
    wmo:currentData.hourly.weather_code[i]
  })).filter(h=>h.t>=now).slice(0,12).map(h=>{
    const fmt=h.t.toLocaleTimeString([],{hour:'numeric',hour12:true});
    return`${fmt}: ${h.temp}°F wind ${h.wind}mph rain ${h.prob}%${h.precip>0.01?' ('+h.precip.toFixed(2)+'")':''}`;
  }).join(' | ');
  const firstRain=currentData.hourly.time.map((t,i)=>({
    t:new Date(t),prob:currentData.hourly.precipitation_probability[i]||0,
    wmo:currentData.hourly.weather_code[i]
  })).filter(h=>h.t>=now).find(h=>h.prob>40||DANGER.has(h.wmo)||WARN.has(h.wmo));
  const rainWarning=firstRain?`First significant rain expected around ${firstRain.t.toLocaleTimeString([],{hour:'numeric',minute:'2-digit',hour12:true})}`:'No significant rain in next 12 hours';
  return`Location: ${currentLabel}. Time: ${timeStr} (${dayPart}). Sunrise: ${sunriseStr}, Sunset: ${sunsetStr}.\nCurrent: ${temp}°F, Wind: ${wind}mph ${windDirLabel(c.wind_direction_10m||0)}, Humidity: ${rh}%, Conditions: ${WMO[wmo]||'Unknown'}.\nRain today: ${rainPct}%. ${rainWarning}.\nTrade: ${TRADE_CONFIG[currentTrade]?.name||'General'}.\nActive alerts: ${alerts.map(a=>a.msg).join(', ')||'None'}.\nNext 12 hours: ${hourlyForecast}`;
}

function getRemainingForeman(){
  console.log('getRemainingForeman called');
  const today=new Date().toDateString();
  const stored=JSON.parse(localStorage.getItem('jw_foreman_usage')||'{}');
  if(stored.date!==today)return 7;
  return Math.max(0,7-(stored.count||0));
}
function incrementForeman(){
  const today=new Date().toDateString();
  const stored=JSON.parse(localStorage.getItem('jw_foreman_usage')||'{}');
  const count=stored.date===today?(stored.count||0)+1:1;
  localStorage.setItem('jw_foreman_usage',JSON.stringify({date:today,count}));
}

function renderForemanTab(el){
  if(!isPro()){showPaywall('foreman');el.innerHTML='';return;}
  const name=localStorage.getItem('jw_user_name')||'Boss';
  const chips=FOREMAN_CHIPS[currentTrade]||FOREMAN_CHIPS.general;
  const remaining=getRemainingForeman();
  const tradeName=(TRADE_CONFIG[currentTrade]||TRADE_CONFIG.general).name;
  el.innerHTML=`<div class="fade-in" style="padding:20px 16px">
    <div style="font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;color:var(--text);margin-bottom:4px">👷 ASK THE FOREMAN</div>
    <div style="font-size:13px;color:var(--muted);margin-bottom:16px">Hey ${name}, what do you need to know?</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">
      ${chips.map(c=>{const safe=c.replace(/&/g,'&amp;').replace(/'/g,'&#39;').replace(/"/g,'&quot;');return`<div class="foreman-chip" onclick="submitForemanQuestion(&quot;${safe}&quot;)">${c}</div>`;}).join('')}
      <div class="foreman-chip" onclick="submitForemanQuestion(&quot;Good for ${tradeName.toLowerCase()} work?&quot;)">Good for ${tradeName.toLowerCase()} work?</div>
      <div class="foreman-chip" onclick="submitForemanQuestion(&quot;How long til it clears?&quot;)">How long til it clears?</div>
    </div>
    <div style="display:flex;gap:6px;align-items:center">
      <input type="text" id="foremanInput" placeholder="Ask anything..." autocomplete="off" style="flex:1;background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:11px 12px;font-size:14px;color:var(--text);font-family:'Barlow',sans-serif;outline:none;" onkeydown="if(event.key==='Enter')submitForemanQuestion(this.value.trim())"/>
      <button id="foremanMic" onclick="startVoiceInput()" style="background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-sm);width:42px;height:42px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--muted)">🎤</button>
      <button class="btn" onclick="submitForemanQuestion(document.getElementById('foremanInput').value.trim())" style="padding:11px 14px">Ask →</button>
    </div>
    <div id="foremanCount" style="font-size:10px;color:var(--subtle);text-align:center;margin-top:8px;letter-spacing:0.04em">${remaining} question${remaining===1?'':'s'} left today</div>
    <div id="foremanResponse"></div>
  </div>`;
}

function startVoiceInput(){
  if(!('webkitSpeechRecognition' in window)&&!('SpeechRecognition' in window)){alert('Voice not supported. Try Chrome.');return;}
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  const rec=new SR();rec.continuous=false;rec.interimResults=false;rec.lang='en-US';
  const mic=document.getElementById('foremanMic');
  if(mic){mic.textContent='🔴';mic.style.color='#e53935';}
  rec.onresult=e=>{document.getElementById('foremanInput').value=e.results[0][0].transcript;if(mic){mic.textContent='🎤';mic.style.color='';}};
  rec.onerror=()=>{if(mic){mic.textContent='🎤';mic.style.color='';}};
  rec.onend=()=>{if(mic){mic.textContent='🎤';mic.style.color='';}};
  rec.start();
}

async function submitForemanQuestion(preset){
  console.log('submitForemanQuestion called with:', preset);
  const input=document.getElementById('foremanInput');
  const question=preset||input?.value?.trim();
  console.log('Resolved question:', question);
  console.log('Remaining questions:', getRemainingForeman());
  if(!question)return;
  const name=localStorage.getItem('jw_user_name')||'Boss';
  const remaining=getRemainingForeman();
  const resp=document.getElementById('foremanResponse');
  if(remaining<=0){
    if(resp)resp.innerHTML=`<div class="foreman-response" style="margin-top:14px"><div style="color:var(--accent)">You've used your 7 for today, ${name}. The Foreman's off the clock. Back at it tomorrow.</div></div>`;
    return;
  }
  if(input)input.value='';
  if(resp)resp.innerHTML=`<div class="foreman-response" style="margin-top:14px"><div style="color:var(--muted)">Foreman's thinking...</div></div>`;

  const style=localStorage.getItem('jw_foreman_style')||'shooter';
  const styleInstructions={
    shooter:'Be direct and blunt. No fluff. Real numbers, real advice. Brief.',
    light:'Be direct but add dry jobsite humor. Keep it real but make them smile.',
    facts:'Be purely factual. Numbers and times only, minimal commentary.'
  };
  const tradeName=(TRADE_CONFIG[currentTrade]||TRADE_CONFIG.general).name;
  const systemPrompt=`You are a seasoned jobsite foreman with 30 years in the trades. You work for StrickerCo Solutions. You're talking to ${name}, a ${tradeName} worker.\n\nStyle: ${styleInstructions[style]}\n\nOccasionally — not every response — weave in a short piece of field wisdom. Things like: "The way you do one thing is the way you do everything." Keep it subtle, never preachy.\n\nKeep ALL answers under 80 words. Use ${name}'s name once naturally. Be specific — use actual numbers from the conditions.\n\nCurrent conditions at ${currentLabel}: ${buildConditionsContext()}`;

  try{
    const r=await fetch('/api/foreman',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,systemPrompt})});
    const data=await r.json();
    incrementForeman();
    const rem=getRemainingForeman();
    const countDisplay=document.getElementById('foremanCount');
    if(countDisplay)countDisplay.textContent=rem+' question'+(rem===1?'':'s')+' left today';
    if(resp)resp.innerHTML=`<div class="foreman-response" style="margin-top:14px"><div style="font-size:10px;color:var(--accent);margin-bottom:8px;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.06em">🔨 THE FOREMAN SAYS:</div><div class="foreman-answer">"${(data.answer||'').replace(/"/g,'')}"</div></div>`;
  }catch(e){
    if(resp)resp.innerHTML=`<div class="foreman-response" style="margin-top:14px"><div style="color:#ff6b6b">Foreman's off the grid. Check conditions manually.</div></div>`;
  }
}

document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(document.getElementById('foremanModal').classList.contains('open'))closeForeman();
    else if(document.getElementById('dayModal').classList.contains('open'))closeModalBtn();
    else if(document.getElementById('settingsModal').classList.contains('open'))closeSettings();
  }
});

// ── FOREMAN MODAL (kept for popstate compat) ─────────────
function openForeman(){switchTab('foreman');}
function closeForemanSilent(){document.getElementById('foremanModal').classList.remove('open');}
function closeForemanOverlay(e){if(e.target===document.getElementById('foremanModal'))closeForeman();}
function closeForeman(){if(!document.getElementById('foremanModal').classList.contains('open'))return;closeForemanSilent();history.back();}
