/* =====================================================================
   page-vs.js — VS 비교 탭
   H2H 6지표, 승자 연출(왕관·글로우·WINNER), 레이더/듀얼/요일 차트
   ===================================================================== */
/* =================================================================
   페이지 4: VS 라이벌 비교 (신규)
   두 멤버를 골라 6개 지표 H2H + 레이더 + 월별 듀얼 + 요일 패턴 비교
   ================================================================= */
function vsMetrics(name){
  const md=S.monthly[S.selMonth]||{};
  const year=S.selMonth.slice(0,4);
  const cumulYear=Object.keys(S.monthly).filter(ym=>ym.startsWith(year)).reduce((s,ym)=>s+(S.monthly[ym]?.[name]||0),0);
  const target=S.stats.target[name]||0;
  const st=streakInfo(name);
  const sports=new Set();
  for(const e of S.raw)if(e.data[name])for(const s of e.data[name]){const k=normSport(s);if(k)sports.add(k);}
  return {
    month:md[name]||0,
    year:cumulYear,
    rate:target?cumulYear/target*100:0,
    cur:st.current,
    longest:st.longest,
    sports:sports.size,
  };
}
function setVs(side,name){
  if(side==='A'){ if(name===S.vsB) S.vsB=S.vsA; S.vsA=name; }
  else { if(name===S.vsA) S.vsA=S.vsB; S.vsB=name; }
  ['vsRadar','vsDuel','vsWeekday'].forEach(k=>{if(CHARTS[k]){try{CHARTS[k].destroy();}catch(e){}delete CHARTS[k];}});
  renderVS();
}
function renderVS(){
  const a=S.vsA||MEMBERS[0], b=S.vsB||MEMBERS[1];
  const A=vsMetrics(a), B=vsMetrics(b);
  const rows=[
    {k:'month',  l:`이달 운동 (${S.selMonth.slice(5)}월)`, u:'일'},
    {k:'year',   l:'올해 누적', u:'일'},
    {k:'rate',   l:'목표 달성률', u:'%', dec:1},
    {k:'cur',    l:'현재 스트릭', u:'일'},
    {k:'longest',l:'최장 스트릭', u:'일'},
    {k:'sports', l:'종목 다양성', u:'종목'},
  ];
  let winA=0,winB=0;
  rows.forEach(r=>{if(A[r.k]>B[r.k])winA++;else if(B[r.k]>A[r.k])winB++;});
  const verdict = winA===winB ? `팽팽한 접전 — <b>${winA} : ${winB}</b> 무승부`
    : winA>winB ? `이번 라운드는 <b>${a}</b> 우세 (${winA} : ${winB})`
    : `이번 라운드는 <b>${b}</b> 우세 (${winB} : ${winA})`;

  const picker=(side,cur,other)=>`
    <select class="select" style="width:100%;max-width:170px;text-align:center" onchange="setVs('${side}',this.value)">
      ${MEMBERS.map(n=>`<option value="${n}"${n===cur?' selected':''}>${n}</option>`).join('')}
    </select>`;

  const h2h=rows.map(r=>{
    const va=A[r.k], vb=B[r.k];
    const max=Math.max(va,vb,1);
    const fa=va/max*100, fb=vb/max*100;
    const aw=va>vb, bw=vb>va;
    const fmt=v=>r.dec?v.toFixed(r.dec):v;
    return `<div class="h2h-row">
      <span class="h2h-val l ${aw?'win':''}">${fmt(va)}</span>
      <div class="h2h-bar l"><div class="h2h-fill" style="width:${fa}%;background:${avatarColor(a)}"></div></div>
      <span class="h2h-label">${r.l}</span>
      <div class="h2h-bar"><div class="h2h-fill" style="width:${fb}%;background:${avatarColor(b)}"></div></div>
      <span class="h2h-val r ${bw?'win':''}">${fmt(vb)}</span>
    </div>`;
  }).join('');

  document.getElementById('page-vs').innerHTML = `
    <div class="sec-eyebrow">Head to Head</div>
    <div class="sec-title">VS 비교</div>
    <div class="sec-desc">두 멤버를 골라 이달·올해·스트릭·다양성을 정면 비교해보세요. 친선 경기니까, 진 쪽이 커피 사기? ☕</div>

    <div class="card mb14">
      <div class="vs-head">
        <div class="vs-side ${winA>winB?'winner':winB>winA?'loser':''}">
          <div class="av-wrap"><span class="crown">👑</span>
            <div class="big-av" style="background:${avatarColor(a)}">${initial(a)}</div></div>
          <div class="nm">${a}</div>
          ${rankAnimalChip(a)}
          <span class="win-badge">🏆 WINNER</span>
          ${picker('A',a,b)}
        </div>
        <div class="vs-mark">VS</div>
        <div class="vs-side ${winB>winA?'winner':winA>winB?'loser':''}">
          <div class="av-wrap"><span class="crown">👑</span>
            <div class="big-av" style="background:${avatarColor(b)}">${initial(b)}</div></div>
          <div class="nm">${b}</div>
          ${rankAnimalChip(b)}
          <span class="win-badge">🏆 WINNER</span>
          ${picker('B',b,a)}
        </div>
      </div>
      <div class="vs-verdict">${verdict}</div>
      <div class="h2h">${h2h}</div>
    </div>

    <div class="g2 mb14">
      <div class="card">
        <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--purple)"></span>능력치 레이더</div><span class="card-sub">그룹 최고치=100 기준 정규화</span></div>
        <div class="chart-box h300"><canvas id="vsRadar"></canvas></div>
      </div>
      <div class="card">
        <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--cyan)"></span>월별 듀얼 레이스</div><span class="card-sub">${S.selMonth.slice(0,4)}년 월별 운동 일수</span></div>
        <div class="chart-box h300"><canvas id="vsDuel"></canvas></div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--blue)"></span>요일 패턴 비교</div><span class="card-sub">25.01~ 요일별 운동 횟수</span></div>
      <div class="chart-box h260"><canvas id="vsWeekday"></canvas></div>
    </div>`;

  buildVsRadar(a,b,A,B);
  buildVsDuel(a,b);
  buildVsWeekday(a,b);
}

