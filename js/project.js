// project.js — Project Mode full workspace

function getSavedLocs(){return JSON.parse(localStorage.getItem('jw_locs')||'[]');}

function deleteLoc(lat,lon){
  let locs=getSavedLocs();
  locs=locs.filter(l=>!(Math.abs(l.lat-lat)<0.001&&Math.abs(l.lon-lon)<0.001));
  localStorage.setItem('jw_locs',JSON.stringify(locs));
  savedLocs=locs;
}

function updateProjectPill(){
  const pill=document.getElementById('projectPill');
  if(!pill)return;
  pill.removeAttribute('style');
  const base="font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:800;letter-spacing:0.08em;padding:4px 12px;border-radius:20px;cursor:pointer;white-space:nowrap;transform:translateZ(0);flex-shrink:0;transition:all 0.2s ease;";
  if(isProject()){
    pill.style.cssText=base+'background:rgba(245,166,35,0.1);border:1.5px solid #f5a623;color:#f5a623;';
  }else{
    pill.style.cssText=base+'background:transparent;border:1px solid rgba(245,166,35,0.18);color:rgba(245,166,35,0.28);';
  }
  pill.textContent='📋 PROJECTS';
}

function handleProjectTap(){
  if(isProject())openProjectMode();
  else showProjectGate();
}

function openProjectMode(){
  if(!isProject()){showProjectGate();return;}
  history.pushState({page:'project'},'','#project');
  const panel=document.createElement('div');
  panel.id='projectPanel';
  panel.style.cssText='position:fixed;inset:0;z-index:500;background:#0a1520;transform:translateX(100%);transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);display:flex;flex-direction:column;overflow:hidden;';
  panel.innerHTML=`
    <div style="background:#0d1e2e;border-bottom:2px solid #f5a623;padding:14px 16px;padding-top:calc(14px + env(safe-area-inset-top,0px));display:flex;align-items:center;gap:12px;flex-shrink:0;">
      <button onclick="closeProjectMode()" style="background:none;border:1px solid rgba(255,255,255,0.2);border-radius:8px;width:36px;height:36px;color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">‹</button>
      <div style="flex:1"><div style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:800;letter-spacing:0.06em;color:#f5a623">📋 PROJECT MODE</div><div style="font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:0.08em">MULTI-SITE COMMAND CENTER</div></div>
      <button onclick="showAddSiteFlow()" style="background:rgba(245,166,35,0.15);border:1px solid #f5a623;border-radius:8px;padding:6px 12px;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:800;color:#f5a623;cursor:pointer;letter-spacing:0.06em;">+ ADD SITE</button>
    </div>
    <div style="background:#0d1e2e;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;flex-shrink:0;">
      <button class="pm-tab" id="pmTabSites" onclick="switchPMTab('sites')" style="flex:1;padding:10px;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:800;letter-spacing:0.06em;background:none;border:none;color:#f5a623;border-bottom:2px solid #f5a623;cursor:pointer;">SITES</button>
      <button class="pm-tab" id="pmTabCalendar" onclick="switchPMTab('calendar')" style="flex:1;padding:10px;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:800;letter-spacing:0.06em;background:none;border:none;color:rgba(255,255,255,0.4);border-bottom:2px solid transparent;cursor:pointer;">7-DAY VIEW</button>
    </div>
    <div style="flex:1;overflow-y:auto;" id="projectContent"><div style="padding:20px;text-align:center;color:var(--muted)">Loading sites...</div></div>`;
  document.body.appendChild(panel);
  document.body.style.overflow='hidden';
  requestAnimationFrame(()=>{panel.style.transform='translateX(0)';});
  loadProjectSites();
}

function closeProjectMode(){
  const panel=document.getElementById('projectPanel');
  if(!panel)return;
  panel.style.transform='translateX(100%)';
  setTimeout(()=>{panel.remove();document.body.style.overflow='';},300);
}

