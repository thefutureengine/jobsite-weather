// auth.js — Supabase magic link auth
const AUTH_EMAIL_KEY='jw_auth_email';

async function signInWithMagicLink(email){
  if(!sb)return false;
  try{
    const{error}=await sb.auth.signInWithOtp({email:email.trim().toLowerCase(),options:{emailRedirectTo:window.location.origin}});
    return!error;
  }catch(e){return false;}
}

async function getSession(){
  if(!sb)return null;
  try{const{data}=await sb.auth.getSession();return data?.session||null;}catch(e){return null;}
}

async function getUserEmail(){
  const session=await getSession();
  return session?.user?.email||localStorage.getItem(AUTH_EMAIL_KEY)||null;
}

async function signOut(){
  if(sb)try{await sb.auth.signOut();}catch(e){}
  localStorage.removeItem(AUTH_EMAIL_KEY);
}

async function handleAuthCallback(){
  if(!sb)return;
  try{
    const{data}=await sb.auth.getSession();
    if(data?.session){
      localStorage.setItem(AUTH_EMAIL_KEY,data.session.user.email);
      const email=data.session.user.email;
      if(email){
        try{
          const r=await fetch('/api/restore-pro',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
          const d=await r.json();
          if(d.success){
            localStorage.setItem('jw_pro','true');
            if(!localStorage.getItem('jw_founding_crew'))localStorage.setItem('jw_founding_crew','true');
          }
        }catch(e){}
      }
    }
  }catch(e){}
}

async function handleMagicLink(){
  const email=document.getElementById('authEmailInput')?.value?.trim();
  const status=document.getElementById('authStatus');
  if(!email||!email.includes('@')){if(status)status.textContent='Enter a valid email address';return;}
  if(status)status.textContent='Sending...';
  const sent=await signInWithMagicLink(email);
  if(sent){
    if(status)status.innerHTML='<span style="color:#4caf50">✓ Check your email for a sign-in link</span>';
    localStorage.setItem(AUTH_EMAIL_KEY,email);
  }else{
    if(status)status.innerHTML='<span style="color:#ff6b6b">Could not send link. Try again.</span>';
  }
}
// crew.js — crew invite system
const MAX_CREW=3;
const CREW_KEY='jw_crew_invites';

function getCrewInvites(){try{return JSON.parse(localStorage.getItem(CREW_KEY)||'[]');}catch(e){return[];}}
function saveCrewInvites(invites){localStorage.setItem(CREW_KEY,JSON.stringify(invites));}

async function generateCrewInvite(){
  const ownerEmail=localStorage.getItem('jw_auth_email');
  if(!ownerEmail)return null;
  const invites=getCrewInvites();
  if(invites.length>=MAX_CREW)return null;
  try{
    const inviteCode=Math.random().toString(36).substring(2,10).toUpperCase();
    if(sb){
      const{data,error}=await sb.from('jw_crew_invites').insert({owner_email:ownerEmail,invite_code:inviteCode,accepted:false,created_at:new Date().toISOString()}).select().single();
      if(!error&&data){invites.push({code:inviteCode,id:data.id,accepted:false});saveCrewInvites(invites);return inviteCode;}
    }
    // Fallback — local only
    invites.push({code:inviteCode,accepted:false});saveCrewInvites(invites);return inviteCode;
  }catch(e){return null;}
}

async function sendCrewMagicLink(email,inviteCode){
  if(!sb)return false;
  try{
    const{error}=await sb.auth.signInWithOtp({email:email.trim().toLowerCase(),options:{emailRedirectTo:window.location.origin+'?crew_invite='+inviteCode,data:{crew_invite:inviteCode}}});
    return!error;
  }catch(e){return false;}
}

async function handleCrewInviteCallback(){
  const params=new URLSearchParams(window.location.search);
  const inviteCode=params.get('crew_invite');
  if(!inviteCode||!sb)return;
  try{
    const{data}=await sb.from('jw_crew_invites').select('*').eq('invite_code',inviteCode).single();
    if(data&&!data.accepted){
      await sb.from('jw_crew_invites').update({accepted:true,member_email:localStorage.getItem('jw_auth_email')}).eq('invite_code',inviteCode);
      const{data:ownerSites}=await sb.from('jw_sites').select('*').eq('user_key',data.owner_email);
      if(ownerSites?.length){
        const existing=getSavedLocs();const merged=[...existing];
        ownerSites.forEach(site=>{if(!merged.find(s=>s.lat===site.lat&&s.lon===site.lon))merged.push({lat:site.lat,lon:site.lon,label:site.label,projectName:site.project_name,trade:site.trade,isShared:true,ownerEmail:data.owner_email});});
        localStorage.setItem('jw_locs',JSON.stringify(merged));
      }
      localStorage.setItem('jw_crew','true');localStorage.setItem('jw_crew_member','true');localStorage.setItem('jw_crew_owner',data.owner_email);
      window.history.replaceState({},'',window.location.pathname);
      showToast('Welcome to the crew. 🔨');
    }
  }catch(e){console.error('Crew invite error:',e);}
}

function renderCrewInviteList(){
  const invites=getCrewInvites();
  if(!invites.length)return'<div style="font-size:12px;color:rgba(255,255,255,0.3);margin-bottom:8px">No crew members yet.</div>';
  return invites.map(inv=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)"><div style="width:8px;height:8px;border-radius:50%;background:${inv.accepted?'#4caf50':'rgba(255,255,255,0.2)'};flex-shrink:0"></div><div style="flex:1;font-size:12px;color:${inv.accepted?'var(--text)':'var(--muted)'}">${inv.email||'Invite sent'} <span style="font-size:10px;color:rgba(255,255,255,0.3)">${inv.accepted?'· Active':'· Pending'}</span></div></div>`).join('');
}

async function handleCrewInvite(){
  const email=document.getElementById('crewEmailInput')?.value?.trim();
  const status=document.getElementById('crewInviteStatus');
  if(!email||!email.includes('@')){if(status)status.innerHTML='<span style="color:#ff6b6b">Enter a valid email address</span>';return;}
  if(status)status.textContent='Generating invite...';
  const inviteCode=await generateCrewInvite();
  if(!inviteCode){if(status)status.innerHTML='<span style="color:#ff6b6b">Could not generate invite. Try again.</span>';return;}
  const sent=await sendCrewMagicLink(email,inviteCode);
  if(sent){
    const invites=getCrewInvites();const inv=invites.find(i=>i.code===inviteCode);
    if(inv){inv.email=email;saveCrewInvites(invites);}
    if(status)status.innerHTML='<span style="color:#4caf50">✓ Invite sent to '+email+'</span>';
    document.getElementById('crewEmailInput').value='';
    const list=document.getElementById('crewInviteList');if(list)list.innerHTML=renderCrewInviteList();
    if(getCrewInvites().length>=MAX_CREW){const form=document.getElementById('crewInviteForm');if(form)form.style.display='none';}
  }else{
    if(status)status.innerHTML='<span style="color:#ff6b6b">Could not send invite. Try again.</span>';
  }
}
// ── PRO / TRIAL / TIERS ───────────────────────────────────
const STRIPE_PRO='https://buy.stripe.com/14AdR97f0h0E3op09IgUM05';
const STRIPE_CREW='https://buy.stripe.com/dRmfZhgPAdOs8IJ9KigUM06';
const STRIPE_PROJECT='https://buy.stripe.com/cNifZh0QC25K6ABcWugUM07';
const STRIPE_LINK=STRIPE_PRO;
const TRIAL_DAYS=30;

function getTrialPhase(){
  const start=localStorage.getItem('jw_trial_start');
  if(!start){localStorage.setItem('jw_trial_start',Date.now().toString());return'active';}
  const days=(Date.now()-parseInt(start))/(1000*60*60*24);
  if(days<=30)return'active';
  if(days<=37)return'grayout';
  return'expired';
}

function getTrialState(){
  const paid=localStorage.getItem('jw_pro')==='true';
  if(paid)return{status:'pro',daysLeft:0};
  const phase=getTrialPhase();
  const start=parseInt(localStorage.getItem('jw_trial_start')||Date.now());
  const elapsed=Math.floor((Date.now()-start)/(1000*60*60*24));
  const daysLeft=Math.max(0,TRIAL_DAYS-elapsed);
  if(phase==='active')return{status:'trial',daysLeft};
  if(phase==='grayout')return{status:'grayout',daysLeft:0};
  return{status:'expired',daysLeft:0};
}

function isPro(){
  return localStorage.getItem('jw_pro')==='true'||getTrialPhase()==='active';
}
function isCrew(){
  return localStorage.getItem('jw_crew')==='true'||getTrialPhase()==='active';
}
function isProject(){
  return localStorage.getItem('jw_project')==='true'||getTrialPhase()==='active';
}

function showTrialToast(){
  const s=getTrialState();
  if(s.status!=='trial')return;
  const today=new Date().toDateString();
  if(localStorage.getItem('jw_toast_shown')===today)return;
  localStorage.setItem('jw_toast_shown',today);
  const d=s.daysLeft;
  let msg='';
  if(d>=25)msg='Pro trial · Ask the Foreman is yours — 7 questions a day';
  else if(d>=15)msg=`Pro trial · ${d} days left · Saved locations & job notes included`;
  else if(d>=7)msg=`Pro trial · ${d} days left · 5AM morning briefing is on`;
  else if(d>=3)msg=`Pro trial · ${d} days left · You've wasted more than $4.99 on bad weather calls`;
  else if(d===2)msg='Pro trial ends in 2 days · $4.99 keeps everything';
  else if(d===1)msg='Last day of trial · $4.99/year · No ads. Ever.';
  if(!msg)return;
  showToast(`<span class="toast-accent">⭐ </span>${msg}`,4000);
}

function showToast(html,duration){
  const c=document.getElementById('toastContainer');
  const t=document.createElement('div');
  t.className='jw-toast';
  t.innerHTML=html;
  c.appendChild(t);
  setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),300);},duration||3000);
}