function buildVsRadar(a,b,A,B){
  const f=chartFont();
  // 그룹 최대치 기준 정규화 (0~100)
  const all=MEMBERS.map(vsMetrics);
  const axes=[
    {k:'month',l:'이달'},{k:'year',l:'올해 누적'},{k:'rate',l:'달성률'},
    {k:'longest',l:'최장 스트릭'},{k:'sports',l:'종목 다양성'},
  ];
  const maxOf=k=>Math.max(...all.map(m=>m[k]),1);
  const norm=M=>axes.map(ax=>Math.round(M[ax.k]/maxOf(ax.k)*100));
  const toRGBA=(name,alpha)=>{
    const idx=MEMBERS.indexOf(name); // hsl → hsla 문자열
    return `hsla(${idx*30},62%,56%,${alpha})`;
  };
  CHARTS.vsRadar=new Chart(document.getElementById('vsRadar'),{type:'radar',
    data:{labels:axes.map(ax=>ax.l),datasets:[
      {label:a,data:norm(A),borderColor:avatarColor(a),backgroundColor:toRGBA(a,.18),borderWidth:2,pointRadius:3,pointBackgroundColor:avatarColor(a)},
      {label:b,data:norm(B),borderColor:avatarColor(b),backgroundColor:toRGBA(b,.18),borderWidth:2,pointRadius:3,pointBackgroundColor:avatarColor(b)},
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:f.text,font:{size:12,weight:'700'},boxWidth:12}},
        tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${c.raw}점`}}},
      scales:{r:{min:0,max:100,ticks:{display:false,stepSize:25},
        grid:{color:f.grid},angleLines:{color:f.grid},
        pointLabels:{color:f.text,font:{size:11,weight:'700'}}}}}});
}

function buildVsDuel(a,b){
  const f=chartFont();
  const year=S.selMonth.slice(0,4);
  const isCur=year===String(NOW.getFullYear());
  const maxMo=isCur?parseInt(nowYM.slice(5,7)):12;
  const labels=[],da=[],db=[];
  for(let mo=1;mo<=maxMo;mo++){
    const ym=`${year}-${String(mo).padStart(2,'0')}`;
    labels.push(mo+'월');
    da.push(S.monthly[ym]?.[a]||0);
    db.push(S.monthly[ym]?.[b]||0);
  }
  CHARTS.vsDuel=new Chart(document.getElementById('vsDuel'),{type:'line',
    data:{labels,datasets:[
      {label:a,data:da,borderColor:avatarColor(a),backgroundColor:'transparent',borderWidth:2.5,pointRadius:3,pointBackgroundColor:avatarColor(a),tension:.3},
      {label:b,data:db,borderColor:avatarColor(b),backgroundColor:'transparent',borderWidth:2.5,pointRadius:3,pointBackgroundColor:avatarColor(b),tension:.3},
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:f.text,font:{size:12,weight:'700'},boxWidth:12}},
        tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${c.raw}일`}}},
      scales:{x:{ticks:{color:f.text,font:{size:11}},grid:{display:false}},
        y:{ticks:{color:f.muted,font:{size:10}},grid:{color:f.grid},beginAtZero:true}}}});
}

function buildVsWeekday(a,b){
  const f=chartFont();
  const cnt=name=>{
    const arr=[0,0,0,0,0,0,0];
    for(const e of S.raw)if(e.data[name])arr[new Date(e.date).getDay()]++;
    return arr;
  };
  CHARTS.vsWeekday=new Chart(document.getElementById('vsWeekday'),{type:'bar',
    data:{labels:DOW_KR,datasets:[
      {label:a,data:cnt(a),backgroundColor:avatarColor(a),borderRadius:5},
      {label:b,data:cnt(b),backgroundColor:avatarColor(b),borderRadius:5},
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:f.text,font:{size:12,weight:'700'},boxWidth:12}},
        tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${c.raw}회`}}},
      scales:{x:{ticks:{color:f.text,font:{size:12,weight:'700'}},grid:{display:false}},
        y:{ticks:{color:f.muted,font:{size:10}},grid:{color:f.grid},beginAtZero:true}}}});
}