function switchPMTab(tab){
  document.querySelectorAll('.pm-tab').forEach(t=>{t.style.color='rgba(255,255,255,0.4)';t.style.borderBottom='2px solid transparent';});
  const id='pmTab'+tab.charAt(0).toUpperCase()+tab.slice(1);
  const active=document.getElementById(id);
  if(active){active.style.color='#f5a623';active.style.borderBottom='2px solid #f5a623';}
  if(tab==='sites')loadProjectSites();
  if(tab==='calendar')loadProjectCalendar();
}

function showProjectGate(){
  document.getElementById('modalInner').innerHTML=`<button class="modal-close" onclick="closeModalBtn()">✕</button><div style="padding:1.5rem 1rem;text-align:center"><div style="font-size:28px;margin-bottom:12px">📋</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;color:var(--text);margin-bottom:8px">Project Mode</div><div style="font-size:13px;color:var(--muted);line-height:1.7;margin-bottom:20px">Built for GCs and architects running multiple sites.<br>Multi-site dashboard, predictive alerts, and crew dispatch.</div><a href="${STRIPE_PROJECT}" target="_blank" style="display:block;background:var(--accent);color:#0a1520;font-family:'Barlow Condensed',sans-serif;font-size:17px;font-weight:800;letter-spacing:0.06em;padding:14px;border-radius:var(--radius);text-decoration:none;text-align:center;margin-bottom:10px">UPGRADE TO PROJECT · $19.99/YEAR →</a><button onclick="closeModalBtn()" style="background:none;border:none;color:var(--muted);font-size:13px;cursor:pointer;padding:8px">Not right now</button></div>`;
  navPush('modal');document.getElementById('dayModal').classList.add('open');
}

