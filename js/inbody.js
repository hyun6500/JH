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

  const history=[...recs].reverse().slice(0,8).map(r=>`
    <tr><td>${r.date.slice(2)}</td>
      <td>${r.weight?.toFixed(1)??'—'}</td><td>${r.smm?.toFixed(1)??'—'}</td>
      <td>${r.bfm?.toFixed(1)??'—'}</td><td>${r.pbf?r.pbf.toFixed(1)+'%':'—'}</td>
      <td>${r.whr?r.whr.toFixed(2):'—'}</td><td>${r.vfl??'—'}</td>
      <td><button class="ib-del" title="이 기록 삭제 (PIN 필요)" onclick="openIbDelete('${name}',${r.ts})">🗑</button></td></tr>`).join('');

  el.innerHTML=head(`최근 측정 ${latest.date} · 총 ${recs.length}회${prev?' · 변화량은 직전 측정 대비':''}`)+`
    <div class="ib-latest">${stats}</div>
    ${recs.length>=2?`<div class="chart-box" style="height:230px;margin-bottom:14px"><canvas id="inbodyTrend"></canvas></div>`:
      `<div style="font-size:12px;color:var(--muted);text-align:center;margin-bottom:14px">한 번 더 기록하면 추이 그래프가 나타나요 📈</div>`}
    <div style="overflow-x:auto"><table class="ib-table">
      <thead><tr><th>측정일</th><th>몸무게</th><th>골격근</th><th>체지방</th><th>체지방률</th><th>WHR</th><th>내장</th><th></th></tr></thead>
      <tbody>${history}</tbody></table></div>
    <div style="text-align:center;margin-top:14px">
      <button class="ib-btn" onclick="openIbForm('${name}')">＋ 인바디 입력</button>
    </div>`;

  if(recs.length>=2)buildInbodyChart(recs);
}

function buildInbodyChart(recs){
  const f=chartFont();
  const cv=document.getElementById('inbodyTrend');
  if(!cv)return;
  const labels=recs.map(r=>r.date.slice(2));
  const line=(label,key,color,dash)=>({label,data:recs.map(r=>r[key]),borderColor:color,
    backgroundColor:'transparent',borderWidth:2.5,pointRadius:3,pointBackgroundColor:color,
    tension:.3,spanGaps:true,borderDash:dash||[]});
  CHARTS.inbodyTrend=new Chart(cv,{type:'line',
    data:{labels,datasets:[
      line('몸무게','weight',f.text),
      line('골격근량','smm',f.green),
      line('체지방량','bfm',f.amber),
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:f.text,font:{size:11,weight:'700'},boxWidth:11,padding:8}},
        tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${Number(c.raw).toFixed(1)}kg`}}},
      scales:{x:{ticks:{color:f.muted,font:{size:10},maxRotation:0,autoSkip:true,maxTicksLimit:8},grid:{display:false}},
        y:{ticks:{color:f.muted,font:{size:10},callback:v=>v+'kg'},grid:{color:f.grid}}}}});
}

/* ---------- 입력/삭제 모달 ---------- */
let IB={mode:null,name:null,vals:null,ts:null};
function closeIbModal(){document.getElementById('ibOverlay').classList.remove('open');IB={mode:null,name:null,vals:null,ts:null};}
function ibShow(html){document.getElementById('ibModal').innerHTML=html;document.getElementById('ibOverlay').classList.add('open');}
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
    bfm:num('ibBfm'), whr:num('ibWhr',1), vfl:num('ibVfl',1)};
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
}

async function ibSubmit(){
  const btn=document.getElementById('ibSaveBtn');
  if(!btn||!IB.vals)return;  // 확인 단계가 아닌데 호출된 경우 방어
  btn.disabled=true;btn.textContent='저장 중…';
  const v=IB.vals;
  const payload=IB.mode==='setup'
    ?{action:'setup',name:IB.name,pin:v.pin,height:v.height,
      record:{date:v.date,weight:v.weight,smm:v.smm,bfm:v.bfm,whr:v.whr??'',vfl:v.vfl??''}}
    :{action:'add',name:IB.name,pin:v.pin,
      record:{date:v.date,weight:v.weight,smm:v.smm,bfm:v.bfm,whr:v.whr??'',vfl:v.vfl??''}};
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
