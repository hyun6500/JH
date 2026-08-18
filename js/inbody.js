/* =====================================================================
   inbody.js — 인바디 기록
   입력 폼(확인 다이얼로그·PIN)·추이 차트·기록 테이블·삭제 (Apps Script POST 연동)
   ===================================================================== */
/* =================================================================
   인바디 — 개인 기록 탭 섹션 + 입력 모달 (PIN 서버 검증)
   ================================================================= */
const IB_METRICS=[
  {k:'weight',l:'몸무게',u:'kg',dec:1,goodDown:true},
  {k:'smm',l:'골격근량',u:'kg',dec:1,goodDown:false},
  {k:'bfm',l:'체지방량',u:'kg',dec:1,goodDown:true},
  {k:'pbf',l:'체지방률',u:'%',dec:1,goodDown:true,derived:true},
  {k:'bmi',l:'BMI',u:'',dec:1,goodDown:true,derived:true},
  {k:'whr',l:'복부지방률',u:'',dec:2,goodDown:true},
  {k:'vfl',l:'내장지방',u:'Lv',dec:0,goodDown:true},
];
function ibDerive(r,height){
  const o={...r};
  o.pbf=(r.weight&&r.bfm!=null)?r.bfm/r.weight*100:null;
  o.bmi=(r.weight&&height)?r.weight/Math.pow(height/100,2):null;
  return o;
}
function ibRecordsOf(name){
  return S.inbody.records.filter(r=>r.name===name)
    .sort((a,b)=>a.date.localeCompare(b.date)||a.ts-b.ts);
}
function ibChgChip(cur,prev,m){
  if(cur==null||prev==null)return '<span class="chg eq">—</span>';
  const d=cur-prev;
  if(Math.abs(d)<Math.pow(10,-m.dec)/2)return '<span class="chg eq">변화없음</span>';
  const good=m.goodDown?d<0:d>0;
  const arrow=d>0?'▲':'▼';
  return `<span class="chg ${good?'good':'bad'}">${arrow}${Math.abs(d).toFixed(m.dec)}</span>`;
}

