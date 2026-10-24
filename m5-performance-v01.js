/* M5: deterministic performance expression on the final playable score.
 * Opt-in, independent of sound presets, never alters source objects. */
(function(root){'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function random(seed){let x=(seed>>>0)||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
const sustained=new Set(['flute','ocarina','strings','synthpad','synthlead']);
const struck=new Set(['musicbox','bell','kalimba','harp','marimba','celesta','softpiano']);
function express({notes,duration,meter,seed=1,wholeTrackArc=[],leadTone='bright',secondaryTone=null}={}){
 if(!Array.isArray(notes)||!Number.isFinite(duration)||duration<=0||!Number.isFinite(meter)||meter<=0)
  throw new TypeError('M5 requires score notes and valid timing');
 const rand=random((seed^0x5a31c9f1)>>>0);
 const parts=notes.map(n=>({...n}));
 const byVoice=new Map();
 for(const n of parts){if(!byVoice.has(n.voice))byVoice.set(n.voice,[]);byVoice.get(n.voice).push(n);}
 let breaths=0,ornaments=0,rubato=0,dynamics=0;
 for(const [voice,group] of byVoice){
  group.sort((a,b)=>a.t-b.t||a.midi-b.midi);
  if(!['lead','counter','chords','pad','arp','bass','sparkle'].includes(voice))continue;
  for(let i=0;i<group.length;i++){
   const n=group[i];if(!(n.d>0&&n.volume>0))continue;
   const bar=Math.max(0,Math.floor(n.t/meter));
   const stage=wholeTrackArc[bar]?.stage||'development';
   const tone=n.timbre||(voice==='lead'?leadTone:voice==='counter'?secondaryTone:null);
   const wind=tone==='flute'||tone==='ocarina';
   const longTone=sustained.has(tone)||voice==='pad';
   const percussive=struck.has(tone)||voice==='arp'||voice==='sparkle';
   const point=(n.t%meter)/meter;
   const shape=stage==='climax'?1.18:stage==='resolution'?.72:stage==='opening'?.82:1;
   const arch=.88+.18*Math.sin(Math.PI*point);
   const accent=(point<.07?1.08:point>.82?.85:1);
   const human=(rand()-.5)*.10;
   n.volume=clamp(n.volume*shape*arch*accent*(1+human),.001,.95);dynamics++;
   if(voice==='lead'||voice==='counter'){
    // Timing movement is small, phrase-local and must not shift the whole song.
    const timeJitter=(rand()-.5)*Math.min(.045,meter*.012);
    const forward=point>.74?Math.min(.045,meter*.012):point<.15?-.012:0;
    const shift=clamp(timeJitter+forward,-.06,.06);
    n.t=clamp(n.t+shift,0,Math.max(0,duration-.045));rubato++;
    if(wind){
     // Leave a short breath after phrase endings. Struck instruments never breathe.
     const phraseEnd=point>.70||i===group.length-1;
     if(phraseEnd){n.d=Math.max(.06,n.d-Math.min(.10,n.d*.15));breaths++;}
    }else if(percussive){n.d=Math.max(.045,n.d*.96);}
    else if(longTone){n.d=Math.max(.06,n.d*.99);}
    // Grace-note ornament only where spacing and register allow it.
    const next=group[i+1],room=next?next.t-(n.t+n.d):Infinity;
    const canGrace=stage!=='opening'&&i>0&&n.d>.22&&
      room>.025&&Math.abs(n.midi-group[i-1].midi)<=7&&rand()<.17;
    if(canGrace&&n.midi>=49&&n.midi<=82){
      const pitch=n.midi+(rand()<.5?-1:1);
      const grace=.065;
      const start=Math.max(0,n.t-.075);
      if(start+grace<=n.t){
       parts.push({...n,t:start,d:grace,midi:pitch,volume:n.volume*.52,ornament:true});ornaments++;
      }
    }
   }
   n.d=clamp(n.d,.04,Math.max(.04,duration-n.t));
  }
 }
 // Keep ornaments before principals. All events remain in the finite score.
 parts.sort((a,b)=>a.t-b.t||Number(!!a.ornament)-Number(!!b.ornament)||a.midi-b.midi);
 return {notes:parts,details:{dynamics,breaths,rubato,ornaments}};
}
root.PlotuneM5Performance={express};
})(window);
