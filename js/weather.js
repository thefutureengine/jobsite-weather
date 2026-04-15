// ── TRADE ALERTS ──────────────────────────────────────────
function getTradeAlerts(temp,windMph,precip,wmo,rh){
  const trade=TRADE_CONFIG[currentTrade]||TRADE_CONFIG.general;
  const alerts=[];
  const hi=heatIdx(temp,rh);
  const isStorm=DANGER.has(wmo);
  const isRain=WARN.has(wmo)||precip>0.1;
  if(isStorm)return[{level:'danger',msg:"Sky's throwing a fit. Get off the jobsite, it's not worth it."}];
  const wd=trade.windDanger||45,wc=trade.windCaution||25;
  if(currentTrade==='roofing'){
    if(windMph>=wd)alerts.push({level:'danger',msg:`${windMph} mph — the roof isn't going anywhere. You might be.`});
    else if(windMph>=wc)alerts.push({level:'caution',msg:`${windMph} mph gusting up there. Hold your felt and your hat.`});
    if(isRain)alerts.push({level:'danger',msg:'Wet roof. Gravity wins every time. Call it.'});
  }else if(currentTrade==='concrete'){
    if(temp<40)alerts.push({level:'danger',msg:`${temp}°F — concrete cures slower than your Monday morning crew.`});
    else if(temp<50)alerts.push({level:'caution',msg:`${temp}°F — she'll cure, just not on your schedule. Use cold-weather mix.`});
    if(temp>90)alerts.push({level:'caution',msg:`${temp}°F and climbing — add water reducer or add regrets.`});
    if(isRain||precip>0.05)alerts.push({level:'danger',msg:'Rain on fresh concrete. Bold move. Don\'t.'});
  }else if(currentTrade==='electrical'){
    if(isRain)alerts.push({level:'danger',msg:'It\'s raining. Outdoor electrical and water have a well-documented relationship.'});
    if(windMph>=wd)alerts.push({level:'caution',msg:`${windMph} mph — secure your conduit runs and anything that can fly.`});
  }else if(currentTrade==='painting'){
    if(isRain||precip>0.01)alerts.push({level:'danger',msg:'Any moisture ruins fresh paint. Today\'s exterior work is tomorrow\'s sanding project.'});
    if(temp<50)alerts.push({level:'danger',msg:`${temp}°F — paint won't bond. You'll be back to sand it anyway.`});
    if(temp>95)alerts.push({level:'caution',msg:`${temp}°F — dries too fast, brush marks guaranteed. Work early or don't work.`});
    if(windMph>=wc)alerts.push({level:'caution',msg:`${windMph} mph — that's not overspray, that's your neighbor's car.`});
  }else if(currentTrade==='framing'){
    if(windMph>=wd)alerts.push({level:'danger',msg:`${windMph} mph — walls go up easier than they come down sideways.`});
    else if(windMph>=wc)alerts.push({level:'caution',msg:`${windMph} mph — that wall panel is a sail. Tie it off.`});
    if(isRain)alerts.push({level:'caution',msg:'Wet lumber moves, warps, and swells. Tomorrow\'s problem is today\'s decision.'});
  }else if(currentTrade==='plumbing'){
    if(temp<32)alerts.push({level:'danger',msg:`${temp}°F — pipes don't care about your schedule.`});
    else if(temp<40)alerts.push({level:'caution',msg:`${temp}°F and dropping. Keep an eye on exposed runs overnight.`});
  }else if(currentTrade==='hvac'){
    if(windMph>=wd)alerts.push({level:'danger',msg:`${windMph} mph — no rooftop unit work today. Come back when it's calm.`});
    else if(windMph>=wc)alerts.push({level:'caution',msg:`${windMph} mph up top. Strap it down before it becomes an insurance claim.`});
    if(hi>=95)alerts.push({level:'caution',msg:`${hi}°F heat index — you're essentially inside an oven. Hydrate or go home.`});
  }else if(currentTrade==='excavation'){
    if(isRain||precip>0.1)alerts.push({level:'caution',msg:'Rain makes ground unstable. Check your trench walls — OSHA definitely will.'});
    if(windMph>=wd)alerts.push({level:'caution',msg:`${windMph} mph — dust is your whole atmosphere right now.`});
  }else if(currentTrade==='landscaping'){
    if(windMph>=wd)alerts.push({level:'danger',msg:`${windMph} mph — skip the spraying. You're just donating chemicals to the neighbors.`});
    if(hi>=100)alerts.push({level:'caution',msg:`${hi}°F heat index — your crew is not a cactus. Get them water and shade.`});
  }else if(currentTrade==='farming'){
    if(temp<28)alerts.push({level:'danger',msg:`${temp}°F — hard freeze. Crops and equipment both hate this. Move fast.`});
    else if(temp<34)alerts.push({level:'caution',msg:`${temp}°F — frost possible overnight. Keep an eye on it.`});
    if(windMph>=wd)alerts.push({level:'danger',msg:`${windMph} mph — equipment stability risk. Park it and wait it out.`});
    else if(windMph>=wc)alerts.push({level:'caution',msg:`${windMph} mph — hold off on spraying. You'll just be chasing drift all day.`});
    if(isRain||precip>0.1)alerts.push({level:'caution',msg:'Field\'s soft. Run heavy equipment now and you\'ll regret it for weeks.'});
  }else if(currentTrade==='gc'){
    if(windMph>=wd)alerts.push({level:'danger',msg:`${windMph} mph — coordinate all trade crews. High wind across the site.`});
    if(isRain||precip>0.3)alerts.push({level:'danger',msg:'Rain affecting multiple trades on site. Adjust schedules.'});
    if(temp<32)alerts.push({level:'danger',msg:`${temp}°F — freezing. Concrete and masonry holds, check all trades.`});
    else if(windMph>=wc)alerts.push({level:'caution',msg:`${windMph} mph — check crane and lift operations.`});
  }else if(currentTrade==='architect'){
    if(isRain||precip>0.5)alerts.push({level:'caution',msg:'Rain likely — site visit conditions poor.'});
    if(windMph>=30)alerts.push({level:'caution',msg:`${windMph} mph — outdoor inspection difficult.`});
    if(temp<20)alerts.push({level:'danger',msg:`${temp}°F — extreme cold. Limit site exposure time.`});
  }else if(currentTrade==='inspector'){
    if(isRain||precip>0.4)alerts.push({level:'caution',msg:'Rain — exterior inspection conditions poor.'});
    if(temp<10)alerts.push({level:'danger',msg:`${temp}°F — extreme cold. Limit outdoor exposure.`});
  }else if(currentTrade==='surveyor'){
    if(windMph>=wd)alerts.push({level:'danger',msg:`${windMph} mph — wind affecting instrument accuracy.`});
    if(isRain||precip>0.3)alerts.push({level:'danger',msg:'Rain — equipment and visibility issues.'});
  }else if(currentTrade==='solar'){
    if(windMph>=wd)alerts.push({level:'danger',msg:`${windMph} mph — wind too high for panel handling.`});
    if(isRain)alerts.push({level:'danger',msg:'Wet roof — no installation today.'});
    else if(windMph>=wc)alerts.push({level:'caution',msg:`${windMph} mph — use caution with large panels.`});
  }else if(currentTrade==='demolition'){
    if(windMph>=wd)alerts.push({level:'danger',msg:`${windMph} mph — debris control required. Wind is a hazard.`});
    if(isRain||precip>0.3)alerts.push({level:'caution',msg:'Rain — dust suppression active, mud hazard on site.'});
  }else{
    if(windMph>=wd)alerts.push({level:'danger',msg:`${windMph} mph — secure everything that can move and get off elevated work.`});
    else if(windMph>=wc)alerts.push({level:'caution',msg:`${windMph} mph — tie down your materials. Wind doesn't care about your bid sheet.`});
    if(isRain)alerts.push({level:'caution',msg:`${WMO[wmo]||'Rain'} moving through. Keep an eye on it.`});
  }
  if(hi>=105)alerts.push({level:'danger',msg:`Heat index ${hi}°F — mandatory breaks, no exceptions. This is how people die on jobsites.`});
  else if(hi>=95)alerts.push({level:'caution',msg:`Heat index ${hi}°F — water, shade, rotate your crew. Don't be a hero.`});
  if(temp<28)alerts.push({level:'danger',msg:`${temp}°F — frostbite is faster than you think. Limit exposure.`});
  return alerts;
}

