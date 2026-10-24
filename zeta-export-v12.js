/* Plotune v1.2 — local AAC/MP4 audio export for Zeta.
 * Safari MediaRecorder records Web Audio into an MP4/AAC file in real time.
 * No upload, third-party converter, external API or codec binaries.
 * Never rename an unsupported file to .m4a.
 */
(function(root){
'use strict';
const MB=20*1024*1024,MIN=30,MAX=300;
const formats=[
 {mime:'audio/mp4;codecs=mp4a.40.2',extension:'m4a',kind:'mp4'},
 {mime:'audio/mp4',extension:'m4a',kind:'mp4'},
 {mime:'audio/aac',extension:'aac',kind:'aac'}
];
function supported(Recorder=root.MediaRecorder){
 if(!Recorder||typeof Recorder.isTypeSupported!=='function')return null;
 return formats.find(x=>Recorder.isTypeSupported(x.mime))||null;
}
function checkTrack(track){
 if(!track||!track.samples||!track.sampleRate)return {ok:false,message:'先に曲を作ってね'};
 const time=track.samples.length/track.sampleRate;
 if(!Number.isFinite(time)||time<MIN-.025)return {ok:false,message:'Zeta用には30秒以上の曲が必要です。30秒か60秒で作曲し直してね。'};
 if(time>MAX+.01)return {ok:false,message:'Zetaの上限は5分です。'};
 return {ok:true,duration:time};
}
async function checkSignature(blob,kind){
 if(typeof blob.slice!=='function'||typeof blob.arrayBuffer!=='function')return true; // older Safari may lack arrayBuffer
 const bytes=new Uint8Array(await blob.slice(0,20).arrayBuffer());
 if(kind==='mp4'){
  return bytes.length>=8 && String.fromCharCode(...bytes.slice(4,8))==='ftyp';
 }
 if(kind==='aac'){
  return bytes.length>=2&&bytes[0]===0xff&&(bytes[1]&0xf0)===0xf0;
 }
 return false;
}
function filename(name,ext){
 const stem=(String(name||'ぽんぽんBGM').replace(/[\\/:*?"<>|\x00-\x1F]/g,'_').trim().slice(0,42)||'ぽんぽんBGM');
 return stem+'_Zeta.'+ext;
}
function encode(track,{AudioContextClass=root.AudioContext||root.webkitAudioContext,
 Recorder=root.MediaRecorder, onProgress=()=>{}, signal, mode}={}){
 const fit=checkTrack(track);
 if(!fit.ok)return Promise.reject(new Error(fit.message));
 const selected=mode||supported(Recorder);
 if(!selected)return Promise.reject(new Error('このSafariはM4A/AACの録音に対応していません。WAV保存とiPhoneショートカットで変換してね。'));
 if(!AudioContextClass)return Promise.reject(new Error('このブラウザでは音声変換を開始できません。'));
 return new Promise(async(resolve,reject)=>{
  let ctx=null,stream=null,source=null,recorder=null,progress=null,timeout=null,settled=false;
  const chunks=[];
  function finish(err,blob){
   if(settled)return;settled=true;
   if(progress)clearInterval(progress);
   if(timeout)clearTimeout(timeout);
   if(signal)signal.removeEventListener('abort',abort);
   if(source){try{source.stop()}catch{}try{source.disconnect()}catch{}}
   if(stream){for(const t of stream.stream.getTracks()){try{t.stop()}catch{}}}
   if(ctx&&ctx.close){try{Promise.resolve(ctx.close()).catch(()=>{})}catch{}}
   err?reject(err):resolve({blob,extension:selected.extension,duration:fit.duration});
  }
  function abort(){
   try{if(recorder&&recorder.state!=='inactive')recorder.stop()}catch{}
   finish(new Error('保存をキャンセルしました'));
  }
  if(signal?.aborted){finish(new Error('保存をキャンセルしました'));return;}
  try{
   ctx=new AudioContextClass();
   stream=ctx.createMediaStreamDestination();
   const pad=fit.duration<30.5?.85:.25;
   // Resample once through AudioBuffer: sample-rate differs between Plotune
   // and the Safari hardware. Repeat the first samples during the short tail
   // rather than introducing silence at the loop boundary.
   const buffer=ctx.createBuffer(1,track.samples.length,track.sampleRate);
   buffer.copyToChannel(track.samples,0);
   const tail=ctx.createBuffer(1,Math.ceil(pad*track.sampleRate),track.sampleRate);
   const tailData=tail.getChannelData(0);
   for(let i=0;i<tailData.length;i++)tailData[i]=track.samples[i%track.samples.length];
   source=ctx.createBufferSource();source.buffer=buffer;
   const tailSource=ctx.createBufferSource();tailSource.buffer=tail;
   source.connect(stream);tailSource.connect(stream);
   try{recorder=new Recorder(stream.stream,{mimeType:selected.mime,audioBitsPerSecond:128000});}
   catch(e){throw new Error('この端末では選択した音声形式を録音できません。別の形式またはショートカットで変換してね。');}
   recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
   recorder.onerror=e=>finish(new Error('音声エンコードに失敗しました'));
   recorder.onstop=async()=>{
    if(settled)return;
    try{
     const data=new Blob(chunks,{type:recorder.mimeType||selected.mime});
     if(!data.size)throw new Error('音声ファイルが空でした。');
     if(data.size>MB)throw new Error('20MBを超えました。60秒以下で保存してね。');
     if(!await checkSignature(data,selected.kind))throw new Error('録音形式がZeta対応形式と一致しません。拡張子を変えるだけでは使えません。');
     onProgress(100);
     finish(null,data);
    }catch(e){finish(e)}
   };
   if(signal)signal.addEventListener('abort',abort,{once:true});
   await ctx.resume();
   if(settled)return;
   recorder.start(1000);
   const started=ctx.currentTime+.08;
   source.start(started);
   tailSource.start(started+fit.duration);
   tailSource.onended=()=>{try{if(recorder.state!=='inactive')recorder.stop()}catch(e){finish(e)}};
   progress=setInterval(()=>onProgress(Math.min(99,Math.floor((ctx.currentTime-started)/(fit.duration+pad)*100))),900);
   // Avoid a stuck wait if browser stops audio in background.
   // setTimeout is a safety timeout, never used to determine duration.
   timeout=setTimeout(()=>{if(!settled)finish(new Error('エンコードが中断されました。Safariを開いたまま再試行してね。'));},(fit.duration+pad+25)*1000);
  }catch(e){finish(e)}
 });
}
root.PlotuneZetaExport={formats,supported,checkTrack,checkSignature,filename,encode,MAX_BYTES:MB};
})(window);
