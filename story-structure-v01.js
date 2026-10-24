/* Plotune structured story analysis v0.1: separate evidence domains, no API. */
(function(root){'use strict';
const schema={
 world:{period:[['edo',/江戸時代|江戸期|文化文政/],['modern',/現代|令和|平成/],['future',/未来|近未来|遠未来/]],culturalContext:[['japan',/日本|和風|江戸|京都/],['europe',/欧州|ヨーロッパ|西洋/]],technology:[['mechanical',/機械|蒸気|工場/],['digital',/電子|コンピュータ|ロボット/]],magicSystem:[['magic',/魔法|魔術|精霊|妖精/]],location:[['forest',/森|森林/],['village',/村|集落/],['castle',/城|宮殿/],['room',/室内|部屋|屋敷/]],geography:[['mountain',/山|山岳/],['sea',/海|海岸/],['urban',/都市|街/]],climate:[['snow',/雪/],['rain',/雨/],['winter',/冬/],['summer',/夏/]],timeLight:[['night',/夜|深夜|月明かり/],['morning',/朝|夜明け/],['evening',/夕暮れ/]],society:[['court',/宮廷|貴族/],['farm',/農家|農村/],['school',/学校/]],scale:[['large',/広大|果てしない|大広間/],['small',/狭い|小部屋/]],materials:[['wood',/木造|木製/],['stone',/石造|石壁/],['metal',/金属|鉄製/]],aesthetic:[['fairytale',/童話|絵本/],['horror',/ホラー|怪談/],['comedy',/コメディ|滑稽/]],ambientSounds:[['bell',/鐘の音|鐘が鳴/],['rain',/雨音/],['footstep',/足音/]],constraints:[['no_drums',/ドラムなし|打楽器なし/]]},
 character:{identity:[['tanuki',/たぬき|狸/],['fox',/狐|きつね/],['human',/人間/]],body:[['small',/小さな|小さい|小さく|小柄|幼い|三歳|3歳/],['large',/大柄|巨体/]],motion:[['bouncy',/ぴょん|跳ね|ちょこちょこ/],['slow',/ゆっくり動|のそのそ/]],speech:[['quiet',/小声|無口|口数が少な/],['fast',/早口/]],attention:[['curious',/好奇心|興味津々/],['observant',/観察|じっと見/]],decision:[['careful',/慎重|用心深い/],['impulsive',/衝動的|思いつきで/]],values:[['competitive',/負けず嫌い|勝ちたい/],['helpful',/人を助け|役に立ちたい/]],emotionExpression:[['reserved',/感情を表に出さな|感情を抑え/],['expressive',/表情豊か/]],relationships:[['cooperative',/協力|助け合う/],['dependent',/甘える|頼りにする/]],habits:[['ear',/耳をぴく|耳が動/],['tail',/しっぽを振|尻尾を振/]],stableTraits:[['lively',/元気|活発|やんちゃ/],['timid',/内気|人見知り|おとなしい/]],temporaryState:[['sleepy',/眠そう|眠い/],['tired',/疲れている|疲労/]],themeIdentity:[]},
 scene:{participants:[['named',/[ぁ-んァ-ヶ一-龥]{2,8}は/]],eventTimeline:[['transition',/ところが|突然|そのとき/]],action:[['fall',/落とし|落ちた|転ん/],['run',/走っ|駆け/]],stakes:[['minor',/おやつ|クッキー|しょんぼり/],['severe',/全滅|二度と会えない|亡くなった/]],emotionCues:[['sad',/しょんぼり|悲し|泣|涙/],['happy',/うれし|笑顔/]],relationshipChange:[['closer',/仲直り|抱きしめ/],['separate',/別れ|離れてい/]],resolution:[['recovery',/もう一度|立ち上が|顔を上げ/],['unresolved',/そのまま|戻らな/]],localEnvironment:[['rain',/雨が降|雨音/]],musicalArc:[['pause',/立ち止ま|うつむ|黙り込/]]}
};
const fields={world:['period','culturalContext','technology','magicSystem','location','geography','climate','timeLight','society','scale','materials','aesthetic','ambientSounds','constraints'],character:['identity','body','motion','speech','attention','decision','values','emotionExpression','relationships','habits','stableTraits','temporaryState','themeIdentity'],scene:['participants','eventTimeline','action','stakes','emotionCues','relationshipChange','resolution','localEnvironment','musicalArc']};
const neg=/^(?:かない|かなかった|くない|くなかった|ない|なかった|ではない|じゃない|ではなく|じゃなく|ず|ません|ぬ)/;
function field(text,patterns,source){
 const matches=[];
 for(const [value,re] of patterns){const m=re.exec(text);if(!m)continue;
 const after=text.slice(m.index+m[0].length,m.index+m[0].length+8);
 if(neg.test(after))continue;
 matches.push({value,confidence:1,evidence:m[0],source,status:'explicit'});}
 if(!matches.length)return {value:null,confidence:0,evidence:[],source,status:'unknown'};
 const unique=[...new Set(matches.map(x=>x.value))];
 return {value:unique.length===1?unique[0]:unique,confidence:1,evidence:matches.map(x=>x.evidence),source,status:unique.length>1?'conflicting':'explicit'};
}
function analyze(input){
 const result={};
 for(const section of ['world','character','scene']){
  const text=String(input?.[section]||'').slice(0,16000);
  result[section]={};
  for(const key of fields[section])result[section][key]=field(text,schema[section][key]||[],section);
 }
 // Character-theme identity is a deterministic input identity, not a guessed biography.
 result.character.themeIdentity={value:String(input?.character||''),confidence:1,evidence:[],source:'character',status:'explicit'};
 return {version:'0.1',...result};
}
root.PlotuneStoryStructure={fields,analyze};
})(window);
