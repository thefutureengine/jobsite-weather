// ── PROJECT MODE ──────────────────────────────────────────
function renderProjectBar(){
  const existing=document.getElementById('projectBar');
  if(existing)existing.remove();
  const hasAccess=isProject();
  const bar=document.createElement('div');
  bar.id='projectBar';
  bar.style.cssText='background:#0a1520;border-bottom:1px solid rgba(255,255,255,0.06);padding:6px 16px;display:flex;align-items:center;justify-content:space-between;';
  const pillStyle=hasAccess?'background:rgba(245,166,35,0.12);border:1.5px solid #f5a623;color:#f5a623;':'background:transparent;border:1.5px solid rgba(245,166,35,0.2);color:rgba(245,166,35,0.35);';
  bar.innerHTML=`<button onclick="${hasAccess?'openProjectMode()':'showProjectGate()'}" style="${pillStyle}font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:800;letter-spacing:0.08em;padding:5px 14px;border-radius:20px;cursor:pointer;display:flex;align-items:center;gap:6px;">📋 PROJECT MODE ${hasAccess?'':'🔒'}</button><span style="font-family:'Barlow Condensed',sans-serif;font-size:9px;color:rgba(245,166,35,${hasAccess?'0.5':'0.2'});letter-spacing:0.1em">${hasAccess?'ACTIVE':'PROJECT PLAN'}</span>`;
  const tabs=document.getElementById('navTabs');
  if(tabs)tabs.after(bar);
}