function getWorkabilityAllClear(){
  const msgs={roofing:'Clear skies, calm wind. Good day to be on a roof.',concrete:'Temps and conditions are dialed in. Pour with confidence.',electrical:'Dry and calm. Go make sparks — the intentional kind.',painting:'Low wind, good temp, no rain. Perfect coat weather.',framing:'Conditions look solid. Go make some noise.',plumbing:'No freeze risk, no storms. Good day for pipe.',hvac:'Clean conditions. Rooftop work is a go.',excavation:'Ground should be stable. Dig away.',landscaping:'Good day to make it look like you planned it this way.',farming:'Field conditions look favorable. Make hay while the sun shines — literally.',gc:'All trades clear. Good day to run the site.',architect:'Clear conditions. Good day for site visits.',inspector:'Inspection conditions favorable. Get it done.',surveyor:'Calm and clear. Instruments will be accurate.',solar:'Low wind, dry roof. Install day.',demolition:'Clear conditions. Knock it down.',general:'No issues flagged. Go make some money.'};
  return msgs[currentTrade]||msgs.general;
}

// ── API ────────────────────────────────────────────────────
async function fetchWx(lat,lon){
  const u=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,uv_index&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,precipitation,snowfall&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant,uv_index_max,sunrise,sunset,precipitation_sum,snowfall_sum&wind_speed_unit=kmh&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto&forecast_days=7`;
  console.log('[fetchWx] Fetching:',lat,lon);
  try{
    const r=await fetch(u);
    console.log('[fetchWx] Status:',r.status,r.ok);
    if(!r.ok)throw new Error('Open-Meteo HTTP '+r.status);
    const d=await r.json();
    console.log('[fetchWx] Success, keys:',Object.keys(d));
    return d;
  }catch(e){
    console.error('[fetchWx] FAILED:',e.name,e.message,e);
    throw e;
  }
}

async function fetchNWSAlerts(lat,lon){
  try{
    const r=await fetch(`https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`,{headers:{Accept:'application/geo+json','User-Agent':'JobSiteWeather/1.0 (support@strickercosolutions.com)'}});
    if(!r.ok)return[];
    const d=await r.json();
    return(d.features||[]).map(f=>({event:f.properties.event,severity:f.properties.severity,headline:f.properties.headline,expires:f.properties.expires,urgency:f.properties.urgency}));
  }catch(e){return[];}
}

async function fetchTomorrowForecast(lat,lon){
  try{
    const r=await fetch(`https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lon}&apikey=${TOMORROW_KEY}`);
    const d=await r.json();
    return d.timelines?.hourly||[];
  }catch(e){return[];}
}

// ── ALERTS ────────────────────────────────────────────────
function setAlert(type,title,body){
  const b=document.getElementById('alertBanner');
  b.className='alert '+type;b.style.display='block';
  b.innerHTML=`<div class="alert-head">${title}</div><div class="alert-body">${body}</div>`;
}
function clearAlert(){document.getElementById('alertBanner').style.display='none';}

function getDismissedAlerts(){
  try{return JSON.parse(sessionStorage.getItem('jw_dismissed_alerts')||'[]');}catch(e){return[];}
}
function dismissAlert(event){
  const list=getDismissedAlerts();
  if(!list.includes(event)){list.push(event);sessionStorage.setItem('jw_dismissed_alerts',JSON.stringify(list));}
}

function renderNWSAlerts(alerts){
  const wrap=document.getElementById('nwsAlerts');
  if(!alerts?.length){wrap.innerHTML='';return;}
  const dismissed=getDismissedAlerts();
  const visible=alerts.filter(a=>!dismissed.includes(a.event)).slice(0,3);
  if(!visible.length){wrap.innerHTML='';return;}
  const SEVERE=new Set(['Tornado Warning','Tornado Watch','Severe Thunderstorm Warning','Severe Thunderstorm Watch','Flash Flood Warning','Flash Flood Watch','Blizzard Warning','Ice Storm Warning','Winter Storm Warning','Extreme Wind Warning','Hurricane Warning','Tropical Storm Warning']);
  const html=visible.map(a=>{
    const isSev=SEVERE.has(a.event)||a.severity==='Extreme'||a.urgency==='Immediate';
    const exp=a.expires?new Date(a.expires).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'';
    const safeEvent=a.event.replace(/'/g,"\\'");
    return`<div class="nws-alert ${isSev?'nws-severe':'nws-moderate'}" data-event="${a.event.replace(/"/g,'&quot;')}">
      <button class="nws-dismiss" onclick="dismissNWSAlert(this)" title="Dismiss">×</button>
      <div class="nws-event">${isSev?'⚠ ':''}${a.event}</div>
      <div class="nws-headline">${a.headline||''}</div>
      ${exp?`<div class="nws-exp">Until ${exp}</div>`:''}
    </div>`;
  }).join('');
  wrap.innerHTML=`<div style="padding:0 16px;margin-top:8px">${html}</div>`;
  // Wire swipe-to-dismiss on each card
  wrap.querySelectorAll('.nws-alert').forEach(card=>{
    let sx=0,sy=0;
    card.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY;card.classList.add('swiping');},{passive:true});
    card.addEventListener('touchmove',e=>{
      const dx=e.touches[0].clientX-sx;
      const dy=e.touches[0].clientY-sy;
      if(Math.abs(dx)>Math.abs(dy)*1.5){card.style.transform=`translateX(${dx}px)`;card.style.opacity=Math.max(0,1-Math.abs(dx)/200);}
    },{passive:true});
    card.addEventListener('touchend',e=>{
      card.classList.remove('swiping');
      const dx=e.changedTouches[0].clientX-sx;
      if(Math.abs(dx)>80){
        card.classList.add('dismissed');
        const event=card.dataset.event;
        dismissAlert(event);
        setTimeout(()=>{card.remove();if(!wrap.querySelector('.nws-alert'))wrap.innerHTML='';},250);
      } else {card.style.transform='';card.style.opacity='';}
    },{passive:true});
  });
}

function dismissNWSAlert(btn){
  const card=btn.closest('.nws-alert');
  if(!card)return;
  card.classList.add('dismissed');
  dismissAlert(card.dataset.event);
  const wrap=document.getElementById('nwsAlerts');
  setTimeout(()=>{card.remove();if(!wrap.querySelector('.nws-alert'))wrap.innerHTML='';},250);
}

function renderAlerts(temp,windMph,precip,wmo,rh,hourly){
  const tradeAlerts=getTradeAlerts(temp,windMph,precip,wmo,rh);
  if(tradeAlerts.length){
    const top=tradeAlerts[0];
    setAlert(top.level==='danger'?'danger':'warning',top.level==='danger'?'⚠ Heads Up':'⚠ Take Note',tradeAlerts.map(a=>a.msg).join(' · '));
    checkPushAlerts(tradeAlerts,nwsAlerts);
    return;
  }
  const future=hourly.filter(h=>h.t>new Date()).slice(0,5);
  const idx=future.findIndex(h=>DANGER.has(h.wmo));
  if(idx>=0){
    const hrs=idx+1;
    setAlert('warning',`Storm rolling in — ${hrs} hr${hrs>1?'s':''} out`,`${WMO[future[idx].wmo]||'Severe weather'} on the way. Plan to wrap up or button it down.`);
    return;
  }
  clearAlert();
}

function workability(temp,windMph,precip,wmo,rh){
  const a=getTradeAlerts(temp,windMph,precip,wmo,rh);
  if(!a.length)return{l:'Good to go',d:'safe'};
  if(a.some(x=>x.level==='danger'))return{l:'Halt work',d:'danger'};
  return{l:'Use caution',d:'caution'};
}
function windRisk(mph){if(mph<15)return{l:'Calm',d:'safe'};if(mph<30)return{l:'Breezy',d:'safe'};if(mph<45)return{l:'Windy',d:'caution'};return{l:'High winds',d:'danger'};}
function heatRisk(hi){if(hi>=105)return{l:'Extreme',d:'danger'};if(hi>=95)return{l:'Caution',d:'caution'};return{l:'Normal',d:'safe'};}

// ── RENDER CONDITIONS ─────────────────────────────────────
function renderConditions(el){
  const c=currentData.current;
  const temp=Math.round(c.temperature_2m);
  const feels=Math.round(c.apparent_temperature);
  const rh=Math.round(c.relative_humidity_2m);
  const windMph=kmh2mph(Math.round(c.wind_speed_10m));
  const gustMph=kmh2mph(Math.round(c.wind_gusts_10m));
  const windDeg=Math.round(c.wind_direction_10m||0);
  const wmo=c.weather_code;
  const hi=heatIdx(temp,rh);
  const precip=c.precipitation||0;
  const uv=Math.round(c.uv_index||0);
  const uvLabel=uv<=2?'Low':uv<=5?'Moderate':uv<=7?'High':uv<=10?'Very High':'Extreme';
  const wk=workability(temp,windMph,precip,wmo,rh);
  const wr=windRisk(windMph);
  const hr2=heatRisk(hi);
  const rainPct=currentData.daily.precipitation_probability_max[0]||0;
  const rainSt=rainPct>60?{l:`${rainPct}% rain`,d:'danger'}:rainPct>30?{l:`${rainPct}% rain`,d:'caution'}:{l:`${rainPct}% rain`,d:'safe'};
  const tradeName=(TRADE_CONFIG[currentTrade]||TRADE_CONFIG.general).name;
  const sunrise=currentData.daily.sunrise?.[0]?fmtTime(currentData.daily.sunrise[0]):'--';
  const sunset=currentData.daily.sunset?.[0]?fmtTime(currentData.daily.sunset[0]):'--';
  const dirLabel=windDirLabel(windDeg);

  const now2=new Date();
  const hourly=currentData.hourly.time.map((t,i)=>({
    t:new Date(t),temp:Math.round(currentData.hourly.temperature_2m[i]),
    prob:currentData.hourly.precipitation_probability[i]||0,
    wmo:currentData.hourly.weather_code[i],
    wind:kmh2mph(Math.round(currentData.hourly.wind_speed_10m[i])),
    rh:Math.round(currentData.hourly.relative_humidity_2m[i]||rh),
    precip:currentData.hourly.precipitation?.[i]||0,
    snow:currentData.hourly.snowfall?.[i]||0
  })).filter(h=>h.t>=now2).slice(0,10);

  renderAlerts(temp,windMph,precip,wmo,rh,hourly);

  // Compute workability status for each hour using Open-Meteo data
  const hrStatuses=hourly.map(h=>{
    const a=getTradeAlerts(h.temp,h.wind,h.precip,h.wmo,h.rh);
    return a.length===0?'safe':a.some(x=>x.level==='danger')?'danger':'caution';
  });

  const hrHTML=hourly.map((h,i)=>{
    const isDanger=DANGER.has(h.wmo),isWarn=WARN.has(h.wmo);
    const cls=isDanger?'danger-hr':isWarn?'alert-hr':'';
    const fmt=h.t.toLocaleTimeString([],{hour:'numeric',hour12:true});
    const precipLine=h.snow>0.01?`<div class="hr-pct" style="color:#a8d8ff">${h.snow.toFixed(2)}"❄️</div>`:h.precip>0.01?`<div class="hr-pct">${h.precip.toFixed(2)}"</div>`:h.prob>15?`<div class="hr-pct">${h.prob}%</div>`:'<div class="hr-pct" style="opacity:0">·</div>';
    const statusDot=`<div class="dot ${dotClass(hrStatuses[i])}" style="margin:0 auto 4px"></div>`;
    return`<div class="hr-item ${cls}">${statusDot}<div class="hr-time">${fmt}</div><div class="hr-ico">${ICO[h.wmo]||'☁️'}</div><div class="hr-tmp">${h.temp}°</div>${precipLine}<div class="hr-wind">${h.wind}mph</div></div>`;
  }).join('');

  // Workability summary line
  const firstBad=hrStatuses.findIndex(s=>s==='danger');
  const firstGood=hrStatuses.findIndex(s=>s==='safe');
  const allGood=hrStatuses.every(s=>s==='safe');
  const allBad=hrStatuses.every(s=>s==='danger');
  const userName=localStorage.getItem('jw_user_name')||'Boss';
  let wwSummary='';
  const goodLines=[
    `Clean day ahead, ${userName}. Go make some money.`,
    `No excuses today, ${userName}. The way you do one thing is the way you do everything.`,
    `${userName} — clear all day. Set the standard.`,
    `Conditions are dialed in, ${userName}. No one's coming to save the bid — go get it.`
  ];
  if(allGood)wwSummary=goodLines[new Date().getDate()%goodLines.length];
  else if(allBad)wwSummary=`Not today, ${userName}. Button it up and live to fight another day.`;
  else if(firstBad===0&&firstGood>0){
    const t=hourly[firstGood].t.toLocaleTimeString([],{hour:'numeric',minute:'2-digit',hour12:true});
    wwSummary=`Rough start, ${userName}. Window opens around ${t}. Be ready.`;
  } else if(firstBad>0){
    const t=hourly[firstBad].t.toLocaleTimeString([],{hour:'numeric',minute:'2-digit',hour12:true});
    wwSummary=`Good window now, ${userName}. Conditions turn around ${t} — plan your move.`;
  } else wwSummary=`Mixed day, ${userName}. Adapt and get after it.`;

  el.innerHTML=`<div class="fade-in">
    <div class="hero">
      <div class="trade-badge">⚙ ${tradeName} conditions</div>
      <div class="city">${currentLabel}</div>
      <div class="hero-main">
        <div><span class="temp-display">${temp}</span><span class="temp-unit">°F</span></div>
        <div class="wx-icon">${ICO[wmo]||'☁️'}</div>
      </div>
      <div class="condition-row">${WMO[wmo]||'Unknown'}</div>
      <div class="feels">Feels like ${feels}°F &nbsp;·&nbsp; ${rh}% humidity</div>
      <div class="sun-strip">
        <div class="sun-item"><span class="sun-ico">🌅</span><span class="sun-label">Sunrise</span><span class="sun-val">${sunrise}</span></div>
        <div class="sun-item"><span class="sun-ico">🌇</span><span class="sun-label">Sunset</span><span class="sun-val">${sunset}</span></div>
        <div class="sun-item" style="margin-left:auto"><span class="sun-ico">💧</span><span class="sun-label">Humidity</span><span class="sun-val">${rh}%</span></div>
      </div>
    </div>
    <div class="stats-row">
      <div class="stat-box wind-box" onclick="showWindDetail()">
        <div class="stat-lbl">Wind</div>
        <div class="stat-val">${windMph} <span style="font-size:14px;color:var(--muted)">mph</span></div>
        <div class="stat-sub wind-dir"><span ${windArrowStyle(windDeg)}>↑</span> ${dirLabel} · gusts ${gustMph}</div>
      </div>
      <div class="stat-box">
        <div class="stat-lbl">UV Index</div>
        <div class="stat-val">${uv}</div>
        <div class="stat-sub">${uvLabel}</div>
      </div>
      <div class="stat-box">
        <div class="stat-lbl">Rain today</div>
        <div class="stat-val">${rainPct}<span style="font-size:14px;color:var(--muted)">%</span></div>
        <div class="stat-sub">chance</div>
      </div>
    </div>
    <div class="section">
      <div class="sec-label">Field conditions · ${tradeName}</div>
      <div class="field-grid">
        <div class="field-item"><div class="dot ${dotClass(wk.d)}"></div><div><div class="fi-lbl">Workability</div><div class="fi-val">${wk.d==='safe'?getWorkabilityAllClear():wk.l}</div></div></div>
        <div class="field-item"><div class="dot ${dotClass(wr.d)}"></div><div><div class="fi-lbl">Wind risk</div><div class="fi-val">${wr.l}</div></div></div>
        <div class="field-item"><div class="dot ${dotClass(hr2.d)}"></div><div><div class="fi-lbl">Heat index</div><div class="fi-val">${hi}°F</div></div></div>
        <div class="field-item"><div class="dot ${dotClass(rainSt.d)}"></div><div><div class="fi-lbl">Precip</div><div class="fi-val">${rainSt.l}</div></div></div>
      </div>
    </div>
    <div class="section">
      <div class="sec-label">Next 10 hours</div>
      ${(()=>{
        const isTouchDevice=('ontouchstart' in window)||(navigator.maxTouchPoints>0)||(navigator.msMaxTouchPoints>0);
        const arrowLeft=isTouchDevice?'':`<button class="hourly-arrow left" id="hourlyLeft">‹</button>`;
        const arrowRight=isTouchDevice?'':`<button class="hourly-arrow right" id="hourlyRight">›</button>`;
        return `<div class="hourly-section">
        ${arrowLeft}
        <div class="hourly-wrap" id="hourlyScroll"><div class="hourly-inner">${hrHTML}</div></div>
        ${arrowRight}
      </div>`;
      })()}
      ${wwSummary?`<div style="font-size:12px;color:var(--muted);line-height:1.6;margin-top:8px">👷 ${wwSummary}</div>`:''}
    </div>
  </div>`;

  // Site notes — show for current location (match saved loc or use currentLabel)
  const noteLocLabel=getNoteLocLabel();
  if(noteLocLabel&&isPro()){
    const notes=JSON.parse(localStorage.getItem('jw_notes')||'{}');
    const note=notes[noteLocLabel]||'';
    if(note){
      el.innerHTML+=`<div class="site-note-card" id="siteNoteCard">
        <div class="note-header"><span class="note-label">📋 Job Site Note</span><div class="note-actions"><button class="note-action" onclick="editSiteNote()">Edit</button><button class="note-action" onclick="deleteSiteNote()">Delete</button></div></div>
        <div class="note-text">${note.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
      </div>`;
    } else {
      el.innerHTML+=`<div class="add-note-link" onclick="editSiteNote()">✏️ Add a job site note for ${noteLocLabel}</div>`;
    }
  } else if(!isPro()){
    el.innerHTML+=`<div class="add-note-link" onclick="showPaywall('notes')">🔒 Job Site Notes · Pro</div>`;
  }

  // Wire hourly scroll arrows
  const hLeft=document.getElementById('hourlyLeft');
  const hRight=document.getElementById('hourlyRight');
  const hScroll=document.getElementById('hourlyScroll');
  if(hLeft&&hRight&&hScroll){
    hLeft.addEventListener('click',()=>{hScroll.scrollBy({left:-220,behavior:'smooth'});});
    hRight.addEventListener('click',()=>{hScroll.scrollBy({left:220,behavior:'smooth'});});
  }
}

