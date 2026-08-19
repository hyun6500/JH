/* =====================================================================
   celebrate.js — 축하 소식 엔진
   =====================================================================
   최근 N일(CELEB_WINDOW) 안에 일어난 "축하할 일"을 데이터에서 직접 찾아낸다.
   별도 저장소(localStorage 등) 없이 기록만으로 계산하므로,
   기기를 바꿔도 누구에게나 동일하게 보인다.

   찾아내는 항목
   - 레벨 업 (25.01~ 누적 운동일이 레벨 경계를 통과)
   - 월간 순위 상승
   - 페이스 신호등 상승 (🔴→🟡, 🟡→🟢)
   - 연속 출석 신기록 (현재 스트릭 = 최장 스트릭)
   - 전월 기록 추월 / 작년 같은 달 추월
   - 종목 장인 신규 등극
   - 목표 100% 달성
   - 인바디 개선 (체지방률·체지방량 감소, 골격근량 증가)
   - 그룹 전체 축하 (전원 달성, 그룹 무결석 릴레이 신기록 등)
   ===================================================================== */

const CELEB_WINDOW = 7;    // 최근 며칠 안의 사건을 축하로 볼지
const CELEB_IB_WINDOW = 21; // 인바디는 측정 주기가 길어 넉넉하게

function celebDaysSince(dateStr){
  if(!dateStr) return Infinity;
  return Math.round((new Date(TODAY) - new Date(dateStr)) / 86400000);
}
function celebShiftDate(dateStr, minusDays){
  return new Date(new Date(dateStr).getTime() - minusDays*86400000).toISOString().slice(0,10);
}

/* 특정 날짜 시점의 페이스 신호등 등급 (그 날까지의 누적 vs 그 날까지의 경과율) */
function celebGradeAt(name, dayStr){
  const target = S.stats.target[name] || 0;
  if(!target) return null;
  const year = dayStr.slice(0,4);
  let cum = 0;
  for(const e of S.raw){
    if(e.date <= dayStr && e.date.startsWith(year) && e.data[name]) cum++;
  }
  const elapsed = dayOfYear(new Date(dayStr));
  const expected = elapsed / 365.25;
  const r = cum / target;
  if(r >= expected) return 'green';
  if(r >= expected * PACE_MID_FACTOR) return 'amber';
  return 'red';
}

/* 특정 날짜까지의 기록만으로 종목별 1위(장인) 계산 */
function celebMastersAsOf(dayStr){
  const map = sportMapFor(S.raw.filter(e => !dayStr || e.date <= dayStr));
  const out = {};
  for(const [sp, {per}] of Object.entries(map)){
    const top = Object.entries(per).sort((a,b)=>b[1]-a[1])[0];
    if(top && top[1] >= 3) out[sp] = top[0];   // 최소 3회는 해야 장인 인정
  }
  return out;
}

/* =================================================================
   축하 소식 목록 만들기
   반환: [{name, e, title, sub, w}]  (name이 null이면 그룹 전체 소식)
   ================================================================= */
