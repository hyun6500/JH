/* =====================================================================
   page-home.js — 홈 탭
   전광판 히어로, 인사이트 엔진(마퀴), 오늘의 현황, 스트릭 그리드, 피드, 티커
   ===================================================================== */
/* =================================================================
   페이지 1: 홈 — 전광판 히어로 + 인사이트 + 오늘 현황 + 스트릭 + 피드
   ================================================================= */
function renderHome(){
  const m=S.selMonth, md=S.monthly[m]||{};
  const total=Object.values(md).reduce((a,b)=>a+b,0);
  const active=Object.keys(md).filter(n=>md[n]>0).length;
  const todayEntry=S.raw.find(e=>e.date===TODAY);
  const doneNames = todayEntry ? Object.keys(todayEntry.data) : [];
  const todayCount = doneNames.length;
  const q=todayQuote();
  const avgRate = MEMBERS.reduce((s,n)=>s+(S.stats.rate[n]||0),0)/MEMBERS.length;
  const ringC=2*Math.PI*27, ringFill=ringC*(1-parseFloat(yearPct)/100);

  // MVP + 가장 뜨거운 스트릭
  const mvp=Object.entries(md).sort((a,b)=>b[1]-a[1])[0];
  const hot=MEMBERS.map(n=>({n,...streakInfo(n)})).filter(x=>x.current>0).sort((a,b)=>b.current-a.current)[0];

  // 레인 전구: 완료 순서(피드 기준으론 알 수 없으니 멤버 순) — 완료자는 점등
  const lanes=MEMBERS.map((n,i)=>{
    const on=doneNames.includes(n);
    const emos=on?[...new Set((todayEntry.data[n]||[]).map(s=>sportEmoji(normSport(s))))].slice(0,1).join(''):'';
    return `<div class="lane ${on?'on':''}" style="${on?`background:${avatarColor(n)};animation-delay:${i*45}ms;`:''}"
      title="${n}${on?' · 오늘 완료':' · 아직'}" onclick="openMember('${n}')">${initial(n)}${on?`<span class="lk">${emos}</span>`:''}</div>`;
  }).join('');

  document.getElementById('page-home').innerHTML = `
    <div class="board">
      <div class="board-top">
        <div style="flex:1;min-width:250px">
          <div class="board-date"><span class="board-live">LIVE</span>
            ${NOW.getFullYear()}.${String(NOW.getMonth()+1).padStart(2,'0')}.${String(NOW.getDate()).padStart(2,'0')} ${DOW_KR[NOW.getDay()]}요일</div>
          <div class="board-bigwrap">
            <span class="board-big" id="boardBig" data-count="${todayCount}">0</span>
            <span class="board-of">/ ${MEMBERS.length}</span>
          </div>
          <div class="board-label">오늘의 <b>오운완</b></div>
          <div class="board-sub">${todayCount===MEMBERS.length?'🎉 전원 달성! 역사적인 날이에요':
            todayCount===0?'아직 첫 주자를 기다리는 중 — 누가 먼저 불을 켤까요? 🏁':
            hot?`🔥 지금 가장 뜨거운 스트릭: <b style="color:var(--accent2)">${hot.n} ${hot.current}일 연속</b>`:'오늘도 하나씩 불을 켜봐요'}</div>
        </div>
        <div class="board-quote">
          <div class="q">"${q.q}"</div>
          <div class="by">— <b>${q.by||'작자 미상'}</b>${q.life?` (${q.life})`:''}${(q.role||q.cat)?` · ${[q.role,q.cat].filter(Boolean).join(' · ')}`:''}</div>
          <div class="year-ring">
            <div class="ring-wrap">
              <svg width="64" height="64"><circle cx="32" cy="32" r="27" fill="none" stroke="var(--surface3)" stroke-width="6"/>
              <circle cx="32" cy="32" r="27" fill="none" stroke="var(--accent2)" stroke-width="6" stroke-linecap="round"
                stroke-dasharray="${ringC}" stroke-dashoffset="${ringFill}"/></svg>
              <div class="ring-label"><div class="pct">${yearPct}%</div><div class="txt">올해 경과</div></div>
            </div>
            <div style="font-size:11px;color:var(--muted);line-height:1.5">올해가 <b style="color:var(--text2)">${yearPct}%</b> 지났어요.<br>남은 ${daysLeftThisYear()}일도 함께 💪</div>
          </div>
        </div>
      </div>
      <div class="lanes">${lanes}</div>
    </div>

    <div class="ins-title">⚡ 오늘의 인사이트 <span style="font-weight:500;letter-spacing:0;text-transform:none;font-family:'Noto Sans KR'">— 데이터가 발견한 이야기</span></div>
    <div class="ins-row" id="insRow"></div>

    <div class="stat-row mb14">
      ${statCard('이달 총 운동',total,'회',(hot?`🔥 ${hot.n} ${hot.current}일 연속`:''),'var(--accent)')}
      ${statCard('활동 멤버',active,'명',`전체 ${MEMBERS.length}명 중`,'var(--amber)')}
      ${statCard('평균 달성률',(avgRate*100).toFixed(1),'%',`기준 ${yearPct}% 경과`,'var(--blue)',false,1)}
      ${statCard('이달의 MVP',mvp?mvp[0]:'—','',mvp?`${mvp[1]}일 운동 🏆`:'','var(--purple)',true)}
    </div>

    <div class="card mb14" id="todayStatusCard"></div>

    <div class="g2">
      <div class="card">
        <div class="card-head">
          <div class="card-title"><span class="dot" style="background:var(--red)"></span>🔥 연속 출석 스트릭</div>
          <span class="card-sub">오늘 기준 · 클릭 시 개인 기록</span>
        </div>
        <div class="streak-grid" id="streakGrid"></div>
      </div>
      <div class="card">
        <div class="card-head">
          <div class="card-title"><span class="dot" style="background:var(--accent)"></span>📋 최근 운동 피드</div>
          <span class="card-sub">최근 활동순</span>
        </div>
        <div class="feed" id="homeFeed"></div>
      </div>
    </div>`;

  buildInsights();
  buildTodayStatus();
  buildStreakGrid('streakGrid');
  buildFeed('homeFeed', 60);
  runCountUps(document.getElementById('page-home'));
  // 전원 달성 축하 (하루 1회)
  if(todayCount===MEMBERS.length && MEMBERS.length>0){
    try{
      if(!sessionStorage.getItem('confetti-'+TODAY)){
        sessionStorage.setItem('confetti-'+TODAY,'1');
        fireConfetti();
      }
    }catch(e){ /* sessionStorage 불가 환경 무시 */ }
  }
}

