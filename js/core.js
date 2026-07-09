/* =====================================================================
   core.js — 데이터·상태·라우팅 코어
   상수(API·멤버·색·레벨), 전역 상태 S, 데이터 로딩(init/parse/quote/inbody API),
   파생지표(스트릭·종목정규화·페이스판정·연말예상), 탭 라우팅(goPage)과 지연 렌더링 시스템.
   ※ 로드 순서 1번 — 다른 모든 파일이 여기 정의된 상수/상태에 의존
   ===================================================================== */
/* =================================================================
   오운완 대시보드 v3 "새벽 트랙" — 데이터 레이어
   기존 Google Apps Script 엔드포인트와 동일한 데이터 계약 유지
   (행 배열: [날짜/키, 멤버1, 멤버2, …] 형식)
   ================================================================= */
const API_BASE = 'https://script.google.com/macros/s/AKfycbzhCy5M8_IpwhJO2EUzrc74FEewXiSgyewm7B0IegufBODEvOWzalijZSvT75dZ-QSh/exec';
const API_URL = API_BASE + '?Q=dashboard';
const QUOTE_URL = API_BASE + '?Q=quotejson';
Chart.register(ChartDataLabels);
Chart.defaults.plugins.datalabels.display = false; // 필요한 차트에서만 켠다

const MEMBERS = ['상','성경','보현','성우','상필','주현','정현','범진','재현','윤선','아현','윤경'];
const MEM_COLORS = MEMBERS.map((_,i)=>`hsl(${i*30},62%,56%)`);
const SPORT_COLORS = ['#ff6b3d','#ffd23f','#35cfe3','#6c8cff','#a78bfa','#f26d9d','#2edd8a','#fb923c','#ff5d7a','#9aa6bd'];
// 정규화된 종목 → 이모지 (달력 뷰용)
const SPORT_EMOJI = {
  '헬스':'🏋️','크로스핏':'🤸','클라이밍':'🧗','수영':'🏊','러닝':'🏃','등산':'🥾',
  '필라테스':'🧘','요가':'🧘','발레':'🩰','자전거':'🚴','골프':'⛳','홈트':'🏠',
  '줌바':'💃','로잉':'🚣','수중하키':'🏑','풋살':'⚽','배드민턴':'🏸','테니스':'🎾',
  '철인3종':'🏅','주짓수':'🥋','탁구':'🏓','농구':'🏀','스키':'⛷️','아이스하키':'🏒',
  '댄스':'💃','볼링':'🎳'
};
const sportEmoji = s => SPORT_EMOJI[s] || '💪';

// 폴백용 명언 — 스프레드시트 '명언' 시트(1,000개)를 ?Q=quotejson 으로 불러오며,
// 로딩 실패 시 아래 12개로 자동 대체됨
const FALLBACK_QUOTES = [
  {q:'무언가를 시작하기 위해 위대해질 필요는 없다. 하지만 위대해지기 위해서는 시작해야 한다.', by:'지그 지글러', role:'동기부여 연설가'},
  {q:'천 리 길도 한 걸음부터.', by:'노자', role:'도가의 창시자'},
  {q:'행동만이 두려움을 치료한다. 망설임과 미룸은 두려움을 키울 뿐이다.', by:'데이비드 슈워츠', role:'자기계발 작가'},
  {q:'우리가 반복적으로 하는 행동이 곧 우리 자신이다. 탁월함은 행동이 아니라 습관이다.', by:'아리스토텔레스', role:'철학자'},
  {q:'몸은 당신이 한 일을 기억한다. 오늘의 땀은 내일의 힘이다.', by:'작자 미상', role:''},
  {q:'가장 큰 영광은 한 번도 넘어지지 않는 것이 아니라, 넘어질 때마다 일어서는 것이다.', by:'넬슨 만델라', role:'정치인'},
  {q:'운동은 몸에 거는 가장 확실한 적금이다.', by:'작자 미상', role:''},
  {q:'시작하라. 그 자체가 천재성이고 힘이며 마법이다.', by:'괴테', role:'대문호'},
  {q:'오늘 할 수 있는 일에 전력을 다하라. 그러면 내일은 한 걸음 더 나아가 있을 것이다.', by:'아이작 뉴턴', role:'과학자'},
  {q:'습관은 처음엔 거미줄처럼 약하지만 나중엔 쇠줄처럼 강해진다.', by:'토마스 아 켐피스', role:'수도사'},
  {q:'꾸준함은 재능을 이긴다. 매일 나오는 사람을 이길 방법은 없다.', by:'작자 미상', role:''},
  {q:'미래는 자신의 꿈의 아름다움을 믿는 사람들의 것이다.', by:'엘리너 루스벨트', role:'영부인'},
];

