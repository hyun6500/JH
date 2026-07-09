/* =====================================================================
   widgets.js — 공용 위젯
   카운트업 애니메이션, 전원달성 콘페티, ⌘K 커맨드 팔레트, 레벨 가이드 모달
   ===================================================================== */
/* ---------- 레벨 가이드 모달 ----------
   프로필의 레벨 배지를 클릭하면 전체 레벨 체계 · 기준 · 현재 위치를 보여줌 */
function openLevelGuide(){
  const name=S.selMember||MEMBERS[0];
  const total=activeDates(name).size;
  const lv=levelInfo(total);
  // 전체 멤버를 각자 레벨로 분류 (누적 많은 순 정렬)
  const byLv={};
  MEMBERS.forEach(n=>{
    const t=activeDates(n).size;
    const l=levelInfo(t);
    (byLv[l.lv]=byLv[l.lv]||[]).push({n,t});
  });
  Object.values(byLv).forEach(arr=>arr.sort((a,b)=>b.t-a.t));
  const asc=[...LEVELS].sort((a,b)=>a.min-b.min);
  const rows=asc.map((l,i)=>{
    const nextMin=asc[i+1]?asc[i+1].min:null;
    const range=nextMin!==null?`${l.min}~${nextMin-1}회`:`${l.min}회 이상`;
    const isCur=l.lv===lv.lv;
    const done=total>=(nextMin!==null?nextMin:l.min)&&!isCur;
    const cls=isCur?'cur':done?'done':'locked';
    const st=isCur
      ?`<span class="st now">현재 ${total}회</span>`
      :done?`<span class="st ok">달성 ✓</span>`
      :`<span class="st togo">${l.min-total}회 남음</span>`;
    const mems=byLv[l.lv]||[];
    const chips=mems.length
      ?mems.map(m=>`<span class="lvl-mem ${m.n===name?'me':''}" title="${m.n} · 누적 ${m.t}회"
          onclick="closeLevelGuide();openMember('${m.n}')">
          <span class="av-xs" style="background:${avatarColor(m.n)}">${initial(m.n)}</span>${m.n}</span>`).join('')
      :`<span class="none">아직 이 레벨의 멤버가 없어요</span>`;
    return `<div class="lvl-row ${cls}">
      <span class="e">${l.e}</span>
      <div class="t"><b>Lv.${l.lv} ${l.title} <span style="font-weight:600;color:var(--muted);font-size:11px">· ${mems.length}명</span></b>
        <span>누적 ${range}</span>
        <div class="lvl-mems">${chips}</div>
      </div>
      ${st}</div>`;
  }).join('');
  document.getElementById('lvlModal').innerHTML=`
    <h3>🏅 레벨 가이드</h3>
    <div class="sub"><b style="color:var(--text2)">${name}</b>님의 <b style="color:var(--text2)">25.01~ 누적 운동일</b> 기준이에요.
      하루에 여러 운동을 해도 <b style="color:var(--text2)">1일 1회</b>로 계산되고, 멤버를 누르면 그 사람 기록으로 이동해요.
      ${lv.next?`다음 레벨 <b style="color:var(--accent)">${lv.next.e} ${lv.next.title}</b>까지 <b style="color:var(--accent)">${lv.need}회</b> 남았어요!`:'이미 최고 레벨이에요 👑'}</div>
    ${rows}
    <button class="lvl-close" onclick="closeLevelGuide()">닫기</button>`;
  document.getElementById('lvlOverlay').classList.add('open');
}
function closeLevelGuide(){document.getElementById('lvlOverlay').classList.remove('open');}

/* =================================================================
   유틸: 카운트업 애니메이션 · 콘페티 · 커맨드 팔레트
   ================================================================= */
const REDUCED_MOTION = (typeof matchMedia==='function') && matchMedia('(prefers-reduced-motion: reduce)').matches;

// data-count 속성을 가진 요소를 0→목표값으로 애니메이션
function runCountUps(root){
  const els=(root||document).querySelectorAll('[data-count]');
  els.forEach(el=>{
    const target=parseFloat(el.dataset.count)||0;
    const dec=parseInt(el.dataset.dec||'0');
    if(REDUCED_MOTION){el.textContent=target.toFixed(dec);return;}
    const dur=800;
    const t0=performance.now();
    function tick(t){
      const p=Math.min(1,(t-t0)/dur);
      const eased=1-Math.pow(1-p,3); // ease-out cubic
      el.textContent=(target*eased).toFixed(dec);
      if(p<1) requestAnimationFrame(tick);
      else el.textContent=target.toFixed(dec);
    }
    requestAnimationFrame(tick);
  });
}

