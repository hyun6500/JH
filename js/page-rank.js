/* =====================================================================
   page-rank.js — 랭킹·챌린지 탭
   시상대, 주간/월간 챌린지, 월간·연간 순위표(페이스 칩·연말예상), 종목 순위+장인
   ===================================================================== */
/* =================================================================
   페이지 2: 랭킹·챌린지
   ================================================================= */
function renderRank(){
  const allMonths=Object.keys(S.monthly).sort().filter(mo=>mo<=nowYM);
  const years=[...new Set(allMonths.map(mo=>mo.slice(0,4)))].sort().reverse();
  if(!S.rankYear||!years.includes(S.rankYear)) S.rankYear=S.selMonth.slice(0,4);

  const toggle=`
    <div class="dropdown-row">
      <div style="display:inline-flex;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:3px;gap:2px">
        <button class="period-btn ${S.rankMode==='month'?'active':''}" onclick="setRankMode('month')">월간</button>
        <button class="period-btn ${S.rankMode==='year'?'active':''}" onclick="setRankMode('year')">연간</button>
      </div>
      ${S.rankMode==='month'
        ? `<span class="dropdown-label">📅 월 선택</span>
           <select class="select" onchange="setMonth(this.value)">
             ${allMonths.filter(mo=>mo>=DATA_START_YM).reverse().map(mo=>`<option value="${mo}"${mo===S.selMonth?' selected':''}>${mo}</option>`).join('')}
           </select>`
        : `<span class="dropdown-label">📅 연도 선택</span>
           <select class="select" onchange="setRankYear(this.value)">
             ${years.map(y=>`<option value="${y}"${y===S.rankYear?' selected':''}>${y}년</option>`).join('')}
           </select>`}
    </div>`;

  if(S.rankMode==='year') return renderRankYear(toggle);

  const m=S.selMonth, year=m.slice(0,4);
  const prevYM=prevMonthOf(m);

  document.getElementById('page-rank').innerHTML = `
    <div class="sec-eyebrow">Leaderboard</div>
    <div class="sec-title">랭킹 · 챌린지</div>
    <div class="sec-desc">이번 달 누가 가장 열심히 했을까? 그룹 챌린지 진행 상황도 함께 확인하세요.</div>
    ${toggle}

    <div class="card mb14" id="raceCard"></div>

    <div class="g2 mb14">
      <div class="card">
        <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--gold)"></span>🏆 이달의 시상대</div><span class="card-sub">${m}</span></div>
        <div class="podium" id="podium"></div>
      </div>
      <div class="chal-card" id="weeklyChal"></div>
    </div>

    <div class="card mb14" id="monthlyChalCard"></div>

    <div class="card mb14">
      <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--green)"></span>📋 전체 순위표</div><span class="card-sub">${m} 운동 일수 · 화살표는 전월 대비 순위 등락</span></div>
      <table class="lb-table" id="lbTable"></table>
      <div style="font-size:11px;color:var(--muted);margin-top:10px;line-height:1.6">
        🟡·🟢 <b>N일 필요</b>는 오늘부터 <b>매일 하루도 안 빠지고</b> 운동한다고 가정했을 때 며칠째에 다음 색으로 바뀌는지를 뜻해요
        (하루 1회 · 목표선이 매일 조금씩 오르는 것까지 반영) · 초록불은 표시 없음 · ⚠️ 연내 어려움 = 올해 안엔 매일 해도 도달이 힘든 상태 ·
        <span class="delta up">▲n</span>/<span class="delta dn">▼n</span> 은 전월 대비 순위가 n계단 오르내렸다는 뜻
      </div>
    </div>

    <div class="g2">
      <div class="card">
        <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--amber)"></span>🏅 이달 종목 순위 + 장인</div><span class="card-sub">${m}</span></div>
        <div id="sportMonthly"></div>
      </div>
      <div class="card">
        <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--purple)"></span>👑 누적 종목 순위 + 장인</div><span class="card-sub">25.01~ 전체</span></div>
        <div id="sportCumul"></div>
      </div>
    </div>`;

  buildRace(year);
  buildPodium(m);
  buildWeeklyChallenge();
  buildMonthlyChallenge(m);
  buildLeaderboard(m, prevYM);
  renderSportSection('sportMonthly', sportMapFor(S.raw.filter(r=>r.date.startsWith(m))));
  renderSportSection('sportCumul', sportMapFor(S.raw));
}

