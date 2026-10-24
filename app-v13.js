/* Plotune v1.3 — piano-unison four-piece band with Zeta export.
   Works entirely inside Safari/Web Audio; no network calls or paid APIs. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const names={chip:'8bit・コミカル',pop:'ポップ',piano:'ピアノ風',horror:'ホラー',fantasy:'ファンタジー',ambient:'アンビエント',band:'3ピースバンド',bandpiano:'3ピース＋ピアノユニゾン',handheld:'DS風ゲームサウンド'};
const cueNames={practice:'練習・試行',stumble:'つまずき',recovery:'回復',success:'成功',danger:'危険',loss:'喪失',turn:'転換',anticipation:'期待',neutral:'変化なし'};
const roleNames={guitar:'ギター',bass:'ベース',drums:'ドラム',piano:'ピアノ',melody:'旋律',counter:'対旋律',chords:'コード',arp:'アルペジオ',pad:'パッド',sparkle:'装飾音'};
const fields=['title','character','world','scene','style','duration','engine','bandStyle','gameStyle'];
const composer=window.PlotuneComposerV4,band=window.PlotuneBand,bandPiano=window.PlotuneBandPiano,handheld=window.PlotuneHandheld,compareTools=window.PlotuneCompare,loopComposer=window.PlotuneLoop;
const renderer=plan=>plan.genre==='band'?band:plan.genre==='bandpiano'?bandPiano:plan.genre==='game'?handheld:composer;
const styleName=plan=>plan.genre==='bandpiano'?(bandPiano.STYLES[plan.bandStyle]||bandPiano.STYLES.indie).name+'＋ピアノユニゾン':plan.genre==='band'?(band.STYLES[plan.bandStyle]||band.STYLES.indie).name:plan.genre==='game'?(handheld.STYLES[plan.gameStyle]||handheld.STYLES.journey).name:names[plan.genre];
const form=()=>Object.fromEntries(fields.map(k=>[k,$(k).value]));
const textNode=(type,text,cls)=>{const n=document.createElement(type);n.textContent=String(text);if(cls)n.className=cls;return n;};
const status=(s,error=false)=>{$('status').textContent=s;$('status').classList.toggle('error',error);};
let ctx=null,node=null,transport=null,request=0,current=null,tracks=null,variant=0,events=[],selected=null;
const buffers=new WeakMap();
const zetaEncoder=window.PlotuneZetaExport;
let zetaBusy=false;
let zetaFileUrl=null;
function stop(silent=false){
 request++;
 if(node){const old=node;node=null;try{old.stop()}catch{}try{old.disconnect()}catch{}}
 transport=null;
 if(!silent)status('停止しました');
}
function clearComparison(){
 stop(true);tracks=null;events=[];selected=null;$('comparison').hidden=true;
 $('eventCompare').hidden=true;$('cueSelect').replaceChildren();
}
function bandPanel(){$('bandOptions').hidden=!['band','bandpiano'].includes($('style').value);$('gameOptions').hidden=$('style').value!=='handheld';}
function ready(){
 $('play').disabled=$('wav').disabled=!current;
 $('reroll').disabled=!current;
 $('zeta').disabled=!current||zetaBusy||!zetaEncoder.supported()||!zetaEncoder.checkTrack(current).ok;
 for(const id of ['classicPlay','resonarePlay'])$(id).disabled=!tracks;
 for(const id of ['classicClip','resonareClip'])$(id).disabled=!tracks||!selected;
 $('cueSelect').disabled=!tracks||!events.length;
}
function busy(yes){
 for(const id of ['make','compare','analyze','reroll'])$(id).disabled=yes;
 if(yes)for(const id of ['play','wav','zeta','classicPlay','resonarePlay','classicClip','resonareClip'])$(id).disabled=true;
}
function save(quiet=false){
 try{localStorage.setItem('plotune',JSON.stringify(form()));if(!quiet)status('設定を保存しました');}
 catch{if(!quiet)status('設定を保存できませんでした',true);}
}
function loadSaved(){
 try{
  const saved=JSON.parse(localStorage.getItem('plotune')||'{}');
  if(!Object.keys(saved).length){status('保存された設定はありません');return;}
  fields.forEach(k=>{if(saved[k]!=null)$(k).value=saved[k]});
  bandPanel();reset();status('保存した設定を読み込みました');
 }catch{status('保存した設定を読み込めませんでした',true);}
}
const gameSelect=$('gameStyle');
const existing=gameSelect.value;
gameSelect.replaceChildren();
const automatic=document.createElement('option');
automatic.value='auto';automatic.textContent='✨ シーンから自動選択';
gameSelect.append(automatic);
for(const group of handheld.GROUPS.filter(g=>!g.label.includes('物語を彩る楽器')&&!g.label.includes('オカリナ・シンセ'))){
 const section=document.createElement('optgroup');
 section.label=group.label;
 for(const id of group.ids){
  const option=document.createElement('option');
  option.value=id;option.textContent=handheld.STYLES[id].name;
  section.append(option);
 }
 gameSelect.append(section);
}
gameSelect.value=handheld.STYLES[existing]&&!handheld.STORY_INSTRUMENTS[existing]?existing:'auto';
bandPanel();
$('runtimeVersion').textContent='実行中：v2.4｜キャラクター音楽DNA';
if(typeof document.querySelector==='function'){
 const badge=document.querySelector('header h1 small');
 if(badge)badge.textContent='v2.4';
}
function addRow(parent,title,value){
 const el=document.createElement('div');el.className='report-row';
 el.append(textNode('span',title,'muted'),textNode('strong',value));parent.append(el);
}
function analyze(){
 const input=form(),old=PlotuneAnalysis.analyze(input);
 const original=PlotuneAnalysis.plan(input,old,variant);
 const appraisal=PlotuneResonare.analyze(input);
 let base=original,enhanced=PlotuneResonare.attachPlan(original,appraisal);
 // A/B opt-in: the baseline remains untouched; emotional rendition is
 // enabled only for the standard renderer, not the handheld/band engines.
 if($('emotionComposition')?.checked && !['handheld','band','bandpiano'].includes(input.style)){
   // Controlled Phase 1 comparison: identical plan and seed, no Resonare.
   enhanced={...original,emotionComposition:true};
 }

 if(['band','bandpiano'].includes(input.style)){
  const arrangementEngine=input.style==='bandpiano'?bandPiano:band;
  base=loopComposer.baseline(arrangementEngine.adaptPlan(original,input.bandStyle));
  enhanced=loopComposer.reactive(arrangementEngine.adaptPlan(enhanced,input.bandStyle),appraisal);
 }else if(input.style==='handheld'){
  // Both compositions share the character's motif, register, tempo and
  // synthesizer palette. Resonare selects a global arrangement from t=0.
  const storyContext=[input.character,input.world,input.scene].filter(Boolean).join('\n');
  const structure=window.PlotuneStoryStructure?.analyze(input);
  const expression=window.PlotuneMusicPsychology?.derive(structure,input.gameStyle);
  base={...handheld.prepare(original,input.gameStyle,appraisal,false,input.scene,storyContext),structure,expression};
  if($('phase3Comparison')?.checked){
   base={...base,motifDevelopment:true};
   enhanced={...base,musicDevelopment:true,musicHarmony:true,musicVoices:true,musicPerformance:true};
  }else enhanced=$('harmonyComparison')?.checked?
   {...base,musicHarmony:true}:
   {...handheld.prepare(original,input.gameStyle,appraisal,false,input.scene,storyContext),structure,expression,motifDevelopment:true};
 }
 const box=$('analysis');box.replaceChildren();
 box.append(textNode('h3','物語の解析結果'));
 const report=document.createElement('div');report.className='report';
 addRow(report,'曲調',styleName(base));
 addRow(report,'テンポ',base.bpm+' BPM');
 addRow(report,'目的の推定',appraisal.goal.label);
 addRow(report,'根拠',appraisal.goal.evidence.join('・')||'未特定');
 addRow(report,'出来事',appraisal.events.length+'件');
 if(['band','bandpiano','game'].includes(base.genre)){
   const whole=loopComposer.analyzeWhole(appraisal);
   addRow(report,'曲全体の編曲',whole.active?whole.label:'基準編曲を維持');
   addRow(report,'編曲の根拠',whole.reason);
   if(base.genre==='game'){
    addRow(report,'選択したBGM',styleName(base));
    if(base.gameAutoChoice)addRow(report,'自動選択の理由',base.gameAutoChoice.reason);
    if(base.emotionalArc){
      addRow(report,'感情の展開',base.emotionalArc.stages.map(s=>s.name).join(' → '));
      addRow(report,'感情曲線を使う理由',base.emotionalArc.reason);
    }
    if(base.instrumentChoice){
      addRow(report,'楽器編成',base.instrumentChoice.palette.role+' ＋ '+(base.instrumentChoice.palette.secondary||'伴奏')+' ＋ '+(base.instrumentChoice.palette.padTone||'パッド'));
      addRow(report,'楽器を選んだ理由',base.instrumentChoice.reason);
    }
   }
   box.append(textNode('p','ループBGMでは文章全体を先に分析し、冒頭から一貫した曲調で演奏します。携帯ゲーム風は主旋律・対旋律・コード・アルペジオ・ベース・ドラム・装飾音を別々に作曲します。','explain'));
 }
 box.append(report);
 box.append(textNode('h4','出来事に対する演奏指示'));
 for(const e of appraisal.events.slice(0,14)){
  const item=document.createElement('div');item.className='event';
  item.append(textNode('span','約'+Math.round(e.position*base.duration)+'秒：'+e.text,'event-text'));
  item.append(textNode('span',cueNames[e.cue]||'維持','event-cue'));
  box.append(item);
 }
 box.append(textNode('p','Resonare型は文章上の手がかりから推定しています。心理状態を確定するものではありません。','explain'));
 box.hidden=false;
 return {input,base,enhanced,appraisal};
}
function comparisonDisplay(){
 const drop=$('cueSelect');drop.replaceChildren();
 for(const e of events){
  const option=document.createElement('option');
  option.value=e.id;
  option.textContent=Math.round(e.window.center)+'秒 · '+e.label+' · '+e.detail.slice(0,28);
  drop.append(option);
 }
 if(selected)drop.value=selected.id;
 $('eventCompare').hidden=!selected;
 showSelection();
}
function showSelection(){
 if(!selected)return;
 const e=selected;
 $('clipPosition').textContent='約'+compareTools.formatSeconds(e.window.center)+
  'の出来事｜比較区間 '+compareTools.formatSeconds(e.window.start)+'〜'+compareTools.formatSeconds(e.window.end);
 $('changeDiagnosis').textContent=e.status+'。波形の差 '+Math.round(e.audio.relative*100)+
  '%、演奏イベントの差 '+e.scoreDelta+'件。※聴き取りやすさ・音楽の良さを判定するものではありません。';
 const box=$('trackDiff');box.replaceChildren();
 for(const [role,stat] of Object.entries(e.roles)){
  box.append(textNode('div',(roleNames[role]||role)+'：'+stat.base+' → '+stat.resonare+
    ' 音／打（差分 '+stat.changed+'件）','track-line'));
 }
}
async function generate(variation=false){
 if(!form().scene.trim()){status('シーンを入力してね',true);return;}
 if(variation)variant++;else variant=0;
 // Always prepare BOTH versions from the same input and seed. Previously
 // "自動作曲" quietly made only one track, hiding the A/B player.
 await compare();
}
function allWaveDiff(a,b){
 const duration=Math.min(a.score.duration,b.score.duration);
 return compareTools.signalDifference(a,b,0,duration).relative;
}
async function compare(){
 if(!form().scene.trim()){status('シーンを入力してね',true);return;}
 const phase1=$('emotionComposition')?.checked && !['handheld','band','bandpiano'].includes(form().style);
 const phase3=form().style==='handheld' && $('phase3Comparison')?.checked;
 const harmonyAB=!phase3 && form().style==='handheld' && $('harmonyComparison')?.checked;
 const phase2=form().style==='handheld' && !harmonyAB && !phase3;
 clearComparison();current=null;busy(true);status(phase3?'Phase 3 表現力 OFF/ONを作曲中…':harmonyAB?'M3 和声連動 OFF/ONを作曲中…':phase2?'フェーズ2 OFF/ONを作曲中…':phase1?'感情表現OFF/ONを作曲中…':'基準版とResonare版を作曲中…');
 await new Promise(resolve=>setTimeout(resolve,35));
 try{
  const a=analyze();
  $('classicPlay').textContent=phase3?'▶ Phase 3 OFF':harmonyAB?'▶ M3 和声OFF':phase2?'▶ フェーズ2 OFF':phase1?'▶ 感情表現OFF':'▶ 基準版';
  $('resonarePlay').textContent=phase3?'▶ Phase 3 ON':harmonyAB?'▶ M3 和声ON':phase2?'▶ フェーズ2 ON':phase1?'▶ 感情表現ON':'▶ Resonare版';
  const base=renderer(a.base).render(a.base);
  const enhanced=renderer(a.enhanced).render(a.enhanced);
  tracks={classic:base,resonare:enhanced};
  current=a.input.engine==='classic'?base:enhanced;
  events=compareTools.buildEvents(base,enhanced,a.appraisal);
  if(['band','bandpiano','game'].includes(a.base.genre)&&a.enhanced.loopArrangement){
   const total=Math.min(base.score.duration,enhanced.score.duration),intro={start:0,end:Math.min(10,total),center:0};
   const roles=compareTools.roleChanges(base,enhanced,intro.start,intro.end);
   const audio=compareTools.signalDifference(base,enhanced,intro.start,intro.end);
   events=[{id:'intro',label:'冒頭からの編曲',detail:a.enhanced.loopArrangement.reason,
     cue:'loop',window:intro,roles,audio,
     scoreDelta:Object.values(roles).reduce((n,v)=>n+v.changed,0),
     status:'物語全体を解析して開始0秒から編曲を変更（聴感は未判定）'},...events];
  }
  selected=events[0]||null;
  comparisonDisplay();
  const d=enhanced.details,ordinary=base.details;
  const global=a.enhanced.loopArrangement;
  const layers=d.genre==='game'?d.parts:null;
  const isUnison=d.genre==='bandpiano';
  const rests=d.rests||[],totalRests=rests.reduce((sum,r)=>sum+Math.max(0,r.end-r.start),0);
  const oldNotes=ordinary.melodyNotes??0,newNotes=d.melodyNotes??0;
  const duration=Math.min(base.score.duration,enhanced.score.duration);
  const roles=compareTools.roleChanges(base,enhanced,0,duration);
  const changedNotes=Object.values(roles).reduce((total,r)=>total+r.changed,0);
  const important=a.appraisal.events.filter(e=>['stumble','loss','danger','recovery','success','practice'].includes(e.cue));
  const hasPractice=a.appraisal.events.some(e=>e.cue==='practice');
  const active=a.appraisal.events.filter(e=>e.cue!=='neutral');
  const relative=allWaveDiff(base,enhanced);
  let diagnosis;
  if(phase1){
    diagnosis='同じ曲・同じシード・同じ編成で、感情表現の有無だけを変更しています。聴感上の改善は未判定です。';
  }else if(global){
    diagnosis='曲の冒頭0秒から編曲を変更：'+global.label+'。'+global.reason+
     '。ギター・ベース・ドラムとコード進行を曲全体で設計し直しました。ループ前提のBGMです。';
  }else if(active.length===0||changedNotes===0&&relative<.02){
    diagnosis='明確な編曲の手がかりがないため、基準版と同じループ編曲を維持しています。';
  }else if(!important.length){
    diagnosis='場面転換・期待のみを検出。練習や試行の記述がない場合、強い変化は作りません。';
  }else if(hasPractice&&!a.appraisal.events.some(e=>['stumble','loss','danger','recovery','success'].includes(e.cue))){
    diagnosis='練習・試行を検出。ギターの刻み、ベース、ドラムを段階的に変化させました。成功・失敗は推定していません。';
  }else if(changedNotes<8&&totalRests<.25){
    diagnosis='編曲の差が小さい状態です。明確な出来事は検出していますが、表現強度を再検証する必要があります。';
  }else{
    diagnosis='物語に対応した編曲差を生成しました。聴いて違いが感じられるかは別途評価が必要です。';
  }
  if(layers){
    diagnosis+=' 使用パート：主旋律 '+layers.lead+'音、対旋律 '+layers.counter+
      '音、コード '+layers.chords+'音、アルペジオ '+layers.arp+
      '音、ベース '+layers.bass+'音、ドラム '+layers.drums+
      '打、装飾音 '+layers.sparkle+'音。';
  }
  if(isUnison){
   diagnosis+=' ギター・ベース・ドラムにピアノを追加。'+
    d.pianoUnisonNotes+'音をギターのメロディーと同じ音程・タイミングで重ねます。';
  }
  $('contrastAssessment').textContent=diagnosis;
  $('comparisonInfo').textContent=(d.loopMode?'ループ '+d.loopBars+'小節・約'+d.bpm.toFixed(1)+' BPM。':'')+
    '同じキャラクターの主題から生成：和音の変化 '+d.shiftedChords+
    '小節内区間／休止 '+d.breaks+'回（'+totalRests.toFixed(1)+'秒）／旋律 '+oldNotes+
    '→'+newNotes+'音／演奏差分 '+changedNotes+'件／波形差 '+Math.round(relative*100)+
    '%。和音の変化は小節内の編曲単位で数えています。波形差だけでは聴感上の改善を証明できません。';
  if(window.PlotuneGenerationTrace&&a.base.genre==='game'){
    const logs=[['基準版',a.base,base],['Resonare版',a.enhanced,enhanced]].map(([label,plan,track])=>({label,...window.PlotuneGenerationTrace.trace(plan,track)}));
    $('generationTrace').textContent=logs.map(log=>log.label+'\n'+log.entries.map(e=>'['+e.id+'] '+(e.evidence?.join('、')||'')+' → '+e.rule+' → '+e.parameter+' → '+e.effect+' ('+e.kind+')').join('\n')+'\n実測: 主旋律 '+log.notes.lead+'音 / 平均跳躍 '+log.notes.meanLeap.toFixed(2)+'半音 / 音色 '+log.notes.timbres.join('、')).join('\n\n');
  }else $('generationTrace').textContent='DS風ゲームサウンドで利用できる生成判断ログです。';
  $('comparison').hidden=false;
  $('playerHint').textContent=global
    ? '0秒から編曲が違うよ。最初の10秒を「冒頭比較」ボタンで直接聴き比べてね。'
    : '物語の根拠が薄い場合は、基準版と同じループになります。';
  $('summary').textContent=(phase1?'2曲生成済み（感情表現OFF ＋ ON） · ':'2曲生成済み（基準版 ＋ Resonare版） · ')+styleName(a.base)+' · '+base.details.bpm.toFixed(1)+' BPM · '+base.score.duration+'秒'+
   (base.details.loopMode?' · 小節ぴったりのループ設計':'');
  save(true);
  status(global?'2曲完成！冒頭から異なるループ編曲で比較できます。':
    '2曲完成！根拠のない音楽の違いは作りません。');
 }catch(e){console.error(e);status('作曲エラー：'+(e?.message||String(e)),true);}
 finally{busy(false);ready();}
}
function playhead(){
 if(!transport||!ctx)return 0;
 const position=transport.start+Math.max(0,ctx.currentTime-transport.contextStart);
 return transport.loop ? position%transport.end : Math.min(transport.end,position);
}
function bufferFor(track){
 let buffer=buffers.get(track);
 if(!buffer){
  buffer=ctx.createBuffer(1,track.samples.length,track.sampleRate);
  buffer.copyToChannel(track.samples,0);buffers.set(track,buffer);
 }
 return buffer;
}
async function play(which=null,scope='full'){
 const track=which&&tracks?tracks[which]:current;
 if(!track){status('再生できる曲がありません。先に「2曲まとめて作曲」を押してね',true);return;}
  if(scope==='clip'&&!selected){status('比較する場面が未選択です。通常の再生を試してね',true);return;}
 const duration=Math.min(track.score?.duration||track.samples.length/track.sampleRate,
    track.samples.length/track.sampleRate);
 const part=scope==='clip'?selected.window:{start:0,end:duration};
 const targetKey=which||'single';
 // Switching A→B or B→A in the same mode preserves the absolute song position.
 const synced=!!(transport&&tracks&&transport.which!==targetKey&&transport.scope===scope&&
   (scope!=='clip'||transport.eventId===selected.id));
 const at=synced?playhead():part.start;
 const offset=Math.max(part.start,Math.min(part.end-.03,at));
 const looping=scope==='full'&&$('loopPlayback').checked;
 stop(true);const token=request;
 try{
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextClass)throw Error('WebAudio unsupported');
  ctx=ctx||new AudioContextClass();
  await ctx.resume();
  if(token!==request)return;
  const buffer=bufferFor(track),source=ctx.createBufferSource();
  source.buffer=buffer;source.connect(ctx.destination);
  node=source;transport={which:targetKey,scope,eventId:scope==='clip'?selected.id:null,
    start:offset,end:part.end,loop:looping,contextStart:ctx.currentTime};
  source.onended=()=>{if(source===node){node=null;transport=null;status('再生が終わりました');}};
  if(looping){
    source.loop=true;source.loopStart=0;source.loopEnd=part.end;
    source.start(0,offset);
  }else{
    source.start(0,offset,Math.max(.03,part.end-offset));
  }
  current=track;$('stop').disabled=false;
  status((synced?'同じ再生位置で切り替え：':'再生中：')+
    (which==='classic'?'基準版':which==='resonare'?'Resonare版':'曲')+
    ' · '+offset.toFixed(1)+'秒'+(scope==='clip'?'（冒頭／場面だけ）':looping?'（ループ再生）':'')+' 🎵');
 }catch(e){console.error(e);node=null;transport=null;status('再生エラー：'+(e?.message||String(e)),true);}
}
async function exportWav(){
 if(!current)return;
 const blob=composer.wavBlob(current.samples,current.sampleRate);
 const filename=((form().title||'plotune').replace(/[\\/:*?"<>|]/g,'_').slice(0,48)||'plotune')+'.wav';
 try{
  if(navigator.share&&typeof File!=='undefined'){
   const file=new File([blob],filename,{type:'audio/wav'});
   if(navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],title:filename});status('共有メニューを開きました');return;}
    catch(e){if(e.name==='AbortError'){status('保存をキャンセルしました');return;}}
   }
  }
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
  status('Safariのダウンロードを確認してね');
 }catch(e){console.error(e);status('WAV保存に失敗しました',true);}
}
async function exportForZeta(){
 if(zetaBusy)return;
 const fit=zetaEncoder.checkTrack(current);
 if(!fit.ok){status(fit.message,true);return;}
 if(!zetaEncoder.supported()){
  status('このSafariではM4A/AAC変換が使えません。WAVを保存してショートカットで音声をエンコードしてね。',true);
  return;
 }
 stop(true);
 if(zetaFileUrl){URL.revokeObjectURL(zetaFileUrl);zetaFileUrl=null;}
 $('zetaDownload').hidden=true;
 zetaBusy=true;ready();
 $('zeta').textContent='変換中… 0%';
 $('zetaProgress').hidden=false;
 $('zetaProgress').value=0;
 $('zetaHelp').textContent='M4Aを作っています。30秒の曲なら約31秒、60秒なら約61秒かかります。Safariを開いたまま待ってね。';
 try{
  const result=await zetaEncoder.encode(current,{
   onProgress:p=>{
    $('zetaProgress').value=p;
    $('zeta').textContent='変換中… '+p+'%';
   }
  });
  const title=zetaEncoder.filename(form().title||'ぽんぽんBGM',result.extension);
  let shared=false;
  if(typeof File!=='undefined'&&navigator.share&&navigator.canShare){
   const file=new File([result.blob],title,{type:result.blob.type});
   if(navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],title});shared=true}
    catch(e){if(e.name==='AbortError'){status('保存をキャンセルしました');return;}}
   }
  }
  zetaFileUrl=URL.createObjectURL(result.blob);
  const saved=$('zetaDownload');
  saved.href=zetaFileUrl;saved.download=title;saved.hidden=false;
  if(!shared)status('変換完了！下の「完成したZeta用ファイルを保存」を押してね。');

  $('zetaHelp').textContent='保存形式：'+result.extension.toUpperCase()+' ／ '+(result.blob.size/1048576).toFixed(2)+'MB ／ '+result.duration.toFixed(1)+'秒。Zetaのファイル選択画面からこの音声を選んでね。';
  status(shared?'共有メニューを開きました。保存用リンクも使えます。':'M4Aへの変換完了！「完成したZeta用ファイルを保存」を押してね。');
 }catch(e){
  console.error(e);status(e.message||'Zeta用の変換に失敗しました',true);
  $('zetaHelp').textContent='この端末で対応していなければWAV保存→ショートカットの「メディアをエンコード」でも変換できます。';
 }finally{
  zetaBusy=false;$('zeta').textContent='🎵 Zeta用M4A保存';
  $('zetaProgress').hidden=true;ready();
 }
}
$('save').addEventListener('click',()=>save());
$('loadSaved').addEventListener('click',loadSaved);
$('analyze').addEventListener('click',()=>{analyze();status('解析しました');});
$('make').addEventListener('click',()=>generate(false));
$('reroll').addEventListener('click',()=>generate(true));
$('compare').addEventListener('click',compare);
$('play').addEventListener('click',()=>play());
$('classicPlay').addEventListener('click',()=>play('classic'));
$('resonarePlay').addEventListener('click',()=>play('resonare'));
$('classicClip').addEventListener('click',()=>play('classic','clip'));
$('resonareClip').addEventListener('click',()=>play('resonare','clip'));
$('loopPlayback').addEventListener('change',()=>{
 status($('loopPlayback').checked?'次の再生からループするよ':'次の再生から1回だけ再生するよ');
});
$('cueSelect').addEventListener('change',()=>{
 stop(true);selected=events.find(e=>e.id===$('cueSelect').value)||events[0]||null;
 showSelection();ready();status('比較する出来事を切り替えました');
});
$('stop').addEventListener('click',()=>stop());
$('wav').addEventListener('click',exportWav);
$('zeta').addEventListener('click',exportForZeta);
function reset(){
 clearComparison();current=null;ready();$('summary').textContent='設定が変わりました。もう一度作曲してね';
}
$('engine').addEventListener('change',()=>{reset();analyze();status('解析方法を切り替えました');});
$('style').addEventListener('change',()=>{bandPanel();reset();status('曲調を切り替えました');});
$('bandStyle').addEventListener('change',()=>{reset();status('バンドのスタイルを切り替えました');});
$('gameStyle').addEventListener('change',()=>{reset();status('ゲームサウンドの編曲を切り替えました');});
if(!zetaEncoder.supported()){
 $('zetaHelp').textContent='このSafariで直接のM4A書き出しは使えません。WAV保存後、ショートカットでM4Aへ変換してね。';
}
})();