function showPaywall(feature){
  const s=getTrialState();
  const featureNames={locations:'📍 Saved Locations',foreman:'🔨 Ask the Foreman',notes:'📝 Job Site Notes'};
  document.getElementById('modalInner').innerHTML=`
    <button class="modal-close" onclick="closeModalBtn()">✕</button>
    <div style="text-align:center;padding:1rem 0.5rem 0">
      <div style="font-size:36px;margin-bottom:8px">${(featureNames[feature]||'🔨').split(' ')[0]}</div>
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;margin-bottom:6px">${featureNames[feature]||'Pro Feature'} is a Pro feature</div>
      <div style="font-size:13px;color:var(--muted);line-height:1.7;margin-bottom:1.25rem">
        You've wasted more than $4.99 waiting on weather that never came.<br>Not anymore.
      </div>
      <div style="background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:1rem;text-align:left">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;color:var(--muted);text-transform:uppercase;margin-bottom:10px">Pro includes</div>
        ${['🔨 Ask the Foreman — 7 questions/day','📍 Saved job site locations','📝 Job site notes','🌅 5AM morning briefing','⭐ Founding Crew — Crew Mode free at launch'].map(f=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:13px;color:var(--text)">${f}</div>`).join('')}
      </div>
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:28px;font-weight:800;color:var(--accent);margin-bottom:4px">$4.99/year</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:1.25rem">No ads. Ever.</div>
      ${s.status==='expired'?`
        <a href="${STRIPE_LINK}" target="_blank" style="display:block;background:var(--accent);color:#0a1520;font-family:'Barlow Condensed',sans-serif;font-size:17px;font-weight:800;letter-spacing:0.06em;padding:14px;border-radius:var(--radius);text-decoration:none;text-align:center;margin-bottom:10px">UNLOCK PRO →</a>
      `:`<div style="font-size:13px;color:var(--muted);padding:10px">You have full access during your trial — enjoy it.</div>`}
      <button onclick="closeModalBtn()" style="background:none;border:none;color:var(--muted);font-size:13px;cursor:pointer;padding:8px">Maybe later</button>
      <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border);text-align:left">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;color:var(--muted);text-transform:uppercase;margin-bottom:8px">Always free</div>
        ${['Current conditions & trade alerts','7-day forecast','Hourly breakdown','GPS & ZIP search','Wind, UV, sunrise/sunset','No ads. Ever.'].map(f=>`<div style="font-size:12px;color:var(--muted);padding:3px 0">✓ ${f}</div>`).join('')}
      </div>
    </div>`;
  navPush('modal');
  document.getElementById('dayModal').classList.add('open');
}

function checkCrewExpiry(){
  const expires=localStorage.getItem('jw_crew_expires');
  if(!expires)return;
  if(localStorage.getItem('jw_crew_founding')!=='true')return;
  if(Date.now()>parseInt(expires)){
    localStorage.removeItem('jw_crew');localStorage.removeItem('jw_crew_expires');localStorage.removeItem('jw_crew_founding');
    const nm=localStorage.getItem('jw_user_name')||'Boss';
    showToast(`${nm} — your free Crew year is up. Upgrade to keep the crew together.`,5000);
    if(typeof updateProjectPill==='function')updateProjectPill();
  }
}

function activatePro(){
  localStorage.setItem('jw_pro','true');
  closeModalBtn();
  document.getElementById('navTabs').style.display='flex';
  renderLocs();
  const pName=localStorage.getItem('jw_user_name')||'Boss';
  showToast(`You're in, ${pName}. Go make some money. 🔨`,3000);
}
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
  if(localStorage.getItem('jw_founding_crew')!=='true')return;
  const logoDiv=document.querySelector('.topbar .logo');
  if(!logoDiv)return;
  const badge=document.createElement('div');
  badge.id='founderTopBadge';
  badge.style.cssText='display:inline-flex;align-items:center;margin-left:8px;vertical-align:middle;cursor:default;';
  badge.title='Founder · Set the Standard';
  badge.innerHTML=`<svg width="18" height="22" viewBox="0 0 140 165" xmlns="http://www.w3.org/2000/svg"><path d="M70 8 L125 32 L125 86 Q125 120 70 142 Q15 120 15 86 L15 32 Z" fill="#0a1520" stroke="#f5a623" stroke-width="5"/><path d="M70 20 L115 42 L115 84 Q115 112 70 130 Q25 112 25 84 L25 42 Z" fill="none" stroke="#f5a623" stroke-width="1.5" opacity="0.3"/></svg>`;
  logoDiv.appendChild(badge);
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
    localStorage.setItem('jw_last_lat',lat);localStorage.setItem('jw_last_lon',lon);localStorage.setItem('jw_last_label',label);
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
// ── JOB SITE NOTES (journal format) ───────────────────────
function getNoteLocLabel(){
  if(activeLoc!==null&&savedLocs[activeLoc])return savedLocs[activeLoc].label;
  if(currentLat!=null&&currentLon!=null){
    const match=savedLocs.find(l=>Math.abs(l.lat-currentLat)<0.01&&Math.abs(l.lon-currentLon)<0.01);
    if(match)return match.label;
  }
  return currentLabel||null;
}

