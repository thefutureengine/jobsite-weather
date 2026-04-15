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
