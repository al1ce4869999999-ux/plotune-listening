/* Plotune generation trace v0.1 — observable rules, no invented causal claims. */
(function(root){'use strict';
const has=(n,v)=>Array.isArray(n?.value)?n.value.includes(v):n?.value===v;
const item=(id,source,field,rule,parameter,effect,kind='hypothesis')=>({id,source,field,evidence:field?.evidence||[],rule,parameter,effect,kind});
function trace(plan,result){
 const st=plan.structure||{},w=st.world||{},c=st.character||{},s=st.scene||{};
 const x=plan.expression||{},m=x.motif||{},entries=[];
 const put=(id,domain,key,rule,parameter,effect,kind)=>{const f=st[domain]?.[key];if(f?.status!=='unknown')entries.push(item(id,domain+'.'+key,f,rule,parameter,effect,kind));};
 if(has(c.body,'small'))put('C01','character','body','小柄→主旋律の音域を上げる','register +'+(m.register||0),'音域上昇');
 if(has(c.motion,'bouncy'))put('C02','character','motion','跳ねる動作→跳躍の重みを増やす','bounce '+m.bounce,'旋律の移動幅が大きくなりやすい');
 if(has(c.stableTraits,'lively'))put('C03','character','stableTraits','活発→跳躍率と音数へ連動','bounce '+m.bounce,'旋律の跳躍・発音密度を同時に増加');
 if(has(c.stableTraits,'timid')||has(c.decision,'careful'))put('C04','character',has(c.stableTraits,'timid')?'stableTraits':'decision','慎重→長音・休符・低密度','hesitation '+m.hesitation,'間の長い旋律');
 if(has(w.location,'forest'))put('W01','world','location','森→オカリナ候補','ocarina','主旋律の音色を変更');
 if(has(w.location,'room'))put('W02','world','location','屋内→柔らかいピアノ候補','softpiano','主旋律の音色を変更');
 if(has(w.magicSystem,'magic'))put('W03','world','magicSystem','魔法→オカリナ候補','ocarina','主旋律の音色を変更');
 if(has(w.period,'edo'))put('W04','world','period','江戸→文法の五音音階タグ','pentatonic (現在は音程選択への適用が限定的)','候補情報のみ');
 if(has(s.stakes,'minor'))put('S01','scene','stakes','軽い落胆→低音の音量を抑える','mildSadness true','低音の主張を弱める');
 if(has(s.stakes,'severe'))put('S02','scene','stakes','深刻な喪失→別の感情表現候補','grief true','使用可否は別の悲劇解析で判定');
 const g=plan.gameStyle||'journey',notes=result?.score?.notes||[],lead=notes.filter(n=>n.voice==='lead'&&n.volume>0);
 const intervals=lead.slice(1).map((n,i)=>n.midi-lead[i].midi);
 const timbres=[...new Set(notes.map(n=>n.timbre).filter(Boolean))];
 const roles={};for(const n of notes)if(n.volume>0)roles[n.voice]=(roles[n.voice]||0)+1;
 const applied=result?.details?.researchApplied;
 if(applied){
  for(const [key,label,meaning] of [['registerSemitones','音域','主旋律と対旋律の音程調整'],['dynamicsFactor','強弱','音符ごとの音量変更'],['articulationFactor','アーティキュレーション','音価変更'],['brightness','音色','合成波形の明るさ係数'],['reverbWet','空間','反射音の割合']]){
   entries.push({id:'R-'+key,source:'research',evidence:[],rule:label+'は聴取感情／距離知覚に関連（調整量はPlotuneの仮設定）',parameter:key+'='+applied[key],effect:meaning,kind:'research-dimension'});
  }
  entries.push({id:'R-pending',source:'research',evidence:[],rule:'長短調・テンポは研究で影響が確認されているが今回は未調整',parameter:'preset preserved',effect:'変更なし',kind:'not-applied'});
 }
 entries.push({id:'GEN01',source:'composer',evidence:[],rule:'曲調と音楽文法を統合して作曲',parameter:g,effect:'旋律と伴奏を生成',kind:'implementation'});
 if(g==='sadness')entries.push({id:'GEN02',source:'composer',evidence:[],rule:'軽い落胆用の専用編曲により既存の音符を置き換える',parameter:'sadness arrangement',effect:'主旋律・伴奏・音色を再生成',kind:'implementation'});
 return {version:'0.1',notes:{lead:lead.length,voices:roles,timbres,meanLeap:intervals.length?intervals.reduce((a,v)=>a+Math.abs(v),0)/intervals.length:0,leadOnsets:lead.slice(0,12).map(n=>Number(n.t.toFixed(3)))},entries,limitations:['記述したルールはコード上の因果経路であり、主観的な音質の原因を証明しない','研究の知見と性格から音を割り当てる創作仮説は別','曲調・音色・シンセの相互作用までは自動的に説明しない']};
}
root.PlotuneGenerationTrace={trace};
})(window);