javascript:(function(){
  const T={c:null,i(){
    if(!this.c){this.c=document.createElement('div');this.c.id='nt';this.c.style.cssText='position:fixed;top:16px;right:16px;z-index:2147483647;display:flex;flex-direction:column;gap:10px;width:min(380px,calc(100vw-32px));pointer-events:none;font-family:system-ui,sans-serif';document.body.appendChild(this.c)}
    return this.c
  },s(m,t='info',d=3000){
    const c=this.i();const cl={success:'#4ade80',error:'#f87171',warning:'#fbbf24',info:'#60a5fa',loading:'#67e8f9'};const co=cl[t]||cl.info;const ic={success:'✓',error:'✕',warning:'!',info:'i',loading:'◌'};
    const to=document.createElement('div');
    to.style.cssText='background:rgba(15,23,42,.95);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px 16px;color:#e2e8f0;font-size:13px;box-shadow:0 20px 25px -5px rgba(0,0,0,.5);transform:translateX(120%);animation:ns .35s ease forwards;pointer-events:auto;display:flex;align-items:center;gap:10px;width:100%';
    const ic2=document.createElement('span');ic2.textContent=ic[t]||'i';ic2.style.cssText='font-size:18px;flex-shrink:0';
    const ms=document.createElement('span');ms.textContent=m;ms.style.cssText='flex:1';
    to.appendChild(ic2);to.appendChild(ms);c.appendChild(to);
    if(d>0)setTimeout(()=>this.r(to),d);return to
  },r(to){if(!to||!to.parentNode)return;to.style.animation='no .25s ease forwards';setTimeout(()=>{if(to.parentNode)to.parentNode.removeChild(to)},250)},load(m,d){return this.s(m,'loading',d)}};
  
  const st=document.createElement('style');st.textContent='@keyframes ns{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes no{to{transform:translateX(120%);opacity:0}}';document.head.appendChild(st);
  
  const U=window.location.hostname;
  
  // Engine detection
  let engine='0';
  if(U.includes('tarviral.com')||U.includes('rodaemotor.com'))engine='aincrad';
  else if(U.includes('vipteam.store'))engine='vipteam';
  else if(U.includes('powercheats.fun'))engine='powercheats';
  else if(U.includes('vplink.in'))engine='universal-vplink';
  
  T.load('Loading engine: '+engine+'...',0);
  
  window.ABDULLAH_BOOKMARK_LOAD=engine;
  var a=['aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL0EyTUJEMy9BaW5jcmFkL21haW4vL2R5bmFtaWMtYnlwYXNzLWJ5LUBhMm1iZDMuanM='];
  fetch(atob(a[0])+'?t='+Date.now())
  .then(r=>r.text())
  .then(t=>{eval(t);T.s('✅ '+engine+' activated!','success',3000)})
  .catch(()=>{T.s('❌ Failed to load','error',4000)});
})();