/* =====================================================================
   page-data.js — 데이터·분석 탭
   월별 스택차트, 누적 달성률, 요일 패턴, 종목 도넛/계절성, 히트맵 2종
   ===================================================================== */
/* =================================================================
   페이지 3: 데이터·분석
   ================================================================= */
function renderData(){
  const m=S.selMonth;
  document.getElementById('page-data').innerHTML = `
    <div class="sec-eyebrow">Analytics</div>
    <div class="sec-title">데이터 · 분석</div>
    <div class="sec-desc">월별 추이, 누적 달성률, 요일 패턴, 출석 히트맵을 한눈에.</div>

    <div class="g2 mb14">
      <div class="card">
        <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--amber)"></span>월별 인원별 운동 일수</div><span class="card-sub">2025-01~ · 범례 클릭으로 필터</span></div>
        <div class="chart-box h340"><canvas id="stackedChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--purple)"></span>누적 달성률</div><span class="card-sub" id="cumulTitle"></span></div>
        <div class="chart-box h340"><canvas id="cumulChart"></canvas></div>
      </div>
    </div>

    <div class="g2 mb14">
      <div class="card">
        <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--blue)"></span>그룹 요일별 운동 패턴</div><span class="card-sub">25.01~ 합산</span></div>
        <div class="chart-box h260"><canvas id="weekdayChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--cyan)"></span>월별 그룹 활동량 추이</div><span class="card-sub">총 운동 일수</span></div>
        <div class="chart-box h260"><canvas id="trendChart"></canvas></div>
      </div>
    </div>

    <div class="g2 mb14">
      <div class="card">
        <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--pink)"></span>우린 무슨 모임? · 그룹 종목 분포</div><span class="card-sub">25.01~ 전체</span></div>
        <div class="chart-box h300"><canvas id="groupDonut"></canvas></div>
      </div>
      <div class="card">
        <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--amber)"></span>월별 종목 구성 추이 · 계절성</div><span class="card-sub" id="seasonSub"></span></div>
        <div class="chart-box h300"><canvas id="seasonChart"></canvas></div>
      </div>
    </div>

    <div class="card mb14">
      <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--purple)"></span>멤버별 요일 성향 비교</div><span class="card-sub">각자 어느 요일에 운동하나 · 행 정규화(%)</span></div>
      <div id="weekdayCompare" style="overflow-x:auto"></div>
    </div>

    <div class="g2">
      <div class="card">
        <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--accent)"></span>출석 히트맵</div><span class="card-sub">${m.slice(0,4)}년</span></div>
        <div id="heatAnnual" style="overflow-x:auto"></div>
      </div>
      <div class="card">
        <div class="card-head"><div class="card-title"><span class="dot" style="background:var(--blue)"></span>인원별 히트맵</div><span class="card-sub">멤버 × 25.01~</span></div>
        <div id="heatCumul"></div>
      </div>
    </div>`;

  buildStacked();
  buildCumulChart(m);
  buildWeekdayChart();
  buildTrendChart();
  buildGroupDonut();
  buildSeasonChart(m);
  buildWeekdayCompare();
  buildHeatAnnual(m);
  buildHeatCumul();
}