/* ---------- 인사이트 엔진 (규칙 기반) ----------
   데이터에서 "지금 말할 가치가 있는 것"을 찾아 카드로 요약.
   각 규칙은 {e:이모지, t:제목(HTML), s:부연, c:색, w:가중치} 반환. 상위 6개 노출. */
function buildInsights(){
  const cards=[];
  const md=S.monthly[S.selMonth]||{};
  const todayEntry=S.raw.find(e=>e.date===TODAY);
  const doneNames=todayEntry?Object.keys(todayEntry.data):[];

  // 1) 전원 달성
  if(doneNames.length===MEMBERS.length)
    cards.push({e:'🎉',t:`오늘 <b>전원 달성</b>!`,s:'12명이 모두 불을 켠 날. 캡처해 두세요.',c:'var(--accent2)',w:100});

  // 2) 이번 주 모멘텀 (월~오늘 vs 지난주 같은 구간)
  {
    const dow=NOW.getDay(); const monday=new Date(NOW); monday.setDate(NOW.getDate()-((dow+6)%7));
    const wkStart=monday.toISOString().slice(0,10);
    const prevMon=new Date(monday.getTime()-7*86400000).toISOString().slice(0,10);
    const prevEnd=new Date(new Date(TODAY).getTime()-7*86400000).toISOString().slice(0,10);
    const cnt=r=>{let c=0;for(const e of S.raw){if(e.date>=r[0]&&e.date<=r[1])c+=Object.keys(e.data).length;}return c;};
    const cur=cnt([wkStart,TODAY]), prev=cnt([prevMon,prevEnd]);
    if(prev>0){
      const diff=Math.round((cur-prev)/prev*100);
      if(diff>=10) cards.push({e:'📈',t:`이번 주 그룹 활동 <b>+${diff}%</b>`,s:`지난주 같은 요일까지 ${prev}회 → 이번 주 ${cur}회`,c:'var(--green)',w:60});
      else if(diff<=-10) cards.push({e:'📉',t:`이번 주 그룹 활동 <b>${diff}%</b>`,s:`지난주 ${prev}회 → 이번 주 ${cur}회. 오늘 한 명이 흐름을 바꿔요`,c:'var(--red)',w:55});
    }
  }

  // 3) 스트릭 신기록 감시
  {
    const watch=MEMBERS.map(n=>({n,...streakInfo(n)}))
      .filter(x=>x.current>=3 && x.longest>=4 && (x.longest-x.current)<=2)
      .sort((a,b)=>(a.longest-a.current)-(b.longest-b.current))[0];
    if(watch){
      const gap=watch.longest-watch.current;
      cards.push(gap<=0
        ? {e:'🏅',t:`<b>${watch.n}</b> 최장 스트릭 <b>신기록 진행 중</b>`,s:`${watch.current}일 연속 — 매일이 새 기록입니다`,c:'var(--accent2)',w:80}
        : {e:'⏱️',t:`<b>${watch.n}</b> 신기록까지 <b>${gap+1}일</b>`,s:`현재 ${watch.current}일 연속 · 최장 ${watch.longest}일`,c:'var(--accent)',w:70});
    }
  }

  // 4) 이달 라이징 스타 (전월 대비 증가 최대)
  {
    const prevYM=prevMonthOf(S.selMonth), pmd=S.monthly[prevYM]||{};
    const rise=MEMBERS.map(n=>({n,d:(md[n]||0)-(pmd[n]||0),cur:md[n]||0}))
      .filter(x=>x.d>=3&&x.cur>0).sort((a,b)=>b.d-a.d)[0];
    if(rise) cards.push({e:'🚀',t:`이달의 라이징 스타 <b>${rise.n}</b>`,s:`전월 대비 +${rise.d}일 (이달 ${rise.cur}일)`,c:'var(--pink)',w:50});
  }

  // 5) 그룹 무결석 릴레이 (누군가는 매일 운동한 연속일)
  {
    const set=new Set(S.raw.map(e=>e.date));
    let cursor = set.has(TODAY)?TODAY:new Date(new Date(TODAY).getTime()-86400000).toISOString().slice(0,10);
    let run=0;
    while(set.has(cursor)){run++;cursor=new Date(new Date(cursor).getTime()-86400000).toISOString().slice(0,10);}
    if(run>=7) cards.push({e:'🔗',t:`그룹 무결석 릴레이 <b>${run}일째</b>`,s:'매일 최소 한 명은 운동 중 — 바통을 이어가요',c:'var(--cyan)',w:45});
  }

  // 6) 연말 페이스 리더
  {
    const year=String(NOW.getFullYear());
    const lead=MEMBERS.map(n=>{
      const c=Object.keys(S.monthly).filter(ym=>ym.startsWith(year)).reduce((s,ym)=>s+(S.monthly[ym]?.[n]||0),0);
      const t=S.stats.target[n]||0;
      return {n,rate:t?c/t:0,proj:projectYearEnd(c),t};
    }).filter(x=>x.t>0).sort((a,b)=>b.rate-a.rate)[0];
    if(lead&&lead.proj) cards.push({e:'🧭',t:`페이스 1위 <b>${lead.n}</b> · 달성률 ${(lead.rate*100).toFixed(0)}%`,s:`이 페이스면 연말 예상 약 ${lead.proj}일`,c:'var(--green)',w:40});
  }

  // 7) 이번 달 새 종목
  {
    const monthSports=new Set(Object.keys(sportMapFor(S.raw.filter(e=>e.date.startsWith(S.selMonth)))));
    const before=new Set(Object.keys(sportMapFor(S.raw.filter(e=>e.date<S.selMonth+'-01'))));
    const news=[...monthSports].filter(s=>!before.has(s));
    if(news.length) cards.push({e:'✨',t:`새 종목 등장: <b>${news.slice(0,3).join(', ')}</b>`,s:'이번 달 처음 기록된 운동이에요',c:'var(--purple)',w:35});
  }

  // 8) 이번 달 가장 뜨거운 요일
  {
    const wd=[0,0,0,0,0,0,0];
    for(const e of S.raw){if(!e.date.startsWith(S.selMonth))continue;wd[new Date(e.date).getDay()]+=Object.keys(e.data).length;}
    const mx=Math.max(...wd);
    if(mx>=5) cards.push({e:'📅',t:`이달 최애 요일은 <b>${DOW_KR[wd.indexOf(mx)]}요일</b>`,s:`${mx}회 운동 — 우리 그룹의 리듬`,c:'var(--blue)',w:25});
  }

  const top=cards.sort((a,b)=>b.w-a.w).slice(0,6);
  const el=document.getElementById('insRow');
  const cardsHtml = top.length
    ? top.map(c=>`<div class="ins-card" style="--ins-c:${c.c}"><span class="e">${c.e}</span>
        <div><div class="t">${c.t}</div><div class="s">${c.s}</div></div></div>`).join('')
    : `<div class="ins-card"><span class="e">🌱</span><div><div class="t">데이터가 쌓이는 중</div><div class="s">기록이 더 모이면 인사이트가 나타나요</div></div></div>`;
  // 카드가 3장 이상이면 헤더 티커처럼 옆으로 흐르게 (호버 시 일시정지, 모션 최소화 설정 존중)
  if(top.length>=3 && !REDUCED_MOTION){
    el.classList.remove('static');
    el.innerHTML=`<div class="ins-track" style="--ins-dur:${top.length*8}s">
      <div class="ins-set">${cardsHtml}</div>
      <div class="ins-set" aria-hidden="true">${cardsHtml}</div>
    </div>`;
  }else{
    el.classList.add('static');
    el.innerHTML=cardsHtml;
  }
}

