// ── SUPABASE ──────────────────────────────────────────────
const SUPABASE_URL='https://jfpyrlregzwmvltrhgfq.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcHlybHJlZ3p3bXZsdHJoZ2ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzcyOTMsImV4cCI6MjA5MDgxMzI5M30.YDLYIk4n6X7mBYYpk5fkEe0MeS3KqrB4wDhcwmD5iKs';
let sb=null;
try{sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);console.log('[Supabase] Client initialized');}catch(e){console.warn('[Supabase] Init failed, running without:',e.message);}

// DEV ONLY — REMOVE BEFORE MERGE TO MAIN
localStorage.setItem('jw_pro','true');localStorage.setItem('jw_crew','true');localStorage.setItem('jw_project','true');localStorage.setItem('jw_founding_crew','true');localStorage.setItem('jw_trial_start',(Date.now()-(5*24*60*60*1000)).toString());

// ── CONSTANTS ──────────────────────────────────────────────
const WMO={0:'Clear',1:'Mostly clear',2:'Partly cloudy',3:'Overcast',45:'Foggy',48:'Icy fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',71:'Light snow',73:'Snow',75:'Heavy snow',77:'Snow grains',80:'Showers',81:'Showers',82:'Heavy showers',85:'Snow showers',86:'Heavy snow showers',95:'Thunderstorm',96:'Thunderstorm+hail',99:'Severe storm'};
const ICO={0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',51:'🌦️',53:'🌦️',55:'🌧️',61:'🌧️',63:'🌧️',65:'🌧️',71:'🌨️',73:'❄️',75:'❄️',77:'❄️',80:'🌦️',81:'🌧️',82:'🌧️',85:'🌨️',86:'🌨️',95:'⛈️',96:'⛈️',99:'⛈️'};
const DANGER=new Set([65,75,82,85,86,95,96,99]);
const WARN=new Set([55,63,71,73,80,81]);
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const TRADE_CONFIG={
  general:{name:'General',windDanger:45,windCaution:25},
  roofing:{name:'Roofing',windDanger:25,windCaution:15,rainStop:true},
  concrete:{name:'Concrete',rainDanger:0.05,tempLow:40,tempHigh:90},
  electrical:{name:'Electrical',rainStop:true},
  plumbing:{name:'Plumbing',tempFreeze:32},
  hvac:{name:'HVAC',windDanger:40,windCaution:25},
  framing:{name:'Framing',windDanger:30,windCaution:20},
  painting:{name:'Painting',rainDanger:0.01,tempLow:50,tempHigh:95,windCaution:20},
  landscaping:{name:'Landscaping',windDanger:40,windCaution:25},
  excavation:{name:'Excavation',rainNote:true},
  farming:{name:'Farming',tempFreeze:28,windDanger:50,windCaution:30},
  gc:{name:'General Contractor',windDanger:35,windCaution:20},
  architect:{name:'Architect / Designer',windDanger:30,windCaution:20},
  inspector:{name:'Inspector',windDanger:30,windCaution:20},
  surveyor:{name:'Surveyor',windDanger:25,windCaution:15},
  solar:{name:'Solar Installation',windDanger:25,windCaution:15,rainStop:true},
  demolition:{name:'Demolition',windDanger:20,windCaution:15}
};

const TOMORROW_KEY='0jFpfjBpo5Zhm5duaeZEwT14339iXIcE';

// ── STATE ──────────────────────────────────────────────────
let currentData=null,currentLabel='',currentLat=null,currentLon=null;
let savedLocs=JSON.parse(localStorage.getItem('jw_locs')||'[]');
let activeLoc=null,currentTrade='general',nwsAlerts=[];
let activeTab='conditions';
let tomorrowHourly=[];
let notifySettings=JSON.parse(localStorage.getItem('jw_notify')||'{"severe":true,"wind":false,"rain":false}');

// ── UTILS ──────────────────────────────────────────────────
const kmh2mph=k=>Math.round(k*0.621371);
const heatIdx=(t,rh)=>{if(t<80)return t;return Math.round(-42.379+2.04901523*t+10.14333127*rh-0.22475541*t*rh-0.00683783*t*t-0.05481717*rh*rh+0.00122874*t*t*rh+0.00085282*t*rh*rh-0.00000199*t*t*rh*rh);};
const dotClass=d=>d==='safe'?'dot-safe':d==='caution'?'dot-caution':'dot-danger';
const fmtTime=iso=>new Date(iso).toLocaleTimeString([],{hour:'numeric',minute:'2-digit',hour12:true});

function windDirLabel(deg){
  if(deg==null||isNaN(deg))return'--';
  const dirs=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg/22.5)%16];
}
function windArrowStyle(deg){
  if(deg==null||isNaN(deg))return'';
  return`style="display:inline-block;transform:rotate(${(deg+180)%360}deg)"`;
}