function getNotesKey(label){return'jw_notes_'+label.replace(/\s/g,'_');}

function loadNotesForSite(label){
  const key=getNotesKey(label);
  try{return JSON.parse(localStorage.getItem(key)||'[]');}catch(e){return[];}
}

function saveNoteForSite(label,text){
  if(!text?.trim())return false;
  const key=getNotesKey(label);
  const notes=loadNotesForSite(label);
  notes.unshift({text:text.trim(),timestamp:Date.now(),date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})});
  localStorage.setItem(key,JSON.stringify(notes));
  try{
    const userKey=localStorage.getItem('jw_auth_email')||localStorage.getItem('jw_device_id');
    if(userKey&&sb)sb.from('jw_notes').insert({user_key:userKey,note:text.trim(),site_id:null});
  }catch(e){}
  return true;
}

function buildNotesHistory(label){
  const notes=loadNotesForSite(label);
  if(!notes.length)return'<div style="font-size:12px;color:rgba(255,255,255,0.25);font-style:italic;padding:8px 0">No notes yet — add your first entry below.</div>';
  return notes.map(n=>`<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)"><div style="font-size:10px;color:rgba(245,166,35,0.6);font-family:\'Barlow Condensed\',sans-serif;font-weight:700;letter-spacing:0.06em;margin-bottom:3px">${n.date}</div><div style="font-family:\'Inter\',sans-serif;font-size:12px;color:rgba(255,255,255,0.7);line-height:1.5">${(n.text||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div></div>`).join('');
}

// Legacy compat — old single-note functions used by conditions screen
function getSiteNotes(){return JSON.parse(localStorage.getItem('jw_notes')||'{}');}
function saveSiteNote(label,text){const notes=getSiteNotes();if(text)notes[label]=text.slice(0,500);else delete notes[label];localStorage.setItem('jw_notes',JSON.stringify(notes));}
function editSiteNote(){
  if(!isPro()){showPaywall('notes');return;}
  const label=getNoteLocLabel();if(!label)return;
  const notes=getSiteNotes();const existing=notes[label]||'';
  const card=document.getElementById('siteNoteCard');const target=card||document.querySelector('.add-note-link');if(!target)return;
  const container=document.createElement('div');container.className='site-note-card';container.id='siteNoteCard';
  container.innerHTML=`<div class="note-header"><span class="note-label">📋 Job Site Note</span></div><textarea id="noteTextarea" maxlength="500" placeholder="e.g. Low-lying site, floods at 0.25in rain...">${existing.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea><div style="text-align:right;font-size:10px;color:var(--subtle)" id="noteCharCount">${existing.length}/500</div><div class="note-save-row"><button class="btn btn-ghost" style="font-size:12px;padding:6px 12px" onclick="renderCurrentTab()">Cancel</button><button class="btn" style="font-size:12px;padding:6px 12px" onclick="saveSiteNoteFromUI()">Save</button></div>`;
  target.replaceWith(container);const ta=document.getElementById('noteTextarea');ta.addEventListener('input',()=>{document.getElementById('noteCharCount').textContent=ta.value.length+'/500';});ta.focus();
}
function saveSiteNoteFromUI(){const label=getNoteLocLabel();if(!label)return;const text=document.getElementById('noteTextarea')?.value?.trim()||'';saveSiteNote(label,text);renderCurrentTab();}
function deleteSiteNote(){const label=getNoteLocLabel();if(!label)return;saveSiteNote(label,'');renderCurrentTab();}