// 오늘의 챔피언 / 아직인 멤버 (부드러운 넛지)
function buildTodayStatus(){
  const todayEntry=S.raw.find(e=>e.date===TODAY);
  const done = todayEntry ? Object.keys(todayEntry.data) : [];
  const pending = MEMBERS.filter(n=>!done.includes(n));
  const dowLabel=DOW_KR[NOW.getDay()];
  const champChips = done.length
    ? done.map(n=>{
        const emos=[...new Set((todayEntry.data[n]||[]).map(s=>sportEmoji(normSport(s))))].slice(0,2).join('');
        return `<span class="status-chip done" onclick="openMember('${n}')">
          <span class="av-xs" style="background:${avatarColor(n)}">${initial(n)}</span>${n} ${emos}</span>`;
      }).join('')
    : `<span style="font-size:13px;color:var(--muted)">아직 오늘의 첫 운동을 기다리고 있어요 — 누가 먼저 끊을까요? 🏁</span>`;
  const pendChips = pending.length
    ? pending.map(n=>`<span class="status-chip pend" onclick="openMember('${n}')">
        <span class="av-xs" style="background:var(--surface3);color:var(--muted)">${initial(n)}</span>${n}</span>`).join('')
    : `<span style="font-size:13px;color:var(--green);font-weight:700">🎉 오늘 전원 달성! 대단한 ${dowLabel}요일이네요</span>`;

  document.getElementById('todayStatusCard').innerHTML=`
    <div class="card-head" style="margin-bottom:12px">
      <div class="card-title"><span class="dot" style="background:var(--gold)"></span>📍 오늘의 현황</div>
      <span class="card-sub">${NOW.getMonth()+1}/${NOW.getDate()} (${dowLabel}) · ${done.length}명 완료 · ${pending.length}명 대기</span>
    </div>
    <div>
      <div class="status-label"><span class="status-dot" style="background:var(--green)"></span>오늘의 챔피언 <b>${done.length}</b></div>
      <div class="status-chips">${champChips}</div>
    </div>
    <div style="margin-top:12px">
      <div class="status-label"><span class="status-dot" style="background:var(--muted)"></span>아직인 멤버 <b>${pending.length}</b></div>
      <div class="status-chips">${pendChips}</div>
    </div>`;
}