function openProjectMode(){
  if(!isProject()){showProjectGate();return;}
  history.pushState({page:'project'},'','#project');
  const panel=document.createElement('div');
  panel.id='projectPanel';
  panel.style.cssText='position:fixed;inset:0;z-index:500;background:#0a1520;transform:translateX(100%);transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);display:flex;flex-direction:column;overflow:hidden;';
  panel.innerHTML=`<div style="background:#0d1e2e;border-bottom:2px solid #f5a623;padding:14px 16px;padding-top:calc(14px + env(safe-area-inset-top,0px));display:flex;align-items:center;gap:12px;flex-shrink:0;"><button onclick="closeProjectMode()" style="background:none;border:1px solid rgba(255,255,255,0.2);border-radius:8px;width:36px;height:36px;color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;">‹</button><div><div style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:800;letter-spacing:0.06em;color:#f5a623">📋 PROJECT MODE</div><div style="font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:0.08em">MULTI-SITE COMMAND CENTER</div></div></div><div style="flex:1;overflow-y:auto;padding:16px" id="projectContent"><div style="color:var(--muted);font-size:13px;text-align:center;padding:40px 0">Loading your job sites...</div></div>`;
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

function showProjectGate(){
  document.getElementById('modalInner').innerHTML=`<button class="modal-close" onclick="closeModalBtn()">✕</button><div style="padding:1.5rem 1rem;text-align:center"><div style="font-size:28px;margin-bottom:12px">📋</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;color:var(--text);margin-bottom:8px">Project Mode</div><div style="font-size:13px;color:var(--muted);line-height:1.7;margin-bottom:20px">Built for GCs and architects running multiple sites.<br>Multi-site dashboard, predictive alerts, and crew dispatch recommendations.</div><a href="${STRIPE_PROJECT}" target="_blank" style="display:block;background:var(--accent);color:#0a1520;font-family:'Barlow Condensed',sans-serif;font-size:17px;font-weight:800;letter-spacing:0.06em;padding:14px;border-radius:var(--radius);text-decoration:none;text-align:center;margin-bottom:10px">UPGRADE TO PROJECT · $19.99/YEAR →</a><button onclick="closeModalBtn()" style="background:none;border:none;color:var(--muted);font-size:13px;cursor:pointer;padding:8px">Not right now</button></div>`;
  navPush('modal');
  document.getElementById('dayModal').classList.add('open');
}

async function loadProjectSites(){
  const content=document.getElementById('projectContent');
  if(!content)return;
  if(!savedLocs.length){content.innerHTML='<div style="text-align:center;padding:40px 16px"><div style="font-size:32px;margin-bottom:12px">📍</div><div style="font-family:\'Barlow Condensed\',sans-serif;font-size:18px;color:var(--text);margin-bottom:8px">No job sites saved yet</div><div style="font-size:13px;color:var(--muted)">Save locations from the main screen to see them here.</div></div>';return;}
  const siteData=await Promise.allSettled(savedLocs.map(async site=>{
    try{
      const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${site.lat}&longitude=${site.lon}&current=temperature_2m,wind_speed_10m,precipitation,weather_code,relative_humidity_2m&hourly=precipitation_probability,temperature_2m,wind_speed_10m,weather_code&forecast_days=2&wind_speed_unit=mph&temperature_unit=fahrenheit&timezone=auto`);
      return{...site,data:await r.json()};
    }catch(e){return{...site,data:null};}
  }));
  const sites=siteData.filter(r=>r.status==='fulfilled').map(r=>r.value);
  let html='<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;color:var(--muted);text-transform:uppercase;margin-bottom:12px">YOUR SITES TODAY</div>';
  sites.forEach(site=>{
    if(!site.data){html+=`<div class="project-site-card"><div style="font-size:13px;color:var(--text)">${site.label}</div><div style="font-size:11px;color:var(--muted)">Could not load</div></div>`;return;}
    const c=site.data.current,temp=Math.round(c.temperature_2m),wind=Math.round(c.wind_speed_10m),wmo=c.weather_code,rh=Math.round(c.relative_humidity_2m),precip=c.precipitation||0;
    const alerts=getTradeAlerts(temp,wind,precip,wmo,rh);
    const hasDanger=alerts.some(a=>a.level==='danger'),hasCaution=alerts.some(a=>a.level==='caution');
    const status=hasDanger?'HOLD':hasCaution?'CAUTION':'GO';
    const statusColor=hasDanger?'#e53935':hasCaution?'#ff9800':'#4caf50';
    const statusEmoji=hasDanger?'🔴':hasCaution?'🟡':'🟢';
    const borderColor=hasDanger?'rgba(229,57,53,0.3)':hasCaution?'rgba(255,152,0,0.3)':'rgba(76,175,80,0.3)';
    const topAlert=alerts[0]?.msg||`${temp}°F · Wind ${wind}mph · Clear`;
    const tom=new Date();tom.setDate(tom.getDate()+1);
    const tomorrowHrs=(site.data.hourly?.time||[]).map((t,i)=>({t:new Date(t),prob:site.data.hourly.precipitation_probability[i]})).filter(h=>h.t.getDate()===tom.getDate()&&h.t.getHours()<12);
    const tomorrowRain=tomorrowHrs.filter(h=>h.prob>60);
    const tAlert=tomorrowRain.length>=3?`⚡ Tomorrow: ${Math.round(tomorrowRain[0].prob)}% rain before noon`:null;
    html+=`<div class="project-site-card" onclick="closeProjectMode();loadByLatLon(${site.lat},${site.lon},'${site.label.replace(/'/g,"\\'")}')" style="border-color:${borderColor};cursor:pointer;margin-bottom:10px"><div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px"><div><div style="font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:700;color:var(--text)">${site.label}</div></div><div style="font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:800;color:${statusColor};text-align:right">${statusEmoji} ${status}</div></div><div style="font-size:12px;color:var(--muted)">${topAlert}</div>${tAlert?`<div style="font-size:11px;color:#f5a623;margin-top:6px">${tAlert}</div>`:''}<div style="font-size:10px;color:rgba(255,255,255,0.2);margin-top:6px;text-align:right">Tap to view →</div></div>`;
  });
  content.innerHTML=html;
}

// ── TIER UPGRADE FUNCTIONS ─────────────────────────────────
function toggleTier(id){
  const card=document.getElementById(id);if(!card)return;
  const body=card.querySelector('.tier-body');
  const chevron=card.querySelector('.tier-chevron');
  const isOpen=body.classList.contains('open');
  document.querySelectorAll('.tier-body').forEach(b=>b.classList.remove('open'));
  document.querySelectorAll('.tier-chevron').forEach(c=>c.textContent='▼');
  if(!isOpen){body.classList.add('open');chevron.textContent='▲';}
}

function startUpgrade(tier){
  closeSettingsSilent();history.back();
  if(tier==='pro'){
    if(!localStorage.getItem('jw_upsell_seen')){showCrewUpsell();return;}
    window.open(STRIPE_PRO,'_blank');return;
  }
  if(tier==='crew'){window.open(STRIPE_CREW,'_blank');return;}
  if(tier==='project'){window.open(STRIPE_PROJECT,'_blank');return;}
}

function showCrewUpsell(){
  localStorage.setItem('jw_upsell_seen','true');
  document.getElementById('modalInner').innerHTML=`<button class="modal-close" onclick="closeModalBtn()">✕</button><div style="padding:1.5rem 1rem;text-align:center"><div style="font-size:28px;margin-bottom:12px">👷</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;color:var(--text);margin-bottom:8px">Before you go...</div><div style="font-size:13px;color:var(--muted);line-height:1.7;margin-bottom:20px">You chose Pro at $4.99/year.<br>For $5 more get <strong style="color:var(--text)">CREW</strong> — share locations, sync notes, and bring your whole team.</div><div style="background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:16px;text-align:left">${['👷 Up to 5 crew members','📍 Shared job site locations','📝 Notes synced across devices','🌅 Morning briefing for the whole crew'].map(f=>'<div style="font-size:12px;color:var(--muted);padding:3px 0">✓ '+f+'</div>').join('')}</div><a href="${STRIPE_CREW}" target="_blank" style="display:block;background:var(--accent);color:#0a1520;font-family:'Barlow Condensed',sans-serif;font-size:17px;font-weight:800;letter-spacing:0.06em;padding:14px;border-radius:var(--radius);text-decoration:none;text-align:center;margin-bottom:10px">YES — UPGRADE TO CREW · $9.99/YEAR →</a><button onclick="window.open('${STRIPE_PRO}','_blank');closeModalBtn();" style="background:none;border:none;color:var(--muted);font-size:13px;cursor:pointer;padding:8px">No thanks, just Pro for $4.99</button></div>`;
  navPush('modal');document.getElementById('dayModal').classList.add('open');
}
