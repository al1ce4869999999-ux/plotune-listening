/* M2: deterministic emotion-aware phrase candidate selection. Opt-in planner, no renderer mutation. */
(function(root){'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function hash(s){let h=2166136261;for(const c of String(s)){h=Math.imul(h^c.charCodeAt(0),16777619)}return h>>>0}
function random(seed){let n=(seed>>>0)||1;return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return(n>>>0)/4294967296}}
function profile(emotion={}){
 const tension=clamp(Number(emotion.tension)||0,0,1),energy=clamp(Number(emotion.energy)||0,0,1);
 const tenderness=clamp(Number(emotion.tenderness)||0,0,1);
 return {tension,energy,tenderness};
}
function evaluate(events,emotion){
 const p=profile(emotion),notes=events.filter(e=>!e.rest);
 if(!notes.length)return -Infinity;
 const leaps=notes.slice(1).map((e,i)=>Math.abs(e.degree-notes[i].degree));
 const meanLeap=leaps.length?leaps.reduce((a,b)=>a+b,0)/leaps.length:0;
 const rests=events.filter(e=>e.rest).length/events.length;
 const duration=notes.reduce((a,e)=>a+e.durationUnits,0)/notes.length;
 const ending=notes[notes.length-1];
 const resolved=[0,2,4].includes(ending.degree%7);
 const targetLeap=.55+p.tension*2.4+p.energy*.65-p.tenderness*.35;
 const targetRests=clamp(.1+p.tenderness*.23-p.energy*.09,0,.5);
 const targetDuration=1.2+p.tenderness*1.4-p.energy*.55;
 return -Math.abs(meanLeap-targetLeap)*1.6-Math.abs(rests-targetRests)*4-Math.abs(duration-targetDuration)*.35
   +(p.tension>.6?!resolved:resolved)*.9;
}
function candidate(source,emotion,seed,index){
 const p=profile(emotion),r=random(hash(seed+'|'+index)),out=source.map(e=>({...e}));
 for(let i=0;i<out.length;i++){
  const e=out[i],isLast=i===out.length-1;
  if(!isLast&&i>0&&r()<.12+p.tenderness*.16)e.rest=true;
  if(!isLast&&r()<.2+p.tension*.35){
   e.degree=clamp(e.degree+(r()<.5?-1:1)*(p.tension>.6?2:1),0,8);
  }
  e.durationUnits=+clamp(e.durationUnits*(.8+r()*.4+p.tenderness*.2-p.energy*.14),.25,16-e.position).toFixed(3);
 }
 const last=out[out.length-1];
 if(last){last.rest=false;last.degree=p.tension>.65?clamp(last.degree+1,1,8):[0,2,4].reduce((a,b)=>Math.abs(a-last.degree)<=Math.abs(b-last.degree)?a:b);last.cadence=p.tension<=.65;}
 if(!out.some(e=>!e.rest))out[0].rest=false;
 return out;
}
function selectPhrase(source,emotion={},options={}){
 if(!Array.isArray(source)||!source.length)throw new TypeError('source events required');
 if(!source.every(e=>Number.isFinite(e.position)&&Number.isFinite(e.durationUnits)&&Number.isInteger(e.degree)&&e.degree>=0&&e.degree<=8&&e.durationUnits>0&&e.position>=0&&e.position+e.durationUnits<=16.001))throw new RangeError('invalid phrase events');
 const seed=options.seed??1,count=clamp(Math.floor(options.candidates??6),1,32);
 const choices=Array.from({length:count},(_,i)=>{const events=candidate(source,emotion,seed,i);return {events,score:evaluate(events,emotion),index:i}});
 choices.sort((a,b)=>b.score-a.score||a.index-b.index);
 return {events:choices[0].events,score:choices[0].score,candidateIndex:choices[0].index,candidateScores:choices.map(c=>({index:c.index,score:c.score}))};
}
root.PlotuneM2Phrase={profile,evaluate,selectPhrase};
})(window);
