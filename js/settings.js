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
      setTimeout(()=>{closeSettingsSilent();history.back();renderLocs();if(currentData&&activeTab==='conditions')renderConditions(document.getElementById('content'));},1500);
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