// ── NAVIGATION STACK (History API) ─────────────────────────
function navPush(screen){
  history.pushState({jw:screen},'');
}

window.addEventListener('popstate',()=>{
  // Check what's currently open (highest priority first) and close it
  if(document.getElementById('projectPanel')){
    closeProjectMode();
  } else if(document.getElementById('foremanModal').classList.contains('open')){
    closeForemanSilent();
  } else if(document.getElementById('dayModal').classList.contains('open')){
    document.getElementById('dayModal').classList.remove('open');
  } else if(document.getElementById('settingsModal').classList.contains('open')){
    closeSettingsSilent();
  } else if(activeTab!=='conditions'){
    activeTab='conditions';
    ['conditions','forecast','foreman'].forEach(t=>{
      document.getElementById('tab-'+t)?.classList.toggle('active',t==='conditions');
    });
    renderCurrentTab();
  }
});

// ── TABS ──────────────────────────────────────────────────
function switchTab(tab){
  if(tab!=='conditions'&&activeTab==='conditions')navPush('tab');
  activeTab=tab;
  ['conditions','forecast','foreman'].forEach(t=>{
    document.getElementById('tab-'+t)?.classList.toggle('active',t===tab);
  });
  renderCurrentTab();
}

function renderCurrentTab(){
  if(!currentData)return;
  const el=document.getElementById('content');
  if(activeTab==='conditions')renderConditions(el);
  else if(activeTab==='forecast')renderForecast(el);
  else if(activeTab==='foreman')renderForemanTab(el);
}

// ── ONBOARDING ────────────────────────────────────────────
function showOnboarding(){
  if(localStorage.getItem('jw_user_name'))return;
  const overlay=document.createElement('div');
  overlay.id='onboardOverlay';
  overlay.style.cssText='position:fixed;inset:0;z-index:600;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML=`<div style="width:100%;max-width:380px;text-align:center">
    <div style="font-size:48px;margin-bottom:12px">👷</div>
    <div style="font-family:'Barlow Condensed',sans-serif;font-size:26px;font-weight:800;color:var(--text);margin-bottom:4px">Welcome to JobSite Weather</div>
    <div style="font-size:13px;color:var(--muted);margin-bottom:24px">Built for the trades · by StrickerCo</div>
    <div style="text-align:left;margin-bottom:20px">
      <div style="font-size:12px;color:var(--muted);margin-bottom:6px;font-weight:600">What should the Foreman call you?</div>
      <input type="text" id="onboardName" placeholder="First name (or leave blank for Boss)" autocomplete="off" style="width:100%;background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:11px 12px;font-size:14px;color:var(--text);font-family:'Barlow',sans-serif;outline:none;"/>
    </div>
    <div style="text-align:left;margin-bottom:24px">
      <div style="font-size:12px;color:var(--muted);margin-bottom:8px;font-weight:600">How do you want him to talk?</div>
      <label style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer;font-size:13px;color:var(--text)">
        <input type="radio" name="fstyle" value="shooter" checked style="accent-color:var(--accent)"/> Straight shooter — direct, no fluff
      </label>
      <label style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer;font-size:13px;color:var(--text)">
        <input type="radio" name="fstyle" value="light" style="accent-color:var(--accent)"/> Keep it light — real talk with some humor
      </label>
      <label style="display:flex;align-items:center;gap:10px;padding:10px 0;cursor:pointer;font-size:13px;color:var(--text)">
        <input type="radio" name="fstyle" value="facts" style="accent-color:var(--accent)"/> Just the facts — numbers only
      </label>
    </div>
    <button class="btn" style="width:100%;padding:13px;font-size:15px" onclick="completeOnboarding()">Let's go →</button>
  </div>`;
  document.body.appendChild(overlay);
}

function completeOnboarding(){
  const name=(document.getElementById('onboardName')?.value||'').trim()||'Boss';
  const style=document.querySelector('input[name=fstyle]:checked')?.value||'shooter';
  localStorage.setItem('jw_user_name',name);
  localStorage.setItem('jw_foreman_style',style);
  document.getElementById('onboardOverlay')?.remove();
}


// ── INIT ──────────────────────────────────────────────────
showOnboarding();

// Auto-activate Pro if returning from Stripe payment
if(new URLSearchParams(window.location.search).get('pro')==='true'){
  localStorage.setItem('jw_pro','true');
  if(!localStorage.getItem('jw_founding_crew'))localStorage.setItem('jw_founding_crew','true');
  window.history.replaceState({},'',window.location.pathname);
  setTimeout(()=>{const pn=localStorage.getItem('jw_user_name')||'Boss';showToast(`You're in, ${pn}. Go make some money. 🔨`,3000);},500);
}

