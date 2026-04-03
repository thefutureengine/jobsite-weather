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