// ── STORM BANNER ──────────────────────────────────────────
function renderStormBanner(){
  const existing=document.getElementById('stormBanner');
  if(existing)existing.remove();
  if(!tomorrowHourly.length)return;
  if(sessionStorage.getItem('jw_storm_dismissed'))return;
  const now=new Date();
  let firstRainIdx=-1;
  for(let i=0;i<Math.min(tomorrowHourly.length,6);i++){
    const v=tomorrowHourly[i].values;
    if(v&&v.precipitationIntensity>0.1){firstRainIdx=i;break;}
  }
  if(firstRainIdx<0)return;
  const hours=firstRainIdx+1;
  let cls,msg;
  if(hours<=1){cls='storm-red';msg='⚠ Rain arriving soon — wrap up what you can';}
  else if(hours<=3){cls='storm-amber';msg=`⚠ Rain ~${hours} hrs out — plan your window`;}
  else{cls='storm-amber';msg='Rain possible this afternoon — keep an eye on it';}
  const hero=document.querySelector('.hero');
  if(!hero)return;
  const div=document.createElement('div');
  div.id='stormBanner';div.className=`storm-banner ${cls}`;
  div.innerHTML=`${msg}<button class="storm-x" onclick="this.parentElement.remove();sessionStorage.setItem('jw_storm_dismissed','1')">×</button>`;
  hero.after(div);
}