// ── DEVICE ID ─────────────────────────────────────────────
function getOrCreateDeviceId(){let id=localStorage.getItem('jw_device_id');if(!id){id=crypto.randomUUID();localStorage.setItem('jw_device_id',id);}return id;}

// ── SUPABASE NOTES ────────────────────────────────────────
async function saveNoteToSupabase(siteLabel,noteText){
  if(!sb)return false;
  const userKey=localStorage.getItem('jw_restore_email')||getOrCreateDeviceId();
  try{const{error}=await sb.from('jw_notes').insert({user_key:userKey,site_id:null,note:noteText});return!error;}catch(e){return false;}
}
async function loadNotesFromSupabase(){
  if(!sb)return null;
  const userKey=localStorage.getItem('jw_restore_email')||getOrCreateDeviceId();
  try{const{data,error}=await sb.from('jw_notes').select('note,created_at').eq('user_key',userKey).order('created_at',{ascending:false}).limit(20);if(error||!data?.length)return null;return data;}catch(e){return null;}
}
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
      <div class="hourly-section">
        ${window.matchMedia('(hover:none)').matches?'':`<button class="hourly-arrow left" id="hourlyLeft">‹</button>`}
        <div class="hourly-wrap" id="hourlyScroll"><div class="hourly-inner">${hrHTML}</div></div>
        ${window.matchMedia('(hover:none)').matches?'':`<button class="hourly-arrow right" id="hourlyRight">›</button>`}
      </div>
      ${wwSummary?`<div style="font-size:12px;color:var(--muted);line-height:1.6;margin-top:8px">${wwSummary}</div>`:''}
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
    <div style="font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;color:var(--text);margin-bottom:4px">🔨 ASK THE FOREMAN</div>
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
      <div style="padding:14px"><div class="pm-data-label" style="margin-bottom:10px">SITE NOTES</div>${loadNotesForSite(site.label).length>=3?`<div style="margin-bottom:10px"><button onclick="summarizeSiteNotes('${safeLabel}',${index})" id="summarizeBtn_${index}" style="background:rgba(245,166,35,0.08);border:1px solid rgba(245,166,35,0.25);border-radius:6px;padding:7px 14px;font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:800;color:rgba(245,166,35,0.7);cursor:pointer;letter-spacing:0.06em;width:100%;">🔨 ASK THE FOREMAN — SUMMARIZE NOTES</button><div id="noteSummary_${index}" style="margin-top:8px;font-family:'Inter',sans-serif;font-size:12px;color:rgba(255,255,255,0.7);line-height:1.6;display:none;background:rgba(245,166,35,0.06);border:1px solid rgba(245,166,35,0.15);border-radius:6px;padding:10px 12px;"></div></div>`:''}<div id="pmNoteHistory_${index}" style="max-height:180px;overflow-y:auto;margin-bottom:12px">${buildNotesHistory(site.label)}</div><textarea id="pmNoteInput_${index}" placeholder="Add a note for this site..." rows="3" style="width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:10px;font-family:'Inter',sans-serif;font-size:13px;color:var(--text);resize:none;box-sizing:border-box;margin-bottom:8px"></textarea><div style="display:flex;gap:8px"><button id="noteMic_${index}" onclick="startNoteVoiceInput(${index})" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:9px 14px;font-size:16px;cursor:pointer;flex-shrink:0;">🎤</button><button onclick="savePMNote_new('${safeLabel}',${index})" style="flex:1;background:rgba(245,166,35,0.15);border:1px solid rgba(245,166,35,0.4);border-radius:6px;padding:9px;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:800;color:#f5a623;cursor:pointer;letter-spacing:0.06em;">SAVE NOTE →</button></div></div>
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