/* ---------- 데이터 표시 기준 시작점 ----------
   집계·표시는 이 날짜(포함)부터. 그 이전(24년 등)은 S.legacy로 분리 보관해
   "이전 기록"으로만 참고 표시. 대시보드 전체 수치를 한 기준으로 통일하기 위함. */
const DATA_START = '2025-01-01';
const DATA_START_YM = DATA_START.slice(0,7);   // '2025-01'
// DATA_START부터 오늘까지 함께한 개월 수 (올림, 최소 1)
function monthsTogether(){
  const s=new Date(DATA_START);
  let m=(NOW.getFullYear()-s.getFullYear())*12 + (NOW.getMonth()-s.getMonth());
  if(NOW.getDate()>=s.getDate()) m+=1;   // 이번 달도 함께한 것으로 카운트
  return Math.max(1, m);
}

/* ---------- 레벨/칭호 시스템 (25.01~ 누적 운동일 기준) ---------- */
const LEVELS = [
  {min:300, lv:6, title:'오운완 레전드', e:'👑'},
  {min:200, lv:5, title:'아이언',       e:'🏔️'},
  {min:120, lv:4, title:'강철체력',     e:'🦾'},
  {min:60,  lv:3, title:'근성러',       e:'💪'},
  {min:25,  lv:2, title:'출석 요정',    e:'🏃'},
  {min:0,   lv:1, title:'운동 새싹',    e:'🌱'},
];
function levelInfo(totalAll){
  const cur = LEVELS.find(l=>totalAll>=l.min) || LEVELS[LEVELS.length-1];
  const next = LEVELS.filter(l=>l.min>cur.min).sort((a,b)=>a.min-b.min)[0] || null;
  const base = cur.min, cap = next ? next.min : null;
  const progress = cap ? Math.min(1,(totalAll-base)/(cap-base)) : 1;
  return {...cur, next, progress, need: cap ? cap-totalAll : 0};
}

let S = {
  raw:[],            // [{date:'YYYY-MM-DD', data:{name:[sports]}}]  ← 25.01~ 만
  monthly:{},        // {'YYYY-MM':{name:count}}                     ← 25.01~ 만
  legacy:{           // 24년 이전 "이전 기록" (참고용, 집계엔 미포함)
    perMember:{},    //   {name:count}
    total:0,         //   전체 이전 기록 일수 합
    firstDate:null,  //   가장 오래된 기록일
    monthly:{},      //   {'YYYY-MM':{name:count}}  (필요 시 확장용)
  },
  stats:{target:{},remain:{},rate:{},cumul:{}},
  selMonth:null,
  selMember:null,
  quote:null,        // 서버에서 받은 오늘의 명언 (없으면 폴백)
  rankMode:'month',  // 랭킹 탭 기간 모드: 'month' | 'year'
  rankYear:null,     // 연간 모드에서 선택한 연도
  vsA:null, vsB:null,// VS 비교 대상 두 명
};
let CHARTS = {};
let curPage = 'home';

const NOW = new Date();
const nowYM = `${NOW.getFullYear()}-${String(NOW.getMonth()+1).padStart(2,'0')}`;
const TODAY = `${NOW.getFullYear()}-${String(NOW.getMonth()+1).padStart(2,'0')}-${String(NOW.getDate()).padStart(2,'0')}`;
const startOfYear = new Date(NOW.getFullYear(),0,1);
const yearPct = ((NOW - startOfYear)/(365.25*24*3600*1000)*100).toFixed(1);
const DOW_KR = ['일','월','화','수','목','금','토'];

const avatarColor = n => MEM_COLORS[MEMBERS.indexOf(n)] || 'var(--muted)';
const initial = n => n.slice(0,1);  // 한 글자 이니셜(앞글자)
const todayQuote = () => S.quote || FALLBACK_QUOTES[(NOW.getFullYear()*1000 + dayOfYear(NOW)) % FALLBACK_QUOTES.length];