function celebAll_(){
  const out = [];
  const add = (name, e, title, sub, w, t) => out.push({name, e, title, sub, w, t});

  const m = S.selMonth || nowYM;
  const md = S.monthly[m] || {};
  const prevYM = prevMonthOf(m);
  const pmd = S.monthly[prevYM] || {};
  const year = String(NOW.getFullYear());

  /* ---------- 1) 레벨 업 ---------- */
  MEMBERS.forEach(n => {
    const dates = [...activeDates(n)].sort();
    if(!dates.length) return;
    const lv = levelInfo(dates.length);
    if(lv.min <= 0 || dates.length < lv.min) return;
    const crossed = dates[lv.min - 1];          // 이 레벨에 진입한 바로 그 날
    if(celebDaysSince(crossed) <= CELEB_WINDOW){
      add(n, lv.e, `<b>${n}</b> 레벨 업! <b>Lv.${lv.lv} ${lv.title}</b>`,
        `누적 ${dates.length}회 달성 — ${crossed.slice(5)}에 승급했어요`, 100, 'level');
    }
  });

  /* ---------- 2) 월간 순위 상승 ---------- */
  {
    const rank = {}, prank = {};
    Object.entries(md).sort((a,b)=>b[1]-a[1]).forEach(([n],i)=>rank[n]=i+1);
    Object.entries(pmd).sort((a,b)=>b[1]-a[1]).forEach(([n],i)=>prank[n]=i+1);
    MEMBERS.forEach(n => {
      if(!rank[n] || !prank[n]) return;
      const up = prank[n] - rank[n];
      if(up >= 2){
        add(n, '📈', `<b>${n}</b> 순위 <b>${up}계단 상승</b>`,
          `${prevYM.slice(5)}월 ${prank[n]}위 → ${m.slice(5)}월 ${rank[n]}위`, 70 + up, 'rank');
      }
    });
  }

  /* ---------- 3) 페이스 신호등 상승 ---------- */
  MEMBERS.forEach(n => {
    const now = celebGradeAt(n, TODAY);
    const before = celebGradeAt(n, celebShiftDate(TODAY, CELEB_WINDOW));
    if(!now || !before || now === before) return;
    const order = {red:0, amber:1, green:2};
    if(order[now] <= order[before]) return;
    const label = {red:'🔴 빨간불', amber:'🟡 노란불', green:'🟢 초록불'};
    add(n, now === 'green' ? '🟢' : '🟡',
      `<b>${n}</b> 페이스 ${label[before]} → <b>${label[now]}</b>`,
      now === 'green' ? '목표 페이스를 따라잡았어요!' : '빨간불 탈출 성공!', 90, 'pace');
  });

  /* ---------- 4) 연속 출석 신기록 ---------- */
  MEMBERS.forEach(n => {
    const st = streakInfo(n);
    if(st.current >= 3 && st.current === st.longest){
      add(n, '🔥', `<b>${n}</b> 연속 출석 <b>신기록 ${st.current}일</b>`,
        '자기 최고 기록을 매일 새로 쓰는 중', 85 + Math.min(10, st.current), 'streak');
    }
  });

  /* ---------- 5) 전월 기록 추월 ---------- */
  MEMBERS.forEach(n => {
    const cur = md[n] || 0, prev = pmd[n] || 0;
    if(prev >= 3 && cur > prev){
      add(n, '🚀', `<b>${n}</b> 지난달 기록 <b>추월</b>`,
        `${prevYM.slice(5)}월 ${prev}일 → 이달 ${cur}일 (아직 진행 중!)`, 60, 'month');
    }
  });

  /* ---------- 6) 작년 같은 달 추월 ---------- */
  {
    const lastYearYM = `${parseInt(m.slice(0,4)) - 1}-${m.slice(5)}`;
    const lymd = S.monthly[lastYearYM] || {};
    MEMBERS.forEach(n => {
      const cur = md[n] || 0, ly = lymd[n] || 0;
      if(ly >= 3 && cur > ly){
        add(n, '📅', `<b>${n}</b> 작년 ${parseInt(m.slice(5))}월보다 <b>더 많이</b>`,
          `작년 ${ly}일 → 올해 ${cur}일`, 45, 'lastyear');
      }
    });
  }

  /* ---------- 7) 종목 장인 신규 등극 ---------- */
  {
    const now = celebMastersAsOf(null);
    const before = celebMastersAsOf(celebShiftDate(TODAY, CELEB_WINDOW));
    for(const [sp, owner] of Object.entries(now)){
      if(before[sp] !== owner){
        add(owner, '🏅', `<b>${owner}</b> <b>${sportEmoji(sp)} ${sp} 장인</b> 등극`,
          before[sp] ? `${before[sp]}님을 제치고 1위로!` : '이 종목 최다 기록 보유자', 75, 'master');
      }
    }
  }

  /* ---------- 8) 연간 목표 100% 달성 ---------- */
  MEMBERS.forEach(n => {
    const target = S.stats.target[n] || 0;
    if(!target) return;
    const dates = [...activeDates(n)].filter(d => d.startsWith(year)).sort();
    if(dates.length < target) return;
    const achieved = dates[target - 1];
    if(celebDaysSince(achieved) <= CELEB_WINDOW * 4){    // 큰 경사라 넉넉히
      add(n, '🎯', `<b>${n}</b> 연간 목표 <b>100% 달성</b>`,
        `목표 ${target}일 완주 (${achieved.slice(5)}) — 이제는 보너스 스테이지`, 110, 'goal');
    }
  });

  /* ---------- 9) 인바디 개선 ---------- */
  if(S.inbody && S.inbody.loaded){
    MEMBERS.forEach(n => {
      const recs = S.inbody.records
        .filter(r => r.name === n)
        .sort((a,b)=>a.date.localeCompare(b.date));
      if(recs.length < 2) return;
      const cur = recs[recs.length-1], prev = recs[recs.length-2];
      if(celebDaysSince(cur.date) > CELEB_IB_WINDOW) return;
      const h = (S.inbody.members[n] || {}).height || null;
      const pbf = r => (r.weight && r.bfm != null) ? r.bfm / r.weight * 100 : null;
      const p1 = pbf(prev), p2 = pbf(cur);
      if(p1 != null && p2 != null && p2 < p1 - 0.2){
        add(n, '💪', `<b>${n}</b> 체지방률 <b>${(p1-p2).toFixed(1)}%p 감소</b>`,
          `${p1.toFixed(1)}% → ${p2.toFixed(1)}% · 노력이 숫자로 나왔어요`, 80, 'inbody');
      }
      if(cur.smm != null && prev.smm != null && cur.smm > prev.smm + 0.2){
        add(n, '🦾', `<b>${n}</b> 골격근량 <b>+${(cur.smm-prev.smm).toFixed(1)}kg</b>`,
          `${prev.smm.toFixed(1)}kg → ${cur.smm.toFixed(1)}kg`, 78, 'inbody');
      }
    });
  }

  /* ---------- 10) 그룹 전체 소식 ---------- */
  {
    // 오늘 전원 달성
    const todayEntry = S.raw.find(e => e.date === TODAY);
    if(todayEntry && Object.keys(todayEntry.data).length === MEMBERS.length){
      add(null, '🎉', `오늘 <b>전원 달성</b>!`, '12명이 모두 불을 켠 날 — 캡처각입니다', 120, 'group');
    }
    // 그룹 무결석 릴레이 신기록
    const set = new Set(S.raw.map(e => e.date));
    let cursor = set.has(TODAY) ? TODAY : celebShiftDate(TODAY, 1);
    let run = 0;
    while(set.has(cursor)){ run++; cursor = celebShiftDate(cursor, 1); }
    if(run >= 14){
      add(null, '🔗', `그룹 무결석 릴레이 <b>${run}일째</b>`, '매일 최소 한 명은 운동 중', 50, 'group');
    }
    // 이달 그룹 합산이 전월 초과
    const curTotal = Object.values(md).reduce((a,b)=>a+b,0);
    const prevTotal = Object.values(pmd).reduce((a,b)=>a+b,0);
    if(prevTotal > 0 && curTotal > prevTotal){
      add(null, '📊', `이달 그룹 활동 <b>지난달 추월</b>`,
        `${prevYM.slice(5)}월 ${prevTotal}일 → 이달 ${curTotal}일`, 40, 'group');
    }
  }

  return out.sort((a,b)=>b.w-a.w);
}