function statCard(label,val,unit,sub,color,small,dec){
  const isNum = !small && val!=='' && !isNaN(parseFloat(val));
  const valHtml = isNum
    ? `<span class="cu" data-count="${val}" data-dec="${dec||0}">0</span>`
    : `${val}`;
  return `<div class="stat-card"><div class="bar" style="background:${color}"></div>
    <div class="s-label">${label}</div>
    <div class="s-val" style="color:${color};${small?'font-size:21px;font-family:\'Noto Sans KR\',sans-serif':''}">${valHtml}<span style="font-size:13px;color:var(--muted);font-weight:600">${unit}</span></div>
    <div class="s-sub">${sub}</div></div>`;
}

function buildStreakGrid(elId){
  const arr=MEMBERS.map(n=>({n,...streakInfo(n)}))
    .sort((a,b)=>b.current-a.current || b.longest-a.longest);
  document.getElementById(elId).innerHTML = arr.map(x=>{
    let chip,cls='';
    if(x.daysSince<=1 && x.current>0){chip=`<span class="alert-chip safe">진행중</span>`;}
    else if(x.daysSince===2){chip=`<span class="alert-chip warn">하루 쉼</span>`;cls='warn';}
    else if(x.daysSince===Infinity){chip=`<span class="alert-chip">기록없음</span>`;}
    else {chip=`<span class="alert-chip">${x.daysSince}일째 휴식</span>`;}
    const cold = !(x.daysSince<=1 && x.current>0);
    return `<div class="streak-card" onclick="openMember('${x.n}')">
      <div class="name-row">
        <div style="display:flex;align-items:center;gap:8px">
          <div class="av" style="background:${avatarColor(x.n)}">${initial(x.n)}</div>
          <span class="nm">${x.n}</span>
        </div>${chip}
      </div>
      <div class="streak-flame ${cold?'cold':''}">
        <span style="font-size:18px">${cold?'❄️':'🔥'}</span>
        <span class="num">${x.current}</span><span class="unit">일 연속</span>
      </div>
      <div class="streak-meta"><span>최장 <b>${x.longest}일</b></span><span>${x.last?x.last.slice(5):'—'} 마지막</span></div>
    </div>`;
  }).join('');
}

