/* =====================================================================
   page-me.js — 개인 기록 탭
   프로필 히어로(레벨·XP), 배지, 종목 도넛, 운동 달력, 개인 히트맵, 페이스 넛지
   ===================================================================== */
/* =================================================================
   페이지 5: 개인 기록 (멤버 클릭 시)
   ================================================================= */
function renderMe(){
  const name=S.selMember||MEMBERS[0];
  document.getElementById('page-me').innerHTML = `
    <div class="sec-eyebrow">Profile</div>
    <div class="sec-title">개인 기록</div>
    <div class="sec-desc">멤버를 선택하면 레벨·연속 스트릭·종목 구성·요일 패턴·달성 배지를 볼 수 있어요.</div>
    <div class="member-picker" id="memberPicker"></div>
    <div id="profileBody"></div>`;
  document.getElementById('memberPicker').innerHTML=MEMBERS.map(n=>
    `<div class="mp-chip ${n===name?'active':''}" onclick="selectMember('${n}')">
      <div class="av" style="background:${avatarColor(n)}">${initial(n)}</div>${n}</div>`).join('');
  buildProfile(name);
}
function selectMember(n){S.selMember=n;profCalYM=null;renderPage('me');}

function buildProfile(name){
  const st=streakInfo(name);
  const year=S.selMonth.slice(0,4);
  const dates=[...activeDates(name)].sort();
  const cumulYear=Object.keys(S.monthly).filter(ym=>ym.startsWith(year)).reduce((s,ym)=>s+(S.monthly[ym]?.[name]||0),0);
  const target=S.stats.target[name]||0;
  const rate=target?(cumulYear/target*100):0;
  const totalAll=dates.length;
  const lv=levelInfo(totalAll);
  const proj=(year===String(NOW.getFullYear()))?projectYearEnd(cumulYear):null;

  // 종목 구성
  const sportCount={};
  for(const e of S.raw)if(e.data[name])for(const s of e.data[name]){const k=normSport(s);if(!k)continue;sportCount[k]=(sportCount[k]||0)+1;}
  const sportSorted=Object.entries(sportCount).sort((a,b)=>b[1]-a[1]);
  const favSport=sportSorted[0]?sportSorted[0][0]:'—';

  // 요일 패턴
  const wd=[0,0,0,0,0,0,0];
  for(const e of S.raw)if(e.data[name])wd[new Date(e.date).getDay()]++;
  const bestWd=wd.indexOf(Math.max(...wd));

  // 종목별 순위 1위 횟수(장인 배지)
  let masteryCount=0;
  const allSports=sportMapFor(S.raw);
  for(const[sp,{per}]of Object.entries(allSports)){const top=Object.entries(per).sort((a,b)=>b[1]-a[1])[0];if(top&&top[0]===name)masteryCount++;}

  // 페이스 판정 + 다음 색까지 필요 일수
  const paceG=paceGrade(target?cumulYear/target:0);
  const nx=daysToNextGrade(cumulYear, target);

  // 배지
  const achvs=[
    {on:st.longest>=7,e:'🔥',t:'일주일 연속',s:'최장 7일+'},
    {on:st.longest>=14,e:'⚡',t:'2주 연속',s:'최장 14일+'},
    {on:totalAll>=50,e:'💪',t:'50회 달성',s:'누적 50회'},
    {on:totalAll>=100,e:'🏆',t:'100회 클럽',s:'누적 100회'},
    {on:rate>=parseFloat(yearPct),e:'🎯',t:'페이스 유지',s:'목표 페이스 이상'},
    {on:masteryCount>=1,e:'🏅',t:'종목 장인',s:`${masteryCount}개 종목 1위`},
    {on:Object.keys(sportCount).length>=4,e:'🌈',t:'올라운더',s:'4종목+ 경험'},
    {on:st.current>=3,e:'✨',t:'현재 연속중',s:`${st.current}일 진행`},
  ];

  // 스토리 카드 렌더링에 쓸 데이터 스냅샷 (다운로드 버튼이 참조)
  S.storyData={
    name, year, cumulYear, target, rate, totalAll,
    curStreak:st.current, longestStreak:st.longest,
    favSport, masteryCount,
    sportTop:sportSorted.slice(0,5),
    bestWd:DOW_KR[bestWd],
    paceLevel:paceG.level, nx,
    badgesOn:achvs.filter(a=>a.on),
    monthsTogether:monthsTogether(),
    legacyCount:(S.legacy.perMember[name]||0),
    lvTitle:`Lv.${lv.lv} ${lv.title}`, lvEmoji:lv.e,
  };

  document.getElementById('profileBody').innerHTML=`
    <div class="card mb14">
      <div class="profile-hero">
        <div class="big-av" style="background:${avatarColor(name)}">${initial(name)}</div>
        <div class="info">
          <h2>${name} <span class="lv-badge" onclick="openLevelGuide()" title="레벨 기준 보기">${lv.e} Lv.${lv.lv} ${lv.title} <span style="opacity:.65;font-size:10px">ⓘ</span></span></h2>
          <div class="meta">${year}년 누적 <b>${cumulYear}일</b> · 목표 ${target}일 · 달성률 <b>${rate.toFixed(1)}%</b>${proj!==null?` · 🧭 연말 예상 ~${proj}일`:''}</div>
          <div class="meta" style="margin-top:2px">가장 좋아하는 운동: <b>${favSport}</b> · <b>25.01~</b> 누적 ${totalAll}회${(S.legacy.perMember[name]||0)?` <span style="color:var(--muted)">(이전 기록 ${S.legacy.perMember[name]}회 별도)</span>`:''}</div>
        </div>
        <button class="story-btn" onclick="downloadStoryCard()" title="인스타 스토리용 9:16 이미지로 저장">
          <span style="font-size:15px">📸</span> 스토리 이미지 저장
        </button>
      </div>
      <div class="mini-stats">
        <div class="mini-stat"><div class="v" style="color:${st.current>0?'var(--red)':'var(--muted)'}">${st.current>0?'🔥':'❄️'}${st.current}</div><div class="l">현재 연속</div></div>
        <div class="mini-stat"><div class="v" style="color:var(--amber)">${st.longest}</div><div class="l">최장 연속</div></div>
        <div class="mini-stat"><div class="v" style="color:var(--green)">${cumulYear}</div><div class="l">${year} 누적</div></div>
        <div class="mini-stat"><div class="v" style="color:var(--purple)">${masteryCount}</div><div class="l">종목 장인 🏅</div></div>
      </div>
      <div class="xp-wrap">
        <div class="xp-head">
          <span style="cursor:pointer" onclick="openLevelGuide()" title="레벨 기준 보기">${lv.e} <b>Lv.${lv.lv} ${lv.title}</b> <span style="opacity:.55;font-size:10px">ⓘ</span></span>
          <span>${lv.next?`다음 레벨 ${lv.next.e} ${lv.next.title}까지 <b>${lv.need}회</b>`:'최고 레벨 달성 👑'}</span>
        </div>
        <div class="xp-bar"><div class="xp-fill" style="width:${Math.round(lv.progress*100)}%"></div></div>
      </div>
      ${buildPaceNudge(paceG, nx, target)}
      ${(S.legacy.perMember[name]||0) ? `<div style="margin-top:10px;font-size:12px;color:var(--muted);text-align:center">
        📎 이전 기록(24년 이전) <b style="color:var(--text2)">${S.legacy.perMember[name]}회</b> — 지금 지표는 모두 <b style="color:var(--text2)">25.01~</b> 기준이에요</div>` : ''}
    </div>

    <div class="g2 mb14">
      <div class="card">
        <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--accent)"></span>종목 구성</div></div>
        <div class="chart-box h260"><canvas id="profileDonut"></canvas></div>
      </div>
      <div class="card">
        <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--blue)"></span>요일별 패턴</div><span class="card-sub">25.01~ 전체</span></div>
        <div class="weekday-grid">
          ${DOW_KR.map((d,i)=>`<div class="wd-cell ${i===bestWd?'best':''}"><div class="d">${d}</div><div class="v">${wd[i]}</div></div>`).join('')}
        </div>
        <div style="font-size:12px;color:var(--text2);margin:12px 0 16px;text-align:center">
          가장 부지런한 요일은 <b style="color:var(--accent)">${DOW_KR[bestWd]}요일</b> 💪
        </div>
        <div style="border-top:1px solid var(--border);padding-top:14px">
          <div style="font-size:11px;color:var(--muted);font-weight:700;margin-bottom:8px">📈 월별 운동 추이</div>
          <div class="chart-box" style="height:150px"><canvas id="profileTrend"></canvas></div>
        </div>
      </div>
    </div>

    <div class="card mb14">
      <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--gold)"></span>🏆 달성 배지</div>
        <span class="card-sub">${achvs.filter(a=>a.on).length}/${achvs.length} 획득</span></div>
      <div class="badge-row">
        ${achvs.map(a=>`<div class="achv ${a.on?'on':'off'}"><span class="e">${a.e}</span><div class="t"><b>${a.t}</b><span>${a.s}</span></div></div>`).join('')}
      </div>
    </div>

    <div class="card mb14" id="inbodyCard"></div>

    <div class="g2 mb14">
      <div class="card">
        <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--purple)"></span>🗓️ 운동 달력</div>
          <div style="display:flex;align-items:center;gap:6px">
            <button class="icon-btn" style="width:28px;height:28px;font-size:13px" onclick="profCalMove(-1)">‹</button>
            <span class="card-sub" id="profCalLabel" style="min-width:74px;text-align:center"></span>
            <button class="icon-btn" style="width:28px;height:28px;font-size:13px" onclick="profCalMove(1)">›</button>
          </div>
        </div>
        <div id="profileCal"></div>
      </div>
      <div class="card">
        <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--accent)"></span>🕒 최근 운동</div>
          <span class="card-sub">${name}님 · 최근 활동순</span></div>
        <div class="feed" id="profileRecent" style="max-height:380px"></div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--cyan)"></span>${year}년 출석 히트맵</div></div>
      <div id="profileHeat" style="overflow-x:auto"></div>
    </div>`;

  buildProfileDonut(name, sportSorted);
  buildProfileTrend(name);
  buildProfileRecent(name);
  buildProfileCal(name);
  buildProfileHeat(name);
  buildInbody(name);
}

