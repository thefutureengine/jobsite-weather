// ── GEO SEARCH ────────────────────────────────────────────
async function geoSearch(q){
  const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=10&language=en&format=json`);
  const d=await r.json();
  if(!d.results?.length)throw new Error('Not found');
  const us=d.results.filter(x=>x.country_code==='US');
  return us.length?us[0]:d.results[0];
}

// ── SAVED LOCATIONS ───────────────────────────────────────
function renderFounderBadge(){
  const existing=document.getElementById('founderTopBadge');
  if(existing)existing.remove();
}

function renderLocs(){
  const row=document.getElementById('locsRow');
  const s=getTrialState();
  const expired=s.status==='expired';
  const pro=isPro();

  // Always show the row
  row.style.display='flex';

  let html='';

  if(savedLocs.length===0){
    // No saved locs yet — show a hint chip
    if(pro){
      html+=`<div class="loc-chip add-chip" onclick="saveCurrentLoc()" title="Save current location">
        📍 Save this spot
      </div>`;
    } else if(expired){
      html+=`<div class="loc-chip add-chip pro-locked" onclick="showPaywall('locations')" title="Pro feature">
        🔒 Save locations · Pro
      </div>`;
    } else {
      // Trial — show save
      html+=currentLabel?`<div class="loc-chip add-chip" onclick="saveCurrentLoc()">📍 Save this spot</div>`:
        `<div class="loc-chip" style="opacity:0.4;cursor:default">📍 Search a ZIP to save it</div>`;
    }
  } else {
    // Show saved locs
    html+=savedLocs.map((l,i)=>{
      if(expired){
        // Locked — show but greyed with lock, tapping shows paywall
        return`<div class="loc-chip locked" onclick="showPaywall('locations')" title="Upgrade to access saved locations">
          🔒 ${l.label}
        </div>`;
      }
      return`<div class="loc-chip${activeLoc===i?' active':''}" onclick="loadSaved(${i})">
        ${l.label}
        <span class="remove" onclick="removeLoc(event,${i})">×</span>
      </div>`;
    }).join('');

    // Add save button if not expired and current location not already saved
    if(!expired&&currentLabel&&!savedLocs.find(l=>l.label===currentLabel)){
      html+=`<div class="loc-chip add-chip" onclick="saveCurrentLoc()">+ Save</div>`;
    } else if(expired){
      html+=`<div class="loc-chip add-chip pro-locked" onclick="showPaywall('locations')">🔒 Upgrade</div>`;
    }
  }

  row.innerHTML=html;
}

function saveCurrentLoc(){
  if(!isPro()){showPaywall('locations');return;}
  if(!currentLabel)return;
  if(savedLocs.find(l=>l.label===currentLabel))return;
  if(savedLocs.length>=10){alert('Max 10 saved locations. Remove one first.');return;}
  savedLocs.push({label:currentLabel,lat:currentLat,lon:currentLon});
  localStorage.setItem('jw_locs',JSON.stringify(savedLocs));
  renderLocs();
}

function removeLoc(e,i){
  e.stopPropagation();
  savedLocs.splice(i,1);
  if(activeLoc===i)activeLoc=null;
  localStorage.setItem('jw_locs',JSON.stringify(savedLocs));
  renderLocs();
}

async function loadSaved(i){
  activeLoc=i;renderLocs();
  const l=savedLocs[i];
  if(l.lat&&l.lon)await loadByLatLon(l.lat,l.lon,l.label);
  else{document.getElementById('locInput').value=l.label;doSearch();}
}

// ── LOAD WEATHER ──────────────────────────────────────────
async function loadByLatLon(lat,lon,label){
  document.getElementById('content').innerHTML='<div class="loading">Loading conditions</div>';
  document.getElementById('nwsAlerts').innerHTML='';
  clearAlert();
  currentLat=lat;currentLon=lon;
  try{
    const[data,alerts]=await Promise.all([fetchWx(lat,lon),fetchNWSAlerts(lat,lon)]);
    data._lat=lat;data._lon=lon;
    nwsAlerts=alerts;
    currentData=data;currentLabel=label;
    localStorage.setItem('jw_last_lat',lat.toString());localStorage.setItem('jw_last_lon',lon.toString());localStorage.setItem('jw_last_label',label);
    try{localStorage.setItem('jw_last_data',JSON.stringify(data));}catch(e){}
    document.getElementById('navTabs').style.display='flex';
    renderNWSAlerts(alerts);
    renderCurrentTab();
    renderLocs();
    // Fetch Tomorrow.io in background — storm countdown only
    fetchTomorrowForecast(lat,lon).then(h=>{tomorrowHourly=h;if(activeTab==='conditions')renderStormBanner();});
    scheduleMorningBriefing();
  }catch(e){
    console.error('[loadByLatLon] FAILED:',e.name,e.message,e);
    document.getElementById('content').innerHTML=`<div class="error-state">Could not load weather. Check connection and try again.<br><span style="font-size:10px;color:var(--subtle);margin-top:8px;display:block">${e.name}: ${e.message}</span></div>`;
  }
}

async function doSearch(){
  const raw=document.getElementById('locInput').value.trim();
  const cleaned=raw.replace(/\D/g,'').slice(0,5);
  if(!cleaned||cleaned.length<5){
    document.getElementById('content').innerHTML='<div class="error-state">Please enter a valid 5-digit ZIP code.</div>';
    return;
  }
  document.getElementById('content').innerHTML='<div class="loading">Searching</div>';
  clearAlert();
  try{
    const geo=await geoSearch(cleaned);
    const label=geo.name+(geo.admin1?', '+geo.admin1:'');
    document.getElementById('locInput').value=label;
    activeLoc=null;
    await loadByLatLon(geo.latitude,geo.longitude,label);
  }catch(e){
    console.error('Search error:',e);
    document.getElementById('content').innerHTML='<div class="error-state">ZIP not found. Try a valid 5-digit US ZIP code.</div>';
  }
}

function useGPS(){
  if(!navigator.geolocation){alert('GPS not available on this device.');return;}
  document.getElementById('content').innerHTML='<div class="loading">Getting your location</div>';
  clearAlert();
  navigator.geolocation.getCurrentPosition(
    async pos=>{const{latitude:lat,longitude:lon}=pos.coords;document.getElementById('locInput').value='';activeLoc=null;await loadByLatLon(lat,lon,'Your location');},
    ()=>{document.getElementById('content').innerHTML='<div class="error-state">Location access denied. Enter a city or ZIP above.</div>';}
  );
}

function onTradeChange(){
  currentTrade=document.getElementById('tradeSelect').value;
  localStorage.setItem('jw_trade',currentTrade);
  if(currentData&&activeTab==='conditions')renderConditions(document.getElementById('content'));
}

document.getElementById('locInput').addEventListener('keydown',e=>{if(e.key==='Enter')doSearch();});

document.getElementById('locInput').addEventListener('keydown',e=>{if(e.key==='Enter')doSearch();});