function buildCelebrations(){ return celebPick_(celebAll_()); }

/* 같은 유형이 화면을 도배하지 않도록 추려낸다.
   - 유형당 최대 CELEB_PER_TYPE 건
   - 전체 최대 CELEB_MAX 건
   - 가중치 높은 순서 유지 */
const CELEB_MAX = 8;
const CELEB_PER_TYPE = 2;
function celebPick_(sorted){
  const cnt = {}, picked = [];
  for(const c of sorted){
    const t = c.t || 'etc';
    cnt[t] = cnt[t] || 0;
    if(cnt[t] >= CELEB_PER_TYPE) continue;
    cnt[t]++;
    picked.push(c);
    if(picked.length >= CELEB_MAX) break;
  }
  return picked;
}

/* 특정 멤버의 축하 소식만 (개인 기록 탭용) */
function celebrationsFor(name){
  // 개인 탭에서는 유형 제한 없이 본인 소식을 모두 보여준다
  const all = celebAll_();
  return all.filter(c => c.name === name).slice(0, 6);
}

/* =================================================================
   홈 탭 축하 배너 — 한 건씩 자동으로 넘어가는 롤링 배너
   ================================================================= */
let CELEB_LIST = [];
let CELEB_IDX = 0;
let CELEB_TIMER = null;