/* ---------- 페이스 판정 공통 로직 ----------
   달성률(r = 누적/목표)을 연 경과율(expected)과 비교해 색 등급을 매김.
   - r >= expected           → 초록 (페이스 유지/초과)
   - r >= expected*0.85      → 노랑 (조금 뒤처짐)
   - 그 외                   → 빨강 (많이 뒤처짐)
   PACE_MID_FACTOR: 노랑/빨강 경계 계수 (0.85). 이 값을 바꾸면 색 기준이 함께 이동함. */
const PACE_MID_FACTOR = 0.85;
function expectedRate(){ return parseFloat(yearPct)/100; }
function paceGrade(r){
  const e=expectedRate();
  if(r>=e)                 return {level:'green', c:'',    col:'var(--green)'};
  if(r>=e*PACE_MID_FACTOR) return {level:'amber', c:'mid', col:'var(--amber)'};
  return {level:'red', c:'low', col:'var(--red)'};
}
// 올해 남은 날짜 수 (오늘 제외, 12/31까지). 하루 최대 1회 제약과 임계선 이동 계산에 사용.
function daysLeftThisYear(){
  const end=new Date(NOW.getFullYear(),11,31);
  return Math.max(0, Math.ceil((end - NOW)/86400000));
}
// 하루당 경과율 증가폭(비율). 임계선이 시간에 따라 오르는 속도.
const RATE_PER_DAY = 1/365.25;

/* 다음 색 등급 도달까지 며칠 더 필요한가 — 정밀 버전.
   색 기준(expected)은 시간이 갈수록 계속 올라가고, 하루 최대 1회이므로
   "오늘부터 매일 하루도 안 빠지고 운동한다"고 가정하고, 며칠째에
   달성률(=(cumul+d)/target)이 그날의 임계선을 따라잡는지 시뮬레이션한다. */
function daysToNextGrade(cumul, target){
  if(!target) return null;
  const g=paceGrade(cumul/target);
  if(g.level==='green') return null;
  const toColor = g.level==='amber' ? 'green' : 'amber';
  const goalFactor = g.level==='amber' ? 1 : PACE_MID_FACTOR;
  const base = expectedRate();
  const left = daysLeftThisYear();
  for(let d=1; d<=left; d++){
    const expD = base + RATE_PER_DAY*d;
    const rD   = (cumul + d)/target;
    if(rD >= expD*goalFactor) return {toColor, need:d};
  }
  return {toColor, unreachable:true, daysLeft:left};
}

/* ---------- 연말 예상 프로젝션 ----------
   올해 누적을 연 경과일로 나눠 하루 페이스를 구하고 365일로 환산.
   해가 바뀐 직후(표본 7일 미만)엔 노이즈가 커서 표시하지 않음. */
function projectYearEnd(cumulYear){
  const elapsed = dayOfYear(NOW);
  if(elapsed < 7) return null;
  return Math.round(cumulYear / elapsed * 365);
}

// 서버에서 오늘의 명언 1개 받아오기 (실패해도 조용히 폴백)
async function loadQuote(){
  try{
    const res = await fetch(QUOTE_URL);
    if(!res.ok) return;
    const q = await res.json();
    if(q && q.q && !q.error) S.quote = q;
  }catch(e){ /* 폴백 유지 */ }
}
function dayOfYear(d){return Math.floor((d - new Date(d.getFullYear(),0,0))/86400000);}

/* ---------- 인바디 데이터 ----------
   ?Q=inbody : {records:[{ts,name,date,weight,smm,bfm,whr,vfl}], members:{name:{height,hasPin}}}
   POST      : {action:'setup'|'add'|'delete', name, pin, ...}
   서버(Apps Script)가 아직 업데이트 전이면 loaded=false 상태로 안내만 표시 */
S.inbody={loaded:false,records:[],members:{}};
async function loadInbody(){
  try{
    const res=await fetch(API_BASE+'?Q=inbody');
    if(!res.ok) return;
    const j=await res.json();
    if(j && !j.error && Array.isArray(j.records)){
      S.inbody={loaded:true,records:j.records,members:j.members||{}};
    }
  }catch(e){ /* 미연결 상태 유지 */ }
}
async function ibPost(payload){
  // text/plain 으로 보내 preflight(CORS 사전요청)를 피함 — Apps Script 웹앱 표준 패턴
  const res=await fetch(API_BASE,{method:'POST',
    headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify(payload)});
  if(!res.ok) throw new Error('HTTP '+res.status);
  return res.json();
}