// ── SITES TAB ─────────────────────────────────────────────
async function loadProjectSites(){
  const content=document.getElementById('projectContent');
  if(!content)return;
  const sites=getSavedLocs();
  if(!sites.length){content.innerHTML=`<div style="text-align:center;padding:40px 16px"><div style="font-size:40px;margin-bottom:12px">📍</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:20px;color:var(--text);margin-bottom:8px">No job sites yet</div><div style="font-size:13px;color:var(--muted);margin-bottom:20px">Add your first site to get started.</div><button onclick="showAddSiteFlow()" style="background:var(--accent);color:#0a1520;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:800;padding:12px 24px;border:none;border-radius:var(--radius);cursor:pointer;">+ ADD FIRST SITE</button></div>`;return;}
  content.innerHTML='<div style="padding:12px 16px 0;font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;color:var(--muted);text-transform:uppercase">YOUR SITES TODAY</div>';
  const siteData=await Promise.all(sites.map(async site=>{
    try{const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${site.lat}&longitude=${site.lon}&current=temperature_2m,wind_speed_10m,precipitation,weather_code,relative_humidity_2m&hourly=precipitation_probability,temperature_2m,weather_code&forecast_days=2&wind_speed_unit=mph&temperature_unit=fahrenheit&timezone=auto`);return{...site,weatherData:await r.json()};}catch(e){return{...site,weatherData:null};}
  }));
  siteData.forEach((site,i)=>{content.innerHTML+=buildSiteCard(site,i);});
  content.innerHTML+='<div style="height:20px"></div>';
}

function buildSiteCard(site,index){
  if(!site.weatherData)return`<div style="margin:10px 16px;background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius);padding:14px"><div style="font-size:13px;color:var(--text)">${site.label}</div><div style="font-size:12px;color:var(--muted);margin-top:4px">Could not load</div></div>`;
  const c=site.weatherData.current,temp=Math.round(c.temperature_2m),wind=Math.round(c.wind_speed_10m),wmo=c.weather_code,rh=Math.round(c.relative_humidity_2m),precip=c.precipitation||0;
  const rainPct=site.weatherData.hourly?.precipitation_probability?Math.max(...site.weatherData.hourly.precipitation_probability.slice(0,12)):0;
  const alerts=getTradeAlerts(temp,wind,precip,wmo,rh);
  const hasDanger=alerts.some(a=>a.level==='danger'),hasCaution=alerts.some(a=>a.level==='caution');
  const status=hasDanger?'HOLD':hasCaution?'CAUTION':'GO';
  const statusColor=hasDanger?'#e53935':hasCaution?'#ff9800':'#4caf50';
  const statusRGB=hasDanger?'229,57,53':hasCaution?'255,152,0':'76,175,80';
  const borderColor=hasDanger?'rgba(229,57,53,0.35)':hasCaution?'rgba(255,152,0,0.35)':'rgba(76,175,80,0.35)';
  const topAlert=alerts[0]?.msg||'No issues — good conditions';
  const tom=new Date();tom.setDate(tom.getDate()+1);
  const tHrs=(site.weatherData.hourly?.time||[]).map((t,i)=>({t:new Date(t),prob:site.weatherData.hourly.precipitation_probability[i]||0})).filter(h=>h.t.getDate()===tom.getDate()&&h.t.getHours()<12);
  const tRain=tHrs.filter(h=>h.prob>60);
  const tAlert=tRain.length>=3?`⚡ Tomorrow AM: ${Math.round(tRain[0].prob)}% rain`:null;
  const safeLabel=site.label.replace(/'/g,"\\'");
  return`<div id="pmCard_${index}" style="margin:10px 16px;background:var(--surface3);border:1px solid ${borderColor};border-radius:var(--radius);overflow:hidden">
    <div onclick="toggleSiteCard(${index})" style="padding:14px;cursor:pointer;display:flex;align-items:center;gap:12px">
      <div class="pm-status-dot" style="background:${statusColor}"></div>
      <div style="flex:1;min-width:0"><div style="font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:800;color:var(--text);line-height:1.2">${site.projectName||site.label}</div><div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:1px">${site.label}${site.trade?' · '+(TRADE_CONFIG[site.trade]?.name||site.trade):''}</div></div>
      <div style="text-align:right;flex-shrink:0"><div style="font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:900;color:${statusColor}">${status}</div><div class="pm-data-label">${temp}°F · ${wind}mph</div></div>
      <div style="color:rgba(255,255,255,0.2);font-size:14px;flex-shrink:0" id="pmChevron_${index}">▼</div>
    </div>
    <div id="pmExpanded_${index}" style="display:none;border-top:1px solid rgba(255,255,255,0.06)">
      <div style="padding:14px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;border-bottom:1px solid rgba(255,255,255,0.06)">
        <div style="text-align:center"><div class="pm-data-value" style="font-size:22px">${temp}°</div><div class="pm-data-label">Temp</div></div>
        <div style="text-align:center"><div class="pm-data-value" style="font-size:22px">${wind}</div><div class="pm-data-label">MPH Wind</div></div>
        <div style="text-align:center"><div class="pm-data-value" style="font-size:22px">${rainPct}%</div><div class="pm-data-label">Rain</div></div>
        <div style="text-align:center"><div class="pm-data-value" style="font-size:22px">${rh}%</div><div class="pm-data-label">Humidity</div></div>
      </div>
      <div style="padding:10px 14px;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(${statusRGB},0.06)">
        <div class="pm-status-dot" style="background:${statusColor}"></div>
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;color:${statusColor}">${status}</div>
        <div style="font-size:12px;color:var(--muted);flex:1">${topAlert}</div>
      </div>
      <div style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.06)"><div class="pm-data-label" style="margin-bottom:8px">NEXT 6 HOURS</div><div style="display:flex;gap:6px;overflow-x:auto">${buildMiniHourly(site.weatherData)}</div></div>
      ${tAlert?`<div style="padding:8px 14px;background:rgba(245,166,35,0.08);border-bottom:1px solid rgba(245,166,35,0.15);font-size:11px;color:#f5a623">${tAlert}</div>`:''}
      <div style="padding:14px"><div class="pm-data-label" style="margin-bottom:10px">SITE NOTES</div>${loadNotesForSite(site.label).length>=3?`<div style="margin-bottom:10px"><button onclick="summarizeSiteNotes('${safeLabel}',${index})" id="summarizeBtn_${index}" style="background:rgba(245,166,35,0.08);border:1px solid rgba(245,166,35,0.25);border-radius:6px;padding:7px 14px;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:800;color:rgba(245,166,35,0.7);cursor:pointer;letter-spacing:0.06em;width:100%;">🔨 ASK THE FOREMAN — SUMMARIZE NOTES</button><div id="noteSummary_${index}" style="margin-top:8px;font-family:'Inter',sans-serif;font-size:12px;color:rgba(255,255,255,0.7);line-height:1.6;display:none;background:rgba(245,166,35,0.06);border:1px solid rgba(245,166,35,0.15);border-radius:6px;padding:10px 12px;"></div></div>`:''}<div id="pmNoteHistory_${index}" style="max-height:180px;overflow-y:auto;margin-bottom:12px">${buildNotesHistory(site.label)}</div><textarea id="pmNoteInput_${index}" placeholder="Add a note for this site..." rows="3" style="width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:10px;font-family:'Inter',sans-serif;font-size:13px;color:var(--text);resize:none;box-sizing:border-box;margin-bottom:8px"></textarea><button onclick="savePMNote_new('${safeLabel}',${index})" style="width:100%;background:rgba(245,166,35,0.15);border:1px solid rgba(245,166,35,0.4);border-radius:6px;padding:9px;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:800;color:#f5a623;cursor:pointer;letter-spacing:0.06em;">SAVE NOTE →</button></div>
      <div style="padding:10px 14px;border-top:1px solid rgba(255,255,255,0.06);display:flex;gap:8px">
        <button onclick="editSiteMeta('${safeLabel}')" style="flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:8px;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:800;color:rgba(255,255,255,0.5);cursor:pointer;letter-spacing:0.04em;">EDIT SITE</button>
        <button onclick="confirmDeleteSite('${safeLabel}')" style="background:rgba(229,57,53,0.08);border:1px solid rgba(229,57,53,0.2);border-radius:6px;padding:8px 14px;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:800;color:rgba(229,57,53,0.6);cursor:pointer;">REMOVE</button>
      </div>
    </div>
  </div>`;
}

function toggleSiteCard(index){
  const expanded=document.getElementById('pmExpanded_'+index);
  const chevron=document.getElementById('pmChevron_'+index);
  if(!expanded)return;
  const isOpen=expanded.style.display!=='none';
  document.querySelectorAll('[id^="pmExpanded_"]').forEach(el=>el.style.display='none');
  document.querySelectorAll('[id^="pmChevron_"]').forEach(el=>el.textContent='▼');
  if(!isOpen){expanded.style.display='block';if(chevron)chevron.textContent='▲';}
}

function buildMiniHourly(wd){
  if(!wd?.hourly)return'<div style="color:var(--muted);font-size:11px">No data</div>';
  const now=new Date();
  return wd.hourly.time.map((t,i)=>({t:new Date(t),temp:Math.round(wd.hourly.temperature_2m[i]),prob:wd.hourly.precipitation_probability[i]||0,wmo:wd.hourly.weather_code[i]})).filter(h=>h.t>=now).slice(0,6).map(h=>{
    const fmt=h.t.toLocaleTimeString([],{hour:'numeric',hour12:true});
    const dotColor=h.prob>60?'#e53935':h.prob>30?'#ff9800':'#4caf50';
    return`<div style="text-align:center;flex-shrink:0;min-width:44px"><div style="width:6px;height:6px;border-radius:50%;background:${dotColor};margin:0 auto 4px"></div><div class="pm-data-value" style="font-size:13px">${h.temp}°</div><div class="pm-data-label" style="font-size:9px">${fmt}</div></div>`;
  }).join('');
}

function savePMNote_new(label,index){
  const input=document.getElementById('pmNoteInput_'+index);
  if(!input?.value?.trim())return;
  const saved=saveNoteForSite(label,input.value);
  if(saved){
    input.value='';
    const history=document.getElementById('pmNoteHistory_'+index);
    if(history)history.innerHTML=buildNotesHistory(label);
    const btn=input.nextElementSibling;
    if(btn){const orig=btn.textContent;btn.textContent='✓ SAVED';btn.style.color='#4caf50';btn.style.borderColor='rgba(76,175,80,0.4)';setTimeout(()=>{btn.textContent=orig;btn.style.color='#f5a623';btn.style.borderColor='rgba(245,166,35,0.4)';},1500);}
  }
}

function confirmDeleteSite(label){
  if(!confirm('Remove '+label+'?'))return;
  let locs=getSavedLocs();
  locs=locs.filter(l=>l.label!==label);
  localStorage.setItem('jw_locs',JSON.stringify(locs));
  savedLocs=locs;
  loadProjectSites();
}

function editSiteMeta(label){
  const sites=getSavedLocs();const site=sites.find(s=>s.label===label)||{};
  const content=document.getElementById('projectContent');if(!content)return;
  content.innerHTML=`<div style="padding:20px 16px"><div style="font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:800;color:var(--text);margin-bottom:16px">EDIT SITE — ${label}</div>
    <div style="margin-bottom:12px"><label style="font-size:11px;color:var(--muted);letter-spacing:0.06em;text-transform:uppercase;display:block;margin-bottom:6px">Project Name</label><input id="editProjectName" value="${(site.projectName||'').replace(/"/g,'&quot;')}" placeholder="e.g. School Build A" style="width:100%;background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px;font-size:13px;color:var(--text);box-sizing:border-box;"/></div>
    <div style="margin-bottom:12px"><label style="font-size:11px;color:var(--muted);letter-spacing:0.06em;text-transform:uppercase;display:block;margin-bottom:6px">Trade</label><select id="editTrade" style="width:100%;background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;font-size:13px;color:var(--text);">${Object.entries(TRADE_CONFIG).map(([k,v])=>'<option value="'+k+'" '+(k===(site.trade||'')?'selected':'')+'>'+v.name+'</option>').join('')}</select></div>
    <div style="margin-bottom:12px"><label style="font-size:11px;color:var(--muted);letter-spacing:0.06em;text-transform:uppercase;display:block;margin-bottom:6px">GC / Owner Contact</label><input id="editGCContact" value="${(site.gcContact||'').replace(/"/g,'&quot;')}" placeholder="Name or phone" style="width:100%;background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px;font-size:13px;color:var(--text);box-sizing:border-box;"/></div>
    <div style="margin-bottom:20px"><label style="font-size:11px;color:var(--muted);letter-spacing:0.06em;text-transform:uppercase;display:block;margin-bottom:6px">Crew Size</label><input id="editCrewSize" type="number" value="${site.crewSize||''}" placeholder="0" style="width:100%;background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px;font-size:13px;color:var(--text);box-sizing:border-box;"/></div>
    <button onclick="saveSiteMeta('${label.replace(/'/g,"\\'")}')" style="width:100%;background:var(--accent);color:#0a1520;font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:800;padding:12px;border:none;border-radius:var(--radius);cursor:pointer;margin-bottom:10px">SAVE</button>
    <button onclick="loadProjectSites()" style="width:100%;background:none;border:1px solid var(--border);border-radius:var(--radius);padding:12px;font-family:'Barlow Condensed',sans-serif;font-size:13px;color:var(--muted);cursor:pointer">CANCEL</button></div>`;
}

function saveSiteMeta(label){
  const sites=getSavedLocs();const site=sites.find(s=>s.label===label);if(!site)return;
  site.projectName=document.getElementById('editProjectName')?.value?.trim()||'';
  site.trade=document.getElementById('editTrade')?.value||'general';
  site.gcContact=document.getElementById('editGCContact')?.value?.trim()||'';
  site.crewSize=document.getElementById('editCrewSize')?.value||'';
  localStorage.setItem('jw_locs',JSON.stringify(sites));savedLocs=sites;
  loadProjectSites();
}

// ── ADD SITE FLOW ─────────────────────────────────────────
function showAddSiteFlow(){
  const content=document.getElementById('projectContent');if(!content)return;
  content.innerHTML=`<div style="padding:20px 16px"><div style="font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:800;color:var(--text);margin-bottom:4px">ADD JOB SITE</div><div style="font-size:12px;color:var(--muted);margin-bottom:20px">Enter a ZIP code</div>
    <div style="display:flex;gap:8px;margin-bottom:16px"><input id="addSiteZip" type="tel" inputmode="numeric" maxlength="5" placeholder="ZIP code" style="flex:1;background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px;font-size:15px;color:var(--text);"/><button onclick="searchAddSite()" style="background:var(--accent);color:#0a1520;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:800;padding:10px 16px;border:none;border-radius:var(--radius-sm);cursor:pointer;">GO</button></div>
    <div id="addSiteResult"></div>
    <button onclick="loadProjectSites()" style="width:100%;background:none;border:1px solid var(--border);border-radius:var(--radius);padding:12px;font-family:'Barlow Condensed',sans-serif;font-size:13px;color:var(--muted);cursor:pointer;margin-top:8px">CANCEL</button></div>`;
  document.getElementById('addSiteZip')?.focus();
}

async function searchAddSite(){
  const zip=document.getElementById('addSiteZip')?.value?.trim()||'';
  const result=document.getElementById('addSiteResult');
  if(zip.length!==5||isNaN(zip)){if(result)result.innerHTML='<div style="color:#ff6b6b;font-size:12px">Enter a valid 5-digit ZIP</div>';return;}
  if(result)result.innerHTML='<div style="color:var(--muted);font-size:12px">Searching...</div>';
  try{
    const geo=await geoSearch(zip);
    const label=geo.name+(geo.admin1?', '+geo.admin1:'');
    if(result)result.innerHTML=`<div style="background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:12px">
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:700;color:var(--text);margin-bottom:12px">📍 ${label}</div>
      <div style="margin-bottom:10px"><label style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:4px">Project Name (optional)</label><input id="newProjectName" placeholder="e.g. School Build A" style="width:100%;background:#0a1520;border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:13px;color:var(--text);box-sizing:border-box;"/></div>
      <div style="margin-bottom:10px"><label style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:4px">Trade</label><select id="newTrade" style="width:100%;background:#0a1520;border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:13px;color:var(--text);">${Object.entries(TRADE_CONFIG).map(([k,v])=>'<option value="'+k+'">'+v.name+'</option>').join('')}</select></div>
      <div style="margin-bottom:14px"><label style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;display:block;margin-bottom:4px">GC / Owner (optional)</label><input id="newGCContact" placeholder="Name or phone" style="width:100%;background:#0a1520;border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:13px;color:var(--text);box-sizing:border-box;"/></div>
      <button onclick="confirmAddSite(${geo.latitude},${geo.longitude},'${label.replace(/'/g,"\\'")}')" style="width:100%;background:var(--accent);color:#0a1520;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:800;padding:11px;border:none;border-radius:var(--radius-sm);cursor:pointer;">ADD THIS SITE →</button></div>`;
  }catch(e){if(result)result.innerHTML='<div style="color:#ff6b6b;font-size:12px">ZIP not found. Try another.</div>';}
}