// ── RENDER FORECAST ───────────────────────────────────────
function renderForecast(el){
  const daily=currentData.daily;
  const allT=[...daily.temperature_2m_max,...daily.temperature_2m_min];
  const tMin=Math.min(...allT),tMax=Math.max(...allT);

  const rows=daily.time.slice(0,7).map((t,i)=>{
    const d=new Date(t+'T12:00:00');
    const lbl=i===0?'Today':i===1?'Tmrw':DAYS[d.getDay()];
    const hi=Math.round(daily.temperature_2m_max[i]),lo=Math.round(daily.temperature_2m_min[i]);
    const bl=Math.max(0,Math.round((lo-tMin)/(tMax-tMin)*100));
    const bw=Math.max(10,Math.round((hi-lo)/(tMax-tMin)*100));
    const rain=daily.precipitation_sum?.[i]||0;
    const snow=daily.snowfall_sum?.[i]||0;
    const windMax=kmh2mph(Math.round(daily.wind_speed_10m_max?.[i]||0));
    const windDomDir=windDirLabel(daily.wind_direction_10m_dominant?.[i]);
    const precipTag=snow>0.1?`<span style="font-size:10px;color:#a8d8ff">${snow.toFixed(1)}"❄️</span>`:rain>0.1?`<span style="font-size:10px;color:var(--blue)">${rain.toFixed(2)}"</span>`:'';
    return`<div class="fc-row" onclick="openDayModal(${i})" data-day="${i}">
      <div class="fc-day">${lbl}</div>
      <div class="fc-ico">${ICO[daily.weather_code[i]]||'☁️'}</div>
      <div class="fc-bar-wrap"><div class="fc-bar" style="left:${bl}%;width:${bw}%"></div></div>
      <div style="font-size:10px;color:var(--muted);min-width:48px;text-align:center">${windMax}mph ${windDomDir}</div>
      <div class="fc-temps"><span class="fc-hi">${hi}°</span><span class="fc-lo">${lo}°</span>${precipTag}</div>
      <div class="fc-chevron">›</div>
    </div>`;
  }).join('');

  el.innerHTML=`<div class="section fade-in" style="padding-top:12px">
    <div class="sec-label">7-day outlook · tap or swipe row for details</div>
    ${rows}
  </div>`;

  // Wire up swipe-right on each forecast row to open modal
  el.querySelectorAll('.fc-row').forEach(row=>{
    let rx=0,ry=0,rt=0;
    row.addEventListener('touchstart',e=>{rx=e.touches[0].clientX;ry=e.touches[0].clientY;rt=Date.now();},{passive:true});
    row.addEventListener('touchend',e=>{
      const dx=e.changedTouches[0].clientX-rx;
      const dy=e.changedTouches[0].clientY-ry;
      const dt=Date.now()-rt;
      if(dt<400&&dx>40&&Math.abs(dy)<40){
        // swipe right on a row = open that day's detail
        row.style.transform='translateX(8px)';
        setTimeout(()=>{row.style.transform='';openDayModal(+row.dataset.day);},120);
      }
    },{passive:true});
  });
}