/* ---------- 테마 토글 ---------- */
function toggleTheme(){
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',next);
  document.getElementById('themeBtn').textContent = next==='dark'?'🌙':'☀️';
  if(S.raw.length) renderAll();  // 차트 색상 갱신
}

function goPage(p){
  curPage = p;
  document.querySelectorAll('.tab, .bn-item').forEach(t=>t.classList.toggle('active', t.dataset.page===p));
  document.querySelectorAll('.page').forEach(pg=>pg.classList.remove('active'));
  const target = document.getElementById('page-'+p);
  if(target) target.classList.add('active');
  // ---- 지연 렌더링: 탭이 화면에 보이는 상태에서 그려야 차트 크기가 올바름 ----
  if(S.raw.length || S.legacy.total){
    if(PAGE_DIRTY[p]) renderPage(p);
    else requestAnimationFrame(()=>{ // 이미 렌더된 페이지: 혹시 모를 0크기 차트 보정
      Object.values(CHARTS).forEach(c=>{try{c.resize();}catch(e){}});
    });
  }
  window.scrollTo({top:0,behavior:'smooth'});
}

/* ---------- 데이터 로드 ---------- */
async function init(){
  const rBtn=document.getElementById('refreshBtn');
  if(rBtn) rBtn.disabled = true;
  if(!S.raw.length){
    document.getElementById('app').innerHTML =
      `<div class="loading"><div class="spin"></div><h3 style="font-size:15px;color:var(--text)">데이터 불러오는 중…</h3></div>`;
  }
  try{
    // 명언은 병렬로 받되 대시보드 로딩을 막지 않음
    const quoteP = loadQuote();
    const res = await fetch(API_URL);
    if(!res.ok) throw new Error('HTTP '+res.status);
    parse(await res.json());
    buildShell();
    renderAll();
    // 명언이 나중에 도착하면 홈 히어로만 갱신
    quoteP.then(()=>{ if(S.quote && curPage==='home') renderPage('home'); });
    // 인바디도 병렬 로딩 — 도착하면 개인기록 탭만 갱신
    loadInbody().then(()=>{
      if(S.inbody.loaded){ PAGE_DIRTY.me=true; if(curPage==='me') renderPage('me'); }
    });
  }catch(e){
    document.getElementById('app').innerHTML =
      `<div class="err"><div class="ic">⚠️</div><h3>데이터를 불러오지 못했어요</h3>
       <p>잠시 후 새로고침을 눌러주세요.<br><span style="opacity:.6">${e.message}</span></p></div>`;
  }finally{
    if(rBtn) rBtn.disabled = false;
  }
}