// 개인 프로필 — 다음 색 등급까지 안내 카드
function buildPaceNudge(paceG, nx, target){
  if(!target){
    return `<div class="pace-nudge keep"><span class="pn-emoji">🎯</span>
      <span class="pn-text">아직 목표가 설정되지 않았어요. 목표를 정하면 페이스 안내를 볼 수 있어요.</span></div>`;
  }
  if(!nx || paceG.level==='green'){
    return `<div class="pace-nudge keep"><span class="pn-emoji">🟢</span>
      <span class="pn-text"><b>초록불</b> — 목표 페이스를 유지하고 있어요! 이대로만 꾸준히 💪</span></div>`;
  }
  const curColor = paceG.level==='amber' ? '노란불' : '빨간불';
  const curEmoji = paceG.level==='amber' ? '🟡' : '🔴';
  const nextColor = nx.toColor==='green' ? '초록불' : '노란불';
  const nextVar   = nx.toColor==='green' ? 'var(--green)' : 'var(--amber)';
  const nextEmoji = nx.toColor==='green' ? '🟢' : '🟡';
  const cls = nx.toColor==='green' ? 'to-green' : 'to-amber';
  if(nx.unreachable){
    return `<div class="pace-nudge to-amber"><span class="pn-emoji">${curEmoji}</span>
      <span class="pn-text">지금은 <b>${curColor}</b>이에요. 아쉽지만 올해 남은 <b>${nx.daysLeft}일</b> 동안 매일 운동해도
      ${nextColor} 도달은 어려워요. 그래도 오늘 한 번이 내년의 나를 만듭니다 💪</span></div>`;
  }
  return `<div class="pace-nudge ${cls}"><span class="pn-emoji">${curEmoji}</span>
    <span class="pn-text">지금은 <b>${curColor}</b>이에요. 오늘부터 <b>매일 운동하면 ${nx.need}일째</b>에
    <b style="color:${nextVar}">${nextColor}</b>로 바뀌어요 ${nextEmoji}
    <span style="color:var(--muted);font-size:11px">(하루 1회 · 색 기준이 매일 조금씩 오르는 것까지 반영)</span></span></div>`;
}