function buildInbody(name){
  const el=document.getElementById('inbodyCard');
  if(!el)return;
  const head=(sub)=>`<div class="card-head"><div class="card-title"><span class="dot" style="background:var(--pink)"></span>💉 인바디 기록</div><span class="card-sub">${sub}</span></div>`;

  if(!S.inbody.loaded){
    el.innerHTML=head('연결 대기')+`<div class="empty-hint" style="padding:18px"><span class="ic">🔌</span>
      인바디 API가 아직 연결되지 않았어요.<br>
      <span style="font-size:11px;color:var(--muted)">Apps Script에 인바디 코드를 추가하고 <b>새 버전으로 재배포</b>하면 이 자리에 나타납니다.</span></div>`;
    return;
  }

  const height=S.inbody.members[name]?.height||null;
  const recs=ibRecordsOf(name).map(r=>ibDerive(r,height));

  if(!recs.length){
    el.innerHTML=head('아직 기록 없음')+`
      <div class="empty-hint" style="padding:20px"><span class="ic">💉</span>
        첫 인바디를 기록하면 체중·골격근·체지방 추이를 볼 수 있어요</div>
      <div style="text-align:center;margin-top:6px">
        <button class="ib-btn" onclick="openIbForm('${name}')">＋ 첫 인바디 입력</button>
      </div>`;
    return;
  }

  const latest=recs[recs.length-1], prev=recs.length>1?recs[recs.length-2]:null;
  const stats=IB_METRICS.map(m=>{
    const v=latest[m.k];
    if(v==null)return '';
    return `<div class="ib-stat"><div class="l">${m.l}</div>
      <div class="v">${v.toFixed(m.dec)}<small>${m.u}</small></div>
      ${prev?ibChgChip(v,prev[m.k],m):'<span class="chg eq">첫 기록</span>'}</div>`;
  }).join('');

  // 선택 상태 정리 (삭제된 기록의 선택은 해제)
  const validTs=new Set(recs.map(r=>r.ts));
  IB_SEL=IB_SEL.filter(ts=>validTs.has(ts));

  // 최신순 표 — 선택하면 그래프가 그 회차만 비교
  const history=[...recs].reverse().map(r=>{
    const on=IB_SEL.indexOf(r.ts)>=0;
    return `<tr class="${on?'sel':''}" onclick="ibToggleSel(${r.ts})" title="클릭하면 이 회차만 그래프에 표시">
      <td class="ib-date"><span class="ib-chk">${on?'☑':'☐'}</span>${ibShortDate(r.date)}</td>
      <td>${r.weight?.toFixed(1)??'—'}</td><td>${r.smm?.toFixed(1)??'—'}</td>
      <td>${r.bfm?.toFixed(1)??'—'}</td><td>${r.pbf?r.pbf.toFixed(1)+'%':'—'}</td>
      <td>${r.whr?r.whr.toFixed(2):'—'}</td><td>${r.vfl??'—'}</td>
      <td><button class="ib-del" title="이 기록 삭제 (PIN 필요)" onclick="event.stopPropagation();openIbDelete('${name}',${r.ts})">🗑</button></td></tr>`;
  }).join('');

  const selNote=IB_SEL.length
    ? `<span class="ib-selnote">선택 ${IB_SEL.length}회차만 표시 중
        <button onclick="ibClearSel()">전체 보기</button></span>`
    : `<span class="ib-selnote dim">표에서 회차를 누르면 그 회차만 비교해서 볼 수 있어요</span>`;

  el.innerHTML=head(`최근 측정 ${latest.date} · 총 ${recs.length}회${prev?' · 변화량은 직전 측정 대비':''}`)+`
    <div class="ib-latest">${stats}</div>
    ${recs.length>=2?`<div class="ib-charts" id="ibCharts">
        <div class="ib-chart-box"><canvas id="inbodyTrend"></canvas></div>
        <div class="ib-chart-box ib-chart-2" id="ibChartBox2"><canvas id="inbodyTrend2"></canvas></div>
      </div>
      <div class="ib-axis-note">📏 세로축은 변화가 잘 보이도록 <b>0부터 시작하지 않습니다</b> (구간 생략 ~)</div>`
      :`<div style="font-size:12px;color:var(--muted);text-align:center;margin-bottom:14px">한 번 더 기록하면 추이 그래프가 나타나요 📈</div>`}
    <div class="ib-tablewrap"><table class="ib-table">
      <thead><tr><th>측정일</th><th>몸무게</th><th>골격근</th><th>체지방</th><th>체지방률</th><th>WHR</th><th>내장</th><th></th></tr></thead>
      <tbody>${history}</tbody></table></div>
    <div class="ib-tablefoot">${selNote}</div>
    <div style="text-align:center;margin-top:12px">
      <button class="ib-btn" onclick="openIbForm('${name}')">＋ 인바디 입력</button>
    </div>`;

  if(recs.length>=2){
    const shown = IB_SEL.length>=1 ? recs.filter(r=>IB_SEL.indexOf(r.ts)>=0) : recs;
    buildInbodyChart(shown.length>=1?shown:recs);
  }
}

/* ---------- 표 회차 선택 (그래프 필터) ---------- */
let IB_SEL=[];
function ibToggleSel(ts){
  const i=IB_SEL.indexOf(ts);
  if(i>=0) IB_SEL.splice(i,1); else IB_SEL.push(ts);
  renderPage('me');
}
function ibClearSel(){ IB_SEL=[]; renderPage('me'); }
// 표 너비를 아끼는 짧은 날짜 (26.07.05) — 줄바꿈 방지
function ibShortDate(d){ return String(d||'').slice(2).replace(/-/g,'.'); }

/* ---------- 추이 그래프 ----------
   좁은 화면: 1개 그래프에 좌축(몸무게) / 우축(골격근·체지방) 이중 축
   넓은 화면: 2개로 분리 — [몸무게] / [골격근·체지방]
   두 경우 모두 축 최소값을 0이 아닌 "데이터 범위 + 여유"로 잡아 증감폭을 크게 보여줌 */