// 전원 달성 콘페티 — 외부 라이브러리 없이 순수 canvas
function fireConfetti(){
  if(REDUCED_MOTION) return;
  try{
    const cv=document.createElement('canvas');
    cv.id='confettiCanvas';
    document.body.appendChild(cv);
    const ctx=cv.getContext('2d');
    if(!ctx){cv.remove();return;}
    const W=cv.width=innerWidth, H=cv.height=innerHeight;
    const colors=[...MEM_COLORS,'#ffd23f','#ff6b3d'];
    const parts=Array.from({length:140},()=>({
      x:Math.random()*W, y:-20-Math.random()*H*0.4,
      w:6+Math.random()*6, h:8+Math.random()*8,
      vy:2.2+Math.random()*3.2, vx:(Math.random()-0.5)*2.2,
      rot:Math.random()*Math.PI, vr:(Math.random()-0.5)*0.25,
      c:colors[Math.floor(Math.random()*colors.length)],
    }));
    const t0=performance.now();
    (function frame(t){
      const el=(t-t0)/1000;
      ctx.clearRect(0,0,W,H);
      for(const p of parts){
        p.x+=p.vx; p.y+=p.vy; p.rot+=p.vr;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
        ctx.fillStyle=p.c; ctx.globalAlpha=Math.max(0,1-el/2.4);
        ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
        ctx.restore();
      }
      if(el<2.6) requestAnimationFrame(frame);
      else cv.remove();
    })(t0);
  }catch(e){ /* canvas 미지원 환경 무시 */ }
}

/* ---------- 커맨드 팔레트 (Ctrl/Cmd+K) ---------- */
let cmdkItems=[], cmdkIdx=0;
function cmdkActions(){
  const acts=[];
  acts.push({g:'이동',e:'🏠',label:'홈',run:()=>goPage('home')});
  acts.push({g:'이동',e:'🏆',label:'랭킹 · 챌린지',run:()=>goPage('rank')});
  acts.push({g:'이동',e:'📊',label:'데이터 · 분석',run:()=>goPage('data')});
  acts.push({g:'이동',e:'⚔️',label:'VS 비교',run:()=>goPage('vs')});
  acts.push({g:'이동',e:'👤',label:'개인 기록',run:()=>goPage('me')});
  MEMBERS.forEach(n=>acts.push({g:'멤버',e:'👤',label:`${n} 개인 기록 보기`,kw:n,run:()=>openMember(n)}));
  Object.keys(S.monthly||{}).sort().reverse().slice(0,12).forEach(mo=>
    acts.push({g:'월 선택',e:'📅',label:`${mo} 로 이동`,kw:mo,run:()=>{setMonth(mo);goPage('rank');}}));
  acts.push({g:'설정',e:'🏅',label:'레벨 가이드 · 레벨별 멤버 보기',run:()=>{goPage('me');openLevelGuide();}});
  acts.push({g:'설정',e:'🌗',label:'다크/라이트 테마 전환',run:()=>toggleTheme()});
  acts.push({g:'설정',e:'🔄',label:'데이터 새로고침',run:()=>init()});
  return acts;
}
function openCmdk(){
  const ov=document.getElementById('cmdkOverlay');
  ov.classList.add('open');
  const inp=document.getElementById('cmdkInput');
  inp.value=''; cmdkFilter(); inp.focus();
}
function closeCmdk(){document.getElementById('cmdkOverlay').classList.remove('open');}
function cmdkFilter(){
  const q=document.getElementById('cmdkInput').value.trim().toLowerCase();
  const all=cmdkActions();
  cmdkItems = q ? all.filter(a=>(a.label+(a.kw||'')+(a.g||'')).toLowerCase().includes(q)) : all;
  cmdkIdx=0;
  renderCmdkList();
}
function renderCmdkList(){
  const list=document.getElementById('cmdkList');
  if(!cmdkItems.length){list.innerHTML=`<div class="cmdk-empty">검색 결과가 없어요</div>`;return;}
  let html='',lastG=null;
  cmdkItems.forEach((a,i)=>{
    if(a.g!==lastG){html+=`<div class="cmdk-group">${a.g}</div>`;lastG=a.g;}
    html+=`<div class="cmdk-item ${i===cmdkIdx?'active':''}" data-i="${i}"
      onclick="cmdkRun(${i})" onmousemove="cmdkIdx=${i};renderCmdkList()">
      <span class="e">${a.e}</span>${a.label}</div>`;
  });
  list.innerHTML=html;
  const act=list.querySelector('.cmdk-item.active');
  if(act&&typeof act.scrollIntoView==='function') act.scrollIntoView({block:'nearest'});
}
function cmdkRun(i){
  const a=cmdkItems[i];
  if(!a)return;
  closeCmdk();
  a.run();
}
function cmdkKey(ev){
  if(ev.key==='ArrowDown'){ev.preventDefault();cmdkIdx=Math.min(cmdkItems.length-1,cmdkIdx+1);renderCmdkList();}
  else if(ev.key==='ArrowUp'){ev.preventDefault();cmdkIdx=Math.max(0,cmdkIdx-1);renderCmdkList();}
  else if(ev.key==='Enter'){ev.preventDefault();cmdkRun(cmdkIdx);}
  else if(ev.key==='Escape'){closeCmdk();}
}
document.addEventListener('keydown',ev=>{
  const isK=(ev.key==='k'||ev.key==='K')&&(ev.metaKey||ev.ctrlKey);
  const isSlash=ev.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'');
  if(isK||isSlash){ev.preventDefault();openCmdk();}
  else if(ev.key==='Escape'){
    if(document.getElementById('cmdkOverlay').classList.contains('open'))closeCmdk();
    if(document.getElementById('lvlOverlay').classList.contains('open'))closeLevelGuide();
    if(document.getElementById('ibOverlay').classList.contains('open'))closeIbModal();
    if(document.getElementById('storyOverlay').classList.contains('open'))closeStoryPreview();
  }
});

