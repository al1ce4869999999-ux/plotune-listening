/* Plotune v0.9: compose a reusable loop from the WHOLE narrative.
 * One appraisal -> one consistent guitar/bass/drum arrangement, starting at 0s.
 * Cues are input evidence, NOT instructions to wait for that event's timestamp.
 * No API, inference service, sample downloads, or background work.
 */
(function(root){
'use strict';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const PRESETS={
 effort:{label:'挑戦を続ける',progression:[5,3,0,4],guitar:'driving',bass:'walking',drums:'driving',voicing:'power',intensity:1.11,reason:'練習・挑戦を曲全体の推進力にする'},
 playful:{label:'ドタバタ・軽快',progression:[3,4,0,5],guitar:'offbeat',bass:'bounce',drums:'syncopated',voicing:'open',intensity:.96,reason:'失敗やつまずきを跳ねるリズムにする'},
 tense:{label:'緊張・警戒',progression:[5,1,4,5],guitar:'sparse',bass:'pedal',drums:'halftime',voicing:'power',intensity:.77,reason:'危険や緊張を抑制された編成で支える'},
 wistful:{label:'寂しさ・余韻',progression:[5,3,1,4],guitar:'arpeggio',bass:'sustain',drums:'soft',voicing:'open',intensity:.76,reason:'喪失や悲しさを長い音と余白で表す'},
 bright:{label:'前進・達成',progression:[0,4,5,3],guitar:'anthem',bass:'running',drums:'anthem',voicing:'open',intensity:1.16,reason:'成功や回復を前向きなハーモニーにする'},
 curious:{label:'期待・展開',progression:[3,4,0,4],guitar:'offbeat',bass:'bounce',drums:'syncopated',voicing:'open',intensity:.94,reason:'発見や予感を軽いシンコペーションにする'}
};
const WEIGHTS={practice:2.8,stumble:2.9,loss:3.0,danger:3.6,recovery:3.0,success:2.7,
 turn:.8,anticipation:1.15};
function analyzeWhole(appraisal){
 const tally={practice:0,stumble:0,loss:0,danger:0,recovery:0,success:0,turn:0,anticipation:0};
 const evidence=[];
 for(const event of appraisal?.events||[]){
  if(!Object.prototype.hasOwnProperty.call(WEIGHTS,event.cue))continue;
  // Explicit lexical evidence has higher weight than a bare conjunction.
  const grounded=(event.evidence?.length||event.actionEvidence?.length||0)>0;
  const strength=clamp(.75+.22*(Number(event.deltaPsi)||0)+.16*(Number(event.tension)||0),.65,1.25);
  const weight=WEIGHTS[event.cue]*strength*(grounded?1: .62);
  tally[event.cue]+=weight;
  evidence.push({cue:event.cue,excerpt:String(event.text||'').slice(0,68),weight});
 }
 const motives={
  effort:tally.practice*1.24+tally.recovery*.25+tally.stumble*.10,
  playful:tally.stumble*1.25+tally.turn*.2,
  tense:tally.danger*1.5+tally.turn*.18,
  wistful:tally.loss*1.4,
  bright:tally.success*1.18+tally.recovery*1.2,
  curious:tally.anticipation*.95+tally.turn*.68
 };
 const ranked=Object.keys(motives).sort((a,b)=>motives[b]-motives[a]);
 const dominant=ranked[0],score=motives[dominant];
 // A transition alone can inform a song, but "no observed event" must
 // never be mistaken for a known goal, mood or outcome.
 if(!score||score<.44)return {active:false,preset:null,
  label:'明確な編曲手がかりなし',reason:'文章に裏付けがないため基準アレンジを維持',evidence:[],tally,motives};
 const p=PRESETS[dominant];
 return {active:true,preset:dominant,label:p.label,reason:p.reason,
  evidence:evidence.sort((a,b)=>b.weight-a.weight).slice(0,8),tally,motives,
  ...p,dominance:clamp(score/(score+(motives[ranked[1]]||0)+1),.25,1)};
}
function baseline(plan){
 return {...plan,loopMode:true,loopArrangement:null};
}
function reactive(plan,appraisal){
 const concept=analyzeWhole(appraisal);
 return {...plan,loopMode:true,loopArrangement:concept.active?concept:null};
}
root.PlotuneLoop={PRESETS,analyzeWhole,baseline,reactive};
})(window);
