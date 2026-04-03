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