function buildFeed(elId, limit){
  const byDate={};
  for(const e of [...S.raw].reverse()){
    byDate[e.date]=byDate[e.date]||[];
    for(const[name,sports]of Object.entries(e.data)) byDate[e.date].push({name,sports});
  }
  let html='',cnt=0;
  for(const date of Object.keys(byDate).sort().reverse()){
    if(cnt>=limit)break;
    const dd=new Date(date);
    const label=`${dd.getMonth()+1}/${dd.getDate()} (${DOW_KR[dd.getDay()]})`;
    html+=`<div class="feed-day">${label} · ${byDate[date].length}명</div>`;
    for(const it of byDate[date]){
      if(cnt>=limit)break;
      const tags=it.sports.map(normSport).filter(Boolean).map(s=>`<span class="tag">${s}</span>`).join('');
      html+=`<div class="feed-item" onclick="openMember('${it.name}')">
        <div class="av" style="background:${avatarColor(it.name)}">${initial(it.name)}</div>
        <span class="nm">${it.name}</span><span class="sp">${tags}</span></div>`;
      cnt++;
    }
  }
  document.getElementById(elId).innerHTML = html || `<div class="empty-hint"><span class="ic">🗓️</span>아직 기록이 없어요</div>`;
}

function buildTicker(){
  const items=[];
  for(const e of [...S.raw].reverse()){
    const st=MEMBERS.map(n=>({n,...streakInfo(n)})).reduce((a,x)=>{a[x.n]=x.current;return a;},{});
    for(const[name,sports]of Object.entries(e.data)){
      items.push({date:e.date.slice(5),name,sport:sports.map(normSport).filter(Boolean).join('·'),streak:st[name]||0});
      if(items.length>=12)break;
    }
    if(items.length>=12)break;
  }
  if(!items.length)return;
  const html=[...items,...items].map(it=>
    `<span class="tk-item"><span class="d">${it.date}</span><span class="n">${it.name}</span>
     <span class="s">${it.sport}</span>${it.streak>1?`<span class="fire">🔥${it.streak}</span>`:''}</span>`).join('');
  const t=document.getElementById('tickerTrack');
  if(t){t.innerHTML=html;}
}

function openMember(name){
  S.selMember=name;
  profCalYM=null;
  markDirty(['me']);
  goPage('me');   // goPage가 dirty 상태를 보고 렌더 (탭이 보이는 상태에서 차트 생성)
}