function confirmAddSite(lat,lon,label){
  const sites=getSavedLocs();
  const maxLocs=isProject()?10:isCrew()?5:isPro()?5:1;
  if(sites.length>=maxLocs){alert('You\'ve reached your '+maxLocs+' site limit.');return;}
  sites.push({lat,lon,label,projectName:document.getElementById('newProjectName')?.value?.trim()||'',trade:document.getElementById('newTrade')?.value||'general',gcContact:document.getElementById('newGCContact')?.value?.trim()||''});
  localStorage.setItem('jw_locs',JSON.stringify(sites));savedLocs=sites;
  loadProjectSites();
}

// ── 7-DAY CALENDAR ────────────────────────────────────────
async function loadProjectCalendar(){
  const content=document.getElementById('projectContent');if(!content)return;
  content.innerHTML='<div style="padding:20px;text-align:center;color:var(--muted)">Loading forecast...</div>';
  const sites=getSavedLocs();
  if(!sites.length){content.innerHTML='<div style="padding:40px 16px;text-align:center;color:var(--muted)">No sites added yet</div>';return;}
  const forecasts=await Promise.all(sites.map(async s=>{
    try{const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${s.lat}&longitude=${s.lon}&daily=precipitation_probability_max,weathercode,wind_speed_10m_max,temperature_2m_max,temperature_2m_min&forecast_days=7&wind_speed_unit=mph&temperature_unit=fahrenheit&timezone=auto`);return{...s,forecast:(await r.json()).daily};}catch(e){return{...s,forecast:null};}
  }));
  const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];const today=new Date();
  let html='<div style="padding:12px 16px 0;font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;color:var(--muted);text-transform:uppercase;margin-bottom:12px">7-DAY WORKABILITY</div>';
  html+=`<div style="display:grid;grid-template-columns:120px repeat(7,1fr);gap:2px;padding:0 16px;margin-bottom:4px"><div></div>${Array.from({length:7},(_,i)=>{const d=new Date(today);d.setDate(d.getDate()+i);return`<div style="text-align:center;font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);letter-spacing:0.05em">${i===0?'TODAY':days[d.getDay()]}</div>`;}).join('')}</div>`;
  forecasts.forEach(site=>{
    if(!site.forecast)return;
    html+=`<div style="display:grid;grid-template-columns:120px repeat(7,1fr);gap:2px;padding:4px 16px;align-items:center"><div style="font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:8px">${site.projectName||site.label.split(',')[0]}</div>${(site.forecast.weathercode||[]).slice(0,7).map((wmo,i)=>{
      const precip=site.forecast.precipitation_probability_max[i]||0;const wind=site.forecast.wind_speed_10m_max[i]||0;const tempMax=site.forecast.temperature_2m_max[i]||50;
      const alerts=getTradeAlerts(tempMax,wind,precip>50?0.5:0,wmo,50);
      const bad=alerts.some(a=>a.level==='danger')||precip>70;const warn=alerts.some(a=>a.level==='caution')||precip>40;
      return`<div style="text-align:center;font-size:14px" title="${precip}% rain · ${Math.round(wind)}mph">${bad?'🔴':warn?'🟡':'🟢'}</div>`;
    }).join('')}</div>`;
  });
  html+='<div style="padding:12px 16px;font-size:10px;color:rgba(255,255,255,0.2)">Based on 7-day forecast data</div>';
  content.innerHTML=html;
}

// ── AI NOTES SUMMARY ──────────────────────────────────────
async function summarizeSiteNotes(label,index){
  const btn=document.getElementById('summarizeBtn_'+index);
  const output=document.getElementById('noteSummary_'+index);
  if(!btn||!output)return;
  const notes=loadNotesForSite(label);
  if(!notes.length)return;
  btn.textContent='🔨 Foreman is reading the notes...';btn.style.opacity='0.5';btn.disabled=true;output.style.display='none';
  const notesText=notes.map(n=>n.date+': '+n.text).join('\n');
  const userName=localStorage.getItem('jw_user_name')||'Boss';
  const trade=localStorage.getItem('jw_trade')||'general';
  const tradeName=TRADE_CONFIG[trade]?.name||'General Contractor';
  const systemPrompt='You are a seasoned jobsite foreman with 30 years in the trades working for StrickerCo Solutions. You are reviewing job site notes for '+userName+', a '+tradeName+'.\n\nSummarize these notes in plain English — weather patterns, recurring issues, best working windows, notable delays, and the overall site weather story so far. Be specific, use the dates. Keep it under 100 words. Sound like a foreman talking to another foreman, not a report.\n\nJob site: '+label+'\nNotes:\n'+notesText;
  try{
    const r=await fetch('/api/foreman',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:'Summarize the weather and site conditions history for '+label+' based on these notes.',systemPrompt})});
    const data=await r.json();
    output.textContent=data.answer||'Could not generate summary right now.';
    output.style.display='block';btn.textContent='🔨 REFRESH SUMMARY';btn.style.opacity='1';btn.disabled=false;
  }catch(e){
    output.textContent="Foreman's off the grid. Try again.";output.style.display='block';
    btn.textContent='🔨 ASK THE FOREMAN — SUMMARIZE NOTES';btn.style.opacity='1';btn.disabled=false;
  }
}

// ── TIER UPGRADE FUNCTIONS ────────────────────────────────
function toggleTier(id){
  const card=document.getElementById(id);if(!card)return;
  const body=card.querySelector('.tier-body'),chevron=card.querySelector('.tier-chevron');
  const isOpen=body.classList.contains('open');
  document.querySelectorAll('.tier-body').forEach(b=>b.classList.remove('open'));
  document.querySelectorAll('.tier-chevron').forEach(c=>c.textContent='▼');
  if(!isOpen){body.classList.add('open');chevron.textContent='▲';}
}

function startUpgrade(tier){
  closeSettingsSilent();history.back();
  if(tier==='pro'){if(!localStorage.getItem('jw_upsell_seen')){showCrewUpsell();return;}window.open(STRIPE_PRO,'_blank');return;}
  if(tier==='crew'){window.open(STRIPE_CREW,'_blank');return;}
  if(tier==='project'){window.open(STRIPE_PROJECT,'_blank');return;}
}

function showCrewUpsell(){
  localStorage.setItem('jw_upsell_seen','true');
  document.getElementById('modalInner').innerHTML=`<button class="modal-close" onclick="closeModalBtn()">✕</button><div style="padding:1.5rem 1rem;text-align:center"><div style="font-size:28px;margin-bottom:12px">👷</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;color:var(--text);margin-bottom:8px">Before you go...</div><div style="font-size:13px;color:var(--muted);line-height:1.7;margin-bottom:20px">You chose Pro at $4.99/year.<br>For $5 more get <strong style="color:var(--text)">CREW</strong> — share locations, sync notes, bring your whole team.</div><div style="background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:16px;text-align:left">${['👷 Up to 5 crew members','📍 Shared locations','📝 Synced notes','🌅 Crew morning briefing'].map(f=>'<div style="font-size:12px;color:var(--muted);padding:3px 0">✓ '+f+'</div>').join('')}</div><a href="${STRIPE_CREW}" target="_blank" style="display:block;background:var(--accent);color:#0a1520;font-family:'Barlow Condensed',sans-serif;font-size:17px;font-weight:800;letter-spacing:0.06em;padding:14px;border-radius:var(--radius);text-decoration:none;text-align:center;margin-bottom:10px">YES — UPGRADE TO CREW · $9.99/YEAR →</a><button onclick="window.open('${STRIPE_PRO}','_blank');closeModalBtn();" style="background:none;border:none;color:var(--muted);font-size:13px;cursor:pointer;padding:8px">No thanks, just Pro for $4.99</button></div>`;
  navPush('modal');document.getElementById('dayModal').classList.add('open');
}