function renderCelebBanner(elId){
  const el = document.getElementById(elId);
  if(!el) return;
  CELEB_LIST = buildCelebrations();
  if(CELEB_TIMER){ clearInterval(CELEB_TIMER); CELEB_TIMER = null; }
  if(!CELEB_LIST.length){ el.innerHTML = ''; el.style.display = 'none'; return; }
  el.style.display = '';
  CELEB_IDX = 0;

  const dots = CELEB_LIST.length > 1
    ? `<div class="celeb-dots">${CELEB_LIST.map((_,i)=>
        `<button class="celeb-dot ${i===0?'on':''}" data-i="${i}" onclick="celebGo(${i})"></button>`).join('')}</div>`
    : '';

  el.innerHTML = `
    <div class="celeb" onmouseenter="celebPause()" onmouseleave="celebResume()">
      <div class="celeb-label">🎊 축하해요</div>
      <div class="celeb-stage" id="celebStage">${celebSlideHtml(CELEB_LIST[0])}</div>
      ${CELEB_LIST.length > 1 ? `
        <div class="celeb-nav">
          <button onclick="celebStep(-1)" title="이전">‹</button>
          <span class="celeb-count"><b id="celebNo">1</b>/${CELEB_LIST.length}</span>
          <button onclick="celebStep(1)" title="다음">›</button>
        </div>` : ''}
      ${dots}
    </div>`;
  if(CELEB_LIST.length > 1) celebResume();
}

function celebSlideHtml(c){
  const who = c.name
    ? `<span class="av-xs" style="background:${avatarColor(c.name)}">${initial(c.name)}</span>`
    : `<span class="av-xs group">👥</span>`;
  const click = c.name ? `onclick="openMember('${c.name}')" style="cursor:pointer"` : '';
  return `<div class="celeb-slide" ${click}>
    <span class="ce">${c.e}</span>
    <div class="ct">
      <div class="t">${who}${c.title}</div>
      <div class="s">${c.sub}</div>
    </div>
  </div>`;
}

function celebGo(i){
  if(!CELEB_LIST.length) return;
  CELEB_IDX = (i + CELEB_LIST.length) % CELEB_LIST.length;
  const stage = document.getElementById('celebStage');
  if(!stage) return;
  stage.innerHTML = celebSlideHtml(CELEB_LIST[CELEB_IDX]);
  const slide = stage.firstElementChild;
  if(slide && !REDUCED_MOTION){
    slide.classList.add('in');
    // 다음 프레임에 클래스 제거해 슬라이드-인 애니메이션 트리거
    requestAnimationFrame(()=>requestAnimationFrame(()=>slide.classList.remove('in')));
  }
  const no = document.getElementById('celebNo');
  if(no) no.textContent = CELEB_IDX + 1;
  document.querySelectorAll('.celeb-dot').forEach(d=>
    d.classList.toggle('on', parseInt(d.dataset.i) === CELEB_IDX));
}
function celebStep(d){ celebGo(CELEB_IDX + d); celebResume(); }
function celebPause(){ if(CELEB_TIMER){ clearInterval(CELEB_TIMER); CELEB_TIMER = null; } }
function celebResume(){
  celebPause();
  if(CELEB_LIST.length <= 1 || REDUCED_MOTION) return;
  CELEB_TIMER = setInterval(()=>celebGo(CELEB_IDX + 1), 5000);   // 5초마다 다음 소식
}

/* =================================================================
   개인 기록 탭 — 그 사람의 축하 소식 카드
   ================================================================= */
function renderMyCelebrations(elId, name){
  const el = document.getElementById(elId);
  if(!el) return;
  const list = celebrationsFor(name);
  if(!list.length){ el.innerHTML = ''; el.style.display = 'none'; return; }
  el.style.display = '';
  el.innerHTML = `
    <div class="my-celeb">
      <div class="my-celeb-head">🎊 최근 ${CELEB_WINDOW}일간 <b>${name}</b>님의 축하 소식</div>
      <div class="my-celeb-list">
        ${list.map(c=>`<div class="my-celeb-item">
          <span class="ce">${c.e}</span>
          <div><div class="t">${c.title}</div><div class="s">${c.sub}</div></div>
        </div>`).join('')}
      </div>
    </div>`;
}