// ── WIND DETAIL (tap stat box) ────────────────────────────
function showWindDetail(){
  if(!currentData)return;
  navPush('modal');
  const c=currentData.current;
  const windMph=kmh2mph(Math.round(c.wind_speed_10m));
  const gustMph=kmh2mph(Math.round(c.wind_gusts_10m));
  const deg=Math.round(c.wind_direction_10m||0);
  const dir=windDirLabel(deg);
  document.getElementById('modalInner').innerHTML=`
    <button class="modal-close" onclick="closeModalBtn()">✕</button>
    <div class="modal-title">💨 Wind Detail</div>
    <div class="modal-sub">${currentLabel}</div>
    <div style="text-align:center;padding:1.5rem 0 1rem">
      <div style="font-size:72px;transition:transform 0.5s" ${windArrowStyle(deg)}>↑</div>
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:18px;margin-top:8px;color:var(--muted)">${dir} · ${deg}°</div>
    </div>
    <div class="detail-stats">
      <div class="modal-stat"><div class="stat-lbl">Speed</div><div class="stat-val">${windMph}</div><div class="stat-sub">mph</div></div>
      <div class="modal-stat"><div class="stat-lbl">Gusts</div><div class="stat-val">${gustMph}</div><div class="stat-sub">mph</div></div>
      <div class="modal-stat"><div class="stat-lbl">Direction</div><div class="stat-val">${dir}</div><div class="stat-sub">${deg}°</div></div>
    </div>
    <div class="assessment-box">
      <div class="stat-lbl" style="margin-bottom:6px">Trade impact</div>
      <div style="font-size:13px;color:var(--muted);line-height:1.6">
        ${getWindTradeNote(windMph)}
      </div>
    </div>`;
  document.getElementById('dayModal').classList.add('open');
}