// 그룹 종목 분포 도넛
function buildGroupDonut(){
  const f=chartFont();
  const map=sportMapFor(S.raw);
  const sorted=Object.entries(map).map(([k,v])=>[k,v.total]).sort((a,b)=>b[1]-a[1]);
  const top=sorted.slice(0,8), rest=sorted.slice(8).reduce((s,[,c])=>s+c,0);
  const labels=top.map(s=>s[0]).concat(rest?['기타']:[]);
  const data=top.map(s=>s[1]).concat(rest?[rest]:[]);
  const total=data.reduce((a,b)=>a+b,0);
  CHARTS.groupDonut=new Chart(document.getElementById('groupDonut'),{type:'doughnut',
    data:{labels,datasets:[{data,backgroundColor:labels.map((_,i)=>SPORT_COLORS[i%10]),borderWidth:2,
      borderColor:getComputedStyle(document.documentElement).getPropertyValue('--surface').trim()}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'56%',
      plugins:{legend:{position:'right',labels:{color:f.text,font:{size:11},boxWidth:10,padding:6}},
        tooltip:{callbacks:{label:c=>` ${c.label}: ${c.raw}회 (${(c.raw/total*100).toFixed(0)}%)`}},
        datalabels:{display:true,color:'#fff',font:{size:10,weight:'700'},formatter:(v)=>{const p=v/total*100;return p>=7?Math.round(p)+'%':'';}}}}});
}

// 월별 종목 구성 추이 (상위 종목 stacked)
function buildSeasonChart(m){
  const f=chartFont();
  const year=m.slice(0,4);
  document.getElementById('seasonSub').textContent=`${year}년`;
  const isCur=year===String(NOW.getFullYear());
  const maxMo=isCur?parseInt(nowYM.slice(5,7)):12;
  const yearMap=sportMapFor(S.raw.filter(e=>e.date.startsWith(year)));
  const topSports=Object.entries(yearMap).sort((a,b)=>b[1].total-a[1].total).slice(0,6).map(s=>s[0]);
  const labels=[]; const perMonth=[];
  for(let mo=1;mo<=maxMo;mo++){
    const ym=`${year}-${String(mo).padStart(2,'0')}`;
    labels.push(mo+'월');
    perMonth.push(sportMapFor(S.raw.filter(e=>e.date.startsWith(ym))));
  }
  const datasets=topSports.map((sp,i)=>({
    label:sp, data:perMonth.map(mm=>mm[sp]?mm[sp].total:0),
    backgroundColor:SPORT_COLORS[i%10], borderWidth:0
  }));
  CHARTS.season=new Chart(document.getElementById('seasonChart'),{type:'bar',data:{labels,datasets},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:f.text,font:{size:10},boxWidth:9,padding:5}},
        tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${c.raw}회`}}},
      scales:{x:{stacked:true,ticks:{color:f.text,font:{size:10}},grid:{display:false}},
        y:{stacked:true,ticks:{color:f.muted,font:{size:10}},grid:{color:f.grid},beginAtZero:true}}}});
}

// 멤버별 요일 성향 비교 (행 정규화 히트맵)
function buildWeekdayCompare(){
  const data={}; MEMBERS.forEach(n=>data[n]=[0,0,0,0,0,0,0]);
  for(const e of S.raw)for(const n of Object.keys(e.data)){if(data[n])data[n][new Date(e.date).getDay()]++;}
  const rows=MEMBERS.map(name=>{
    const arr=data[name], tot=arr.reduce((a,b)=>a+b,0)||1;
    const peak=arr.indexOf(Math.max(...arr));
    const cells=arr.map((v,i)=>{
      const pct=v/tot*100;
      const alpha=Math.min(1,pct/35);
      const bg=v===0?'var(--surface2)':`color-mix(in srgb, var(--accent) ${Math.round(alpha*85)}%, transparent)`;
      return `<td style="text-align:center;padding:0"><div title="${name} ${DOW_KR[i]}요일: ${v}회 (${pct.toFixed(0)}%)" style="margin:2px;height:30px;border-radius:7px;background:${bg};border:1px solid ${i===peak&&v>0?'var(--accent)':'var(--border)'};display:flex;align-items:center;justify-content:center;font-size:11px;font-family:'DM Mono',monospace;font-weight:700;color:${pct>=22?'#fff':'var(--muted)'}">${v||''}</div></td>`;
    }).join('');
    return `<tr><td style="font-weight:700;font-size:12.5px;white-space:nowrap;padding-right:8px"><span class="av-sm" style="background:${avatarColor(name)}">${initial(name)}</span>${name}</td>${cells}</tr>`;
  }).join('');
  document.getElementById('weekdayCompare').innerHTML=`
    <table style="width:100%;border-collapse:collapse;min-width:520px">
      <thead><tr><th style="width:80px"></th>${DOW_KR.map((d,i)=>`<th style="text-align:center;font-size:11px;font-weight:600;color:${i===0?'var(--red)':i===6?'var(--blue)':'var(--muted)'};padding-bottom:6px">${d}</th>`).join('')}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="font-size:11px;color:var(--muted);margin-top:10px">색이 진할수록 그 요일 비중이 높음 · 테두리 강조 = 개인 최다 요일</div>`;
}

function buildStacked(){
  const f=chartFont();
  const months=Object.keys(S.monthly).sort().filter(mo=>mo>='2025-01'&&mo<=nowYM);
  CHARTS.stacked=new Chart(document.getElementById('stackedChart'),{
    type:'bar',
    data:{labels:months.map(mo=>mo.slice(2)),datasets:MEMBERS.map((n,i)=>({
      label:n,data:months.map(mo=>S.monthly[mo]?.[n]||0),backgroundColor:MEM_COLORS[i],borderWidth:0,borderRadius:2}))},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:22}},
      plugins:{legend:{labels:{color:f.text,font:{size:11},boxWidth:11,padding:7}},
        tooltip:{callbacks:{footer:it=>`합계 ${it.reduce((s,i)=>s+i.raw,0)}일`}},
        datalabels:{display:c=>c.datasetIndex===MEMBERS.length-1,anchor:'end',align:'end',color:f.text,font:{size:10,weight:'700'},
          formatter:(v,c)=>{const mo=months[c.dataIndex];const t=MEMBERS.reduce((s,n)=>s+(S.monthly[mo]?.[n]||0),0);return t||'';}}},
      scales:{x:{stacked:true,ticks:{color:f.text,font:{size:11}},grid:{display:false}},
        y:{stacked:true,ticks:{color:f.muted,font:{size:11}},grid:{color:f.grid},beginAtZero:true}}}});
}

function buildCumulChart(m){
  const f=chartFont(); const year=m.slice(0,4);
  document.getElementById('cumulTitle').textContent=`${year}년 · 목표 대비`;
  const isCur=year===String(NOW.getFullYear());
  const maxMo=isCur?parseInt(nowYM.slice(5,7)):12;
  const yms=[]; for(let mo=1;mo<=maxMo;mo++){const ym=`${year}-${String(mo).padStart(2,'0')}`;if(S.monthly[ym])yms.push(ym);}
  if(!yms.length)return;
  const cumul=MEMBERS.map(n=>yms.reduce((s,ym)=>s+(S.monthly[ym]?.[n]||0),0));
  const remain=MEMBERS.map((n,i)=>Math.max(0,(S.stats.target[n]||0)-cumul[i]));
  const rate=MEMBERS.map((n,i)=>{const t=S.stats.target[n]||1;return parseFloat((cumul[i]/t*100).toFixed(1));});
  const ds=[
    {label:'누적 운동',data:cumul,backgroundColor:MEMBERS.map((_,i)=>MEM_COLORS[i]),borderWidth:0,borderRadius:3,yAxisID:'y',stack:'s'},
    {label:'목표까지',data:remain,backgroundColor:MEMBERS.map((_,i)=>MEM_COLORS[i].replace('hsl(','hsla(').replace(')',',0.10)')),
      borderColor:MEMBERS.map((_,i)=>MEM_COLORS[i].replace('hsl(','hsla(').replace(')',',0.45)')),borderWidth:1.5,borderSkipped:false,yAxisID:'y',stack:'s'},
    {label:'달성률(%)',type:'line',data:rate,borderColor:f.amber,backgroundColor:'transparent',borderWidth:2,pointRadius:3,pointBackgroundColor:f.amber,tension:.3,yAxisID:'y2',order:0},
  ];
  if(isCur)ds.push({label:`기준 ${yearPct}%`,type:'line',data:MEMBERS.map(()=>parseFloat(yearPct)),borderColor:f.red,borderWidth:1.5,borderDash:[5,4],pointRadius:0,yAxisID:'y2',order:0});
  const yMax=Math.ceil(Math.max(...MEMBERS.map(n=>S.stats.target[n]||0),...cumul)*1.15/5)*5;
  CHARTS.cumul=new Chart(document.getElementById('cumulChart'),{type:'bar',data:{labels:MEMBERS,datasets:ds},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:30}},
      plugins:{legend:{labels:{color:f.muted,font:{size:10},boxWidth:9,padding:5,filter:i=>['누적 운동','목표까지','달성률(%)',`기준 ${yearPct}%`].includes(i.text)}},
        tooltip:{callbacks:{label:c=>{if(c.dataset.label==='목표까지'){const n=MEMBERS[c.dataIndex];return ` 잔여 ${c.raw}일 (목표 ${S.stats.target[n]}일)`;}if(c.dataset.yAxisID==='y2')return ` 달성률 ${Number(c.raw).toFixed(1)}%`;return ` 누적 ${c.raw}일`;}}}},
      scales:{x:{stacked:true,ticks:{color:f.text,font:{size:11,weight:'600'}},grid:{display:false}},
        y:{stacked:true,max:yMax,ticks:{color:f.muted,font:{size:10}},grid:{color:f.grid},beginAtZero:true,title:{display:true,text:'운동 일수',color:f.muted,font:{size:10}}},
        y2:{position:'right',min:0,max:120,ticks:{color:f.amber,font:{size:10},callback:v=>v+'%'},grid:{display:false}}}}});
}

function buildWeekdayChart(){
  const f=chartFont();
  const counts=[0,0,0,0,0,0,0];
  for(const e of S.raw){const d=new Date(e.date).getDay();counts[d]+=Object.keys(e.data).length;}
  const maxIdx=counts.indexOf(Math.max(...counts));
  CHARTS.weekday=new Chart(document.getElementById('weekdayChart'),{type:'bar',
    data:{labels:DOW_KR,datasets:[{data:counts,
      backgroundColor:counts.map((_,i)=>i===maxIdx?f.accent:f.accent+'70'),borderRadius:7}]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:18}},
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${c.raw}회 운동`}},
        datalabels:{display:true,anchor:'end',align:'end',color:f.text,font:{size:11,weight:'700'},formatter:v=>v||''}},
      scales:{x:{ticks:{color:f.text,font:{size:13,weight:'700'}},grid:{display:false}},
        y:{ticks:{color:f.muted,font:{size:10}},grid:{color:f.grid},beginAtZero:true}}}});
}