function parse(rows){
  S.raw=[]; S.monthly={}; S.stats={target:{},remain:{},rate:{},cumul:{}};
  S.legacy={perMember:{}, total:0, firstDate:null, monthly:{}};
  const dateRe=/^\d{4}-\d{2}-\d{2}/;
  function toKSTDate(raw){
    const s=String(raw||'');
    if(!dateRe.test(s)) return null;
    if(s.includes('T')){const d=new Date(s);return new Date(d.getTime()+9*3600*1000).toISOString().slice(0,10);}
    return s.slice(0,10);
  }
  for(const r of rows){
    const key=String(r[0]||'').trim();
    if(key==='목표 일수') MEMBERS.forEach((n,j)=>S.stats.target[n]=+r[j+1]||0);
    if(key==='남은 횟수') MEMBERS.forEach((n,j)=>S.stats.remain[n]=+r[j+1]||0);
    if(key==='달성률')    MEMBERS.forEach((n,j)=>S.stats.rate[n]=+r[j+1]||0);
    if(key==='누적')      MEMBERS.forEach((n,j)=>S.stats.cumul[n]=+r[j+1]||0);
  }
  for(const r of rows){
    const date=toKSTDate(r[0]);
    if(!date||date>TODAY) continue;
    const hasData=MEMBERS.some((_,j)=>{const c=String(r[j+1]||'').trim();return c&&isNaN(Number(c));});
    if(!hasData) continue;
    const month=date.slice(0,7);
    // ---- DATA_START 이전은 '이전 기록'(S.legacy)으로 분리, 집계엔 미포함 ----
    const isLegacy = date < DATA_START;
    if(isLegacy){
      for(let j=0;j<MEMBERS.length;j++){
        const c=String(r[j+1]||'').trim();
        if(c&&isNaN(Number(c))){
          const n=MEMBERS[j];
          S.legacy.perMember[n]=(S.legacy.perMember[n]||0)+1;
          S.legacy.total++;
          if(!S.legacy.monthly[month]) S.legacy.monthly[month]={};
          S.legacy.monthly[month][n]=(S.legacy.monthly[month][n]||0)+1;
          if(!S.legacy.firstDate || date<S.legacy.firstDate) S.legacy.firstDate=date;
        }
      }
      continue; // S.raw / S.monthly 에는 넣지 않음
    }
    if(!S.monthly[month]) S.monthly[month]={};
    const entry={date,data:{}};
    for(let j=0;j<MEMBERS.length;j++){
      const c=String(r[j+1]||'').trim();
      if(c&&isNaN(Number(c))){
        // ',' '·' '、' = 여러 운동 구분 / '/' = 운동 뒤 세부부위(예: 헬스/가슴) → 앞부분만 사용
        const raw=c.split(/[,·、]+/).map(s=>s.split('/')[0].trim()).filter(Boolean);
        // 정규화 후 같은 종목 중복 제거(예: 헬스/가슴 → 헬스 1개)
        const seen=new Set(), sports=[];
        for(const s of raw){const k=normSport(s)||s; if(!seen.has(k)){seen.add(k); sports.push(s);}}
        entry.data[MEMBERS[j]]=sports;
        S.monthly[month][MEMBERS[j]]=(S.monthly[month][MEMBERS[j]]||0)+1;
      }
    }
    if(Object.keys(entry.data).length) S.raw.push(entry);
  }
  S.raw.sort((a,b)=>a.date.localeCompare(b.date));
  const months=Object.keys(S.monthly).sort();
  if(S.monthly[nowYM]) S.selMonth=nowYM;
  else if(!S.selMonth||!months.includes(S.selMonth)) S.selMonth=months[months.length-1];
  if(!S.selMember) S.selMember = bestMemberThisMonth() || MEMBERS[0];
  // VS 기본 매치업: 이달 1·2위
  const top2=Object.entries(S.monthly[S.selMonth]||{}).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  if(!S.vsA) S.vsA = top2[0] || MEMBERS[0];
  if(!S.vsB) S.vsB = (top2[1] && top2[1]!==S.vsA) ? top2[1] : MEMBERS.find(n=>n!==S.vsA);
}

function bestMemberThisMonth(){
  const md=S.monthly[S.selMonth]||{};
  const e=Object.entries(md).sort((a,b)=>b[1]-a[1])[0];
  return e?e[0]:null;
}

/* ---------- 파생 지표: 스트릭 계산 ---------- */
// 멤버별 운동한 날짜 집합
function activeDates(name){
  return new Set(S.raw.filter(e=>e.data[name]).map(e=>e.date));
}
// 현재 연속 스트릭(오늘 또는 어제까지 이어진 연속일), 최장 스트릭, 마지막 운동일
function streakInfo(name){
  const dates=[...activeDates(name)].sort();
  if(!dates.length) return {current:0,longest:0,last:null,daysSince:Infinity};
  const set=new Set(dates);
  // 최장
  let longest=0,run=0,prev=null;
  for(const d of dates){
    if(prev && (new Date(d)-new Date(prev))===86400000) run++; else run=1;
    longest=Math.max(longest,run); prev=d;
  }
  // 현재: 오늘 또는 어제부터 거꾸로
  const last=dates[dates.length-1];
  const daysSince=Math.round((new Date(TODAY)-new Date(last))/86400000);
  let current=0;
  if(daysSince<=1){
    let cursor=last;
    while(set.has(cursor)){
      current++;
      cursor=new Date(new Date(cursor).getTime()-86400000).toISOString().slice(0,10);
    }
  }
  return {current,longest,last,daysSince};
}