/* ---------- 오운완 레이스 ----------
   멤버 12명이 트랙 위를 달리는 진행 시각화.
   달성률 모드: 목표 대비 % 위치 + "오늘 기준선"(연 경과율, 노란 점선) 표시
   운동일수 모드: 선두를 기준으로 상대 위치
   탭 진입 시 출발선에서 제 위치까지 달려가는 입장 애니메이션 */
let raceMode='rate';
function setRaceMode(m){
  raceMode=m;
  const el=document.getElementById('raceCard');
  if(el) buildRace(el.dataset.year, true);
}
function buildRace(year, skipEnter){
  const el=document.getElementById('raceCard');
  if(!el) return;
  el.dataset.year=year;
  const isCur=year===String(NOW.getFullYear());
  const cumul={};
  MEMBERS.forEach(n=>{cumul[n]=Object.keys(S.monthly).filter(ym=>ym.startsWith(year)).reduce((s,ym)=>s+(S.monthly[ym]?.[n]||0),0);});

  let rows;
  if(raceMode==='rate'){
    rows=MEMBERS.map(n=>{
      const t=S.stats.target[n]||0, r=t?cumul[n]/t:0;
      return {n,days:cumul[n],val:t?(r*100).toFixed(0)+'%':'목표없음',pos:Math.min(100,r*100),done:t>0&&r>=1,sort:r};
    });
  }else{
    const maxD=Math.max(...MEMBERS.map(n=>cumul[n]),1);
    rows=MEMBERS.map(n=>({n,days:cumul[n],val:cumul[n]+'일',pos:cumul[n]/maxD*100,done:false,sort:cumul[n]}));
  }
  rows.sort((a,b)=>b.sort-a.sort||b.days-a.days);

  // 오늘 기준선 (달성률 모드 + 올해만)
  const goal=(raceMode==='rate'&&isCur)
    ?`<div class="race-goal" style="left:${yearPct}%"><span class="race-goal-label">📍 오늘 기준 ${yearPct}%</span></div>`:'';

  const lanes=rows.map((r,i)=>{
    const flip=r.pos>78;   // 결승선 근처에선 라벨·먼지를 왼쪽으로
    return `<div class="race-lane">
      <span class="race-nm"><span class="rk">${i+1}</span>${r.n}</span>
      <div class="race-track">
        ${i===0?goal:''}
        <div class="race-finish"></div>
        <div class="race-runner ${r.done?'done':''} ${flip?'flip':''}" data-pos="${r.pos}"
             style="--d:${(i*0.07).toFixed(2)}s;left:${skipEnter?r.pos:0}%">
          <span class="rr-dust">💨</span>
          <span class="rr-av" style="background:${avatarColor(r.n)}">${i===0&&r.days>0?'<span class="rr-crown">👑</span>':''}${initial(r.n)}${r.done?'':''}</span>
          <span class="rr-val">${r.done?'🎉 ':''}${r.val}</span>
        </div>
      </div>
    </div>`;
  }).join('');

  el.innerHTML=`
    <div class="race-head">
      <div class="card-title"><span class="dot" style="background:var(--accent)"></span>🏃 오운완 레이스 <span class="card-sub" style="margin-left:4px">${year}년</span></div>
      <div class="race-toggle">
        <button class="${raceMode==='rate'?'active':''}" onclick="setRaceMode('rate')">🎯 목표 달성률</button>
        <button class="${raceMode==='days'?'active':''}" onclick="setRaceMode('days')">💪 운동일수</button>
      </div>
    </div>
    <div class="race-tracks">${lanes}</div>
    <div class="race-legend">${raceMode==='rate'
      ?`🏁 결승선 = 연간 목표 100% · <b style="color:var(--amber)">노란 점선</b> = 오늘까지 왔어야 할 위치(연 경과율${isCur?` ${yearPct}%`:''}) — 점선보다 앞이면 페이스 초과 중!`
      :`🏁 선두 기준 상대 위치 · 선두와의 거리가 곧 따라잡을 일수예요`}</div>`;

  // 입장 애니메이션: 출발선(0%) → 제 위치로 달려가기
  if(!skipEnter && !REDUCED_MOTION){
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      el.querySelectorAll('.race-runner').forEach(r=>{r.style.left=r.dataset.pos+'%';});
    }));
  }else if(skipEnter||REDUCED_MOTION){
    el.querySelectorAll('.race-runner').forEach(r=>{r.style.left=r.dataset.pos+'%';});
  }
}