function getWindTradeNote(mph){
  if(mph<10)return'Calm conditions — favorable for all trade work including roofing and painting.';
  if(mph<15)return'Light breeze — generally safe for all trades. Minimal impact on overhead work.';
  if(mph<20)return'Moderate wind — use caution on scaffolding and roof work. Secure loose materials.';
  if(mph<25)return'Roofing caution threshold reached. Elevated risk for work above 10 feet. Secure all panels and materials.';
  if(mph<30)return'Roofing stop threshold — winds exceed safe limits for most roof work. Framing crews should secure wall panels.';
  if(mph<40)return'High wind advisory — most elevated trade work should stop. Ground-level work still feasible.';
  return'Dangerous wind — halt all outdoor trade work. Secure equipment and materials immediately.';
}

// ── DAY MODAL ─────────────────────────────────────────────
function openDayModal(dayIndex){
  if(!currentData)return;
  navPush('modal');
  const daily=currentData.daily;
  const t=daily.time[dayIndex];
  const d=new Date(t+'T12:00:00');
  const lbl=dayIndex===0?'Today':dayIndex===1?'Tomorrow':DAYS[d.getDay()]+' '+d.toLocaleDateString([],{month:'short',day:'numeric'});
  const hi=Math.round(daily.temperature_2m_max[dayIndex]);
  const lo=Math.round(daily.temperature_2m_min[dayIndex]);
  const wmo=daily.weather_code[dayIndex];
  const rain=daily.precipitation_probability_max[dayIndex]||0;
  const rainTotal=daily.precipitation_sum?.[dayIndex]||0;
  const snowTotal=daily.snowfall_sum?.[dayIndex]||0;
  const wind=kmh2mph(Math.round(daily.wind_speed_10m_max?.[dayIndex]||0));
  const windDir=windDirLabel(daily.wind_direction_10m_dominant?.[dayIndex]);
  const uv=Math.round(daily.uv_index_max?.[dayIndex]||0);
  const sunrise=daily.sunrise?.[dayIndex]?fmtTime(daily.sunrise[dayIndex]):'--';
  const sunset=daily.sunset?.[dayIndex]?fmtTime(daily.sunset[dayIndex]):'--';
  const tradeName=(TRADE_CONFIG[currentTrade]||TRADE_CONFIG.general).name;

  const dayStart=new Date(t+'T00:00:00');
  const dayEnd=new Date(t+'T23:59:59');
  const dayHours=currentData.hourly.time.map((ht,i)=>({
    t:new Date(ht),temp:Math.round(currentData.hourly.temperature_2m[i]),
    prob:currentData.hourly.precipitation_probability[i]||0,
    wmo:currentData.hourly.weather_code[i],
    wind:kmh2mph(Math.round(currentData.hourly.wind_speed_10m[i]))
  })).filter(h=>h.t>=dayStart&&h.t<=dayEnd);

  const hourlyHTML=dayHours.map(h=>{
    const fmt=h.t.toLocaleTimeString([],{hour:'numeric',hour12:true});
    const isDanger=DANGER.has(h.wmo),isWarn=WARN.has(h.wmo);
    return`<div class="dh-item${isDanger?' danger-hr':isWarn?' alert-hr':''}">
      <div class="dh-time">${fmt}</div>
      <div class="dh-ico">${ICO[h.wmo]||'☁️'}</div>
      <div class="dh-tmp">${h.temp}°</div>
      ${h.prob>10?`<div class="dh-pct">${h.prob}%</div>`:''}
      <div class="dh-wind">${h.wind}mph</div>
    </div>`;
  }).join('');

  const dayAlerts=getTradeAlerts(Math.round((hi+lo)/2),wind,rain>40?0.15:0,wmo,60);
  const dayStatus=dayAlerts.length===0?`<span style="color:var(--safe)">✓ ${getWorkabilityAllClear()}</span>`:dayAlerts.map(a=>`<span style="color:${a.level==='danger'?'#ff6b6b':'var(--accent)'}">${a.msg}</span>`).join('<br>');

  document.getElementById('modalInner').innerHTML=`
    <button class="modal-close" onclick="closeModalBtn()">✕</button>
    <div class="modal-title">${ICO[wmo]||'☁️'} ${lbl}</div>
    <div class="modal-sub">${WMO[wmo]||''} · High ${hi}° / Low ${lo}°</div>
    <div class="detail-stats">
      <div class="modal-stat"><div class="stat-lbl">Rain chance</div><div class="stat-val">${rain}%</div></div>
      <div class="modal-stat"><div class="stat-lbl">Wind max</div><div class="stat-val">${wind}</div><div class="stat-sub">mph ${windDir}</div></div>
      <div class="modal-stat"><div class="stat-lbl">UV Index</div><div class="stat-val">${uv}</div></div>
    </div>
    ${(rainTotal>0.01||snowTotal>0.1)?`<div class="detail-stats">
      ${rainTotal>0.01?`<div class="modal-stat"><div class="stat-lbl">Rain total</div><div class="stat-val">${rainTotal.toFixed(2)}"</div></div>`:''}
      ${snowTotal>0.1?`<div class="modal-stat"><div class="stat-lbl">Snow total</div><div class="stat-val">${snowTotal.toFixed(1)}"</div></div>`:''}
    </div>`:''}
    <div class="assessment-box">
      <div class="stat-lbl" style="margin-bottom:6px">${tradeName} assessment</div>
      <div style="font-size:13px;line-height:1.6">${dayStatus}</div>
    </div>
    <div class="modal-stat" style="margin-bottom:1rem;padding:10px 14px;display:flex;gap:2rem;">
      <div><div class="stat-lbl">Sunrise</div><div style="font-size:15px;font-weight:600">🌅 ${sunrise}</div></div>
      <div><div class="stat-lbl">Sunset</div><div style="font-size:15px;font-weight:600">🌇 ${sunset}</div></div>
    </div>
    <div class="sec-label">Hourly breakdown</div>
    <div class="dh-grid">${hourlyHTML||'<div style="color:var(--muted);font-size:13px;padding:8px 0">Hourly data unavailable</div>'}</div>`;
  document.getElementById('dayModal').classList.add('open');
}

function closeModal(e){if(e.target===document.getElementById('dayModal'))closeModalBtn();}
function closeModalBtn(){
  if(!document.getElementById('dayModal').classList.contains('open'))return;
  document.getElementById('dayModal').classList.remove('open');
  history.back();
}
