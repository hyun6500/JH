/* =====================================================================
   storycard.js — 인스타 스토리 카드
   1080×1920 canvas 이미지 생성·다운로드 (개인 기록 탭 📸 버튼)
   ===================================================================== */
/* =================================================================
   개인 탭 — 인스타 스토리용 9:16 카드 이미지 생성 & 다운로드
   외부 라이브러리 없이 순수 canvas로 1080×1920 렌더링.
   멤버 색(HSL) 기반 그라데이션 배경.
   ================================================================= */
function memberHSL(name){
  const idx=MEMBERS.indexOf(name);
  const h=idx>=0?idx*30:210;
  return {h, s:62, l:56};
}
function roundRect(ctx,x,y,w,h,r){
  if(w<2*r)r=w/2; if(h<2*r)r=h/2;
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

async function downloadStoryCard(){
  if(!S.storyData){ return; }
  const btn=document.querySelector('.story-btn');
  const D=S.storyData;
  const {h}=memberHSL(D.name);

  if(btn){ btn.disabled=true; btn.innerHTML='<span style="font-size:15px">⏳</span> 이미지 만드는 중…'; }

  try{
    const W=1080, H=1920;
    const cv=document.createElement('canvas');
    cv.width=W; cv.height=H;
    const c=cv.getContext('2d');

    // ---- 배경: 멤버 색 기반 대각 그라데이션 ----
    const g=c.createLinearGradient(0,0,W,H);
    g.addColorStop(0, `hsl(${h}, 58%, 20%)`);
    g.addColorStop(0.5, `hsl(${(h+18)%360}, 52%, 12%)`);
    g.addColorStop(1, `hsl(${(h+340)%360}, 45%, 8%)`);
    c.fillStyle=g; c.fillRect(0,0,W,H);

    // 은은한 광원(상단 오른쪽)
    const glow=c.createRadialGradient(W*0.78,H*0.12,50, W*0.78,H*0.12,700);
    glow.addColorStop(0, `hsla(${h}, 80%, 62%, 0.28)`);
    glow.addColorStop(1, 'hsla(0,0%,0%,0)');
    c.fillStyle=glow; c.fillRect(0,0,W,H);

    // 하단 어둡게(가독성)
    const bottom=c.createLinearGradient(0,H*0.6,0,H);
    bottom.addColorStop(0,'hsla(0,0%,0%,0)');
    bottom.addColorStop(1,'hsla(0,0%,0%,0.45)');
    c.fillStyle=bottom; c.fillRect(0,0,W,H);

    // ---- 순위 동물 워터마크: 초대형 이모지를 반투명하게 배경에 깔기 ----
    if(D.rankAnimal){
      c.save();
      c.textAlign='center'; c.textBaseline='middle';
      // 뒤에 은은한 원형 광 (동물 실루엣을 배경에서 살짝 띄워줌)
      const wg=c.createRadialGradient(W*0.72,H*0.30,60, W*0.72,H*0.30,560);
      wg.addColorStop(0, `hsla(${h}, 70%, 60%, 0.10)`);
      wg.addColorStop(1, 'hsla(0,0%,0%,0)');
      c.fillStyle=wg; c.fillRect(0,0,W,H);
      c.globalAlpha=0.13;
      c.font='900 640px "Noto Sans KR", sans-serif';
      c.fillText(D.rankAnimal.e, W*0.72, H*0.30);
      c.restore();
      c.textBaseline='alphabetic';
    }

    const PAD=90;
    const accentSoft=`hsl(${h}, 70%, 72%)`;
    const white='#ffffff';
    const dim='rgba(255,255,255,0.62)';
    const dim2='rgba(255,255,255,0.40)';

    // ---- 상단 브랜드 ----
    c.textAlign='left'; c.textBaseline='alphabetic';
    c.font='400 42px "Black Han Sans", "Noto Sans KR", sans-serif';
    c.fillStyle=white;
    c.fillText('오운완', PAD, 150);
    c.font='500 26px "Noto Sans KR", sans-serif';
    c.fillStyle=dim;
    c.fillText('우리들의 운동 기록', PAD+165, 150);
    c.textAlign='right';
    c.font='700 30px "Archivo", "DM Mono", monospace';
    c.fillStyle=accentSoft;
    c.fillText(`${D.year}`, W-PAD, 150);

    // ---- 아바타 원형 + 이름 ----
    const avX=W/2, avY=360, avR=105;
    c.beginPath(); c.arc(avX,avY,avR+10,0,Math.PI*2);
    c.strokeStyle=`hsla(${h},80%,65%,0.55)`; c.lineWidth=6; c.stroke();
    const avg=c.createLinearGradient(avX-avR,avY-avR,avX+avR,avY+avR);
    avg.addColorStop(0,`hsl(${h},65%,58%)`);
    avg.addColorStop(1,`hsl(${(h+25)%360},60%,48%)`);
    c.beginPath(); c.arc(avX,avY,avR,0,Math.PI*2); c.fillStyle=avg; c.fill();
    c.textAlign='center'; c.textBaseline='middle';
    c.font='900 96px "Noto Sans KR", sans-serif'; c.fillStyle=white;
    c.fillText(initial(D.name), avX, avY+4);

    // 이름 + 레벨 칭호
    c.textBaseline='alphabetic';
    c.font='400 82px "Black Han Sans", "Noto Sans KR", sans-serif'; c.fillStyle=white;
    c.fillText(D.name, avX, avY+avR+112);
    c.font='700 30px "Noto Sans KR", sans-serif'; c.fillStyle=accentSoft;
    c.fillText(`${D.lvEmoji} ${D.lvTitle}${D.rankAnimal?`   |   ${D.rankAnimal.e} ${D.rankAnimal.short} · ${D.rankAnimal.rank}위`:''}`, avX, avY+avR+162);
    c.font='500 27px "Noto Sans KR", sans-serif'; c.fillStyle=dim;
    c.fillText(`최애 운동 · ${D.favSport}   |   가장 부지런한 ${D.bestWd}요일`, avX, avY+avR+206);

    // ---- 히어로 스탯: 올해 누적 (대형) ----
    let y=780;
    c.textAlign='center';
    c.font='600 30px "Noto Sans KR", sans-serif'; c.fillStyle=dim;
    c.fillText(`${D.year}년 누적 운동`, avX, y);
    c.font='900 168px "Archivo", "DM Mono", monospace'; c.fillStyle=white;
    c.fillText(String(D.cumulYear), avX, y+150);
    c.font='700 44px "Noto Sans KR", sans-serif'; c.fillStyle=accentSoft;
    c.fillText('일', avX + measureW(c,String(D.cumulYear),'900 168px "Archivo", "DM Mono", monospace')/2 + 44, y+150);
    c.font='600 34px "Noto Sans KR", sans-serif'; c.fillStyle=dim;
    if(D.target>0){
      c.fillText(`목표 ${D.target}일 중 ${D.rate.toFixed(0)}% 달성`, avX, y+215);
    }
    c.font='500 28px "Noto Sans KR", sans-serif'; c.fillStyle=accentSoft;
    c.fillText(`오운완과 함께한 지 ${D.monthsTogether}개월째`, avX, y+270);

    // ---- 2×2 스탯 그리드 ----
    y=1100;
    const gap=26, cardW=(W-PAD*2-gap)/2, cardH=160;
    const stats=[
      {label:'현재 연속', val:D.curStreak, unit:'일', tag:D.curStreak>0?'진행중 🔥':'휴식중'},
      {label:'최장 연속', val:D.longestStreak, unit:'일', tag:'기록'},
      {label:'25.01~ 누적', val:D.totalAll, unit:'회', tag:D.legacyCount?`+이전 ${D.legacyCount}회`:'누적'},
      {label:'종목 장인', val:D.masteryCount, unit:'개', tag:'1위 종목'},
    ];
    stats.forEach((s,i)=>{
      const col=i%2, row=Math.floor(i/2);
      const x=PAD+col*(cardW+gap), yy=y+row*(cardH+gap);
      c.save();
      roundRect(c,x,yy,cardW,cardH,28);
      c.fillStyle='rgba(255,255,255,0.07)'; c.fill();
      c.strokeStyle='rgba(255,255,255,0.13)'; c.lineWidth=1.5; c.stroke();
      c.restore();
      c.textAlign='left';
      c.font='600 27px "Noto Sans KR", sans-serif'; c.fillStyle=dim;
      c.fillText(s.label, x+34, yy+50);
      c.font='900 74px "Archivo", "DM Mono", monospace'; c.fillStyle=white;
      c.fillText(String(s.val), x+34, yy+122);
      const numW=measureW(c,String(s.val),'900 74px "Archivo", "DM Mono", monospace');
      c.font='700 30px "Noto Sans KR", sans-serif'; c.fillStyle=accentSoft;
      c.fillText(s.unit, x+34+numW+10, yy+122);
      c.textAlign='right';
      c.font='600 24px "Noto Sans KR", sans-serif'; c.fillStyle=dim2;
      c.fillText(s.tag, x+cardW-30, yy+50);
    });

    // ---- 종목 구성 도넛 (네이티브) + 범례 ----
    y=1470;
    const donutCX=PAD+150, donutCY=y+130, donutR=120, donutInner=72;
    const total=D.sportTop.reduce((a,[,v])=>a+v,0)||1;
    const donutColors=D.sportTop.map((_,i)=>`hsl(${(h + i*47)%360}, 62%, ${60- i*3}%)`);
    let ang=-Math.PI/2;
    D.sportTop.forEach(([sp,v],i)=>{
      const slice=v/total*Math.PI*2;
      c.beginPath();
      c.moveTo(donutCX,donutCY);
      c.arc(donutCX,donutCY,donutR,ang,ang+slice);
      c.closePath();
      c.fillStyle=donutColors[i]; c.fill();
      ang+=slice;
    });
    c.beginPath(); c.arc(donutCX,donutCY,donutInner,0,Math.PI*2);
    c.fillStyle=`hsl(${(h+18)%360}, 40%, 11%)`; c.fill();
    c.textAlign='center'; c.textBaseline='middle';
    c.font='800 30px "Archivo", "DM Mono", monospace'; c.fillStyle=white;
    c.fillText(String(D.sportTop.length), donutCX, donutCY-8);
    c.font='500 18px "Noto Sans KR", sans-serif'; c.fillStyle=dim;
    c.fillText('종목', donutCX, donutCY+20);
    c.textBaseline='alphabetic';

    // 범례
    c.textAlign='left';
    const legX=donutCX+180, legY0=y+40;
    D.sportTop.forEach(([sp,v],i)=>{
      const ly=legY0+i*46;
      roundRect(c,legX,ly-20,26,26,7); c.fillStyle=donutColors[i]; c.fill();
      c.font='700 30px "Noto Sans KR", sans-serif'; c.fillStyle=white;
      c.fillText(sp, legX+42, ly);
      c.font='500 28px "DM Mono", monospace'; c.fillStyle=dim;
      c.textAlign='right';
      c.fillText(`${v}회 · ${Math.round(v/total*100)}%`, W-PAD, ly);
      c.textAlign='left';
    });

    // ---- 페이스 신호등 배너 ----
    y=1740;
    const paceMap={
      green:{txt:'초록불 · 목표 페이스 유지 중', col:`hsl(145,60%,55%)`},
      amber:{txt:'노란불 · 조금만 더 힘내요', col:`hsl(42,90%,58%)`},
      red:{txt:'빨간불 · 다시 리듬 찾는 중', col:`hsl(350,75%,62%)`},
    };
    let paceTxt=(paceMap[D.paceLevel]||paceMap.green).txt;
    let paceCol=(paceMap[D.paceLevel]||paceMap.green).col;
    if(D.nx && !D.nx.unreachable){
      const to=D.nx.toColor==='green'?'초록불':'노란불';
      paceTxt += `  →  매일 하면 ${D.nx.need}일 뒤 ${to}`;
    }else if(D.nx && D.nx.unreachable){
      paceTxt += `  →  올해 도달은 어려워요`;
    }
    c.save();
    roundRect(c,PAD,y,W-PAD*2,90,24);
    c.fillStyle='rgba(255,255,255,0.08)'; c.fill();
    c.restore();
    c.beginPath(); c.arc(PAD+46,y+45,16,0,Math.PI*2); c.fillStyle=paceCol; c.fill();
    c.textAlign='left'; c.textBaseline='middle';
    c.font='700 30px "Noto Sans KR", sans-serif'; c.fillStyle=white;
    c.fillText(paceTxt, PAD+82, y+47);
    c.textBaseline='alphabetic';

    // ---- 푸터 ----
    c.textAlign='center';
    c.font='500 26px "Noto Sans KR", sans-serif'; c.fillStyle=dim2;
    const dateStr=`${NOW.getFullYear()}.${String(NOW.getMonth()+1).padStart(2,'0')}.${String(NOW.getDate()).padStart(2,'0')} 기준`;
    c.fillText(`#오운완  ·  ${dateStr}`, W/2, 1880);

    // ---- 다운로드 ----
    await new Promise(res=>{
      if(typeof URL==='undefined'||typeof URL.createObjectURL!=='function'){res();return;}
      cv.toBlob(blob=>{
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');
        a.href=url;
        a.download=`오운완_${D.name}_${D.year}.png`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(()=>URL.revokeObjectURL(url), 1000);
        res();
      }, 'image/png');
    });
  }catch(e){
    alert('이미지 생성 중 문제가 발생했어요: '+e.message);
  }finally{
    if(btn){ btn.disabled=false; btn.innerHTML='<span style="font-size:15px">📸</span> 스토리 이미지 저장'; }
  }
}
// 폰트 지정 후 텍스트 폭 측정 헬퍼 (원래 폰트 복원)
function measureW(c, text, font){
  const prev=c.font; c.font=font;
  const w=c.measureText(text).width; c.font=prev;
  return w;
}