function buildTrendChart(){
  const f=chartFont();
  const months=Object.keys(S.monthly).sort().filter(mo=>mo<=nowYM);
  const totals=months.map(mo=>Object.values(S.monthly[mo]).reduce((a,b)=>a+b,0));
  CHARTS.trend=new Chart(document.getElementById('trendChart'),{type:'line',
    data:{labels:months.map(mo=>mo.slice(2)),datasets:[{data:totals,borderColor:f.accent,
      backgroundColor:'transparent',borderWidth:2.5,pointRadius:2,pointBackgroundColor:f.accent,tension:.35,fill:false}]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${c.raw}일`}}},
      scales:{x:{ticks:{color:f.muted,font:{size:10},maxRotation:0,autoSkip:true,maxTicksLimit:10},grid:{display:false}},
        y:{ticks:{color:f.muted,font:{size:10}},grid:{color:f.grid},beginAtZero:true}}}});
}

function buildHeatAnnual(m){
  const year=m.slice(0,4),isCur=year===String(NOW.getFullYear());
  const endDate=isCur?TODAY:`${year}-12-31`, start=new Date(year,0,1);
  const dayMap={}; for(const e of S.raw){if(e.date<`${year}-01-01`||e.date>endDate)continue;dayMap[e.date]=Object.keys(e.data).length;}
  const startDow=start.getDay();
  const totalDays=isCur?Math.floor((NOW-start)/86400000)+1:(new Date(year,11,31)-start)/86400000+1;
  const max=Math.max(...Object.values(dayMap),1);
  const cs=13,gap=3,weeks=Math.ceil((startDow+Math.ceil(totalDays))/7);
  let cols=Array.from({length:weeks},()=>[]),di=0;
  for(let cell=0;cell<weeks*7;cell++){const w=Math.floor(cell/7);
    if(cell<startDow||di>=totalDays){cols[w].push(null);continue;}
    const date=new Date(start.getTime()+di*86400000);
    const ds=`${year}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const cnt=dayMap[ds]||0,lv=cnt===0?0:cnt<=max*.33?1:cnt<=max*.66?2:3;cols[w].push({ds,cnt,lv});di++;}
  const monthLabels=Array(weeks).fill('');let lm=-1;
  for(let w=0;w<weeks;w++){const fc=cols[w].find(c=>c);if(fc){const mo=parseInt(fc.ds.slice(5,7));if(mo!==lm){monthLabels[w]=mo+'월';lm=mo;}}}
  let html=`<div style="display:flex;gap:0"><div style="display:flex;flex-direction:column;gap:${gap}px;margin-right:4px;margin-top:18px">`;
  DOW_KR.forEach(d=>html+=`<div style="height:${cs}px;line-height:${cs}px;font-size:9px;color:var(--muted);text-align:right">${d}</div>`);
  html+=`</div><div><div style="display:flex;gap:${gap}px;margin-bottom:3px">`;
  for(let w=0;w<weeks;w++)html+=`<div style="width:${cs}px;font-size:9px;color:var(--muted);white-space:nowrap;overflow:visible">${monthLabels[w]}</div>`;
  html+=`</div>`;
  for(let d=0;d<7;d++){html+=`<div style="display:flex;gap:${gap}px;margin-bottom:${gap}px">`;
    for(let w=0;w<weeks;w++){const c=cols[w][d];if(!c){html+=`<div style="width:${cs}px;height:${cs}px;opacity:0"></div>`;continue;}
      html+=`<div class="hm-cell ${c.lv>0?'lv'+c.lv:''}" style="width:${cs}px;height:${cs}px" title="${c.ds}: ${c.cnt}명"></div>`;}
    html+=`</div>`;}
  html+=`</div></div><div class="hm-legend">적음 <div class="hm-cell"></div><div class="hm-cell lv1"></div><div class="hm-cell lv2"></div><div class="hm-cell lv3"></div> 많음</div>`;
  document.getElementById('heatAnnual').innerHTML=html;
}

function buildHeatCumul(){
  const months=Object.keys(S.monthly).sort().filter(mo=>mo<=nowYM);
  const max=Math.max(...MEMBERS.map(n=>Math.max(...months.map(mo=>S.monthly[mo]?.[n]||0))),1);
  const rows=MEMBERS.map(name=>{
    const cells=months.map(mo=>{const c=S.monthly[mo]?.[name]||0;const lv=c===0?'':c<=max*.33?'lv1':c<=max*.66?'lv2':'lv3';
      return `<div class="hm-cell ${lv}" style="width:13px;height:13px" title="${name} ${mo}: ${c}일"></div>`;}).join('');
    return `<div style="display:flex;align-items:center;gap:3px;margin-bottom:3px">
      <span style="font-size:10px;color:var(--muted);min-width:30px;font-family:'DM Mono',monospace;text-align:right">${name}</span>
      <div style="display:flex;gap:2px">${cells}</div></div>`;}).join('');
  const labels=months.map((mo,i)=>{const prev=months[i-1];
    return (!prev||prev.slice(0,4)!==mo.slice(0,4))?`<span style="font-size:9px;color:var(--muted);font-family:'DM Mono',monospace;display:inline-block;min-width:15px">${mo.slice(2,4)}년</span>`:`<span style="display:inline-block;min-width:15px"></span>`;}).join('');
  document.getElementById('heatCumul').innerHTML=`<div style="overflow-x:auto"><div style="margin-left:33px;display:flex;gap:2px;margin-bottom:4px">${labels}</div><div>${rows}</div></div>
    <div class="hm-legend">적음 <div class="hm-cell"></div><div class="hm-cell lv1"></div><div class="hm-cell lv2"></div><div class="hm-cell lv3"></div> 많음</div>`;
}