// 직전 달 'YYYY-MM' 반환
function prevMonthOf(m){
  const [y,mo]=m.split('-').map(Number);
  const d=new Date(y,mo-2,1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

/* ---------- 연간 모드 ---------- */
function renderRankYear(toggle){
  const y=S.rankYear;
  const prevY=String(parseInt(y)-1);
  const cumul={}; MEMBERS.forEach(n=>{cumul[n]=Object.keys(S.monthly).filter(ym=>ym.startsWith(y)).reduce((s,ym)=>s+(S.monthly[ym]?.[n]||0),0);});
  const prevCumul={}; MEMBERS.forEach(n=>{prevCumul[n]=Object.keys(S.monthly).filter(ym=>ym.startsWith(prevY)).reduce((s,ym)=>s+(S.monthly[ym]?.[n]||0),0);});

  document.getElementById('page-rank').innerHTML = `
    <div class="sec-eyebrow">Leaderboard</div>
    <div class="sec-title">랭킹 · 챌린지</div>
    <div class="sec-desc">${y}년 한 해 누가 가장 꾸준했을까? 연간 누적 기준 순위입니다.</div>
    ${toggle}

    <div class="card mb14" id="raceCard"></div>

    <div id="yearHighlight" class="mb14"></div>

    <div class="g2 mb14">
      <div class="card">
        <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--gold)"></span>🏆 ${y}년 시상대</div><span class="card-sub">연 누적 운동 일수</span></div>
        <div class="podium" id="podium"></div>
      </div>
      <div class="card" id="yearGoalCard"></div>
    </div>

    <div class="g2 mb14">
      <div class="card">
        <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--cyan)"></span>📊 ${y}년 월별 그룹 활동</div><span class="card-sub">어느 달에 가장 뜨거웠나</span></div>
        <div class="chart-box h260"><canvas id="yearMonthlyChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--pink)"></span>🌈 ${y}년 종목 다양성</div><span class="card-sub">시도한 종목 · 새 도전</span></div>
        <div id="yearDiversity"></div>
      </div>
    </div>

    <div class="card mb14">
      <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--green)"></span>📋 ${y}년 연간 순위표</div><span class="card-sub">누적 일수 · 달성률 · 전년 대비 등락 · 🧭 연말 예상</span></div>
      <table class="lb-table" id="lbTableYear"></table>
      <div style="font-size:11px;color:var(--muted);margin-top:10px;line-height:1.6">
        🟡·🟢 <b>N일 필요</b>는 오늘부터 <b>매일 하루도 안 빠지고</b> 운동한다고 가정했을 때 며칠째에 다음 색으로 바뀌는지를 뜻해요
        (하루 1회 · 목표선이 매일 조금씩 오르는 것까지 반영) · 초록불은 표시 없음 · ⚠️ 연내 어려움 = 올해 안엔 매일 해도 도달이 힘든 상태 ·
        <span class="proj-chip">🧭 예상 N일</span>은 지금까지의 페이스가 연말까지 이어진다고 가정한 추정치 ·
        <span class="delta up">▲n</span>/<span class="delta dn">▼n</span> 은 전년 대비 순위가 n계단 오르내렸다는 뜻
      </div>
    </div>

    <div class="g2">
      <div class="card">
        <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--amber)"></span>🏅 ${y}년 종목 순위 + 장인</div><span class="card-sub">연간 전체</span></div>
        <div id="sportYear"></div>
      </div>
      <div class="card">
        <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--purple)"></span>👑 누적 종목 순위 + 장인</div><span class="card-sub">25.01~ 전체</span></div>
        <div id="sportCumul"></div>
      </div>
    </div>`;

  buildRace(y);
  buildYearHighlight(y, cumul);
  buildPodiumByMap('podium', cumul, '일');
  buildYearGoalCard(y, cumul);
  buildYearMonthlyChart(y);
  buildYearDiversity(y, prevY);
  buildYearLeaderboard(y, cumul, prevCumul);
  renderSportSection('sportYear', sportMapFor(S.raw.filter(r=>r.date.startsWith(y))));
  renderSportSection('sportCumul', sportMapFor(S.raw));
}

// 올해의 하이라이트 배너
function buildYearHighlight(y, cumul){
  const topMem=Object.entries(cumul).sort((a,b)=>b[1]-a[1])[0];
  const totalDays=Object.values(cumul).reduce((a,b)=>a+b,0);
  const activeDaySet=new Set(S.raw.filter(e=>e.date.startsWith(y)).map(e=>e.date));
  const monRows=[]; for(let mo=1;mo<=12;mo++){const ym=`${y}-${String(mo).padStart(2,'0')}`;
    monRows.push([mo, Object.values(S.monthly[ym]||{}).reduce((a,b)=>a+b,0)]);}
  const hotMon=monRows.slice().sort((a,b)=>b[1]-a[1])[0];
  let bestStreak={n:'—',v:0};
  MEMBERS.forEach(n=>{
    const ds=[...activeDates(n)].filter(d=>d.startsWith(y)).sort();
    let run=0,prev=null,mx=0;
    for(const d of ds){if(prev&&(new Date(d)-new Date(prev))===86400000)run++;else run=1;mx=Math.max(mx,run);prev=d;}
    if(mx>bestStreak.v)bestStreak={n,v:mx};
  });
  const cells=[
    {e:'🥇',v:topMem?topMem[0]:'—',l:`최다 운동 (${topMem?topMem[1]:0}일)`,c:'var(--gold)'},
    {e:'🔥',v:`${bestStreak.v}일`,l:`최장 연속 · ${bestStreak.n}`,c:'var(--red)'},
    {e:'📅',v:`${hotMon[1]}일`,l:`가장 뜨거운 달 · ${hotMon[0]}월`,c:'var(--cyan)'},
    {e:'💪',v:`${totalDays}일`,l:`그룹 총 운동 (${activeDaySet.size}일 활동)`,c:'var(--accent)'},
  ];
  document.getElementById('yearHighlight').innerHTML=`
    <div class="hl-banner">
      ${cells.map(x=>`<div class="hl-cell">
        <div class="hl-e">${x.e}</div>
        <div class="hl-v" style="color:${x.c}">${x.v}</div>
        <div class="hl-l">${x.l}</div></div>`).join('')}
    </div>`;
}

// 연간 월별 그룹 활동 막대
function buildYearMonthlyChart(y){
  const f=chartFont();
  const labels=[],data=[];
  const isCur=y===String(NOW.getFullYear());
  const maxMo=isCur?parseInt(nowYM.slice(5,7)):12;
  for(let mo=1;mo<=maxMo;mo++){const ym=`${y}-${String(mo).padStart(2,'0')}`;
    labels.push(mo+'월');data.push(Object.values(S.monthly[ym]||{}).reduce((a,b)=>a+b,0));}
  const maxIdx=data.indexOf(Math.max(...data));
  CHARTS.yearMonthly=new Chart(document.getElementById('yearMonthlyChart'),{type:'bar',
    data:{labels,datasets:[{data,backgroundColor:data.map((_,i)=>i===maxIdx?f.accent:f.accent+'70'),borderRadius:6}]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${c.raw}일 운동`}},
        datalabels:{display:true,anchor:'end',align:'end',color:f.text,font:{size:10,weight:'700'},formatter:v=>v||''}},
      scales:{x:{ticks:{color:f.text,font:{size:11}},grid:{display:false}},
        y:{ticks:{color:f.muted,font:{size:10}},grid:{color:f.grid},beginAtZero:true}}}});
}

// 종목 다양성 + 신규 도전
function buildYearDiversity(y, prevY){
  const yearSports=new Set(Object.keys(sportMapFor(S.raw.filter(e=>e.date.startsWith(y)))));
  const beforeSports=new Set(Object.keys(sportMapFor(S.raw.filter(e=>e.date<`${y}-01-01`))));
  const newSports=[...yearSports].filter(s=>!beforeSports.has(s));
  const memSports={}; MEMBERS.forEach(n=>memSports[n]=new Set());
  for(const e of S.raw){if(!e.date.startsWith(y))continue;
    for(const[n,sp]of Object.entries(e.data))for(const s of sp){const k=normSport(s);if(k)memSports[n].add(k);}}
  const allrounder=Object.entries(memSports).map(([n,set])=>[n,set.size]).sort((a,b)=>b[1]-a[1])[0];
  document.getElementById('yearDiversity').innerHTML=`
    <div style="display:flex;gap:12px;margin-bottom:14px">
      <div class="mini-stat" style="flex:1;background:var(--surface2)">
        <div class="v" style="color:var(--pink)">${yearSports.size}</div><div class="l">시도한 종목</div></div>
      <div class="mini-stat" style="flex:1;background:var(--surface2)">
        <div class="v" style="color:var(--green)">${allrounder?allrounder[1]:0}</div><div class="l">올라운더 · ${allrounder?allrounder[0]:'—'}</div></div>
    </div>
    <div style="font-size:11px;color:var(--muted);font-weight:700;margin-bottom:8px">✨ ${y}년 새로 등장한 종목</div>
    ${newSports.length
      ? `<div style="display:flex;flex-wrap:wrap;gap:6px">${newSports.map(s=>`<span class="tag" style="display:inline-block;background:var(--surface2);border:1px solid var(--border);border-radius:9px;font-size:12px;padding:4px 10px">${sportEmoji(s)} ${s}</span>`).join('')}</div>`
      : `<div style="font-size:12px;color:var(--muted)">새로 추가된 종목 없음 — 꾸준히 해오던 종목들로 채운 해네요 👏</div>`}`;
}

// 연간 목표 달성 현황
function buildYearGoalCard(y, cumul){
  const isCur=y===String(NOW.getFullYear());
  const rows=MEMBERS.map(n=>({n,c:cumul[n],t:S.stats.target[n]||0}))
    .map(x=>({...x,rate:x.t?x.c/x.t:0}))
    .sort((a,b)=>b.rate-a.rate);
  const reached=rows.filter(x=>x.c>=x.t&&x.t>0).length;
  const totalC=MEMBERS.reduce((s,n)=>s+cumul[n],0);
  const totalT=MEMBERS.reduce((s,n)=>s+(S.stats.target[n]||0),0);
  const groupPct=totalT?Math.round(totalC/totalT*100):0;
  const top=rows.slice(0,6);
  document.getElementById('yearGoalCard').innerHTML=`
    <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--cyan)"></span>🎯 ${y}년 목표 달성 현황</div>
      <span class="card-sub">${isCur?`기준 ${yearPct}% 경과`:'연말 마감'}</span></div>
    <div class="chal-goal-bar"><div class="chal-goal-fill" style="width:${Math.min(100,groupPct)}%"><span class="v">${groupPct}%</span></div></div>
    <div class="chal-goal-label"><span>그룹 합산 ${totalC} / ${totalT}일</span><span>목표 달성 <b style="color:var(--green)">${reached}명</b></span></div>
    <div class="chal-list">
      ${top.map((x,i)=>{const pct=(x.rate*100).toFixed(0);const done=x.c>=x.t&&x.t>0;
        return `<div class="chal-row">
          <span class="medal">${done?'✅':['🥇','🥈','🥉','','',''][i]||''}</span>
          <span class="nm">${x.n}</span>
          <div class="track"><div class="fill" style="width:${Math.min(100,x.rate*100)}%;background:${done?'var(--green)':avatarColor(x.n)}"></div></div>
          <span class="v">${pct}%</span></div>`;}).join('')}
    </div>`;
}

// 연간 순위표 (+연말 예상 프로젝션)
function buildYearLeaderboard(y, cumul, prevCumul){
  const prevRank={}; Object.entries(prevCumul).sort((a,b)=>b[1]-a[1]).forEach(([n],i)=>prevRank[n]=i+1);
  const isCur=y===String(NOW.getFullYear());
  const sorted=MEMBERS.map(n=>({name:n,cumul:cumul[n],target:S.stats.target[n]||0,
    rate:S.stats.target[n]?cumul[n]/S.stats.target[n]:0})).sort((a,b)=>b.cumul-a.cumul);
  const rows=sorted.map((p,i)=>{
    const rc=i===0?'r1':i===1?'r2':i===2?'r3':'rn';
    const pr=prevRank[p.name];
    let delta='';
    if(pr){const d=pr-(i+1);
      delta=d>0?`<span class="delta up" title="전년 대비 순위 ${d}계단 상승">▲${d}</span>`
        :d<0?`<span class="delta dn" title="전년 대비 순위 ${-d}계단 하락">▼${-d}</span>`
        :`<span class="delta eq" title="전년과 순위 동일">—</span>`;}
    const pct=(p.rate*100).toFixed(1),pn=parseFloat(pct),{c,col}=paceGrade(p.rate);
    const nextChip=nextGradeChip(p.cumul, p.target);
    // 연말 예상 (올해만)
    let projChip='';
    if(isCur){
      const proj=projectYearEnd(p.cumul);
      if(proj!==null){
        const hit=p.target>0&&proj>=p.target;
        projChip=` · <span class="proj-chip ${hit?'hit':''}" title="지금 페이스가 연말까지 이어질 때의 추정치">🧭 예상 ${proj}일${hit?' ✓':''}</span>`;
      }
    }
    return `<tr onclick="openMember('${p.name}')">
      <td><span class="rank-badge ${rc}">${i+1}</span></td>
      <td><span class="av-sm" style="background:${avatarColor(p.name)}">${initial(p.name)}</span><b>${p.name}</b></td>
      <td style="font-family:'Archivo',sans-serif;font-weight:800">${p.cumul}<span style="color:var(--muted);font-size:10px">일</span> ${delta}</td>
      <td><div class="pbar-row"><div class="pbar"><div class="pfill ${c}" style="width:${Math.min(100,pn)}%"></div></div>
        <span class="pct" style="color:${col}">${pct}%</span></div>
        <div class="rate-detail">${p.cumul}/${p.target}일${nextChip}${projChip}</div></td></tr>`;
  }).join('');
  document.getElementById('lbTableYear').innerHTML=`<thead><tr><th>#</th><th>이름</th><th>연 누적</th><th>목표 달성률</th></tr></thead><tbody>${rows}</tbody>`;
}

// 순위표 rate-detail 뒤에 붙일 "다음 색까지 +N일" 칩
function nextGradeChip(cumul, target){
  const nx=daysToNextGrade(cumul, target);
  if(!nx) return '';
  const toGreen = nx.toColor==='green';
  const dotEmoji = toGreen ? '🟢' : '🟡';
  const cls = toGreen ? 'to-green' : 'to-amber';
  const colorName = toGreen ? '초록불' : '노란불';
  if(nx.unreachable){
    return ` · <span class="next-chip unreachable" title="남은 ${nx.daysLeft}일 동안 매일 운동해도 올해 안엔 ${colorName} 도달이 어려워요">⚠️ 연내 어려움</span>`;
  }
  return ` · <span class="next-chip ${cls}" title="오늘부터 매일 운동하면 ${nx.need}일째에 ${colorName}로 바뀌어요 (하루 1회 · 색 기준 상승 반영)">${dotEmoji} ${nx.need}일 필요</span>`;
}

// 범용 시상대 (임의 {name:count} 맵 기반)
function buildPodiumByMap(elId, map, unit){
  const top=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,3);
  if(top.length<3||top[0][1]===0){document.getElementById(elId).innerHTML=`<div class="empty-hint" style="padding:24px"><span class="ic">🥇</span>아직 순위를 매길 데이터가 부족해요</div>`;return;}
  const order=[top[1],top[0],top[2]],place=[2,1,3];
  document.getElementById(elId).innerHTML=order.map((e,i)=>{
    const[name,cnt]=e;const p=place[i];const medal=p===1?'🥇':p===2?'🥈':'🥉';
    return `<div class="pod pod-${p}" onclick="openMember('${name}')" style="cursor:pointer">
      <div style="font-size:18px">${medal}</div>
      <div class="av" style="background:${avatarColor(name)}">${initial(name)}</div>
      <div class="nm">${name}</div><div class="sc">${cnt}${unit}</div>
      <div class="stand">${p}</div></div>`;
  }).join('');
}

function setRankMode(mode){S.rankMode=mode;renderPage('rank');}
function setRankYear(y){S.rankYear=y;renderPage('rank');}

function buildPodium(m){
  buildPodiumByMap('podium', S.monthly[m]||{}, '일');
}

// 주간 그룹 챌린지: 이번 주(월~일) 그룹 전체 운동 횟수 목표
function buildWeeklyChallenge(){
  const dow=NOW.getDay(); const monday=new Date(NOW); monday.setDate(NOW.getDate()-((dow+6)%7));
  const weekStart=monday.toISOString().slice(0,10);
  const weekEntries=S.raw.filter(e=>e.date>=weekStart && e.date<=TODAY);
  let groupCount=0; const perMember={};
  for(const e of weekEntries)for(const n of Object.keys(e.data)){groupCount++;perMember[n]=(perMember[n]||0)+1;}
  const GOAL=40; // 주간 그룹 목표 (12명 × 약 3~4회)
  const pct=Math.min(100, Math.round(groupCount/GOAL*100));
  const top=Object.entries(perMember).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxV=top[0]?top[0][1]:1;
  document.getElementById('weeklyChal').innerHTML=`
    <div class="chal-head"><div class="chal-title">⚡ 이번 주 그룹 챌린지</div>
      <span class="chal-period">${weekStart.slice(5)} ~ ${TODAY.slice(5)}</span></div>
    <div class="chal-goal-bar"><div class="chal-goal-fill" style="width:${pct}%"><span class="v">${groupCount}/${GOAL}</span></div></div>
    <div class="chal-goal-label"><span>그룹 합산 운동 횟수</span><span>${pct}% 달성</span></div>
    <div class="chal-list">
      ${top.map((e,i)=>{const[n,c]=e;return `<div class="chal-row">
        <span class="medal">${['🥇','🥈','🥉','',''][i]||''}</span>
        <span class="nm">${n}</span>
        <div class="track"><div class="fill" style="width:${c/maxV*100}%;background:${avatarColor(n)}"></div></div>
        <span class="v">${c}회</span></div>`;}).join('') || '<div class="empty-hint" style="padding:14px">이번 주 첫 운동을 시작해보세요!</div>'}
    </div>`;
}

// 월간 챌린지: 이달 그룹 전체 일수 vs 전월
function buildMonthlyChallenge(m){
  const md=S.monthly[m]||{};
  const total=Object.values(md).reduce((a,b)=>a+b,0);
  const prevYM=prevMonthOf(m);
  const prevTotal=Object.values(S.monthly[prevYM]||{}).reduce((a,b)=>a+b,0);
  const goal=prevTotal>0?Math.ceil(prevTotal*1.05):60; // 전월 대비 +5% 도전
  const pct=Math.min(100,Math.round(total/goal*100));
  const beat = total>=goal;
  document.getElementById('monthlyChalCard').innerHTML=`
    <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--cyan)"></span>🎯 이달 그룹 도전 — 전월 기록 넘기</div>
      <span class="card-sub">${prevYM} 대비 +5% 목표</span></div>
    <div class="chal-goal-bar"><div class="chal-goal-fill" style="width:${pct}%;${beat?'':'background:linear-gradient(90deg,var(--blue),var(--cyan))'}">
      <span class="v" style="${beat?'':'color:#fff'}">${total}일</span></div></div>
    <div class="chal-goal-label">
      <span>목표 ${goal}일 (전월 ${prevTotal}일)</span>
      <span style="color:${beat?'var(--green)':'var(--text2)'};font-weight:700">${beat?'🎉 목표 달성!':`${pct}% · ${goal-total}일 남음`}</span>
    </div>`;
}

function buildLeaderboard(m, prevYM){
  const md=S.monthly[m]||{};
  const prevMd=S.monthly[prevYM]||{};
  const prevRank={};
  Object.entries(prevMd).sort((a,b)=>b[1]-a[1]).forEach(([n],i)=>prevRank[n]=i+1);
  const year=m.slice(0,4);
  const yearCumul={};
  MEMBERS.forEach(n=>{yearCumul[n]=Object.keys(S.monthly).filter(ym=>ym.startsWith(year)&&ym<=m).reduce((s,ym)=>s+(S.monthly[ym]?.[n]||0),0);});
  const sorted=MEMBERS.map(n=>({name:n,count:md[n]||0,cumul:yearCumul[n],target:S.stats.target[n]||0,
    rate:S.stats.target[n]?yearCumul[n]/S.stats.target[n]:0})).sort((a,b)=>b.count-a.count);
  const rows=sorted.map((p,i)=>{
    const rc=i===0?'r1':i===1?'r2':i===2?'r3':'rn';
    const pr=prevRank[p.name];
    let delta='';
    if(pr){const d=pr-(i+1);
      delta=d>0?`<span class="delta up" title="전월 대비 순위 ${d}계단 상승">▲${d}</span>`
        :d<0?`<span class="delta dn" title="전월 대비 순위 ${-d}계단 하락">▼${-d}</span>`
        :`<span class="delta eq" title="전월과 순위 동일">—</span>`;}
    const pct=(p.rate*100).toFixed(1),pn=parseFloat(pct),{c,col}=paceGrade(p.rate);
    const nextChip=nextGradeChip(p.cumul, p.target);
    return `<tr onclick="openMember('${p.name}')">
      <td><span class="rank-badge ${rc}">${i+1}</span></td>
      <td><span class="av-sm" style="background:${avatarColor(p.name)}">${initial(p.name)}</span><b>${p.name}</b></td>
      <td style="font-family:'Archivo',sans-serif;font-weight:800">${p.count}<span style="color:var(--muted);font-size:10px">일</span> ${delta}</td>
      <td><div class="pbar-row"><div class="pbar"><div class="pfill ${c}" style="width:${Math.min(100,pn)}%"></div></div>
        <span class="pct" style="color:${col}">${pct}%</span></div>
        <div class="rate-detail">${p.cumul}/${p.target}일${nextChip}</div></td></tr>`;
  }).join('');
  document.getElementById('lbTable').innerHTML=`<thead><tr><th>#</th><th>이름</th><th>이달</th><th>${year}년 누적 달성률</th></tr></thead><tbody>${rows}</tbody>`;
}

function renderSportSection(elId, sportMap){
  const sorted=Object.entries(sportMap).sort((a,b)=>b[1].total-a[1].total).slice(0,10);
  if(!sorted.length){document.getElementById(elId).innerHTML=`<div class="empty-hint"><span class="ic">🏃</span>기록이 없어요</div>`;return;}
  const max=sorted[0][1].total||1;
  document.getElementById(elId).innerHTML=`<div class="sport-section">${sorted.map(([name,{total,per}],i)=>{
    const master=Object.entries(per).sort((a,b)=>b[1]-a[1])[0];
    return `<div class="sr-item"><span class="sr-rank">${i+1}</span><span class="sr-name">${name}</span>
      <div class="sr-bar"><div class="sr-fill" style="width:${total/max*100}%;background:${SPORT_COLORS[i%10]}"></div></div>
      <div class="sr-right"><span class="sr-cnt">${total}회</span>
      ${master?`<span class="master-badge">🏅${master[0]} ${master[1]}</span>`:''}</div></div>`;
  }).join('')}</div>`;
}

function setMonth(m){
  S.selMonth=m;
  buildTicker();
  markDirty(['home','rank','data','vs']);  // 월 의존 페이지만 무효화 (개인기록은 자체 달력 유지)
  renderPage(curPage);
}
