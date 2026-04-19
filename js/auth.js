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
          const r=await fetch('https://jobsiteweather.app/.netlify/functions/restore-pro',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
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