const savedTrade=localStorage.getItem('jw_trade');
if(savedTrade){currentTrade=savedTrade;document.getElementById('tradeSelect').value=savedTrade;}

// Clear saved locs only if somehow corrupted
if(!Array.isArray(savedLocs))savedLocs=[];

renderLocs();
renderFounderBadge();
updateProjectPill();
showTrialToast();
handleAuthCallback();


// ── SWIPE GESTURES ────────────────────────────────────────
(()=>{
  const TABS=['conditions','forecast','foreman'];
  let swipeStartX=0,swipeStartY=0,swipeStartTime=0,swipeBlocked=false;

  document.querySelector('.app').addEventListener('touchstart',e=>{
    swipeStartX=e.touches[0].clientX;
    swipeStartY=e.touches[0].clientY;
    swipeStartTime=Date.now();
    // Block if touch starts inside ANY scrollable or interactive container
    swipeBlocked=!!e.target.closest(
      '.hourly-wrap,.hourly-inner,.hr-item,.locs-row,.dh-grid,.modal,.fc-row,select,input,button'
    );
  },{passive:true});

  document.querySelector('.app').addEventListener('touchend',e=>{
    if(swipeBlocked)return;
    const dx=e.changedTouches[0].clientX-swipeStartX;
    const dy=e.changedTouches[0].clientY-swipeStartY;
    const dt=Date.now()-swipeStartTime;
    // Must be fast, strongly horizontal — dx must be 3x greater than dy
    if(dt>350||Math.abs(dx)<65||Math.abs(dy)>Math.abs(dx)*0.33)return;
    const cur=TABS.indexOf(activeTab);
    if(dx<0&&cur<TABS.length-1)switchTab(TABS[cur+1]);
    else if(dx>0&&cur>0)switchTab(TABS[cur-1]);
  },{passive:true});
})();
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  });
}

(async()=>{
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(
      async pos=>{await loadByLatLon(pos.coords.latitude,pos.coords.longitude,'Your location');},
      async()=>{
        try{const geo=await geoSearch('65254');await loadByLatLon(geo.latitude,geo.longitude,'Glasgow, MO');}
        catch(e){document.getElementById('content').innerHTML='<div class="error-state">Enter a ZIP code or tap GPS to get started.</div>';}
      }
    );
  } else {
    document.getElementById('locInput').value='Glasgow, MO';
    try{const geo=await geoSearch('65254');await loadByLatLon(geo.latitude,geo.longitude,'Glasgow, MO');}
    catch(e){document.getElementById('content').innerHTML='<div class="error-state">Enter a city or ZIP to get started.</div>';}
  }
})();


(async()=>{
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(
      async pos=>{await loadByLatLon(pos.coords.latitude,pos.coords.longitude,'Your location');},
      async()=>{
        try{const geo=await geoSearch('65254');await loadByLatLon(geo.latitude,geo.longitude,'Glasgow, MO');}
        catch(e){document.getElementById('content').innerHTML='<div class="error-state">Enter a ZIP code or tap GPS to get started.</div>';}
      }
    );
  } else {
    document.getElementById('locInput').value='Glasgow, MO';
    try{const geo=await geoSearch('65254');await loadByLatLon(geo.latitude,geo.longitude,'Glasgow, MO');}
    catch(e){document.getElementById('content').innerHTML='<div class="error-state">Enter a city or ZIP to get started.</div>';}
  }
})();