function ibNiceRange(values){
  const v=values.filter(x=>x!=null&&!isNaN(x));
  if(!v.length) return {min:undefined,max:undefined};
  let mn=Math.min(...v), mx=Math.max(...v);
  const span=mx-mn;
  const pad=span>0?span*0.35:Math.max(1,mx*0.03);   // 변화가 없어도 납작해 보이지 않게
  return {min:Math.max(0,mn-pad), max:mx+pad};
}
function buildInbodyChart(recs){
  const f=chartFont();
  const labels=recs.map(r=>ibShortDate(r.date));
  const wide=(typeof innerWidth==='number') && innerWidth>=900;
  const box2=document.getElementById('ibChartBox2');
  if(box2) box2.style.display = wide ? '' : 'none';

  const line=(label,key,color,axis)=>({label,data:recs.map(r=>r[key]),borderColor:color,
    backgroundColor:'transparent',borderWidth:2.5,pointRadius:recs.length>20?2:4,
    pointBackgroundColor:color,tension:.3,spanGaps:true,yAxisID:axis||'y'});
  const baseOpts=(scales)=>({responsive:true,maintainAspectRatio:false,
    interaction:{mode:'index',intersect:false},
    plugins:{legend:{labels:{color:f.text,font:{size:11,weight:'700'},boxWidth:11,padding:8}},
      tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${Number(c.raw).toFixed(1)}kg`}}},
    scales:Object.assign({x:{ticks:{color:f.muted,font:{size:10},maxRotation:0,autoSkip:true,maxTicksLimit:7},grid:{display:false}}},scales)});
  const axis=(range,color,side)=>({position:side||'left',min:range.min,max:range.max,
    ticks:{color:color,font:{size:10},callback:v=>Number(v).toFixed(0)+'kg'},
    grid:{color:f.grid,drawOnChartArea:side!=='right'}});

  const wRange=ibNiceRange(recs.map(r=>r.weight));
  const bRange=ibNiceRange(recs.map(r=>r.smm).concat(recs.map(r=>r.bfm)));

  if(wide){
    // 그래프 1: 몸무게 단독
    CHARTS.inbodyTrend=new Chart(document.getElementById('inbodyTrend'),{type:'line',
      data:{labels,datasets:[line('몸무게','weight',f.text)]},
      options:baseOpts({y:axis(wRange,f.muted)})});
    // 그래프 2: 골격근 + 체지방
    const cv2=document.getElementById('inbodyTrend2');
    if(cv2) CHARTS.inbodyTrend2=new Chart(cv2,{type:'line',
      data:{labels,datasets:[line('골격근량','smm',f.green),line('체지방량','bfm',f.amber)]},
      options:baseOpts({y:axis(bRange,f.muted)})});
  }else{
    // 좁은 화면: 이중 축 1개 (좌=몸무게, 우=골격근/체지방)
    CHARTS.inbodyTrend=new Chart(document.getElementById('inbodyTrend'),{type:'line',
      data:{labels,datasets:[
        line('몸무게','weight',f.text,'y'),
        line('골격근량','smm',f.green,'y2'),
        line('체지방량','bfm',f.amber,'y2'),
      ]},
      options:baseOpts({y:axis(wRange,f.text),y2:axis(bRange,f.green,'right')})});
  }
}

/* ---------- 입력/삭제 모달 ---------- */
let IB={mode:null,name:null,vals:null,ts:null};
function ibRawClose(){document.getElementById('ibOverlay').classList.remove('open');IB={mode:null,name:null,vals:null,ts:null};}
function closeIbModal(){navCloseModal('ib');}
registerModal('ib',
  ()=>document.getElementById('ibOverlay').classList.contains('open'),
  ibRawClose);
function ibShow(html){
  const ov=document.getElementById('ibOverlay');
  const wasOpen=ov.classList.contains('open');
  document.getElementById('ibModal').innerHTML=html;
  ov.classList.add('open');
  if(!wasOpen) navPushModal('ib');   // 모달 내부 화면 전환은 히스토리 추가 안 함
}
function ibMsg(txt,cls){const m=document.getElementById('ibFormMsg');if(m){m.textContent=txt;m.className='ib-msg '+(cls||'err');}}

function openIbForm(name){
  const isSetup=!S.inbody.members[name]?.hasPin;
  const keepVals=(IB.name===name)?IB.vals:null;  // "← 수정"으로 돌아올 때 입력값 보존
  IB={mode:isSetup?'setup':'add',name,vals:keepVals};
  const setupFields=isSetup?`
    <div style="background:color-mix(in srgb,var(--accent) 8%,var(--surface2));border:1px solid var(--accent);border-radius:11px;padding:11px 13px;margin-top:12px;font-size:12px;color:var(--text2);line-height:1.6">
      🔑 <b>${name}</b>님의 첫 입력이에요. 본인 확인용 <b>PIN(숫자 4자리)</b>과 BMI 계산용 <b>키</b>를 함께 설정해주세요. 다음부터는 PIN만 입력하면 됩니다.</div>
    <div class="ib-2col">
      <div><label>키 (cm)</label><input id="ibHeight" type="number" step="0.1" placeholder="예: 175.5"></div>
      <div><label>PIN 설정 (숫자 4자리)</label><input id="ibPin" type="password" inputmode="numeric" maxlength="4" placeholder="••••"></div>
    </div>
    <label>PIN 확인</label><input id="ibPin2" type="password" inputmode="numeric" maxlength="4" placeholder="한 번 더 입력">`
  :`<label>PIN (숫자 4자리)</label><input id="ibPin" type="password" inputmode="numeric" maxlength="4" placeholder="••••">`;

  ibShow(`
    <h3>💉 인바디 입력 <span style="font-size:12px;color:var(--muted);font-weight:500">— ${name}</span></h3>
    <div class="sub">인바디 결과지의 수치를 그대로 입력하세요. 체지방률·BMI는 자동 계산됩니다.</div>
    <div class="ib-form">
      <div class="ib-scan">
        <input type="file" id="ibPhoto" accept="image/*" style="display:none" onchange="ibScanPhoto(this)">
        <button class="ib-scan-btn" onclick="document.getElementById('ibPhoto').click()">
          <span style="font-size:17px">📷</span>
          <span><b>인바디 용지 사진으로 자동 입력</b><small>AI가 수치를 읽어 아래 칸을 채워줘요</small></span>
        </button>
        <div id="ibScanMsg" class="ib-scan-msg"></div>
      </div>
      <label>인바디 측정일</label><input id="ibDate" type="date" value="${TODAY}" max="${TODAY}">
      <div class="ib-2col">
        <div><label>몸무게 (kg)</label><input id="ibWeight" type="number" step="0.1" placeholder="예: 72.5"></div>
        <div><label>골격근량 (kg)</label><input id="ibSmm" type="number" step="0.1" placeholder="예: 32.1"></div>
      </div>
      <div class="ib-2col">
        <div><label>체지방량 (kg)</label><input id="ibBfm" type="number" step="0.1" placeholder="예: 14.2"></div>
        <div><label>복부지방률 WHR <span style="font-weight:500">(선택)</span></label><input id="ibWhr" type="number" step="0.01" placeholder="예: 0.85"></div>
      </div>
      <label>내장지방레벨 <span style="font-weight:500">(선택)</span></label><input id="ibVfl" type="number" step="1" placeholder="예: 6">
      <details class="ib-more">
        <summary>＋ 추가 항목 (전부 선택 입력)</summary>
        <div class="ib-2col">
          <div><label>체수분 (L)</label><input id="ibTbw" type="number" step="0.1" placeholder="예: 40.2"></div>
          <div><label>단백질 (kg)</label><input id="ibProtein" type="number" step="0.1" placeholder="예: 10.8"></div>
        </div>
        <div class="ib-2col">
          <div><label>무기질 (kg)</label><input id="ibMineral" type="number" step="0.01" placeholder="예: 3.85"></div>
          <div><label>기초대사량 (kcal)</label><input id="ibBmr" type="number" step="1" placeholder="예: 1620"></div>
        </div>
        <label>인바디 점수 (점)</label><input id="ibScore" type="number" step="1" placeholder="예: 78">
      </details>
      ${setupFields}
      <div id="ibFormMsg" class="ib-msg"></div>
      <div class="ib-actions">
        <button class="lvl-close" onclick="closeIbModal()">취소</button>
        <button class="ib-btn" onclick="ibToConfirm()">다음 → 확인</button>
      </div>
    </div>`);
}

// 1단계 → 확인 다이얼로그 (실수 입력 방지)
function ibToConfirm(){
  const g=id=>document.getElementById(id);
  const num=(id,opt)=>{const v=g(id).value.trim();return v===''?(opt?null:NaN):Number(v);};
  const vals={date:g('ibDate').value, weight:num('ibWeight'), smm:num('ibSmm'),
    bfm:num('ibBfm'), whr:num('ibWhr',1), vfl:num('ibVfl',1),
    tbw:num('ibTbw',1), protein:num('ibProtein',1), mineral:num('ibMineral',1),
    bmr:num('ibBmr',1), score:num('ibScore',1)};
  if(!vals.date)return ibMsg('측정일을 선택해주세요');
  if(!(vals.weight>20&&vals.weight<250))return ibMsg('몸무게(kg)를 확인해주세요');
  if(!(vals.smm>5&&vals.smm<100))return ibMsg('골격근량(kg)을 확인해주세요');
  if(!(vals.bfm>=0&&vals.bfm<150))return ibMsg('체지방량(kg)을 확인해주세요');
  if(vals.bfm>=vals.weight)return ibMsg('체지방량이 몸무게보다 클 수 없어요');
  if(vals.whr!=null&&!(vals.whr>0.3&&vals.whr<2))return ibMsg('WHR을 확인해주세요 (예: 0.85)');
  if(vals.vfl!=null&&!(vals.vfl>=1&&vals.vfl<=30))return ibMsg('내장지방레벨은 1~30 사이예요');

  let pin=g('ibPin').value.trim(), height=null;
  if(!/^\d{4}$/.test(pin))return ibMsg('PIN은 숫자 4자리로 입력해주세요');
  if(IB.mode==='setup'){
    if(g('ibPin2').value.trim()!==pin)return ibMsg('PIN 확인이 일치하지 않아요');
    height=Number(g('ibHeight').value);
    if(!(height>100&&height<230))return ibMsg('키(cm)를 확인해주세요');
  }
  IB.vals={...vals,pin,height};

  const pbf=(vals.bfm/vals.weight*100).toFixed(1);
  const rows=[
    ['측정일',vals.date],['몸무게',vals.weight.toFixed(1)+' kg'],
    ['골격근량',vals.smm.toFixed(1)+' kg'],['체지방량',vals.bfm.toFixed(1)+' kg'],
    ['체지방률 (자동)',pbf+' %'],
    ...(vals.whr!=null?[['복부지방률',vals.whr.toFixed(2)]]:[]),
    ...(vals.vfl!=null?[['내장지방레벨','Lv.'+vals.vfl]]:[]),
    ...(vals.tbw!=null?[['체수분',vals.tbw+' L']]:[]),
    ...(vals.protein!=null?[['단백질',vals.protein+' kg']]:[]),
    ...(vals.mineral!=null?[['무기질',vals.mineral+' kg']]:[]),
    ...(vals.bmr!=null?[['기초대사량',vals.bmr+' kcal']]:[]),
    ...(vals.score!=null?[['인바디 점수',vals.score+' 점']]:[]),
    ...(IB.mode==='setup'?[['키 (최초 등록)',height+' cm']]:[]),
  ].map(([l,v])=>`<div class="row"><span>${l}</span><b>${v}</b></div>`).join('');

  ibShow(`
    <h3>✅ 입력 확인</h3>
    <div class="ib-confirm">
      <div class="who">⚠️ <b style="color:var(--accent)">${IB.name}</b>님의 인바디로 기록합니다. 본인이 맞나요?</div>
      ${rows}
    </div>
    <div id="ibFormMsg" class="ib-msg"></div>
    <div class="ib-actions">
      <button class="lvl-close" onclick="openIbForm('${IB.name}');ibRestore()">← 수정</button>
      <button class="ib-btn" id="ibSaveBtn" onclick="ibSubmit()">맞아요, 저장</button>
    </div>`);
}
// 수정으로 돌아갈 때 입력값 복원
function ibRestore(){
  const v=IB.vals; if(!v)return;
  const set=(id,val)=>{const el=document.getElementById(id);if(el&&val!=null)el.value=val;};
  set('ibDate',v.date);set('ibWeight',v.weight);set('ibSmm',v.smm);set('ibBfm',v.bfm);
  set('ibWhr',v.whr);set('ibVfl',v.vfl);set('ibHeight',v.height);
  set('ibTbw',v.tbw);set('ibProtein',v.protein);set('ibMineral',v.mineral);
  set('ibBmr',v.bmr);set('ibScore',v.score);
}

async function ibSubmit(){
  const btn=document.getElementById('ibSaveBtn');
  if(!btn||!IB.vals)return;  // 확인 단계가 아닌데 호출된 경우 방어
  btn.disabled=true;btn.textContent='저장 중…';
  const v=IB.vals;
  const rec={date:v.date,weight:v.weight,smm:v.smm,bfm:v.bfm,whr:v.whr??'',vfl:v.vfl??'',
    tbw:v.tbw??'',protein:v.protein??'',mineral:v.mineral??'',bmr:v.bmr??'',score:v.score??''};
  const payload=IB.mode==='setup'
    ?{action:'setup',name:IB.name,pin:v.pin,height:v.height,record:rec}
    :{action:'add',name:IB.name,pin:v.pin,record:rec};
  try{
    const r=await ibPost(payload);
    if(!r.ok){ibMsg(r.error||'저장 실패');btn.disabled=false;btn.textContent='맞아요, 저장';return;}
    // 로컬 상태 즉시 반영
    if(r.added)S.inbody.records.push(r.added);
    if(IB.mode==='setup')S.inbody.members[IB.name]={height:v.height,hasPin:true};
    ibShow(`<h3>🎉 저장 완료</h3>
      <div class="sub"><b>${IB.name}</b>님의 인바디가 기록됐어요. 꾸준한 측정이 최고의 동기부여!</div>
      <button class="lvl-close" onclick="closeIbModal();renderPage('me')">확인</button>`);
  }catch(e){
    ibMsg('네트워크 오류: '+e.message);btn.disabled=false;btn.textContent='맞아요, 저장';
  }
}

function openIbDelete(name,ts){
  IB={mode:'delete',name,ts};
  const rec=S.inbody.records.find(r=>r.name===name&&r.ts===ts);
  ibShow(`
    <h3>🗑 기록 삭제</h3>
    <div class="sub"><b>${name}</b>님의 <b>${rec?rec.date:''}</b> 기록을 삭제합니다. 본인 PIN을 입력해주세요.</div>
    <div class="ib-form">
      <label>PIN (숫자 4자리)</label><input id="ibPin" type="password" inputmode="numeric" maxlength="4" placeholder="••••">
      <div id="ibFormMsg" class="ib-msg"></div>
      <div class="ib-actions">
        <button class="lvl-close" onclick="closeIbModal()">취소</button>
        <button class="ib-btn" id="ibSaveBtn" style="background:linear-gradient(135deg,var(--red),#ff8a7a)" onclick="ibDoDelete()">삭제</button>
      </div>
    </div>`);
}
async function ibDoDelete(){
  const pin=document.getElementById('ibPin').value.trim();
  if(!/^\d{4}$/.test(pin))return ibMsg('PIN은 숫자 4자리예요');
  const btn=document.getElementById('ibSaveBtn');
  btn.disabled=true;btn.textContent='삭제 중…';
  try{
    const r=await ibPost({action:'delete',name:IB.name,pin,ts:IB.ts});
    if(!r.ok){ibMsg(r.error||'삭제 실패');btn.disabled=false;btn.textContent='삭제';return;}
    S.inbody.records=S.inbody.records.filter(x=>!(x.name===IB.name&&x.ts===IB.ts));
    closeIbModal();renderPage('me');
  }catch(e){ibMsg('네트워크 오류: '+e.message);btn.disabled=false;btn.textContent='삭제';}
}


/* =================================================================
   인바디 용지 사진 → AI 자동 인식 (Apps Script 프록시 경유)
   ※ 제미나이 API 키는 Apps Script에만 보관 — 이 페이지 소스에는 없음
   ※ AI 인식값은 반드시 사용자가 눈으로 확인/수정 후 저장
   ================================================================= */
function ibScanMsg(txt,cls){
  const el=document.getElementById('ibScanMsg');
  if(el){el.textContent=txt;el.className='ib-scan-msg '+(cls||'');}
}
// 업로드 전 이미지 축소 (전송 크기·인식 속도 개선)
function ibShrinkImage(file, maxSide){
  return new Promise((res,rej)=>{
    const rd=new FileReader();
    rd.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        const scale=Math.min(1, maxSide/Math.max(img.width,img.height));
        const cv=document.createElement('canvas');
        cv.width=Math.round(img.width*scale); cv.height=Math.round(img.height*scale);
        const c=cv.getContext('2d');
        if(!c){res(String(rd.result).split(',')[1]);return;}
        c.drawImage(img,0,0,cv.width,cv.height);
        res(cv.toDataURL('image/jpeg',0.85).split(',')[1]);
      };
      img.onerror=()=>rej(new Error('이미지를 읽지 못했어요'));
      img.src=rd.result;
    };
    rd.onerror=()=>rej(new Error('파일을 읽지 못했어요'));
    rd.readAsDataURL(file);
  });
}
async function ibScanPhoto(input){
  const file=input.files&&input.files[0];
  input.value='';   // 같은 파일 재선택 가능하도록 초기화
  if(!file) return;
  ibScanMsg('사진을 분석하는 중… (10초 정도 걸려요)','load');
  try{
    const b64=await ibShrinkImage(file, 1600);
    const r=await ibPost({action:'scan', name:(IB.name||S.selMember||''), image:b64});
    if(!r.ok){
      const e=String(r.error||'');
      // 서버 스크립트가 아직 사진 인식(v2)을 모르는 경우 명확히 안내
      if(e.indexOf('알 수 없는 요청')>=0 || e.indexOf('이름이 없습니다')>=0){
        ibScanMsg('서버 스크립트가 아직 사진 인식 버전이 아니에요. Apps Script를 v2로 교체하고 "새 버전"으로 재배포해주세요. (수동 입력은 그대로 가능)','err');
      }else{
        ibScanMsg(e||'인식에 실패했어요. 직접 입력해주세요.','err');
      }
      return;
    }
    const d=r.data||{};
    const set=(id,val)=>{
      const el=document.getElementById(id);
      if(el && val!=null && val!=='' && !isNaN(Number(val))) el.value=val;
    };
    set('ibDate', /^\d{4}-\d{2}-\d{2}$/.test(String(d.date||''))?d.date:null);
    if(d.date && /^\d{4}-\d{2}-\d{2}$/.test(d.date)){
      const el=document.getElementById('ibDate');
      if(el && d.date<=TODAY) el.value=d.date;
    }
    set('ibWeight',d.weight); set('ibSmm',d.smm); set('ibBfm',d.bfm);
    set('ibWhr',d.whr); set('ibVfl',d.vfl);
    set('ibTbw',d.tbw); set('ibProtein',d.protein); set('ibMineral',d.mineral);
    set('ibBmr',d.bmr); set('ibScore',d.score);
    // 추가 항목이 채워졌으면 접힌 영역 펼치기
    if([d.tbw,d.protein,d.mineral,d.bmr,d.score].some(v=>v!=null&&v!=='')){
      const det=document.querySelector('.ib-more'); if(det) det.open=true;
    }
    const got=['weight','smm','bfm'].filter(k=>d[k]!=null&&d[k]!=='').length;
    ibScanMsg(got>=3
      ?'✅ 인식 완료! 숫자가 맞는지 꼭 확인하고 저장해주세요.'
      :'⚠️ 일부만 인식됐어요. 빈 칸은 직접 채워주세요.', got>=3?'ok':'err');
  }catch(e){
    ibScanMsg('오류: '+e.message,'err');
  }
}
