/* Plotune Resonare-inspired appraisal model, v0.8.
 * This is an experimental ADAPTATION, not a verified copy of Resonare.
 * All inputs are explicit user-supplied text. No network calls or AI API.
 *
 * E_t: expected signed outcome [-1,+1], O_t: observed signed outcome.
 * Δφ_t = (π/2) |E_t − O_t|, R_t=(1+cos Δφ_t)/2 × (1−B_t).
 * Δψ_t = min(1, 0.65|O_t−O_{t−1}| + 0.22*action + 0.20*transition).
 * B_t is a text-evidenced blind spot, otherwise 0.
 * R is expectation fit, NOT joy/sadness; outcome valence stays separate.
 */
(function(root){
'use strict';
const limit=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
const GOALS=[
 {id:'recognition',label:'認められる・褒められる',re:/褒め|ほめ|認め|認めてもら|いい子|評価|自慢|得意げ|ほめて|すごいと言|褒美/g},
 {id:'mastery',label:'うまくできる・達成する',re:/できるよう|成功|上手|うまく|練習|れんしゅう|れん習|挑戦|ちょうせん|頑張|がんば|完璧|仕上げ|お手伝い|掃除|任せて|失敗したく/g},
 {id:'safety',label:'安全を確保する',re:/安全|守りた|危険|怖|逃げ|隠れ|怯|助か|生き延|警戒|用心/g},
 {id:'connection',label:'誰かと一緒にいる',re:/一緒|仲良|友達|家族|そばに|会いた|寂し|離れたく|つなが|帰って|抱きしめ/g},
 {id:'independence',label:'自分の力でやる',re:/ひとりで|自分で|手伝わないで|自立|自由|ひとりでも|任せて|自分だけ/g},
 {id:'exploration',label:'発見・探検する',re:/探検|冒険|発見|知りた|調べ|見つけ|未知|不思議|好奇心|行ってみ/g},
 {id:'possession',label:'手に入れる・守る',re:/欲し|ほしい|手に入れ|奪|独占|取られたく|渡さない|大事な物|お菓子|宝物/g},
 {id:'comfort',label:'安心・休息する',re:/眠りた|休みた|寝たい|静かに|落ち着|安心したい|ゆっくり|ぬくもり/g}
];
const POSITIVE=[
 [/成功|できた|やった|完成|うまくい|達成|上手にでき|抜けた|動いた|解決|間に合った|見つかった/g,0.85,'success'],
 [/褒め|ほめ|認め|喜ん|嬉し|うれし|笑顔|微笑|ほっと|安心|仲直り|助けられ|救われ|抱きしめ|あたたか/g,0.58,'connection'],
 [/見つけ|発見|探し当て|たどり着/g,0.48,'discovery']
];
const NEGATIVE=[
 [/失敗|転ん|転ぶ|転倒|こけ|引っかか|ぶつか|落ち|つまず|倒れ|抜けない|動かない|壊れ|割れ|間に合わな/g,-0.78,'setback'],
 [/拒否|叱|怒られ|嫌われ|無視され|置いていか|ひとりぼっち|離れ|別れ|泣|涙|悲し|寂し|失った/g,-0.70,'loss'],
 [/怪物|襲|殺|怪異|恐怖|危険|追い詰め|迫っ|おびえ|怯|こわい|怖い|震え|暗闇|悲鳴/g,-0.62,'danger']
];
const EXPECT_SUCCESS=/つもり|しようと|したかった|やろう|できるはず|うまくいく|成功するはず|褒めてもら|認めてもら|必ず|きっと|期待|得意げ|自信満々/;
const EXPECT_FAILURE=/失敗するはず|無理だと思|どうせできない|絶対に無理|失敗すると思/;
const TRANSITION=/しかし|ところが|けれど|なのに|だが|でも|突然|そのとき|その時|次の瞬間|すると|一転|ふいに/;
const BLIND_SPOT=/気づかな|気付かな|知らなかった|勘違い|思い込|見えていな|見落とし|気づいていない/;
const ACTION=/走|転|飛|跳|ぶつか|落ち|倒|掴|つか|逃げ|叩|投げ|踏|叫|戦|急|登|駆け|追い|伸ばし|抜け|引っかか|練習|れんしゅう|挑戦|ちょうせん|もう一度|もういっかい|やり直|繰り返し/;
const PRACTICE=/練習|れんしゅう|れん習|特訓|れんしゅー|おけいこ|稽古|繰り返し|もう一度|もういっかい|再挑戦|挑戦|ちょうせん|やり直し|やりなおし|試してみ|頑張って|がんばって/;
const CONJUNCTION_ONLY=/^(?:でも|けど|しかし|ところが|けれど|それでも|だけど|だが|なのに|一方で|すると|そのとき|その時|突然|次の瞬間|ふいに)[、，。！？!?\s]*$/;
const NEGATION=/^(?:ない|なかった|ません|ず|ぬ|なく|ことはない|わけではない|なくて)/;
function matchScore(text, list){
 let sum=0, evidence=[],kind='neutral';
 for(const [re,weight,type] of list){
  re.lastIndex=0;let m;
  while((m=re.exec(text))!==null){
   const tail=text.slice(m.index+m[0].length,m.index+m[0].length+9);
   if(NEGATION.test(tail))continue;
   // A wish or plan is an expectation, not an observed outcome.
   const forward=text.slice(m.index,m.index+24);
   if(weight>0 && /(?:褒め|ほめ|認め)(?:て)?(?:もらおう|もらいたい|てほしい|られたい|られれば)/.test(forward))continue;
   if(weight>0 && /^(?:成功(?:したい|するつもり|するはず)|達成したい|できたら|うまくいくはず)/.test(forward))continue;
   if(weight<0 && /^(?:失敗したくない|失敗するはず|転ばないよう|落ちないよう)/.test(forward))continue;
   sum+=weight;
   if(evidence.length<5)evidence.push(m[0]);
   kind=type;
  }
 }
 return {sum,evidence,kind};
}
function chooseGoal(character,world,scene){
 const scores=GOALS.map(g=>{
  function count(source){g.re.lastIndex=0;return [...source.matchAll(g.re)].length;}
  const fromProfile=count(character),fromWorld=count(world),fromScene=count(scene);
  const explicitWishes=[
   {id:'recognition',re:/褒められたい|褒めてもらいたい|認められたい|認めてもらいたい|認めてほしい/},
   {id:'connection',re:/一緒にいたい|離れたくない|そばにいたい/},
   {id:'safety',re:/安全でいたい|怖いから逃げたい|守りたい/},
   {id:'mastery',re:/上手になりたい|できるようになりたい|成功したい/}
  ];
  const explicit=explicitWishes.some(w=>w.id===g.id&&w.re.test(character))?5:0;
  return {...g,score:fromProfile*3+fromScene*.45+fromWorld*.15+explicit*1.3,fromProfile,fromScene};
 }).sort((a,b)=>b.score-a.score);
 const top=scores[0];
 if(!top||top.score<=0)return {id:'unknown',label:'未特定',evidence:[],confidence:'low',weight:0};
 const witnesses=[];
 top.re.lastIndex=0;
 for(const s of [character,scene]){const words=[...s.matchAll(top.re)].slice(0,3).map(m=>m[0]);for(const w of words)if(!witnesses.includes(w))witnesses.push(w);}
 return {id:top.id,label:top.label,evidence:witnesses.slice(0,5),confidence:top.fromProfile?'medium':'low',weight:limit(top.score/8)};
}
function splitEvents(scene){
 const clean=String(scene||'').replace(/\*/g,'').replace(/[\r\n]+/g,'。').trim();
 // Isolated conjunctions ("でも、") are grammatical links, not events.
 // Bind them to the following action before event-level scoring. A dangling
 // conjunction at the very end supplies no observed event and is dropped.
 const raw=clean.split(/(?<=[。！？!?])|(?<=[、，])/u).map(s=>s.trim()).filter(s=>s.replace(/[。！？!?、，]/g,'').trim());
 const parts=[];let lead='';
 for(const part of raw){
   if(CONJUNCTION_ONLY.test(part)){lead+=part;continue;}
   const combined=lead+part;lead='';
   parts.push(combined);
 }
 if(parts.length>32){
  const buckets=Array.from({length:32},()=>[]);
  parts.forEach((p,i)=>buckets[Math.min(31,Math.floor(i*32/parts.length))].push(p));
  return buckets.map(items=>items.join(''));
 }
 return parts;
}
function evaluateEvent(text, goal){
 const good=matchScore(text,POSITIVE),bad=matchScore(text,NEGATIVE);
 let outcome=limit((good.sum+bad.sum),-1,1);
 let tone=bad.sum<good.sum?'setback':'neutral';
 if(good.sum>Math.abs(bad.sum)+.08)tone=good.kind;
 if(bad.sum<-good.sum-.08)tone=bad.kind;
 // A success matters more if it serves an explicit goal.
 if(goal.id==='recognition'&&/褒め|ほめ|認め/.test(text))outcome=limit(outcome+.26,-1,1);
 if(goal.id==='mastery'&&/できた|成功|動いた|抜けた/.test(text))outcome=limit(outcome+.21,-1,1);
 if(goal.id==='safety'&&/助か|逃げ切|安全/.test(text))outcome=limit(outcome+.22,-1,1);
 const action=ACTION.test(text)?1:0;
 const practice= PRACTICE.test(text)&&!/練習しない|練習をしない|練習しなかった|練習をやめ|挑戦しない|挑戦しなかった|れんしゅうしない/.test(text)?1:0;
 const transition=TRANSITION.test(text)?1:0;
 const blindSpot=BLIND_SPOT.test(text)?0.30:0;
 const statedExpectation=EXPECT_FAILURE.test(text)?-.75:EXPECT_SUCCESS.test(text)?.78:null;
 const evidence=[...new Set([...good.evidence,...bad.evidence])].slice(0,5);
 const actionEvidence=practice?(text.match(PRACTICE)||[]).slice(0,1):[];
 // A practice keyword is evidence of an ACTION but never of success.
 const confidence=evidence.length||actionEvidence.length?'medium':'low';
 return {text,outcome,tone,action,practice,transition,blindSpot,statedExpectation,evidence,actionEvidence,confidence};
}
function cueFor(event,previous,goal){
 if(event.tone==='danger')return 'danger';
 if(event.outcome<-.26){
  if(event.tone==='setback' && goal.id!=='safety')return 'stumble';
  return 'loss';
 }
 if(event.outcome>.26){
  if(previous&&previous.outcome<-.26)return 'recovery';
  return 'success';
 }
 if(event.practice)return 'practice';
 if(event.transition)return 'turn';
 if(event.statedExpectation!==null)return 'anticipation';
 return 'neutral';
}
function analyze(input){
 const profile=String(input.character||''),world=String(input.world||''),scene=String(input.scene||'');
 const goal=chooseGoal(profile,world,scene);
 const chunks=splitEvents(scene);
 const events=[];
 let expectation=goal.id==='unknown'?0:.55,prev=0;
 chunks.forEach((chunk,index)=>{
  const e=evaluateEvent(chunk,goal);
  const expected=e.statedExpectation===null?expectation:e.statedExpectation;
  const deltaPhi=Math.PI/2*Math.abs(expected-e.outcome);
  const resonance=limit((1+Math.cos(deltaPhi))/2*(1-e.blindSpot));
  const deltaPsi=limit(.65*Math.abs(e.outcome-prev)+.22*e.action+.20*e.transition+.09*e.practice);
  const surprise=limit(1-resonance);
  const tension=limit(.12+.44*surprise+.36*deltaPsi+(e.tone==='danger'?.15:0));
  // Ignore neutral filler between a setback and the eventual recovery.
  const prevEvent=events.slice().reverse().find(p=>p.evidence.length&&Math.abs(p.outcome)>.26);
  const cue=cueFor(e,prevEvent,goal);
  events.push({...e,index,expectation:expected,deltaPhi,deltaPsi,resonance,
    surprise,tension,cue,position:chunks.length<=1?.5:(index+.5)/chunks.length});
  // State updates follow *observed* evidence; neutral / expectation-only text
  // should not fabricate a success.
  if(e.evidence.length && Math.abs(e.outcome)>.18){
    prev=e.outcome;expectation=limit(.55*expectation+.45*e.outcome,-1,1);
  }
 });
 const mean=(key)=>events.length?events.reduce((acc,e)=>acc+e[key],0)/events.length:0;
 const peak=events.reduce((acc,e)=>e.tension>acc.tension?e:acc,{tension:0,cue:'neutral',index:-1});
 const recoveries=events.filter(e=>e.cue==='recovery').length;
 const avg=mean('tension');
 const curve=Array.from({length:8},(_,i)=>{
  if(!events.length)return .30;
  const from=i/8,to=(i+1)/8,within=events.filter(e=>e.position>=from&&e.position<to);
  const nearest=events[Math.min(events.length-1,Math.floor((i+.5)/8*events.length))];
  return limit((within.length?within.reduce((s,e)=>s+e.tension,0)/within.length:nearest.tension),.1,.98);
 });
 return {version:'experimental-1',goal,events,curve,meanTension:avg,peak,
   recoveries,uncertainty:goal.id==='unknown'||!events.some(e=>e.evidence.length),
   summary:{eventCount:events.length,recoveryCount:recoveries,meanFit:mean('resonance'),meanChange:mean('deltaPsi')},
   disclaimer:'Resonare着想の実験式。心理状態は確定せず、文章上の手がかりのみで推定。'};
}
function attachPlan(plan,appraisal){
 const sections=plan.sections.map((s,i)=>({...s,intensity:limit(.47*s.intensity+.53*appraisal.curve[Math.min(7,i*2+1)],.12,.98)}));
 return {...plan,sections,resonare:{
  events:appraisal.events.map(e=>({position:e.position,tension:e.tension,
    surprise:e.surprise,deltaPsi:e.deltaPsi,cue:e.cue,practice:e.practice,outcome:e.outcome,
    confidence:e.confidence,text:e.text})),
  goal:appraisal.goal,uncertainty:appraisal.uncertainty
 }};
}
root.PlotuneResonare={analyze,attachPlan,splitEvents,chooseGoal,evaluateEvent};
})(window);
