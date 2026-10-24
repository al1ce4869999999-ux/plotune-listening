/* M7.2: isolated four-condition listening panel; legacy two-track UI remains intact. */
(function(root){'use strict';
const IDS=['baseline','phase','m','phase-m'];
const LABELS={baseline:'Baseline',phase:'Phase',m:'M', 'phase-m':'Phase + M'};
function peak(samples){let p=0;for(const x of samples)p=Math.max(p,Math.abs(x));return p;}
function gainFor(track,reference=0.18){
 const samples=track.samples;if(!samples?.length)throw new TypeError('empty track');
 let sum=0;for(const x of samples){if(!Number.isFinite(x))throw new RangeError('non-finite audio');sum+=x*x;}
 const rms=Math.sqrt(sum/samples.length);if(rms<1e-7)throw new RangeError('silent track');
 return Math.min(1,reference/rms,0.95/Math.max(peak(samples),1e-8));
}
function validate(result){
 if(result?.tracks?.length!==4)throw new TypeError('four tracks required');
 const ids=result.tracks.map(x=>x.conditionId);
 if(ids.join('|')!==IDS.join('|'))throw new TypeError('condition order mismatch');
 const first=result.tracks[0].track;
 for(const item of result.tracks){
  const t=item.track;
  if(t.sampleRate!==first.sampleRate||t.samples.length!==first.samples.length)throw new RangeError('mismatched track timing');
 }
 return result;
}
function attach(doc,api,AudioContextClass){
 const make=doc.getElementById('m7Make'),panel=doc.getElementById('m7Panel');
 if(!make||!panel)return null;
 const buttons=IDS.map(id=>doc.getElementById('m7Play-'+id));
 const message=doc.getElementById('m7Status'),stopButton=doc.getElementById('m7Stop');
 let context=null,source=null,transport=null,result=null,buffers=new Map(),epoch=0;
 const report=(s)=>{message.textContent=s;};
 function position(){if(!transport||!context)return 0;const d=transport.duration;return (transport.offset+Math.max(0,context.currentTime-transport.started))%d;}
 function stop(){epoch++;if(source){try{source.onended=null;source.stop();source.disconnect();}catch{}source=null;}transport=null;}
 async function play(id){
  if(!result)return;
  const item=result.tracks.find(x=>x.conditionId===id);if(!item)return;
  const offset=transport?position():0;stop();const ticket=epoch;
  try{
   if(!AudioContextClass)throw new Error('Web Audio unavailable');
   context=context||new AudioContextClass();await context.resume();if(ticket!==epoch)return;
   let buffer=buffers.get(id);
   if(!buffer){const t=item.track;buffer=context.createBuffer(1,t.samples.length,t.sampleRate);buffer.copyToChannel(t.samples,0);buffers.set(id,buffer);}
   const node=context.createBufferSource(),gain=context.createGain();
   gain.gain.value=gainFor(item.track);node.buffer=buffer;node.loop=true;node.connect(gain);gain.connect(context.destination);
   node.start(0,offset);source=node;transport={id,offset,started:context.currentTime,duration:buffer.duration};
   report(LABELS[id]+' · '+offset.toFixed(1)+'秒から再生');
  }catch(e){stop();report('再生エラー: '+e.message);}
 }
 function create(){
  stop();result=null;buffers.clear();buttons.forEach(b=>b.disabled=true);stopButton.disabled=true;
  const input=Object.fromEntries(['title','character','world','scene','style','gameStyle','duration'].map(k=>[k,doc.getElementById(k)?.value]));
  const seed=Number(doc.getElementById('m7Seed').value);
  try{
   result=validate(api.generate(input,seed));
   buttons.forEach(b=>b.disabled=false);stopButton.disabled=false;
   if(root.PlotuneM7Evaluation?.controller)root.PlotuneM7Evaluation.controller.begin(result);
   if(root.PlotuneM7Diagnostics?.controller)root.PlotuneM7Diagnostics.controller.show(result);
   report('4曲生成完了 · 同じ位置で切り替え可能 · 音量を静的補正');
  }catch(e){report('4条件生成エラー: '+e.message);}
 }
 make.addEventListener('click',create);
 buttons.forEach((b,i)=>b.addEventListener('click',()=>play(IDS[i])));
 stopButton.addEventListener('click',()=>{stop();report('停止しました');});
 return {create,play,stop,get result(){return result;}};
}
root.PlotuneM7Listening={IDS,LABELS,gainFor,validate,attach};
if(typeof document!=='undefined')root.PlotuneM7Listening.controller=attach(document,root.PlotuneM7Generation,root.AudioContext||root.webkitAudioContext);
})(typeof window!=='undefined'?window:globalThis);
