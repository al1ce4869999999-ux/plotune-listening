/* M7.3: human listening evaluations; no automatic quality claims. */
(function(root){'use strict';
const IDS=['baseline','phase','m','phase-m'];
const CRITERIA=[['motif','旋律・動機'],['development','展開'],['emotion','感情表現'],['coherence','まとまり'],['preference','好み']];
function rating(value){if(value===''||value==null)return null;const n=Number(value);if(!Number.isInteger(n)||n<1||n>5)throw new RangeError('rating must be 1..5');return n;}
function createRecord(generation){
 if(!generation||generation.tracks?.map(t=>t.conditionId).join('|')!==IDS.join('|'))throw new TypeError('M7 four-condition generation required');
 return {schema:'plotune.m7.listening.v1',seed:generation.request.seed,input:{scene:generation.request.scene,style:generation.request.style,gameStyle:generation.request.gameStyle,duration:generation.request.duration},ratings:Object.fromEntries(IDS.map(id=>[id,Object.fromEntries(CRITERIA.map(([key])=>[key,null]))])),notes:Object.fromEntries(IDS.map(id=>[id,'']))};
}
function setRating(record,id,key,value){
 if(!IDS.includes(id)||!CRITERIA.some(c=>c[0]===key))throw new RangeError('unknown evaluation dimension');
 record.ratings[id][key]=rating(value);return record;
}
function complete(record){return IDS.every(id=>CRITERIA.every(([key])=>record.ratings[id][key]!=null));}
function attach(doc,listening,storage){
 const panel=doc.getElementById('m7Evaluation'),body=doc.getElementById('m7RatingFields'),message=doc.getElementById('m7RatingStatus');
 if(!panel||!body)return null;
 const save=doc.getElementById('m7RatingSave'),download=doc.getElementById('m7RatingExport');
 let record=null;
 const render=()=>{
  body.replaceChildren();if(!record)return;
  for(const id of IDS){
   const group=doc.createElement('fieldset'),legend=doc.createElement('legend');
   legend.textContent=({baseline:'Baseline',phase:'Phase',m:'M','phase-m':'Phase + M'})[id];group.append(legend);
   for(const [key,label] of CRITERIA){
    const row=doc.createElement('label');row.textContent=label+'（1〜5） ';
    const select=doc.createElement('select');select.setAttribute('aria-label',legend.textContent+' '+label);
    for(const [value,name] of [['','未評価'],['1','1'],['2','2'],['3','3'],['4','4'],['5','5']]){
     const opt=doc.createElement('option');opt.value=value;opt.textContent=name;select.append(opt);
    }
    select.value=record.ratings[id][key]??'';
    select.addEventListener('change',()=>{setRating(record,id,key,select.value);message.textContent=complete(record)?'全項目入力済み':'未評価の項目があります';});
    row.append(select);group.append(row);
   }
   const note=doc.createElement('textarea');note.placeholder='聴いて気づいたこと（任意）';note.setAttribute('aria-label',legend.textContent+' メモ');
   note.value=record.notes[id];note.addEventListener('input',()=>{record.notes[id]=note.value;});group.append(note);body.append(group);
  }
 };
 function begin(generation){record=createRecord(generation);panel.hidden=false;render();message.textContent='新しい4曲の評価を開始しました。未評価は空欄のまま保存できます。';}
 function persist(){
  if(!record)return;
  try{storage.setItem('plotune-m7-rating-v1',JSON.stringify(record));message.textContent='評価をこの端末に保存しました。'+(complete(record)?'全項目入力済み。':'未評価項目あり。');}
  catch(e){message.textContent='保存失敗: '+e.message;}
 }
 function exportJson(){
  if(!record)return;
  const blob=new Blob([JSON.stringify(record,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=doc.createElement('a');
  a.href=url;a.download='plotune-m7-rating-'+record.seed+'.json';doc.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
 }
 save.addEventListener('click',persist);download.addEventListener('click',exportJson);
 return {begin,persist,get record(){return record;}};
}
root.PlotuneM7Evaluation={IDS,CRITERIA,rating,createRecord,setRating,complete,attach};
if(typeof document!=='undefined')root.PlotuneM7Evaluation.controller=attach(document,root.PlotuneM7Listening,root.localStorage);
})(typeof window!=='undefined'?window:globalThis);