/* ---------- 종목 정규화 ---------- */
function normSport(s){
  s=s.trim();
  if(MEMBERS.includes(s)) return null; // 멤버명이 종목칸에 잘못 들어간 경우 제외
  if(/헬스|가슴|상체|하체|등$|^등 |팔|하이로|웨이트/.test(s))return'헬스';
  if(/클핏|크로스핏|F45/i.test(s))return'크로스핏';
  if(/클라이밍|클릿|볼더/.test(s))return'클라이밍';
  if(/바다수영|수영/.test(s))return'수영';
  if(/러닝|달리기|런|마라톤|걷기/.test(s))return'러닝';
  if(/등산|트래킹|트레킹|하이킹|트래일/.test(s))return'등산';
  if(/필라테스|필테/.test(s))return'필라테스';
  if(/요가/.test(s))return'요가';
  if(/발레/.test(s))return'발레';
  if(/자전거|사이클/.test(s))return'자전거';
  if(/골프/.test(s))return'골프';
  if(/홈트|홈/.test(s))return'홈트';
  if(/줌바|좀바|zumba/i.test(s))return'줌바';
  if(/로잉|로윙/.test(s))return'로잉';
  if(/수중/.test(s))return'수중하키';
  if(/풋살/.test(s))return'풋살';
  if(/배드민턴/.test(s))return'배드민턴';
  if(/테니/.test(s))return'테니스';
  if(/철인|듀애슬론|아쿠아슬론|트라이애슬론/.test(s))return'철인3종';
  if(/주짓수|유도/.test(s))return'주짓수';
  if(/탁구/.test(s))return'탁구';
  if(/농구/.test(s))return'농구';
  if(/스키|보드|썰매/.test(s))return'스키';
  if(/하키/.test(s))return'아이스하키';
  if(/댄스/.test(s))return'댄스';
  if(/볼링/.test(s))return'볼링';
  return s||'기타';
}
function sportMapFor(entries){
  const m={};
  for(const e of entries)for(const[name,sports]of Object.entries(e.data))for(const s of sports){
    const k=normSport(s);
    if(!k)continue;
    if(!m[k])m[k]={total:0,per:{}};
    m[k].total++; m[k].per[name]=(m[k].per[name]||0)+1;
  }
  return m;
}

/* =================================================================
   SHELL: 5개 페이지 컨테이너 1회 생성 (탭 전환 시 재사용)
   ================================================================= */
function buildShell(){
  document.getElementById('app').innerHTML = `
    <section class="page active" id="page-home"></section>
    <section class="page" id="page-rank"></section>
    <section class="page" id="page-data"></section>
    <section class="page" id="page-vs"></section>
    <section class="page" id="page-me"></section>`;
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active', p.id==='page-'+curPage));
}

function destroyAll(){Object.values(CHARTS).forEach(c=>{try{c.destroy();}catch(e){}});CHARTS={};}
function chartFont(){const s=getComputedStyle(document.documentElement);return{
  text:s.getPropertyValue('--text2').trim(),muted:s.getPropertyValue('--muted').trim(),
  grid:s.getPropertyValue('--grid').trim(),accent:s.getPropertyValue('--accent').trim(),
  accent2:s.getPropertyValue('--accent2').trim(),green:s.getPropertyValue('--green').trim(),
  amber:s.getPropertyValue('--amber').trim(),red:s.getPropertyValue('--red').trim(),
};}

/* ---------- 지연 렌더링 시스템 ----------
   숨겨진 탭(display:none)에서 Chart.js를 생성하면 canvas 크기가 0으로 잡혀
   빈 차트가 되는 문제가 있어, "지금 보이는 탭"만 그리고 나머지는
   dirty 표시 후 탭 진입 시점에 그린다. */
const PAGE_DIRTY = {home:true, rank:true, data:true, vs:true, me:true};
// 페이지별 소유 차트 키 (페이지 재렌더 전 해당 차트만 파기해 메모리 누수 방지)
const PAGE_CHARTS = {
  home:[], rank:['yearMonthly'],
  data:['stacked','cumul','weekday','trend','groupDonut','season'],
  vs:['vsRadar','vsDuel','vsWeekday'],
  me:['donut','profTrend','inbodyTrend'],
};
function destroyPageCharts(p){
  (PAGE_CHARTS[p]||[]).forEach(k=>{
    if(CHARTS[k]){try{CHARTS[k].destroy();}catch(e){} delete CHARTS[k];}
  });
}
function renderPage(p){
  destroyPageCharts(p);
  if(p==='home') renderHome();
  else if(p==='rank') renderRank();
  else if(p==='data') renderData();
  else if(p==='vs') renderVS();
  else if(p==='me') renderMe();
  PAGE_DIRTY[p]=false;
}
function markDirty(pages){ pages.forEach(p=>PAGE_DIRTY[p]=true); }

function renderAll(){
  destroyAll();
  buildTicker();
  markDirty(['home','rank','data','vs','me']);
  renderPage(curPage);   // 지금 보이는 탭만 즉시 렌더, 나머지는 진입 시
}

