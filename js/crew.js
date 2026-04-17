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
    const{error}=await sb.auth.signInWithOtp({
      email:email.trim().toLowerCase(),
      options:{
        emailRedirectTo:`${window.location.origin}?crew_invite=${inviteCode}`,
        data:{crew_invite:inviteCode}
      }
    });
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