// ── NOTE VOICE INPUT ──────────────────────────────────────
function startNoteVoiceInput(index){
  if(!('webkitSpeechRecognition' in window)&&!('SpeechRecognition' in window)){showToast('Voice not supported on this browser. Try Chrome.');return;}
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  const rec=new SR();rec.continuous=false;rec.interimResults=false;rec.lang='en-US';
  const mic=document.getElementById('noteMic_'+index);
  const input=document.getElementById('pmNoteInput_'+index);
  if(mic){mic.textContent='🔴';mic.style.color='#e53935';}
  rec.onresult=e=>{const t=e.results[0][0].transcript;if(input)input.value=input.value?input.value+' '+t:t;if(mic){mic.textContent='🎤';mic.style.color='';}};
  rec.onerror=()=>{if(mic){mic.textContent='🎤';mic.style.color='';}};
  rec.onend=()=>{if(mic){mic.textContent='🎤';mic.style.color='';}};
  rec.start();
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
// ── SETTINGS MODAL ────────────────────────────────────────
function openSettings(){
  navPush('settings');
  const name=localStorage.getItem('jw_user_name')||'';
  const style=localStorage.getItem('jw_foreman_style')||'shooter';
  const trade=currentTrade;
  const s=getTrialState();
  const tradeOpts=['general','roofing','concrete','electrical','plumbing','hvac','framing','painting','landscaping','excavation','farming','gc','architect','inspector','surveyor','solar','demolition'];
  const tradeLabels=['General / All Trades','Roofing','Concrete / Masonry','Electrical','Plumbing','HVAC','Framing / Carpentry','Painting','Landscaping','Excavation / Grading','Farming / Agriculture','General Contractor','Architect / Designer','Inspector','Surveyor','Solar Installation','Demolition'];
  const inner=document.getElementById('settingsInner');
  const isFounder=localStorage.getItem('jw_founding_crew')==='true';
  const briefingOn=localStorage.getItem('jw_morning_briefing')!=='false';
  inner.innerHTML=`
    <button class="modal-close" onclick="closeSettings()">✕</button>
    <div style="padding:0 4px">
      <div style="font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:800;margin-bottom:16px">⚙ SETTINGS</div>
      ${isFounder?`<div style="background:var(--surface3);border:1px solid rgba(245,166,35,0.2);border-radius:var(--radius);padding:16px;margin-bottom:16px;text-align:center">
        <div style="margin-bottom:8px"><svg width="80" height="100" viewBox="0 0 140 165" xmlns="http://www.w3.org/2000/svg"><path d="M70 8 L125 32 L125 86 Q125 120 70 142 Q15 120 15 86 L15 32 Z" fill="#0a1520" stroke="#f5a623" stroke-width="4"/><path d="M70 20 L115 42 L115 84 Q115 112 70 130 Q25 112 25 84 L25 42 Z" fill="none" stroke="#f5a623" stroke-width="1" opacity="0.3"/></svg></div>
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:800;color:#f5a623;letter-spacing:0.06em;margin-bottom:4px">FOUNDING CREW MEMBER</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.5);line-height:1.6;margin-bottom:4px">You're in early. When Crew Plan launches,<br>Year 1 is on us.</div>
        <div style="font-size:11px;color:rgba(245,166,35,0.5);font-style:italic">That's the way we do things. 🔨</div>
      </div>`:''}
      <div style="margin-bottom:16px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:6px;font-weight:600">Your name</div>
        <input type="text" id="settingsName" value="${name.replace(/"/g,'&quot;')}" placeholder="Boss" autocomplete="off" style="width:100%;background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px;font-size:14px;color:var(--text);font-family:'Barlow',sans-serif;outline:none;"/>
      </div>
      <div style="margin-bottom:16px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px;font-weight:600">Foreman style</div>
        <label style="display:flex;align-items:center;gap:10px;padding:8px 0;cursor:pointer;font-size:13px;color:var(--text)">
          <input type="radio" name="sstyle" value="shooter" ${style==='shooter'?'checked':''} style="accent-color:var(--accent)"/> Straight shooter — direct, no fluff
        </label>
        <label style="display:flex;align-items:center;gap:10px;padding:8px 0;cursor:pointer;font-size:13px;color:var(--text)">
          <input type="radio" name="sstyle" value="light" ${style==='light'?'checked':''} style="accent-color:var(--accent)"/> Keep it light — real talk with humor
        </label>
        <label style="display:flex;align-items:center;gap:10px;padding:8px 0;cursor:pointer;font-size:13px;color:var(--text)">
          <input type="radio" name="sstyle" value="facts" ${style==='facts'?'checked':''} style="accent-color:var(--accent)"/> Just the facts — numbers only
        </label>
      </div>
      <div style="margin-bottom:16px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:6px;font-weight:600">Default trade</div>
        <select id="settingsTrade" style="width:100%;background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px;font-size:13px;color:var(--text);font-family:'Barlow',sans-serif;outline:none;-webkit-appearance:none;appearance:none;">
          ${tradeOpts.map((v,i)=>`<option value="${v}" ${v===trade?'selected':''}>${tradeLabels[i]}</option>`).join('')}
        </select>
      </div>
      <div style="margin-bottom:16px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px;font-weight:600">Morning briefing</div>
        <div class="notify-row">
          <div><div class="notify-label">5AM nudge</div><div class="notify-sub">Check conditions before the day starts</div></div>
          <label class="toggle"><input type="checkbox" id="s-briefing" ${briefingOn?'checked':''}><span class="toggle-slider"></span></label>
        </div>
      </div>
      <div style="margin-bottom:16px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px;font-weight:600">Notifications</div>
        <div class="notify-row">
          <div><div class="notify-label">Severe weather</div><div class="notify-sub">NWS tornado, storm, flood</div></div>
          <label class="toggle"><input type="checkbox" id="s-severe" ${notifySettings.severe?'checked':''}><span class="toggle-slider"></span></label>
        </div>
        <div class="notify-row">
          <div><div class="notify-label">High wind alerts</div><div class="notify-sub">Trade threshold warnings</div></div>
          <label class="toggle"><input type="checkbox" id="s-wind" ${notifySettings.wind?'checked':''}><span class="toggle-slider"></span></label>
        </div>
        <div class="notify-row">
          <div><div class="notify-label">Rain incoming</div><div class="notify-sub">1-2 hours before precip</div></div>
          <label class="toggle"><input type="checkbox" id="s-rain" ${notifySettings.rain?'checked':''}><span class="toggle-slider"></span></label>
        </div>
      </div>
      ${(()=>{const authEmail=localStorage.getItem('jw_auth_email');return authEmail?`<div style="background:var(--surface3);border:1px solid rgba(76,175,80,0.3);border-radius:var(--radius);padding:12px 14px;margin-bottom:12px"><div style="font-size:11px;color:rgba(76,175,80,0.8);font-family:'Barlow Condensed',sans-serif;font-weight:700;letter-spacing:0.06em;margin-bottom:4px">✓ SIGNED IN</div><div style="font-size:12px;color:var(--muted)">${authEmail}</div><button onclick="if(typeof signOut==='function')signOut();closeSettingsSilent();history.back();" style="background:none;border:none;color:rgba(255,255,255,0.3);font-size:11px;cursor:pointer;padding:4px 0;margin-top:4px">Sign out</button></div>`:`<div style="border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:12px"><div style="font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px">Sync across devices</div><div style="font-size:12px;color:var(--muted);margin-bottom:10px">Sign in with your email to access your sites and notes on any device.</div><div style="display:flex;gap:8px"><input type="email" id="authEmailInput" autocomplete="email" name="auth-email" placeholder="your@email.com" style="flex:1;background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;font-size:13px;color:var(--text);min-width:0;"/><button onclick="if(typeof handleMagicLink==='function')handleMagicLink()" style="background:var(--accent);color:#0a1520;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:800;padding:8px 14px;border:none;border-radius:var(--radius-sm);cursor:pointer;white-space:nowrap;">SEND LINK</button></div><div id="authStatus" style="font-size:11px;color:var(--muted);margin-top:6px;min-height:16px"></div></div>`;})()}
      ${(()=>{const isMember=localStorage.getItem('jw_crew_member')==='true';const canInvite=(isCrew()||isProject())&&!isMember;return canInvite?`<div style="border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:12px"><div style="font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:800;color:var(--text);margin-bottom:4px">👷 YOUR CREW</div><div style="font-size:12px;color:var(--muted);margin-bottom:12px">Invite up to ${typeof MAX_CREW!=='undefined'?MAX_CREW:3} crew members. They'll see your saved sites and can add notes.</div><div id="crewInviteList" style="margin-bottom:12px">${typeof renderCrewInviteList==='function'?renderCrewInviteList():''}</div><div id="crewInviteForm"><div style="display:flex;gap:8px"><input type="email" id="crewEmailInput" autocomplete="off" name="crew-invite-email" placeholder="crew@email.com" style="flex:1;background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;font-size:13px;color:var(--text);min-width:0;"/><button onclick="if(typeof handleCrewInvite==='function')handleCrewInvite()" style="background:var(--accent);color:#0a1520;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:800;padding:8px 14px;border:none;border-radius:var(--radius-sm);cursor:pointer;white-space:nowrap;">INVITE</button></div><div id="crewInviteStatus" style="font-size:11px;color:var(--muted);margin-top:6px;min-height:16px"></div></div></div>`:''})()}
      ${s.status==='pro'?`
        <div style="background:var(--surface3);border:1px solid var(--accent);border-left:3px solid var(--accent);border-radius:var(--radius);padding:14px;margin-bottom:12px">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;color:var(--accent);margin-bottom:6px">${isFounder?'FOUNDING CREW · PRO':'⭐ PRO — ACTIVE'}</div>
          ${['🔨 Ask the Foreman','📍 Saved locations','📝 Job site notes','🌅 Morning briefing',isFounder?'⭐ Crew Mode free at launch':''].filter(Boolean).map(f=>`<div style="font-size:12px;color:var(--muted);padding:2px 0">✓ ${f}</div>`).join('')}
        </div>
      `:s.status==='trial'?`
        <div style="background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:12px">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px">PRO TRIAL — ${s.daysLeft} days remaining</div>
          ${['🔨 Ask the Foreman — 7 questions/day','📍 Saved locations','📝 Job site notes','🌅 Morning briefing','⭐ Founding Crew — Crew Mode free at launch'].map(f=>`<div style="font-size:12px;color:var(--muted);padding:2px 0">✓ ${f}</div>`).join('')}
          <a href="${STRIPE_LINK}" target="_blank" style="display:block;background:var(--accent);color:#0a1520;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:800;letter-spacing:0.06em;padding:10px;border-radius:var(--radius-sm);text-decoration:none;text-align:center;margin-top:12px">UPGRADE NOW — $4.99/YEAR →</a>
          <div style="font-size:10px;color:var(--muted);text-align:center;margin-top:6px">You've wasted more than $4.99 waiting on weather that never came. Not anymore.</div>
        </div>
      `:`
        <div style="background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:12px">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;color:#ff6b6b;margin-bottom:8px">TRIAL ENDED</div>
          <a href="${STRIPE_LINK}" target="_blank" style="display:block;background:var(--accent);color:#0a1520;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:800;letter-spacing:0.06em;padding:10px;border-radius:var(--radius-sm);text-decoration:none;text-align:center">UNLOCK PRO — $4.99/YEAR →</a>
          <div style="font-size:10px;color:var(--muted);text-align:center;margin-top:6px">You've wasted more than $4.99 waiting on weather that never came. Not anymore.</div>
        </div>
      `}
      ${localStorage.getItem('jw_crew_member')==='true'?`<div style="background:var(--surface3);border:1px solid rgba(76,175,80,0.3);border-radius:var(--radius);padding:12px 14px;margin-bottom:12px"><div style="font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;color:rgba(76,175,80,0.8);letter-spacing:0.06em;margin-bottom:4px">👷 CREW MEMBER</div><div style="font-size:12px;color:var(--muted)">You're part of ${localStorage.getItem('jw_crew_owner')||'a crew'}.</div><div style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:4px">Want your own crew? <a href="${STRIPE_CREW}" target="_blank" style="color:#f5a623;text-decoration:none">Upgrade to Crew Plan →</a></div></div>`:''}
      ${isFounder&&localStorage.getItem('jw_crew')!=='true'?`<div style="background:rgba(245,166,35,0.08);border:1px solid rgba(245,166,35,0.3);border-radius:var(--radius);padding:14px;margin-bottom:12px"><div style="font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:800;color:#f5a623;margin-bottom:6px">⭐ YOUR FOUNDING CREW BENEFIT</div><div style="font-size:12px;color:var(--muted);margin-bottom:12px;line-height:1.6">Crew Plan is here. As a Founding Crew member your first year is on us.</div><button onclick="claimFoundingCrewBenefit()" style="width:100%;background:var(--accent);color:#0a1520;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:800;padding:11px;border:none;border-radius:var(--radius-sm);cursor:pointer;letter-spacing:0.06em;">CLAIM FREE CREW YEAR →</button></div>`:''}
      ${s.status!=='pro'?`<div style="padding:12px 0;border-top:1px solid var(--border);margin-top:4px">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;color:var(--muted);text-transform:uppercase;margin-bottom:8px">Already paid on another device?</div>
        <div style="display:flex;gap:8px">
          <input type="email" id="restoreEmail" placeholder="Enter your payment email" style="flex:1;background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;font-size:13px;color:var(--text);font-family:'Barlow',sans-serif;outline:none;min-width:0"/>
          <button onclick="restorePro()" style="background:var(--surface3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 14px;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;color:var(--accent);cursor:pointer;white-space:nowrap;letter-spacing:0.04em">Restore</button>
        </div>
        <div id="restoreStatus" style="font-size:12px;margin-top:6px;min-height:18px"></div>
      </div>`:''}
      <div style="padding:10px 0;border-top:1px solid var(--border);margin-top:8px;margin-bottom:12px">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;color:var(--muted);text-transform:uppercase;margin-bottom:8px">Always free</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.8">✓ Current conditions & trade alerts<br>✓ 7-day forecast<br>✓ Hourly breakdown<br>✓ GPS & ZIP search<br>✓ Wind, UV, sunrise/sunset<br>✓ No ads. Ever.</div>
      </div>
      <div style="padding:14px 0;border-top:1px solid var(--border);margin-top:8px">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;color:var(--muted);text-transform:uppercase;margin-bottom:10px">About</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.3);line-height:2">
          <div>JobSite Weather · v1.1.0</div>
          <div>Built by StrickerCo Solutions</div>
          <div style="margin-top:8px;font-size:11px;color:rgba(255,255,255,0.2)">Data & attribution</div>
          <div>Weather data: Open-Meteo (open-meteo.com)</div>
          <div>Severe alerts: NOAA / National Weather Service</div>
          <div>Extended forecast: Tomorrow.io</div>
          <div>AI advisor: Anthropic Claude</div>
          <div>Payments: Stripe</div>
        </div>
      </div>
      <button class="btn" style="width:100%;padding:12px" onclick="saveSettings()">Save & Close</button>
    </div>`;
  document.getElementById('settingsModal').classList.add('open');
}

function saveSettings(){
  const name=(document.getElementById('settingsName')?.value||'').trim()||'Boss';
  // DEV ONLY — REMOVE BEFORE MERGE
  if(name.toUpperCase()==='CREWPLAN'){localStorage.setItem('jw_crew','true');showToast('Crew Plan activated 🔨',2000);}
  const style=document.querySelector('input[name=sstyle]:checked')?.value||'shooter';
  const trade=document.getElementById('settingsTrade')?.value||'general';
  localStorage.setItem('jw_user_name',name);
  localStorage.setItem('jw_foreman_style',style);
  currentTrade=trade;
  localStorage.setItem('jw_trade',trade);
  const ts=document.getElementById('tradeSelect');if(ts)ts.value=trade;
  localStorage.setItem('jw_morning_briefing',document.getElementById('s-briefing')?.checked?'true':'false');
  notifySettings.severe=document.getElementById('s-severe')?.checked||false;
  notifySettings.wind=document.getElementById('s-wind')?.checked||false;
  notifySettings.rain=document.getElementById('s-rain')?.checked||false;
  localStorage.setItem('jw_notify',JSON.stringify(notifySettings));
  closeSettingsSilent();
  history.back();
  updateProjectPill();
  if(currentData&&activeTab==='conditions')renderConditions(document.getElementById('content'));
  showToast('Settings saved. 🔨',1500);
}

async function restorePro(){
  const email=document.getElementById('restoreEmail')?.value?.trim();
  const status=document.getElementById('restoreStatus');
  if(!email){if(status)status.innerHTML='<span style="color:#ff6b6b">Enter your payment email first.</span>';return;}
  if(status)status.innerHTML='<span style="color:var(--muted)">Checking...</span>';
  try{
    const r=await fetch('/api/restore-pro',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
    const data=await r.json();
    if(data.success){
      localStorage.setItem('jw_pro','true');
      if(!localStorage.getItem('jw_founding_crew'))localStorage.setItem('jw_founding_crew','true');
      if(status)status.innerHTML='<span style="color:var(--safe)">✓ Pro restored. Welcome back. 🔨</span>';
      setTimeout(()=>{closeSettingsSilent();history.back();renderLocs();renderFounderBadge();if(currentData&&activeTab==='conditions')renderConditions(document.getElementById('content'));},1500);
    } else {
      if(status)status.innerHTML=`<span style="color:#ff6b6b">${data.message||'Not found.'}</span>`;
    }
  }catch(e){
    if(status)status.innerHTML='<span style="color:#ff6b6b">Could not verify. Check connection and try again.</span>';
  }
}

async function claimFoundingCrewBenefit(){
  const email=localStorage.getItem('jw_auth_email')||localStorage.getItem('jw_restore_email');
  if(!email){showToast('Sign in first to claim your benefit.',3000);return;}
  try{
    const r=await fetch('/api/restore-pro',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
    const d=await r.json();
    if(d.success){
      localStorage.setItem('jw_crew','true');localStorage.setItem('jw_crew_activated',Date.now().toString());localStorage.setItem('jw_crew_founding','true');localStorage.setItem('jw_crew_expires',(Date.now()+365*24*60*60*1000).toString());
      if(sb){try{await sb.from('jw_crew_claims').upsert({email,claimed_at:new Date().toISOString(),expires_at:new Date(Date.now()+365*24*60*60*1000).toISOString(),founding:true});}catch(e){}}
      closeSettingsSilent();history.back();showToast("Crew Year 1 claimed. That's the way we do things. 🔨",4000);updateProjectPill();
    }else{showToast('Could not verify founding membership. Contact support.',3000);}
  }catch(e){showToast('Could not connect. Try again.',3000);}
}

function closeSettingsOverlay(e){
  if(e.target===document.getElementById('settingsModal'))closeSettings();
}
function closeSettingsSilent(){
  document.getElementById('settingsModal').classList.remove('open');
}
function closeSettings(){
  if(!document.getElementById('settingsModal').classList.contains('open'))return;
  closeSettingsSilent();
  history.back();
}

function checkPushAlerts(tradeAlerts,nws){
  if(Notification.permission!=='granted')return;
  const dangerous=tradeAlerts.filter(a=>a.level==='danger');
  if(notifySettings.severe&&nws?.length){
    const sev=nws.find(a=>['Tornado Warning','Severe Thunderstorm Warning','Flash Flood Warning'].includes(a.event));
    if(sev){new Notification('⚠ '+sev.event,{body:sev.headline||'Active NWS alert for your location',icon:'/icons/icon-192.png'});}
  }
  if(notifySettings.wind&&dangerous.some(a=>a.msg.includes('Wind'))){
    new Notification('💨 High Wind Alert',{body:dangerous.find(a=>a.msg.includes('Wind'))?.msg||'Wind exceeds safe work threshold',icon:'/icons/icon-192.png'});
  }
  if(notifySettings.rain&&dangerous.some(a=>a.msg.includes('Wet')||a.msg.includes('Rain'))){
    new Notification('🌧️ Rain Alert',{body:'Precipitation expected — plan accordingly',icon:'/icons/icon-192.png'});
  }
}
// ── MORNING BRIEFING ──────────────────────────────────────
function scheduleMorningBriefing(){
  if(Notification.permission!=='granted')return;
  if(localStorage.getItem('jw_morning_briefing')==='false')return;
  const lastScheduled=localStorage.getItem('jw_briefing_scheduled');
  const today=new Date().toDateString();
  if(lastScheduled===today)return;
  const now=new Date();
  const tomorrow5am=new Date();
  tomorrow5am.setDate(tomorrow5am.getDate()+1);
  tomorrow5am.setHours(5,0,0,0);
  const msUntil5am=tomorrow5am-now;
  setTimeout(()=>{
    const nm=localStorage.getItem('jw_user_name')||'Boss';
    const trade=localStorage.getItem('jw_trade')||'general';
    const tradeNames={general:'your crew',roofing:'the roofing crew',concrete:'the concrete crew',electrical:'the electrical crew',plumbing:'the plumbing crew',hvac:'the HVAC crew',framing:'the framing crew',painting:'the painting crew',landscaping:'the landscaping crew',excavation:'the excavation crew',farming:'the farming operation'};
    new Notification(`Morning ${nm} — JobSite Weather`,{body:`Time to check conditions for ${tradeNames[trade]||'your crew'}. Tap to see what the day looks like.`,icon:'/icons/icon-192.png',badge:'/icons/icon-72.png',tag:'morning-briefing',renotify:false});
    localStorage.setItem('jw_briefing_scheduled',new Date().toDateString());
  },msUntil5am);
  localStorage.setItem('jw_briefing_scheduled',today);
}
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

// Auto-activate from Stripe payment return
const _params=new URLSearchParams(window.location.search);
if(_params.get('pro')==='true'){
  localStorage.setItem('jw_pro','true');
  if(!localStorage.getItem('jw_founding_crew'))localStorage.setItem('jw_founding_crew','true');
  window.history.replaceState({},'',window.location.pathname);
  setTimeout(()=>{const pn=localStorage.getItem('jw_user_name')||'Boss';showToast(`You're in, ${pn}. Go make some money. 🔨`,3000);renderFounderBadge();updateProjectPill();},500);
}
if(_params.get('crew')==='true'){
  localStorage.setItem('jw_pro','true');localStorage.setItem('jw_crew','true');localStorage.setItem('jw_crew_activated',Date.now().toString());
  window.history.replaceState({},'',window.location.pathname);
  setTimeout(()=>{const pn=localStorage.getItem('jw_user_name')||'Boss';showToast(`Crew Plan activated, ${pn}. Your crew is ready. 🔨`,3000);updateProjectPill();},500);
}
if(_params.get('project')==='true'){
  localStorage.setItem('jw_pro','true');localStorage.setItem('jw_crew','true');localStorage.setItem('jw_project','true');localStorage.setItem('jw_project_activated',Date.now().toString());
  window.history.replaceState({},'',window.location.pathname);
  setTimeout(()=>{const pn=localStorage.getItem('jw_user_name')||'Boss';showToast(`Project Plan activated, ${pn}. Command center is live. 🔨`,3000);updateProjectPill();},500);
}

// Check crew expiry
if(typeof checkCrewExpiry==='function')checkCrewExpiry();

// Restore all persisted settings
const savedTrade=localStorage.getItem('jw_trade');
if(savedTrade){currentTrade=savedTrade;const ts=document.getElementById('tradeSelect');if(ts)ts.value=savedTrade;}
if(!Array.isArray(savedLocs))savedLocs=[];

renderLocs();
renderFounderBadge();
updateProjectPill();
showTrialToast();
handleAuthCallback();
if(typeof handleCrewInviteCallback==='function')handleCrewInviteCallback();


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
  // Try restoring last location first
  const lastLat=localStorage.getItem('jw_last_lat');
  const lastLon=localStorage.getItem('jw_last_lon');
  const lastLabel=localStorage.getItem('jw_last_label');
  if(lastLat&&lastLon&&lastLabel){
    await loadByLatLon(parseFloat(lastLat),parseFloat(lastLon),lastLabel);
    return;
  }
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(
      async pos=>{await loadByLatLon(pos.coords.latitude,pos.coords.longitude,'Your location');},
      async()=>{
        try{const geo=await geoSearch('65254');await loadByLatLon(geo.latitude,geo.longitude,'Glasgow, MO');}
        catch(e){document.getElementById('content').innerHTML='<div class="error-state">Enter a ZIP code or tap GPS to get started.</div>';}
      }
    );
  } else {
    try{const geo=await geoSearch('65254');await loadByLatLon(geo.latitude,geo.longitude,'Glasgow, MO');}
    catch(e){document.getElementById('content').innerHTML='<div class="error-state">Enter a ZIP to get started.</div>';}
  }
})();