// 개인 월별 운동 추이
function buildProfileTrend(name){
  const f=chartFont();
  const months=Object.keys(S.monthly).sort().filter(mo=>mo<=nowYM);
  const data=months.map(mo=>S.monthly[mo]?.[name]||0);
  CHARTS.profTrend=new Chart(document.getElementById('profileTrend'),{type:'line',
    data:{labels:months.map(mo=>mo.slice(2)),datasets:[{data,borderColor:avatarColor(name),
      backgroundColor:'transparent',borderWidth:2.5,pointRadius:0,tension:.35,fill:false}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${c.raw}일`}}},
      scales:{x:{ticks:{color:f.muted,font:{size:9},maxRotation:0,autoSkip:true,maxTicksLimit:8},grid:{display:false}},
        y:{ticks:{color:f.muted,font:{size:9}},grid:{color:f.grid},beginAtZero:true}}}});
}

// 개인 운동 달력 (월별, 운동한 날에 이모지)
let profCalYM = null;
function buildProfileCal(name){
  const dates=[...activeDates(name)].sort();
  if(!profCalYM){profCalYM = dates.length?dates[dates.length-1].slice(0,7):nowYM;}
  renderProfileCal(name);
}
function profCalMove(delta){
  const [y,m]=profCalYM.split('-').map(Number);
  const d=new Date(y,m-1+delta,1);
  const cand=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  if(cand>nowYM) return; // 미래는 막음
  profCalYM=cand;
  renderProfileCal(S.selMember);
}
function renderProfileCal(name){
  const ym=profCalYM, [y,mo]=ym.split('-').map(Number);
  document.getElementById('profCalLabel').textContent=`${y}년 ${mo}월`;
  const dayMap={};
  for(const e of S.raw){if(!e.date.startsWith(ym)||!e.data[name])continue;
    dayMap[e.date]=e.data[name].map(normSport).filter(Boolean);}
  const days=new Date(y,mo,0).getDate();
  const first=new Date(y,mo-1,1).getDay();
  let cells='';
  for(let i=0;i<first;i++)cells+=`<div class="cal-cell empty"></div>`;
  for(let d=1;d<=days;d++){
    const key=`${ym}-${String(d).padStart(2,'0')}`;
    const sports=dayMap[key];
    const isToday=key===TODAY;
    const dow=(first+d-1)%7;
    const dcol=dow===0?'var(--red)':dow===6?'var(--blue)':'var(--text2)';
    if(sports&&sports.length){
      const emos=[...new Set(sports.map(sportEmoji))].slice(0,3).join('');
      const title=sports.join(', ');
      cells+=`<div class="cal-cell on${isToday?' today':''}" title="${key} · ${title}">
        <span class="cd" style="color:${dcol}">${d}</span><span class="ce">${emos}</span></div>`;
    }else{
      cells+=`<div class="cal-cell${isToday?' today':''}"><span class="cd" style="color:${dcol}">${d}</span></div>`;
    }
  }
  const cnt=Object.keys(dayMap).length;
  document.getElementById('profileCal').innerHTML=`
    <div class="cal-dow">${DOW_KR.map((d,i)=>`<span style="color:${i===0?'var(--red)':i===6?'var(--blue)':'var(--muted)'}">${d}</span>`).join('')}</div>
    <div class="cal-grid">${cells}</div>
    <div style="font-size:11px;color:var(--muted);text-align:center;margin-top:10px">이 달 <b style="color:var(--accent)">${cnt}일</b> 운동 💪</div>`;
}

// 개인 최근 운동 리스트
function buildProfileRecent(name){
  const list=[...S.raw].reverse().filter(e=>e.data[name]).slice(0,30);
  if(!list.length){document.getElementById('profileRecent').innerHTML=`<div class="empty-hint"><span class="ic">🗓️</span>아직 운동 기록이 없어요</div>`;return;}
  document.getElementById('profileRecent').innerHTML=list.map(e=>{
    const dd=new Date(e.date);
    const label=`${dd.getMonth()+1}/${dd.getDate()} (${DOW_KR[dd.getDay()]})`;
    const tags=e.data[name].map(normSport).filter(Boolean).map(s=>`<span class="tag">${sportEmoji(s)} ${s}</span>`).join('');
    return `<div class="feed-item">
      <div class="av" style="background:${avatarColor(name)}">${initial(name)}</div>
      <span class="nm" style="min-width:62px;color:var(--muted);font-family:'DM Mono',monospace;font-size:12px;font-weight:600">${label}</span>
      <span class="sp">${tags}</span></div>`;
  }).join('');
}

function buildProfileDonut(name, sportSorted){
  const f=chartFont();
  const top=sportSorted.slice(0,7);
  const rest=sportSorted.slice(7).reduce((s,[,c])=>s+c,0);
  const labels=top.map(s=>s[0]).concat(rest?['기타']:[]);
  const data=top.map(s=>s[1]).concat(rest?[rest]:[]);
  if(!data.length){document.getElementById('profileDonut').parentElement.innerHTML=`<div class="empty-hint"><span class="ic">🏃</span>운동 기록이 아직 없어요</div>`;return;}
  CHARTS.donut=new Chart(document.getElementById('profileDonut'),{type:'doughnut',
    data:{labels,datasets:[{data,backgroundColor:labels.map((_,i)=>SPORT_COLORS[i%10]),borderWidth:2,borderColor:getComputedStyle(document.documentElement).getPropertyValue('--surface').trim()}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'58%',
      plugins:{legend:{position:'right',labels:{color:f.text,font:{size:11},boxWidth:10,padding:7}},
        tooltip:{callbacks:{label:c=>` ${c.label}: ${c.raw}회`}},
        datalabels:{display:true,color:'#fff',font:{size:10,weight:'700'},formatter:(v,c)=>{const t=c.dataset.data.reduce((a,b)=>a+b,0);const p=v/t*100;return p>=8?Math.round(p)+'%':'';}}}}});
}

function buildProfileHeat(name){
  const year=S.selMonth.slice(0,4),isCur=year===String(NOW.getFullYear());
  const endDate=isCur?TODAY:`${year}-12-31`,start=new Date(year,0,1);
  const set=new Set([...activeDates(name)].filter(d=>d.startsWith(year)));
  const startDow=start.getDay();
  const totalDays=isCur?Math.floor((NOW-start)/86400000)+1:(new Date(year,11,31)-start)/86400000+1;
  const cs=13,gap=3,weeks=Math.ceil((startDow+Math.ceil(totalDays))/7);
  let cols=Array.from({length:weeks},()=>[]),di=0;
  for(let cell=0;cell<weeks*7;cell++){const w=Math.floor(cell/7);
    if(cell<startDow||di>=totalDays){cols[w].push(null);continue;}
    const date=new Date(start.getTime()+di*86400000);
    const ds=`${year}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    cols[w].push({ds,on:set.has(ds)});di++;}
  const monthLabels=Array(weeks).fill('');let lm=-1;
  for(let w=0;w<weeks;w++){const fc=cols[w].find(c=>c);if(fc){const mo=parseInt(fc.ds.slice(5,7));if(mo!==lm){monthLabels[w]=mo+'월';lm=mo;}}}
  let html=`<div style="display:flex;gap:0"><div style="display:flex;flex-direction:column;gap:${gap}px;margin-right:4px;margin-top:18px">`;
  DOW_KR.forEach(d=>html+=`<div style="height:${cs}px;line-height:${cs}px;font-size:9px;color:var(--muted);text-align:right">${d}</div>`);
  html+=`</div><div><div style="display:flex;gap:${gap}px;margin-bottom:3px">`;
  for(let w=0;w<weeks;w++)html+=`<div style="width:${cs}px;font-size:9px;color:var(--muted);white-space:nowrap;overflow:visible">${monthLabels[w]}</div>`;
  html+=`</div>`;
  for(let d=0;d<7;d++){html+=`<div style="display:flex;gap:${gap}px;margin-bottom:${gap}px">`;
    for(let w=0;w<weeks;w++){const c=cols[w][d];if(!c){html+=`<div style="width:${cs}px;height:${cs}px;opacity:0"></div>`;continue;}
      html+=`<div class="hm-cell ${c.on?'lv3':''}" style="width:${cs}px;height:${cs}px" title="${c.ds}: ${c.on?'운동 ✓':'휴식'}"></div>`;}
    html+=`</div>`;}
  html+=`</div></div><div class="hm-legend"><div class="hm-cell"></div> 휴식 <div class="hm-cell lv3"></div> 운동</div>`;
  document.getElementById('profileHeat').innerHTML=html;
}

