/* Plotune v1.9: 30 plot-driven, emotionally expressive handheld ensemble, zero API, mono 22.05 kHz.
 * Not a ROM soundfont or a reproduction of any commercial game music.
 * Seven independent parts: lead, counter melody, chords, arpeggio,
 * bass, percussion, sparkles/pads. Deterministic score and synthesizer.
 */
(function(root){
'use strict';
const SR=22050,TAU=2*Math.PI,clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const MAJOR=[0,2,4,5,7,9,11],MINOR=[0,2,3,5,7,8,10];
const STYLES={
 journey:{name:'冒険・フィールド',bpm:132,progression:[0,4,5,3],lead:'bright',bass:'walking',drums:'drive',mode:'major',density:0.88,arpEvery:1,intensity:1,shape:'field'},
 village:{name:'街・タウン',bpm:112,progression:[0,3,4,0],lead:'warm',bass:'bounce',drums:'soft',mode:'major',density:0.66,arpEvery:2,intensity:0.76,shape:'gentle'},
 mischief:{name:'コミカル・ドタバタ',bpm:146,progression:[0,4,3,4],lead:'reed',bass:'bounce',drums:'shuffle',mode:'major',density:1.05,arpEvery:1,intensity:1.1,shape:'bounce'},
 mystery:{name:'ふしぎ・探索',bpm:98,progression:[5,3,1,4],lead:'glass',bass:'pulse',drums:'light',mode:'minor',density:0.58,arpEvery:2,intensity:0.76,shape:'mystery'},
 joy:{name:'喜・うれしい！',bpm:144,progression:[0,4,3,4],lead:'bright',bass:'bounce',drums:'festival',mode:'major',density:1.1,arpEvery:1,intensity:1.2,shape:'jump'},
 anger:{name:'怒・ぷんぷん！',bpm:156,progression:[5,4,5,1],lead:'reed',bass:'pulse',drums:'heavy',mode:'minor',density:0.91,arpEvery:2,intensity:1.19,shape:'stomp'},
 sadness:{name:'哀・しょんぼり',bpm:76,progression:[5,3,1,4],lead:'warm',bass:'sustain',drums:'ballad',mode:'minor',density:0.42,arpEvery:4,intensity:0.7,shape:'sigh'},
 fun:{name:'楽・わくわく！',bpm:154,progression:[0,3,4,0],lead:'bright',bass:'bounce',drums:'shuffle',mode:'major',density:1,arpEvery:1,intensity:1.2,shape:'jump'},
 proud:{name:'得意げ・どや顔',bpm:124,progression:[0,4,0,3],lead:'reed',bass:'walk',drums:'march',mode:'major',density:0.88,arpEvery:2,intensity:1.02,shape:'march'},
 victory:{name:'成功・やった！',bpm:158,progression:[0,4,5,3],lead:'bright',bass:'running',drums:'festival',mode:'major',density:1.1,arpEvery:1,intensity:1.3,shape:'triumph'},
 frustration:{name:'悔しい・むむむ',bpm:130,progression:[5,4,1,4],lead:'reed',bass:'pulse',drums:'heavy',mode:'minor',density:0.82,arpEvery:2,intensity:1.1,shape:'stomp'},
 shyness:{name:'照れ・もじもじ',bpm:92,progression:[0,3,5,4],lead:'warm',bass:'sustain',drums:'soft',mode:'major',density:0.5,arpEvery:4,intensity:0.65,shape:'tiptoe'},
 affection:{name:'なかよし・ぬくもり',bpm:96,progression:[0,3,4,0],lead:'warm',bass:'sustain',drums:'ballad',mode:'major',density:0.54,arpEvery:4,intensity:0.68,shape:'gentle'},
 lonely:{name:'ひとりぼっち',bpm:72,progression:[5,1,3,4],lead:'glass',bass:'sustain',drums:'ballad',mode:'minor',density:0.36,arpEvery:4,intensity:0.57,shape:'sigh'},
 anxiety:{name:'不安・おろおろ',bpm:106,progression:[5,1,4,5],lead:'glass',bass:'pulse',drums:'suspense',mode:'minor',density:0.62,arpEvery:2,intensity:0.78,shape:'tiptoe'},
 fear:{name:'こわい・びくびく',bpm:90,progression:[5,1,5,4],lead:'glass',bass:'pulse',drums:'suspense',mode:'minor',density:0.42,arpEvery:4,intensity:0.84,shape:'mystery'},
 failure:{name:'失敗・ずっこけ',bpm:138,progression:[0,4,5,1],lead:'reed',bass:'bounce',drums:'shuffle',mode:'minor',density:0.88,arpEvery:2,intensity:1.1,shape:'bounce'},
 retry:{name:'再挑戦・がんばる',bpm:150,progression:[5,3,0,4],lead:'bright',bass:'running',drums:'drive',mode:'major',density:1.02,arpEvery:1,intensity:1.16,shape:'field'},
 prank:{name:'いたずら・こっそり',bpm:124,progression:[0,5,4,3],lead:'reed',bass:'bounce',drums:'shuffle',mode:'minor',density:0.78,arpEvery:2,intensity:0.96,shape:'tiptoe'},
 chase:{name:'追いかけっこ',bpm:176,progression:[5,4,0,4],lead:'bright',bass:'running',drums:'race',mode:'minor',density:1.08,arpEvery:1,intensity:1.24,shape:'rush'},
 discovery:{name:'発見・きらり',bpm:118,progression:[0,3,4,0],lead:'glass',bass:'walk',drums:'light',mode:'major',density:0.72,arpEvery:2,intensity:0.85,shape:'spark'},
 wonder:{name:'ふしぎ・夢みたい',bpm:86,progression:[0,5,3,4],lead:'glass',bass:'sustain',drums:'light',mode:'major',density:0.48,arpEvery:4,intensity:0.76,shape:'mystery'},
 suspense:{name:'見つかりそう・ひみつ',bpm:114,progression:[5,4,1,5],lead:'glass',bass:'pulse',drums:'suspense',mode:'minor',density:0.52,arpEvery:2,intensity:0.8,shape:'tiptoe'},
 sleep:{name:'おやすみ・すやすや',bpm:68,progression:[0,3,4,0],lead:'warm',bass:'sustain',drums:'ballad',mode:'major',density:0.33,arpEvery:4,intensity:0.52,shape:'gentle'},
 rain:{name:'雨・しっとり',bpm:88,progression:[5,3,1,4],lead:'glass',bass:'sustain',drums:'light',mode:'minor',density:0.42,arpEvery:4,intensity:0.62,shape:'sigh'},
 reunion:{name:'再会・ほっとする',bpm:112,progression:[0,3,5,4],lead:'warm',bass:'walking',drums:'soft',mode:'major',density:0.64,arpEvery:2,intensity:0.82,shape:'gentle'},
 farewell:{name:'おわかれ・余韻',bpm:80,progression:[5,3,4,0],lead:'warm',bass:'sustain',drums:'ballad',mode:'minor',density:0.41,arpEvery:4,intensity:0.64,shape:'sigh'},
 daily:{name:'のんびり・日常',bpm:106,progression:[0,3,4,0],lead:'warm',bass:'walk',drums:'soft',mode:'major',density:0.66,arpEvery:2,intensity:0.75,shape:'gentle'},
 festival:{name:'おまつり・大騒ぎ',bpm:166,progression:[0,4,3,4],lead:'bright',bass:'running',drums:'festival',mode:'major',density:1.13,arpEvery:1,intensity:1.25,shape:'jump'},
 battle:{name:'勝負・対決',bpm:172,progression:[5,4,1,5],lead:'reed',bass:'running',drums:'heavy',mode:'minor',density:1.04,arpEvery:1,intensity:1.22,shape:'rush'},
 // Character-driven, ORIGINAL instrumental palettes. No game ROM samples.
 musicbox:{name:'切ない・神秘のオルゴール',bpm:72,progression:[5,3,1,4],lead:'musicbox',bass:'sustain',drums:'ballad',mode:'minor',density:.28,arpEvery:4,intensity:.53,shape:'sigh'},
 starbox:{name:'星空・祈りのオルゴール',bpm:82,progression:[0,5,3,4],lead:'musicbox',bass:'sustain',drums:'light',mode:'major',density:.35,arpEvery:4,intensity:.61,shape:'mystery'},
 courageflute:{name:'勇気・旅立ちの笛',bpm:116,progression:[5,3,0,4],lead:'flute',bass:'walking',drums:'march',mode:'major',density:.73,arpEvery:2,intensity:.92,shape:'triumph'},
 dawnflute:{name:'夜明け・希望の笛',bpm:96,progression:[0,3,5,4],lead:'flute',bass:'sustain',drums:'soft',mode:'major',density:.59,arpEvery:4,intensity:.78,shape:'gentle'},
 distantbell:{name:'遠い記憶・鐘の余韻',bpm:66,progression:[5,1,3,4],lead:'bell',bass:'sustain',drums:'light',mode:'minor',density:.27,arpEvery:4,intensity:.49,shape:'sigh'},
 farewellpiano:{name:'お別れ・静かなピアノ',bpm:70,progression:[5,3,1,4],lead:'softpiano',bass:'sustain',drums:'ballad',mode:'minor',density:.31,arpEvery:4,intensity:.55,shape:'sigh'},
 forestflute:{name:'森・木漏れ日の笛',bpm:104,progression:[0,3,4,0],lead:'flute',bass:'walking',drums:'light',mode:'major',density:.55,arpEvery:2,intensity:.72,shape:'gentle'},
 lullabybox:{name:'おやすみ・小さなオルゴール',bpm:66,progression:[0,3,4,0],lead:'musicbox',bass:'sustain',drums:'ballad',mode:'major',density:.24,arpEvery:4,intensity:.45,shape:'gentle'},
 resolvebells:{name:'決意・鐘と笛',bpm:126,progression:[5,4,0,3],lead:'flute',bass:'running',drums:'drive',mode:'major',density:.80,arpEvery:2,intensity:1.0,shape:'triumph'},
 ocarinalament:{name:'オカリナ・切ない記憶',bpm:74,progression:[5,3,1,4],lead:'ocarina',bass:'sustain',drums:'ballad',mode:'minor',density:.33,arpEvery:4,intensity:.57,shape:'sigh'},
 ocarinacourage:{name:'オカリナ・小さな勇気',bpm:112,progression:[5,3,0,4],lead:'ocarina',bass:'walking',drums:'march',mode:'major',density:.71,arpEvery:2,intensity:.91,shape:'triumph'},
 synthmystery:{name:'シンセ・未知の世界',bpm:94,progression:[5,1,4,5],lead:'synthlead',bass:'pulse',drums:'suspense',mode:'minor',density:.55,arpEvery:2,intensity:.81,shape:'mystery'},
 synthhope:{name:'シンセ・希望の光',bpm:124,progression:[0,4,5,3],lead:'synthlead',bass:'running',drums:'drive',mode:'major',density:.86,arpEvery:1,intensity:1.0,shape:'triumph'},
 harpnight:{name:'ハープ・月夜の夢',bpm:76,progression:[0,5,3,4],lead:'harp',bass:'sustain',drums:'light',mode:'major',density:.34,arpEvery:4,intensity:.58,shape:'gentle'},
 kalimbadaily:{name:'カリンバ・小さな日常',bpm:106,progression:[0,3,4,0],lead:'kalimba',bass:'walking',drums:'soft',mode:'major',density:.67,arpEvery:2,intensity:.77,shape:'gentle'},
 marimbapranks:{name:'マリンバ・いたずら大作戦',bpm:148,progression:[0,4,3,4],lead:'marimba',bass:'bounce',drums:'shuffle',mode:'major',density:1.04,arpEvery:1,intensity:1.04,shape:'bounce'},
 stringsmemory:{name:'弦楽器・忘れられない日',bpm:78,progression:[5,1,3,4],lead:'strings',bass:'sustain',drums:'ballad',mode:'minor',density:.39,arpEvery:4,intensity:.62,shape:'sigh'},
 celestadream:{name:'チェレスタ・星屑の道',bpm:84,progression:[0,5,3,4],lead:'celesta',bass:'sustain',drums:'light',mode:'major',density:.44,arpEvery:4,intensity:.73,shape:'mystery'}
};
const GROUPS=[
 {label:'🎹 オカリナ・シンセ・多彩な楽器',ids:['ocarinalament','ocarinacourage','synthmystery','synthhope','harpnight','kalimbadaily','marimbapranks','stringsmemory','celestadream']},
 {label:'🔔 物語を彩る楽器',ids:['musicbox','starbox','courageflute','dawnflute','distantbell','farewellpiano','forestflute','lullabybox','resolvebells']},
 {label:'🌈 喜怒哀楽',ids:['joy','anger','sadness','fun']},
 {label:'🐾 ぽんぽんの気持ち',ids:['proud','victory','frustration','shyness','affection','lonely','anxiety','fear']},
 {label:'🎭 プロットの出来事',ids:['failure','retry','prank','chase','discovery','wonder','suspense','reunion','farewell']},
 {label:'🏡 日常・情景',ids:['daily','sleep','rain','festival','battle']},
 {label:'🎮 ゲーム音楽の基本',ids:['journey','village','mischief','mystery']}
];
// The classifier uses explicit, observable language. If no cue occurs,
// fall back to familiar whimsical game music; do not assert hidden emotions.
// A melancholic score needs its own phrasing, instrumental activity
// and timbre, not a slower version of the pop backing track.
const MOODS={
 sadness:{register:-5,phrase:9,lead:.74,drum:.22,kind:'melancholy'},
 lonely:{register:-7,phrase:9,lead:.68,drum:.16,kind:'melancholy'},
 farewell:{register:-5,phrase:9,lead:.76,drum:.23,kind:'melancholy'},
 rain:{register:-3,phrase:6,lead:.72,drum:.18,kind:'melancholy'},
 anxiety:{register:-3,phrase:5,lead:.79,drum:.32,kind:'uneasy'},
 fear:{register:-7,phrase:6,lead:.65,drum:.30,kind:'uneasy'}
};
const STORY_INSTRUMENTS={
 musicbox:{family:'musicbox',role:'記憶のオルゴール',drums:'none',rhythm:'sparse',bell:.58,breath:0},
 starbox:{family:'musicbox',role:'星空のオルゴール',drums:'none',rhythm:'sparse',bell:.72,breath:0},
 lullabybox:{family:'musicbox',role:'眠りのオルゴール',drums:'none',rhythm:'sparse',bell:.40,breath:0},
 courageflute:{family:'flute',role:'勇気の笛',drums:'pulse',rhythm:'hero',bell:.16,breath:.7},
 dawnflute:{family:'flute',role:'夜明けの笛',drums:'soft',rhythm:'hope',bell:.23,breath:.78},
 forestflute:{family:'flute',role:'森の笛',drums:'soft',rhythm:'gentle',bell:.20,breath:.74},
 resolvebells:{family:'flute',role:'笛と鐘',drums:'pulse',rhythm:'hero',bell:.54,breath:.7},
 ocarinalament:{family:'ocarina',role:'オカリナ',drums:'none',rhythm:'sparse',bell:0,breath:.86,secondary:'musicbox',padTone:'strings'},
 ocarinacourage:{family:'ocarina',role:'オカリナ',drums:'pulse',rhythm:'hero',bell:0,breath:.78,secondary:'synthlead',padTone:'synthpad'},
 synthmystery:{family:'synthlead',role:'アナログシンセ',drums:'suspense',rhythm:'mystery',bell:.22,breath:0,secondary:'celesta',padTone:'synthpad'},
 synthhope:{family:'synthlead',role:'希望のシンセ',drums:'pulse',rhythm:'hero',bell:.20,breath:0,secondary:'ocarina',padTone:'synthpad'},
 harpnight:{family:'harp',role:'ハープ',drums:'none',rhythm:'sparse',bell:.32,breath:0,secondary:'celesta',padTone:'strings'},
 kalimbadaily:{family:'kalimba',role:'カリンバ',drums:'soft',rhythm:'gentle',bell:.22,breath:0,secondary:'ocarina',padTone:'synthpad'},
 marimbapranks:{family:'marimba',role:'マリンバ',drums:'shuffle',rhythm:'playful',bell:.16,breath:0,secondary:'synthlead',padTone:'synthpad'},
 stringsmemory:{family:'strings',role:'弦楽器',drums:'none',rhythm:'sparse',bell:0,breath:0,secondary:'ocarina',padTone:'strings'},
 celestadream:{family:'celesta',role:'チェレスタ',drums:'none',rhythm:'sparse',bell:.60,breath:0,secondary:'harp',padTone:'synthpad'},
 distantbell:{family:'bell',role:'遠い鐘',drums:'none',rhythm:'sparse',bell:.76,breath:0},
 farewellpiano:{family:'softpiano',role:'静かなピアノ',drums:'none',rhythm:'sparse',bell:0,breath:0}
};
// Scene-to-orchestration is independent of emotional BGM preset selection.
// Match *observable events* rather than claiming a character's hidden feelings.
// Specific situational patterns beat general descriptive background words.
// Manual preset selection always takes priority over this classifier.
const SCENE_INSTRUMENT_RULES=[
 {style:'ocarinalament',score:6,match:/しくしく|涙を|泣いて|泣きながら|声を殺して泣|ひとりぼっち|誰も来ない|寂し|しょんぼり|お別れ|さよなら|置いていかれ|会えない/},
 {style:'ocarinacourage',score:7,match:/勇気を出し|勇気を奮い|立ち上が|立ち向か|あきらめず|諦めず|もう一度挑戦|怖くても進|一歩を踏み出|やり遂げる/},
 {style:'synthmystery',score:6,match:/暗闇|不気味|幽霊|謎の|秘密の扉|怪しい光|知らない世界|異世界|異空間|迷宮|夜の探索|洞窟|怪物/},
 {style:'synthhope',score:5,match:/光が差し|夜が明け|希望|未来へ|旅立ち|出発|新しい朝|願いが届|明日へ/},
 {style:'harpnight',score:5,match:/月夜|夜空|月明かり|夢の中|幻想的|星を見上げ|星空|祈り|静かな森/},
 {style:'kalimbadaily',score:4,match:/お散歩|さんぽ|散歩|おやつ|日向ぼっこ|昼寝|お昼寝|朝ごはん|お掃除|のんびり|ほっこり/},
 {style:'marimbapranks',score:6,match:/いたずら|転んだ|ずっこけ|ドタバタ|こっそり|盗み食い|ひっくり返|大失敗|慌てて/},
 {style:'stringsmemory',score:6,match:/遠い記憶|思い出|懐かし|忘れられない|思い返|最後のお別れ|見送った/},
 {style:'celestadream',score:5,match:/きらきら|星屑|魔法|夢みたい|不思議な光|精霊|小さな奇跡|きらめく/}
];
function chooseInstrumentPalette(scene,chosenStyle){
 const text=String(scene||'').slice(0,10000);
 let best=null;
 for(const rule of SCENE_INSTRUMENT_RULES){
  const match=text.match(rule.match);
  if(!match)continue;
  // Intentional priority in overlaps: a distressed scene should not
  // become whimsical just because a character fell down.
  const score=rule.score+(rule.style==='ocarinalament'&&/泣|涙|誰も来ない|ひとりぼっち/.test(text)?3:0);
  if(!best||score>best.score)best={style:rule.style,score,evidence:match[0]};
 }
 // Do not infer grief, fear, or joy from an unrelated sentence.
 const chosen=best?.style||({sadness:'ocarinalament',lonely:'ocarinalament',
  farewell:'stringsmemory',retry:'ocarinacourage',fear:'synthmystery',
  anxiety:'synthmystery',wonder:'celestadream',discovery:'celestadream',
  prank:'marimbapranks',failure:'marimbapranks',daily:'kalimbadaily',
  sleep:'harpnight',joy:'synthhope',victory:'synthhope',journey:'ocarinacourage',
  battle:'synthmystery',anger:'synthmystery',suspense:'synthmystery',
  mystery:'synthmystery',rain:'ocarinalament',affection:'harpnight',
  reunion:'synthhope',festival:'marimbapranks',proud:'marimbapranks',
  village:'kalimbadaily',mischief:'marimbapranks',frustration:'stringsmemory',
  shyness:'harpnight',chase:'synthhope'}[chosenStyle]||'kalimbadaily');
 return {style:chosen,palette:STORY_INSTRUMENTS[chosen],reason:best?
  '場面の「'+best.evidence+'」に合わせて楽器編成を選択':
  '曲調「'+(STYLES[chosenStyle]?.name||'日常')+'」から楽器編成を選択',
  evidence:best?[best.evidence]:[],confidence:best?'grounded':'fallback'};
}

const RULES=[
 ['musicbox',/神秘的なオルゴール|悲しいオルゴール|切ないオルゴール|オルゴールの音/g,6],
 ['courageflute',/勇気を奮い|勇気を出し|立ち向か|決意して進|勇敢な笛/g,6],
 ['starbox',/星空のオルゴール|星のオルゴール|祈りのオルゴール/g,7],
 ['distantbell',/遠くの鐘|鐘の余韻|遠い記憶/g,6],
 ['farewellpiano',/別れのピアノ|静かなピアノ/g,6],
 ['forestflute',/森の笛|木漏れ日の笛/g,6],
 ['fear',/怖い|こわい|怖が|恐怖|怯|おびえ|びくびく|お化け|幽霊|恐ろし|震え/g,4],
 ['anger',/怒っ|怒り|ぷんぷん|激怒|腹を立て|かんかん|むかつ|むっとした|怒鳴/g,4],
 ['sadness',/悲し|しょんぼり|泣い|泣き|泣く|涙|落ち込|悲嘆|うつむ|かなしい|しくしく|ぐすぐす|涙ぐ|声を殺して泣|目に涙/g,4],
 ['joy',/うれしい|嬉しい|喜ん|大喜び|にこにこ|にっこり|笑顔|わーい/g,4],
 ['fun',/楽しい|たのしい|わくわく|るんるん|はしゃ|浮かれ|遊びまわ/g,4],
 ['proud',/得意げ|どや顔|えっへん|自慢げ|胸を張|ふんぞり|じまん/g,5],
 ['victory',/成功|大成功|勝利|優勝|やったー|できた|完成|達成|褒められた/g,4],
 ['frustration',/悔し|くやし|負けず嫌い|むむむ|歯ぎしり|不満|納得でき/g,4],
 ['shyness',/照れ|恥ずかし|もじもじ|顔を赤らめ|赤面/g,4],
 ['affection',/なかよし|仲良し|なでなで|ぎゅっと抱|大好き|甘え|寄り添|あったか|ほっこり/g,4],
 ['lonely',/さびし|寂し|ひとりぼっち|孤独|置いていかれ|会えない|誰もいない|誰も来ない|ひとりきり|ひとりで待/g,4],
 ['anxiety',/不安|心配|おろおろ|そわそわ|どうしよう|落ち着かない/g,4],
 ['failure',/失敗|ずっこけ|つまず|転ん|ころんと|落とした|間違え|ひっくり返/g,4],
 ['retry',/やり直|再挑戦|もう一度|もういっかい|れんしゅう|練習|挑戦|諦めず|がんば/g,4],
 ['prank',/いたずら|こっそり|忍び込|悪だくみ|隠して|しめしめ|企み/g,4],
 ['chase',/追いかけっこ|追いかけ|逃げ回|鬼ごっこ|おにごっこ|全速力|猛ダッシュ/g,5],
 ['discovery',/発見|見つけた|ひらめ|気づいた|きらり|宝物を発見/g,4],
 ['wonder',/不思議|ふしぎ|夢みたい|幻想|魔法|きらきら|星空/g,4],
 ['suspense',/見つかりそう|ばれる|バレる|隠れ|忍び足|秘密|ひみつ|緊迫/g,4],
 ['sleep',/おやすみ|すやすや|寝息|眠っ|お昼寝|ねんね|うとうと/g,4],
 ['rain',/雨|あめ|雨音|雨粒|しとしと|霧雨/g,3],
 ['reunion',/再会|会えた|久しぶり|帰ってきた|ただいま|おかえり/g,4],
 ['farewell',/お別れ|別れ|さようなら|さよなら|旅立ち|見送|行ってしまった|遠ざかっていく|見えなくなった/g,4],
 ['festival',/祭り|まつり|花火|お祝い|宴|大騒ぎ|パーティー/g,4],
 ['battle',/対決|戦い|勝負|決闘|強敵|ライバル|バトル/g,4],
 ['daily',/日常|いつもの|のんびり|おさんぽ|散歩|朝ごはん|昼ごはん|お掃除/g,2],
 ['journey',/冒険|旅|出発|フィールド|遠征/g,3],
 ['village',/街|町|村|お店|おうち|里|タウン/g,2],
 ['mischief',/ドタバタ|大慌て|あわて|大失敗|こけた/g,2],
 ['mystery',/探索|迷い込|謎|ミステリー|洞窟/g,2]
];
function chooseStyle(scene){
 const text=String(scene||'').slice(0,10000);
 if(!text.trim())return {style:'mischief',confidence:'low',evidence:[],reason:'文章がないためコミカル曲を使用'};
 const found=[];
 for(const [style,regex,weight] of RULES){
  regex.lastIndex=0;let match,score=0,evidence=[];
  while((match=regex.exec(text))!==null){
   const tail=text.slice(match.index+match[0].length,match.index+match[0].length+8);
   // Explicit negation prevents treating "怖くない" as fear.
   if(/^(?:くない|ではない|じゃない|なかった|しない|ない|ずに)/.test(tail))continue;
   score+=weight;evidence.push(match[0]);
   if(evidence.length>=8)break;
  }
  if(score>0)found.push({style,score,evidence});
 }
 found.sort((a,b)=>b.score-a.score);
 const expressive=found.find(x=>STORY_INSTRUMENTS[x.style]&&x.score>=6)||found.find(x=>['sadness','lonely','farewell','fear','anxiety'].includes(x.style)&&x.score>=4);
 const first=expressive||found[0];
 return first?{style:first.style,confidence:'medium',evidence:first.evidence,
   reason:'文章内の「'+first.evidence.join('・')+'」を根拠に選択'}
   :{style:'mischief',confidence:'low',evidence:[],reason:'明確な感情語がないためコミカル曲を使用'};
}

function random(seed){let x=(seed>>>0)||1;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
function midi(root,scale,index){return root+scale[((index%7)+7)%7]+12*Math.floor(index/7);}
// Emotional arcs express the sequence of musical tension and release.
// A grief cue requests a dynamic arc even if the user chose "adventure".
function analyzeEmotionalArc(scene,style){
  const text=String(scene||'').slice(0,10000);
  // Everyday disappointment and mild tears never trigger the
  // catastrophic grief engine. The selected gentle melancholy
  // arrangement remains intact instead.
  const catastrophic=/亡くなった|亡くして|死んでしま|死んだ|息を引き取|永遠の別れ|二度と会えない|二度と戻らない|取り返しがつかない|全滅|絶望|世界が崩れ|全てを失|すべてを失|泣き崩れ|崩れ落ちて泣|最期を看取|帰らぬ人|最後の別れ/;
  if(!catastrophic.test(text))return null;
  return {type:'grief',strength:'full',stages:[
   {name:'抑える',start:0,end:.25},
   {name:'期待が高まる',start:.25,end:.55},
   {name:'崩れる',start:.55,end:.77},
   {name:'余韻',start:.77,end:1}
  ],reason:'明確な喪失・絶望の描写を根拠に重い悲劇的展開を作曲'};
 }
function characterMusicDNA(context,seed){
 const t=String(context||'');
 const small=/小さな|小さい|幼い|幼児|子ども|子供|三歳|3歳|四歳|4歳|五歳|5歳|ちび|ちいさ|ちょこちょこ/.test(t);
 const lively=/元気|活発|おてんば|やんちゃ|好奇心|走り回|跳ね|ぴょん|せっかち/.test(t);
 const timid=/内気|おとなしい|臆病|慎重|無口|静か|人見知り/.test(t);
 const proud=/強気|負けず嫌い|生意気|意地っ張り|自信家|ぷんぷん/.test(t);
 const gentle=/優しい|穏やか|のんびり|柔らか|おっとり/.test(t);
 const r=random((seed^0x6d2b79f5)>>>0);
 return {small,lively,timid,proud,gentle,
   bounce:clamp((small?.48:0)+(lively?.34:0)+(proud?.12:0)-(timid?.22:0),0,.95),
   hesitation:clamp((timid?.55:0)+(gentle?.13:0),0,.8),
   attack:clamp((proud?.48:0)+(lively?.18:0),0,.8),
   variation:Math.floor(r()*4)};
}
function prepare(plan,style,appraisal=null,reactive=false,scene='',context=''){
 const picked=style==='auto'?chooseStyle(scene):null;
 const type=STYLES[picked?.style||style]?picked?.style||style:'mischief';
 // A selected DS music style fixes the dramatic grammar, never the instruments.
 // Automatic orchestration applies to both manual and automatic styles.
 // Legacy instrument-specific presets remain supported for existing saved work.
 const instrumentChoice=STORY_INSTRUMENTS[type]?null:chooseInstrumentPalette(context||scene,type);
 const emotionalArc=analyzeEmotionalArc(scene,type);
 const knowledge=root.PlotuneLoop?.analyzeWhole(appraisal);
 return {...plan,genre:'game',gameStyle:type,loopMode:true,
  loopArrangement:reactive&&knowledge?.active?knowledge:null,gameAutoChoice:picked,
  instrumentChoice,emotionalArc,storyContext:context||scene,musicDNA:characterMusicDNA(context||scene,plan.characterSeed||1),arrangementSource:style==='auto'?'automatic-style':'manual-style'};
}
function score(plan){
 const game=STYLES[plan.gameStyle]||STYLES.journey;
 const dna=plan.musicDNA||characterMusicDNA(plan.storyContext||'',plan.characterSeed||1);
 const duration=[15,30,60].includes(Number(plan.duration))?Number(plan.duration):30;
 const bars=Math.max(1,Math.round(game.bpm*duration/240));
 const bpm=bars*240/duration,step=duration/(bars*16),steps=bars*16;
 const scale=(game.mode||plan.mode)==='minor'?MINOR:MAJOR,tonic=(game.mode==='minor'&&plan.mode!=='minor'?57:game.mode==='major'&&plan.mode==='minor'?60:plan.root||60);
 const concept=plan.loopArrangement,kind=concept?.preset||null,transform=!!concept?.active;
 const palette=plan.instrumentChoice?.palette||STORY_INSTRUMENTS[plan.gameStyle]||null;
 // Distinct global harmony from the FIRST measure when story supports it.
 const base=game.progression,change=transform&&!MOODS[plan.gameStyle]&&!palette?(concept.progression||base):base;
 const prog=change.map((v,i)=>((v+(kind==='mystery'?1:0))%7+7)%7);
 const meter=step*16,seed=plan.seed>>>0;
 const themeRand=random(plan.characterSeed>>>0);
 const motif=[0,2,4,2,3,5,4,1].map((x,i)=>x+(themeRand()>.6?(i%3===0?2:1):0)+(dna.bounce>.4&&i%3===0?2:0)-(dna.hesitation>.4&&i%4===3?1:0));
 const notes=[],drums=[],rests=[],harmony=[];
 const voices={lead:0,counter:0,chords:0,arp:0,bass:0,sparkle:0,pad:0,drums:0};
 const roleLimits={lead:850,counter:390,chords:850,arp:700,bass:480,sparkle:180,pad:100};
 const count={};
 const arrangementProfiles={
  opening:{lead:1,counter:0,chords:.38,arp:0,bass:.58,pad:.8,sparkle:0,drums:.25},
  development:{lead:1,counter:.75,chords:.85,arp:.7,bass:.9,pad:1,sparkle:.65,drums:.8},
  climax:{lead:1,counter:1,chords:1.15,arp:1.1,bass:1.12,pad:1,sparkle:1,drums:1.15},
  resolution:{lead:1,counter:0,chords:.55,arp:.25,bass:.55,pad:1,sparkle:.3,drums:.2}
 };
 const stageForTime=t=>arcAt(Math.min(bars-1,Math.floor(t/meter))).stage;
 const arrangementAt=t=>arrangementProfiles[stageForTime(t)];

 function add(t,d,n,voice,v){
  if(t<0||t>=duration||d<=.018||!Number.isFinite(n))return;
  count[voice]=(count[voice]||0)+1;if(count[voice]>roleLimits[voice])return;
  const mix=arrangementAt(t)[voice]??1;
  if(mix<=0)return;
  notes.push({t,d:Math.min(d,duration-t),midi:clamp(n,24,105),
    voice,role:voice,volume:clamp(v*mix,0,.26)});
  voices[voice]++;
 }
 function drum(t,name,v){
  if(t<0||t>=duration)return;
  const mix=arrangementAt(t).drums;
  if(mix<=0)return;
  drums.push({t,kind:name,volume:clamp(v*mix,0,1)});voices.drums++;
 }
 // Phrase-aware harmony: cadence bars resolve to tonic; other bars select
 // nearby functional chords using the shared melodic phrase's strong notes.
 function chordAt(b){
  if(!root.PlotuneMelodicGrammar?.composePhrase)return prog[b%4];
  if(b%4===3)return 0;
  const g=root.PlotuneMelodicGrammar.grammar(plan.structure,plan.expression,plan.characterSeed||seed);
  const events=root.PlotuneMelodicGrammar.composePhrase(g,b,{density:clamp((game.density||.7)*.68,.25,.92)});
  const sounding=events.filter(n=>!n.rest);
  const anchor=sounding.length?sounding[Math.floor(sounding.length/2)].degree:0;
  const candidates=[0,3,4,5,1];
  const previous=prog[(b+3)%4];
  return candidates.reduce((best,c)=> {
   const fit=x=>Math.min(...[0,2,4].map(k=>Math.abs(((anchor-x-k)%7+7)%7)))+
      Math.abs(x-previous)*.08+(x===prog[b%4]?-.35:0);
   return fit(c)<fit(best)?c:best;
  },prog[b%4]);
 }
 const leadTone=game.lead;
 const leadRoot=tonic+12;
 const songEnergy=game.intensity||1;
 const pulseDensity=game.density||1;
 const shape=game.shape||'field';
 const sharedGrammar=root.PlotuneMelodicGrammar?.grammar(plan.structure,plan.expression,plan.characterSeed||seed);
 // Whole-track dramatic arc: opening, development, peak, release.
 // Works at any length; retains loop continuity and original instrument palettes.
 const arcStages=['opening','development','climax','resolution'];
 const arcAt=b=>{
  const fraction=(b+.5)/bars;
  const stage=Math.min(3,Math.floor(fraction*4));
  const profile=[.70,.94,1.23,.77][stage];
  return {stage:arcStages[stage],energy:profile,
    density:[.72,.96,1.12,.68][stage],
    register:[-1,0,2,-1][stage]};
 };
 const wholeTrackArc=Array.from({length:bars},(_,b)=>({bar:b+1,...arcAt(b)}));
 const motifPhrase=sharedGrammar&&root.PlotuneMelodicGrammar?.composePhrase?
   root.PlotuneMelodicGrammar.composePhrase(sharedGrammar,0,{density:clamp(pulseDensity*.68,.25,.92)}):null;
 const motifIdentity=plan.motifDevelopment===true&&motifPhrase&&root.PlotuneMotifPlanner?
   root.PlotuneMotifPlanner.capture(motifPhrase):null;
 const sharedPhrases=motifPhrase?Array.from({length:bars},(_,b)=>
   b===0?motifPhrase:root.PlotuneMelodicGrammar.composePhrase(sharedGrammar,b,
     motifIdentity?{
       motifIdentity,
       motifTransform:arcAt(b).stage==='climax'?'contrast':
         arcAt(b).stage==='resolution'?'return':'variation'
     }:{
       density:clamp(pulseDensity*.68*arcAt(b).density,.25,.92),
       motif:motifPhrase,stage:arcAt(b).stage})):null;
 // M2 opt-in: emotional candidate selection, preserving legacy output when disabled.
 if(plan.musicDevelopment===true && root.PlotuneM2Phrase && sharedPhrases){
  const stages={opening:{tension:.18,energy:.25,tenderness:.65},development:{tension:.55,energy:.65,tenderness:.35},climax:{tension:.93,energy:.95,tenderness:.08},resolution:{tension:.08,energy:.22,tenderness:.9}};
  for(let b=0;b<bars;b++)sharedPhrases[b]=root.PlotuneM2Phrase.selectPhrase(sharedPhrases[b],
    {...stages[arcAt(b).stage],...(plan.phraseEmotion||{})},
    {seed:(seed^Math.imul(b+1,2654435761))>>>0,candidates:8}).events;
 }
 // M3 shared melody/harmony planning (opt-in).
 const m3JointPlan=plan.musicHarmony===true && sharedPhrases && root.PlotuneM3Harmony?
  root.PlotuneM3Harmony.plan(sharedPhrases,{progression:prog,tension:clamp(Number(plan.harmonicTension)||.45,0,1)}):null;
 if(m3JointPlan)for(let b=0;b<bars;b++)sharedPhrases[b]=m3JointPlan.phrases[b];
 // Repeat 4-bar thematic material; vary density and fills but keep a looping identity.
 for(let b=0;b<bars;b++){
  const chord=m3JointPlan?m3JointPlan.chords[b]:chordAt(b),next=m3JointPlan?m3JointPlan.chords[(b+1)%bars]:chordAt((b+1)%bars),barAt=b*meter;
  harmony.push({t:barAt,chord});
  const section=b%4;
  const lift=b%8===4||kind==='bright';
  const arcState=arcAt(b);
   const energy=clamp((section===2?1.08:section===3?.87:1)*(kind==='tense'?.76:kind==='effort'?1.12:1)*songEnergy*arcState.energy,.22,1.38);
  const isLast=b===bars-1;
  // Baseline original chord voicings, game ensemble uses bright, close four notes.
  for(const d of [0,2,4,6])add(barAt,step*15.2,midi(tonic,scale,chord+d)-12,'pad',.016*energy);
  for(let i=0;i<16;i++){
   const t=barAt+i*step,beat=i%4,on=i%8;
   // Shared melodic phrasing; arrangement and instruments remain style-specific.
   if(sharedPhrases){
    for(const event of sharedPhrases[b]){
     if(Math.floor(event.position)!==i||event.rest)continue;
     if(arcState.density<.8&&event.position>9&&event.position<13)continue;
     add(barAt+event.position*step,event.durationUnits*step,
       midi(leadRoot,scale,event.degree+chord+arcState.register),'lead',.125*energy);
    }
   }else if(i%2===0)add(t,step*1.55,midi(leadRoot,scale,motif[(i+section*2)%8]),'lead',.125*energy);
   // Counterpoint answers primary melody in a different octave.
   if(((i===3||i===7||i===11||i===15)&&!isLast||i===3||i===11)&& (pulseDensity>.5||i===3)){
    const response=motif[(i+3)%8]+(kind==='effort'?1:0);
    add(t,step*1.75,midi(tonic+12,scale,response-2),
     'counter',.046*energy);
   }
   // Layered keyboard chord stabs, routed separately from lush pad.
   let chordHit=i===0||i===8||(kind==='playful'?i===4||i===12:
       kind==='bright'?i===4||i===10:i===12);
   if(kind==='tense'||pulseDensity<.5)chordHit=i===0||i===8;
   if(shape==='stomp')chordHit=i%4===0;
   if(chordHit){
    const dur=step*(kind==='tense'?4:3.2);
    [0,2,4].forEach((degree,j)=>add(t+step*.045*j,dur,
      midi(tonic,scale,chord+degree),'chords',.042*energy));
   }
   // Independent fast arpeggiator; alternates with chord stabs.
   if((i%(game.arpEvery===4?4:game.arpEvery===2?2:1)===(game.arpEvery===4?3:game.arpEvery===2?1:0)) || kind==='effort'&&i%2===0 || kind==='playful'&&i%3===0){
    const arpDegree=chord+[0,2,4,6,4,2,0,4][Math.floor(i/2)%8];
    add(t,step*(kind==='tense'?2:1.25),
      midi(tonic+12,scale,arpDegree),'arp',.028*energy);
   }
   // Bass line is independent and changes its rhythmic intent with the story.
   if(i%4===0||game.bass==='running'&&i%2===0||game.bass==='bounce'&&i%4===3||kind==='effort'&&i%4===2||kind==='playful'&&i%4===3){
    const bassDegree=game.bass==='running'?chord+(i%8>=4?4:0):game.bass==='sustain'?chord:kind==='tense'?chord:
      kind==='effort'?chord+(i%8>=4?4:0):
      kind==='playful'?chord+[0,4,2,4][Math.floor(i/4)%4]:
      chord+(i===12?4:0);
    add(t,step*(kind==='tense'?4:2.8),
      midi(tonic-24,scale,bassDegree),'bass',.11*energy);
   }
   // Groove is selected from the entire plot, starting on the first beat.
   const drumMode=game.drums;
   if(drumMode==='ballad'){
     if(i%4===0)drum(t,'hat',.10*energy);
     if(i===0||i===8)drum(t,'kick',.22*energy);
     if(i===12)drum(t,'rim',.13*energy);
   }else if(drumMode==='suspense'){
     if(i%4===0)drum(t,'hat',.14*energy);
     if(i===0||i===11)drum(t,'kick',.33*energy);
     if(i===8)drum(t,'rim',.30*energy);
   }else if(drumMode==='march'){
     if(i%2===0)drum(t,'hat',.19*energy);
     if(i===0||i===8)drum(t,'kick',.42*energy);
     if(i===4||i===12)drum(t,'snare',.38*energy);
   }else if(drumMode==='heavy'){
     if(i%2===0)drum(t,'hat',.23*energy);
     if(i===0||i===3||i===8||i===11)drum(t,'kick',.59*energy);
     if(i===4||i===12)drum(t,'snare',.62*energy);
   }else if(drumMode==='race'||drumMode==='festival'){
     drum(t,'hat',.19*energy);
     if(i%4===0||i===6||i===14)drum(t,'kick',.45*energy);
     if(i%8===4)drum(t,'snare',.46*energy);
     if(i===0&&section===2)drum(t,'crash',.31*energy);
   }else if(drumMode==='shuffle'){
     if(i%3!==1)drum(t,'hat',.24*energy);
     if(i===0||i===7||i===8)drum(t,'kick',.40*energy);
     if(i===4||i===12)drum(t,'snare',.36*energy);
     if(i===15)drum(t,'rim',.25*energy);
   }else{
     if(i%2===0)drum(t,'hat',.18*energy);
     if(i===0||i===8)drum(t,'kick',.42*energy);
     if((i===4||i===12)&&drumMode!=='light')drum(t,'snare',.38*energy);
     if(i===12&&drumMode==='light')drum(t,'rim',.21*energy);
   }
   // Glitter is short and rare; it must not mask the lead.
   if(i===3||i===11&&lift || shape==='spark'&&i===7)add(t,step*3.1,midi(tonic+24,scale,chord+4),
      'sparkle',.028*energy);
  }
  // Soft pickup to the next loop avoids terminal success cadence.
  if(isLast)add(barAt+14*step,step*1.7,midi(tonic+12,scale,next),'counter',.034);
 }
 // Re-orchestrate all layers for melancholy and dread. Pop/arpeggio
 // rhythms are deliberately removed; sustained melody and silence matter.
 const emotional=MOODS[plan.gameStyle];
 if(emotional){
  const moved=[];
  const phraseSeconds=Math.max(.1,step*emotional.phrase);
  const intervals=emotional.kind==='melancholy'?[0,-2,-4,-2]:[0,-1,-3,-2];
  let previous=-100;
  const lead=notes.filter(n=>n.voice==='lead');
  for(let i=0;i<lead.length;i++){
   const n=lead[i],cell=Math.floor(n.t/meter),phase=n.t-cell*meter;
   if(phase>step*.4&&phase<step*5.5 ||phase>step*8&&phase<step*12)continue;
   if(n.t-previous<phraseSeconds*.85)continue;
   previous=n.t;
   const register=emotional.register;
   moved.push({...n,midi:clamp(n.midi+register+intervals[i%4],36,85),
      d:Math.min(duration-n.t,phraseSeconds),volume:n.volume*emotional.lead});
  }
  for(const n of notes){
   if(n.voice==='lead')continue;
   const beat=Math.round((n.t%meter)/step);
   if(n.voice==='arp'||n.voice==='sparkle')continue;
   if(n.voice==='counter'&&emotional.kind==='melancholy')continue;
   if(n.voice==='chords'&&beat!==0)continue;
   if(n.voice==='bass'&&beat!==0&&!(emotional.kind==='uneasy'&&beat===8))continue;
   moved.push({...n,d:Math.min(duration-n.t,
     n.voice==='bass'?step*11:n.voice==='chords'?step*13:n.d),
     volume:n.volume*(n.voice==='bass'?.72:n.voice==='chords'?.82:1)});
  }
  notes.length=0;notes.push(...moved);
  const quieter=drums.filter(d=>{
   const beat=Math.round((d.t%meter)/step);
   return d.kind==='kick'&&beat===0||d.kind==='rim'&&beat===12||
       emotional.kind==='uneasy'&&d.kind==='rim'&&beat===8;
  }).map(d=>({...d,volume:d.volume*emotional.drum}));
  // Even when no original rim existed, keep slow restrained movement.
  for(let b=0;b<bars;b++){
   const start=b*meter;
   if(!quieter.some(n=>Math.abs(n.t-start)<.0001))quieter.push({t:start,kind:'kick',volume:.08});
   const late=start+step*10;
   if(late<duration)quieter.push({t:late,kind:'rim',volume:.08});
  }
  drums.length=0;drums.push(...quieter);
  for(const k of Object.keys(voices))voices[k]=k==='drums'?drums.length:notes.filter(n=>n.voice===k).length;
 }
 // Dedicated arrangement: genuine music box and flute are not brighter
 // versions of the pop lead. Remove pop ostinati and compose a contrasting
 // melody + accompaniment beginning in the first bar of every loop.
 if(palette){
   const originalNotes=notes.slice();
   notes.length=0;drums.length=0;
   const isFlute=['flute','ocarina'].includes(palette.family);
   const isSynth=palette.family==='synthlead';
   const isSoft=['strings','softpiano'].includes(palette.family);
   const isPluck=['harp','kalimba','marimba','celesta'].includes(palette.family);
   const isBreath=isFlute;
   const isBox=palette.family==='musicbox';
   const isBell=palette.family==='bell';
   // Phrase contour belongs to the dramatic style, while timbre belongs to
  // the chosen scene. This preserves the selected preset's emotion.
  const phrase=[0,2,4,3,1,2,0,-1],hero=[0,2,4,5,4,2,6,4];
   const sorrow=[0,-1,-3,-2,-4,-3,-5,-2];
   const mystic=[0,1,-2,3,-1,2,-3,1];
   const playful=[0,3,1,4,2,5,1,3];
   const line=palette.rhythm==='sparse'?sorrow:
     palette.rhythm==='mystery'?mystic:
     palette.rhythm==='playful'?playful:
     palette.rhythm==='hero'?hero:
     isFlute||isSynth?hero:phrase;
   const cadence=isFlute||isSynth?[0,4,5,3]:[5,3,1,4];
   for(let b=0;b<bars;b++){
     const start=b*meter,degree=prog[b%prog.length];
     const basis=midi(tonic+12,scale,degree);
     const sadMode=['sadness','lonely','farewell','rain'].includes(plan.gameStyle);
     const heroicMode=['retry','victory','battle','journey'].includes(plan.gameStyle);
     const playfulMode=['proud','mischief','fun','prank','failure'].includes(plan.gameStyle);
     const unit=sadMode?4:heroicMode?2:playfulMode?2:
       isBreath||isSynth?2:isPluck?3:4; // scene and preset both shape rhythm
     for(let slot=0;slot<16;slot+=unit){
       const t=start+slot*step;if(t>=duration)continue;
       const ordinal=Math.floor(slot/unit);
       // Silent gaps and phrase resolution are intentional.
       if(!isBreath&&!isSynth&&slot>=12&&b%2===1)continue;
       const move=line[(ordinal+b%4)%8]+((isBreath||isSynth)&&b%4===3?2:0);
       // Carry the opt-in motif transformation through the palette renderer.
       // Otherwise this renderer replaces the shared lead and loses the change.
       const sourceEvent=motifIdentity&&motifPhrase[ordinal%motifPhrase.length];
       const evolvedEvent=motifIdentity&&sharedPhrases[b]?.[ordinal%sharedPhrases[b].length];
       const motifShift=sourceEvent&&evolvedEvent?evolvedEvent.degree-sourceEvent.degree:0;
       const midiValue=clamp(basis+move+motifShift+(isBell?-12:0)+(palette.family==='strings'?-7:0),46,92);
       const len=step*(sadMode?(ordinal%4===3?5.5:3.7):
         heroicMode?(ordinal%4===3?3.2:1.8):
         playfulMode?1.35:isBreath?(ordinal%4===3?3.2:1.8):
         isSynth?(ordinal%4===3?3.3:1.95):isSoft?7.5:
         isPluck?2.8:isBox?3.55:7.2);
       notes.push({t,d:Math.min(len,duration-t),midi:midiValue,
         voice:'lead',role:'lead',timbre:palette.family,volume:isBreath?.124:isSynth?.115:isBell?.09:isSoft?.069:.096});
       if((isBreath||isSynth)&&ordinal%4===1){
         // A quiet counter-line supports resolve without busy pop arpeggios.
         notes.push({t,d:Math.min(step*2.2,duration-t),
           midi:clamp(basis+move-12,40,79),
           voice:'counter',role:'counter',timbre:palette.secondary||'kalimba',volume:.033});
       }
     }
     // Very light chord/pad accompaniment. Small ringing gestures for bells;
     // flute themes get a stable bass and heartbeat instead.
     for(const offset of [0,2,4]){
       const tone=midi(tonic-12,scale,degree+offset);
       notes.push({t:start,d:Math.min(meter*.94,duration-start),midi:tone,
         voice:'pad',role:'pad',timbre:palette.padTone||'synthpad',volume:(isBreath||isSynth)?.028:.016});
     }
     if(isBreath||isSynth){
       for(const i of [0,8]){
         const t=start+i*step;
         notes.push({t,d:Math.min(step*6.6,duration-t),
           midi:midi(tonic-24,scale,degree),voice:'bass',role:'bass',volume:.062});
         if(palette.drums==='pulse')drums.push({t,kind:'kick',volume:.22});
       }
       if(palette.drums==='pulse')drums.push({t:start+step*12,kind:'rim',volume:.14});
       if(palette.drums==='suspense')drums.push({t:start,kind:'kick',volume:.13});
       if(palette.drums==='soft')drums.push({t:start+step*8,kind:'rim',volume:.12});
     }else{
       notes.push({t:start,d:Math.min(meter*.95,duration-start),
         midi:midi(tonic-24,scale,degree),voice:'bass',role:'bass',volume:.027});
     }
     if((isBox||isBell||isPluck)&&b%2===0&&!['sadness','lonely','farewell'].includes(plan.gameStyle)){
       const t=start+step*10;
       notes.push({t,d:Math.min(step*5,duration-t),
         midi:clamp(basis+12,59,103),
         voice:'sparkle',role:'sparkle',timbre:palette.secondary||'celesta',volume:Math.max(.024,palette.bell*.019)});
     }
   }
   for(const key of Object.keys(voices))
     voices[key]=key==='drums'?drums.length:notes.filter(n=>n.voice===key).length;
 }
  // Character identity shapes a repeatable motif, while scene changes its
  // variation, register, rhythmic spaces and timbre in every emotion preset.
  if(plan.gameStyle==='sadness' && !plan.emotionalArc){
    notes.length=0;drums.length=0;
    const context=String(plan.storyContext||'');
    const charRand=random(((plan.characterSeed||1)^0x529a3d71)>>>0);
    const sceneRand=random(((plan.seed||1)^0x12b6a90f)>>>0);
    const ex=plan.expression||null,cm=ex?.motif||{};
    const playful=Math.max(dna.bounce,cm.bounce||0)>.45;
    const reserved=!playful&&Math.max(dna.hesitation,cm.hesitation||0)>.3;
    const type=playful?'playful':reserved?'reserved':'neutral';
    const expressive=/森|魔法|星|神秘|妖精/.test(context)?['ocarina','celesta']:
      /未来|宇宙|電子|機械|ロボット/.test(context)?['synthlead','kalimba']:
      reserved?['softpiano','musicbox']:
      /強気|勝負|負けず嫌い|悔し/.test(context)?['marimba','kalimba']:
      ['kalimba','musicbox'];
    const pent=[0,1,2,4,5],motif=Array.from({length:8},()=>pent[Math.floor(charRand()*pent.length)]);
    const upper=tonic+12+(dna.small?2:0),shift=Math.floor(sceneRand()*3)-1;
    // Distinct melodic grammars: contour is generated before choosing timing or timbre.
    // Playful: leaps, repeated peaks, little falls and recovery.
    // Reserved: narrow stepwise line, suspended notes, descent and withheld resolution.
    const contour={
      playful:[0,3,5,2,6,4,5,1],
      reserved:[4,4,3,2,2,1,1,0],
      neutral:[1,2,3,2,4,3,2,1]
    };
    const dynamicGrammar=root.PlotuneMelodicGrammar?.grammar(plan.structure,plan.expression,plan.characterSeed||1)||null;
    const contourDegrees=contour[type];
    const contourIdentity=Math.floor(charRand()*3);
    const degreeFor=(index,bar)=>{
      const phraseShift=bar%4===0?0:bar%4===1?1:bar%4===2?-1:0;
      const base=contourDegrees[index%contourDegrees.length];
      const identity=type==='playful'?(contourIdentity===2&&index%3===0?1:0):
        type==='reserved'?(contourIdentity===1&&index%4===0?-1:0):
        (contourIdentity===0&&index%3===0?1:0);
      return Math.max(0,base+identity+phraseShift+(bar%4===3&&index===contourDegrees.length-1?-1:0));
    };
    // Different rhythmic grammars, not small offsets to one shared 8-note grid.
    // The slots are sixteenth-note units within a 16-slot bar.
    const phrases={
      playful:[{p:0,d:1.0,k:0},{p:1.5,d:.8,k:2},{p:3,d:1.1,k:4},
        {p:5.5,d:.75,k:3},{p:6.5,d:1.1,k:5},{p:9,d:1.3,k:2},
        {p:11.5,d:1,k:4},{p:13,d:2.2,k:1}],
      reserved:[{p:1.0,d:3.0,k:0},{p:5.0,d:2.6,k:1},
        {p:9.0,d:3.4,k:2},{p:14,d:1.7,k:1}],
      neutral:[{p:0,d:2.2,k:0},{p:3,d:2,k:1},{p:6,d:1.8,k:3},
        {p:10,d:2.4,k:2},{p:13,d:2.1,k:1}]
    };
    const generatedPhrases=dynamicGrammar&&root.PlotuneMelodicGrammar?.composePhrase?Array.from({length:bars},(_,b)=>root.PlotuneMelodicGrammar.composePhrase(dynamicGrammar,b,{density:type==='reserved'?.38:type==='playful'?.85:.62})):null;
    const chordSteps=type==='playful'?[0,4,3,0]:type==='reserved'?[0,5,3,0]:[0,3,4,0];
    for(let bar=0;bar<bars;bar++){
      const start=bar*meter,variation=bar%4,degree=chordSteps[variation];
      const phrase=phrases[type],unit=meter/16;
      for(let j=0;j<(generatedPhrases?.[bar]?.length||phrase.length);j++){
        const generated=generatedPhrases?.[bar]?.[j];
        const n=phrase[j%phrase.length],t=start+(generated?generated.position:n.p)*unit;
        if(t>=duration||generated?.rest)continue;
        const pitch=(generated?generated.degree:degreeFor(j,bar))+shift;
        notes.push({t,d:Math.min(duration-t,(generated?generated.durationUnits:n.d)*unit),midi:clamp(midi(upper,MAJOR,pitch),60,86),
          voice:'lead',role:'lead',timbre:expressive[0],volume:type==='reserved'?.052:.070});
      }
      // Companion phrases and accompaniment must reflect the same grammar.
      const reply=start+(type==='playful'?7.7:type==='reserved'?12.2:9.7)*unit;
      if(reply<duration)notes.push({t:reply,d:Math.min(duration-reply,(type==='reserved'?3:1.2)*unit),
        midi:midi(upper,MAJOR,degreeFor(type==='playful'?5:2,bar)),voice:'counter',role:'counter',
        timbre:expressive[1],volume:.016});
      const chordPositions=type==='playful'?[0,7,12]:type==='reserved'?[0]:[0,8];
      for(const p of chordPositions){
        for(const interval of [0,2,4]){
          const t=start+p*unit;
          if(t<duration)notes.push({t,d:Math.min(duration-t,(type==='reserved'?14:3.3)*unit),
            midi:midi(tonic,MAJOR,degree+interval),voice:'chords',role:'chords',
            timbre:'softpiano',volume:type==='playful'?.012:.009});
        }
      }
      if(start<duration)notes.push({t:start,d:Math.min(duration-start,(type==='reserved'?12:4)*unit),
        midi:midi(tonic-12,MAJOR,degree),voice:'bass',role:'bass',timbre:'kalimba',volume:.011});
    }
    // Sparse orchestral colours, independent of the lead melody.
    // The number of layers is bounded to preserve the gentle sadness preset.
    const world=plan.structure?.world||{};
    const worldHas=(key,val)=>Array.isArray(world[key]?.value)?world[key].value.includes(val):world[key]?.value===val;
    const mystic=worldHas('magicSystem','magic')||worldHas('location','forest');
    const indoors=worldHas('location','room');
    const textureLead=mystic?'ocarina':indoors?'softpiano':expressive[0];
    for(const n of notes){
      if(n.voice==='lead'){
        n.timbre=textureLead;
        // Slightly varied articulation and dynamics by phrase position.
        const place=Math.round((n.t%meter)/(meter/16));
        n.volume*=place<3?1.06:place>12?.81:.94;
      }
    }
    for(let bar=0;bar<bars;bar++){
      const start=bar*meter,degree=chordSteps[bar%4],unit=meter/16;
      // Contrasting sustained background texture, below the melody.
      if(bar%2===0){
        for(const offset of [0,4]){
          const t=start;
          if(t<duration)notes.push({t,d:Math.min(duration-t,meter*1.67),
            midi:midi(tonic-12,MAJOR,degree+offset),voice:'pad',role:'pad',
            timbre:mystic?'synthpad':'strings',volume:.009});
        }
      }
      // Gentle replies on alternate bars, not a constant second melody.
      if(bar%2===1){
        const t=start+(type==='playful'?10:11)*unit;
        if(t<duration)notes.push({t,d:Math.min(duration-t,2.8*unit),
          midi:midi(tonic+12,MAJOR,degree+2),voice:'counter',role:'counter',
          timbre:indoors?'celesta':'musicbox',volume:.018});
      }
      // Very light sparkling pickup only where the phrasing has room.
      if((bar%4===1||bar%4===3)){
        const t=start+14*unit;
        if(t<duration)notes.push({t,d:Math.min(duration-t,1.6*unit),
          midi:midi(tonic+24,MAJOR,degree+4),voice:'sparkle',role:'sparkle',
          timbre:mystic?'celesta':'kalimba',volume:.009});
      }
    }
    for(const key of Object.keys(voices))
      voices[key]=key==='drums'?0:notes.filter(n=>n.voice===key).length;
  }
 // A musically structural emotional arc, not an arbitrary volume fade:
 // hopeful ascent -> unresolved minor-second clash -> descending bass/lead
 // -> near-silence. The unresolved tone is intentionally brief and never
 // replaces the entire original melody or its selected timbre.
 const arc=plan.emotionalArc;
 const arcDynamics=arc?.type==='grief'?[
  {name:'抑える',start:0,end:.25},
  {name:'期待が高まる',start:.25,end:.55},
  {name:'崩れる',start:.55,end:.77},
  {name:'余韻',start:.77,end:1}
 ]:null;
 if(arcDynamics){
  const boundary=p=>Math.max(0,Math.min(duration-.01,Math.round(p*bars)*meter));
  const climb=boundary(.25),breakAt=boundary(.55),after=boundary(.77);
  const stages=[
   {name:'抑える',from:0,to:climb},
   {name:'期待が高まる',from:climb,to:breakAt},
   {name:'崩れる',from:breakAt,to:after},
   {name:'余韻',from:after,to:duration}
  ];
  // Protect small 15-second loops by using the actual temporal boundaries.
  for(const n of notes){
   const t=n.t,section=t<climb?0:t<breakAt?1:t<after?2:3;
   n.arcStage=stages[section].name;
   if(n.voice==='lead'){
    if(section===0){n.volume*=.53;n.midi=clamp(n.midi-3,24,105);}
    if(section===1){
     const rise=(t-climb)/Math.max(.1,breakAt-climb);
     n.midi=clamp(n.midi+Math.round(rise*7),24,105);
     n.volume*=.78+rise*.42;
     n.d=Math.min(duration-t,n.d*(1.12+rise*.35));
    }
    if(section===2){
     n.midi=clamp(n.midi-5-Math.round((t-breakAt)/Math.max(.1,after-breakAt)*6),24,105);
     n.volume*=.69;
     n.d=Math.min(duration-t,n.d*1.6);
    }
    if(section===3){n.midi=clamp(n.midi-12,24,105);n.volume*=.26;}
   }else if(n.voice==='bass'){
    if(section===1)n.volume*=1.20;
    if(section===2){n.midi=clamp(n.midi-4,24,105);n.volume*=.97;}
    if(section===3){n.midi=clamp(n.midi-7,24,105);n.volume*=.25;}
   }else{
    n.volume*=section===0?.60:section===1?1.15:section===2?.72:.17;
   }
  }
  for(let i=drums.length-1;i>=0;i--){
   const d=drums[i],section=d.t<climb?0:d.t<breakAt?1:d.t<after?2:3;
   if(section===3||section===0&&d.kind!=='kick'){drums.splice(i,1);continue;}
   d.volume*=section===1?.55:.14;
  }
  // The high expectation and its collapse are distinct EVENTS, rather than
  // repeated identical four-bar patterns.
  const source=notes.find(n=>n.voice==='lead');
  const leadTimbre=source?.timbre||palette?.family||'ocarina';
  const rootDegree=prog[Math.min(prog.length-1,Math.floor(breakAt/meter)%prog.length)];
  const unstable=midi(tonic+12,scale,rootDegree+4)+1;
  const suspenseDur=Math.min(step*4.3,Math.max(.12,after-breakAt));
  notes.push({t:breakAt,d:suspenseDur,midi:clamp(unstable,40,99),
   voice:'lead',role:'lead',timbre:leadTimbre,arcStage:'崩れる',
   arcMarker:'unresolved',volume:arc.strength==='full'?.115:.082});
  // Hold the diatonic neighboring tone to create audible dissonance.
  notes.push({t:breakAt,d:Math.min(step*5,after-breakAt),
   midi:clamp(unstable-1,40,99),voice:'pad',role:'pad',
   timbre:palette?.padTone||'strings',arcMarker:'suspension',volume:.045});
  const drop=[0,-2,-5,-9];
  drop.forEach((interval,index)=>{
   const t=breakAt+(after-breakAt)*(index/4);
   if(t>=duration)return;
   notes.push({t,d:Math.min(step*2,duration-t),midi:clamp(tonic-16+interval,24,86),
    voice:'bass',role:'bass',arcMarker:'falling-bass',volume:.077*(1-index*.15)});
  });
  // Gravitational low register: the collapse must have weight AFTER
  // the high melody disappears. A sustained sub-bass pedal, dark bowed
  // midrange and a low unresolved semitone create the "どよん" sensation.
  // Avoid adding bright ornaments or an upbeat rhythmic pulse.
  const heavyStart=Math.max(0,breakAt-step*2);
  const heavyEnd=duration;
  const gravityRoot=clamp(tonic-30,28,48);
  notes.push({t:heavyStart,d:Math.min(heavyEnd-heavyStart,step*13),
   midi:gravityRoot,voice:'bass',role:'bass',timbre:'synthpad',
   arcMarker:'gravity-pedal',volume:arc.strength==='full'?.138:.108});
  const gravityT=Math.min(duration-.08,breakAt+step*2);
  const gravityNotes=[0,1,7].map((interval,i)=>({
   t:gravityT,d:Math.min(duration-gravityT,step*(i===2?10:12)),
   midi:clamp(tonic-18+interval,35,65),
   voice:'pad',role:'pad',timbre:'strings',
   arcMarker:'dark-cluster',volume:i===2?.038:.060
  }));
  notes.push(...gravityNotes);
  // The bass falls below the pad and *stays* there into the aftermath.
  const floorT=Math.max(gravityT,after-step*.6);
  notes.push({t:floorT,d:Math.min(duration-floorT,step*10.5),
   midi:clamp(gravityRoot-5,24,44),voice:'bass',role:'bass',
   timbre:'synthpad',arcMarker:'gravity-floor',volume:.105});
  // Hollow final fifth: omit the tonic's major third, keeping resolution
  // emotionally incomplete while avoiding permanent harsh dissonance.
  notes.push({t:after,d:Math.min(duration-after,step*10),
   midi:clamp(tonic-19,29,64),voice:'pad',role:'pad',
   timbre:'strings',arcMarker:'hollow-afterglow',volume:.038});
  // End with one low, soft answering note rather than a triumphant cadence.
  notes.push({t:after,d:Math.min(duration-after,step*6.2),
   midi:clamp(tonic-12,24,85),voice:'lead',role:'lead',timbre:leadTimbre,
   arcMarker:'afterglow',arcStage:'余韻',volume:.045});
  for(const key of Object.keys(voices))
   voices[key]=key==='drums'?drums.length:notes.filter(n=>n.voice===key).length;
  arcDynamics.forEach((stage,i)=>{stage.start=stages[i].from/duration;stage.end=stages[i].to/duration;});
 }
 // Character-specific rhythmic phrasing: distinct onsets, rests and durations.
 // These body/temperament mappings are creative hypotheses, not universal laws.
 const expression=plan.expression||null;
 if(expression){
   const m=expression.motif||{},e=expression.emotion||{},o=expression.orchestration||{};
   const lively=plan.gameStyle!=='sadness'&&m.bounce>.45,careful=plan.gameStyle!=='sadness'&&m.hesitation>.3;
   const phraseStep=Math.max(.04,step);
   for(const n of notes){
     if(n.voice==='lead'){
       const pos=Math.round(n.t/phraseStep);
       if(lively){
         // Light syncopation and short pickups instead of identical even eighth notes.
         const pattern=[0,-.40,0,.25,-.30,0,.35,-.20];
         n.t=Math.max(0,Math.min(duration-.04,n.t+pattern[pos%8]*phraseStep));
         n.d=Math.max(.07,Math.min(duration-n.t,n.d*(pos%3===0?.62:.83)));
         if(pos%8===2||pos%8===6)n.midi=clamp(n.midi+Math.round(2*m.bounce+1),36,100);
         n.volume*=pos%4===0?1.10:.96;
       }else if(careful){
         // Long breaths: fewer lead attacks, late entries, connected sustained notes.
         if(pos%8===3||pos%8===6){n.volume=0;n.d=.06;}
         else{
           n.t=Math.max(0,Math.min(duration-.04,n.t+(pos%8===0?.55:.22)*phraseStep));
           n.d=Math.max(.07,Math.min(duration-n.t,n.d*(pos%8===1?1.95:1.55)));
           n.volume*=pos%8===0?.73:.92;
         }
       }
       if(m.register)n.midi=clamp(n.midi+m.register,36,100);
     }
     if(n.voice==='counter'&&lively){
       n.t=Math.max(0,Math.min(duration-.04,n.t-.30*phraseStep));
       n.d=Math.min(n.d*.72,duration-n.t);
     }
     if(n.voice==='chords'){
       if(lively){
         if(Math.round(n.t/phraseStep)%8===0)n.d=Math.max(.09,Math.min(n.d*.64,duration-n.t));
       }else if(careful){
         n.d=Math.min(duration-n.t,n.d*1.45);
         n.volume*=.82;
       }
     }
     if(e.mildSadness&&!e.grief&&n.voice==='bass')n.volume*=.78;
     if(o.family&&n.voice==='lead'&&!n.timbre)n.timbre=o.family;
   }
   notes.sort((a,b)=>a.t-b.t);
 }
 // Apply the same arrangement to notes added by specialist layers after add().
 // Recount roles so diagnostics reflect the audible arrangement.
 for(let i=notes.length-1;i>=0;i--){
  const n=notes[i],mix=arrangementAt(n.t)[n.voice]??1;
  if(mix===0){notes.splice(i,1);continue;}
  if(n.role!==n.voice)n.volume=clamp(n.volume*mix,0,.26);
 }
 for(let i=drums.length-1;i>=0;i--){
  const hit=drums[i],mix=arrangementAt(hit.t).drums;
  if(mix===0)drums.splice(i,1);
 }
 // Apply research-backed *dimensions* after character/scene composition.
 // Numeric amounts are our implementation choices; not paper coefficients.
 const cues=expression?.researchCues||null;
 if(cues){
   for(const n of notes){
     if(n.voice==='lead'||n.voice==='counter'){
       n.midi=clamp(n.midi+cues.registerSemitones,36,100);
       n.d=Math.max(.04,Math.min(duration-n.t,n.d*cues.articulationFactor));
       n.volume*=cues.dynamicsFactor;
     }else if(n.voice==='chords'||n.voice==='pad') n.volume*=Math.sqrt(cues.dynamicsFactor);
   }
 }
 // M4 opt-in: rebuild counterpoint after the instrument-specific renderers.
 // This affects the notes heard by the synthesizer, not just an abstract plan.
 const voiceDialogue=plan.musicVoices===true&&root.PlotuneM4Voices?
   root.PlotuneM4Voices.arrange({notes,harmony,duration,meter,step,seed,wholeTrackArc,tonic,scale,
     secondaryTone:palette?.secondary}):null;
 if(voiceDialogue){
  notes.length=0;notes.push(...voiceDialogue.notes);
  for(const key of Object.keys(voices))
   if(key!=='drums')voices[key]=notes.filter(n=>n.voice===key).length;
 }
 // M5 is applied after M4 to the final events actually rendered to PCM.
 const performance=plan.musicPerformance===true&&root.PlotuneM5Performance?
   root.PlotuneM5Performance.express({notes,duration,meter,seed,wholeTrackArc,
     leadTone:palette?.family||game.lead,secondaryTone:palette?.secondary}):null;
 if(performance){
  notes.length=0;notes.push(...performance.notes);
  for(const key of Object.keys(voices))
   if(key!=='drums')voices[key]=notes.filter(n=>n.voice===key).length;
 }
 const details={
  performance:performance?performance.details:null,
  voiceDialogue:voiceDialogue?{responseCount:voiceDialogue.responseCount,
   replies:voiceDialogue.responses.map(x=>({bar:x.bar,stage:x.stage,mode:x.mode,from:x.from,until:x.until})),
   imitationTypes:voiceDialogue.imitationTypes}:null,
  musicPsychology:expression,researchApplied:cues?{...cues,appliedTo:['lead register','lead/counter articulation','note dynamics','synth brightness','reflection wetness'],tempoStatus:'not applied (preset BPM retained)',modeStatus:'not applied (style harmony retained)'}:null,structuredStory:plan.structure||null,
  genre:'game',gameStyle:plan.gameStyle||'journey',gameName:game.name,emotionMode:game.mode,groove:game.drums,shape,
  loopMode:true,loopBars:bars,bpm,theme:motif,parts:voices,wholeTrackArc,arrangementProfiles,motifDevelopment:sharedPhrases?'opening → variation → climax → reprise':null,
  emotionalProfile:emotional?.kind||null,
  emotionalArc:arcDynamics?{type:'grief',strength:arc.strength,stages:arcDynamics,gravity:'low-pedal-and-unresolved-cluster',reason:arc.reason}:null,
  storyInstrument:palette?{...palette}:null,
  instrumentSelection:plan.instrumentChoice?{style:plan.instrumentChoice.style,reason:plan.instrumentChoice.reason,
    evidence:plan.instrumentChoice.evidence,confidence:plan.instrumentChoice.confidence}:null,
  globalArrangement:transform?{preset:kind,label:concept.label,reason:concept.reason}:null,
  instruments:Object.keys(voices),palette:voices,
  melodyNotes:voices.lead,counterMelodyNotes:voices.counter,
  accompanimentNotes:voices.chords+voices.pad+voices.arp,
  bassNotes:voices.bass,percussionHits:voices.drums,
  breaks:0,shiftedChords:transform?bars:0,cueHits:transform?1:0,
  harmonyChanges:harmony.length,rests,events:[],harmonies:harmony
 };
 return {notes,drums,rests,harmony,theme:motif,details,genre:'game',
  duration,bpm,sampleRate:SR};
}
function render(plan){
 const s=score(plan),N=Math.round(s.duration*SR),out=new Float32Array(N);
 const leadTone=STYLES[plan.gameStyle]?.lead||'bright';
 const emotional=MOODS[plan.gameStyle]||null;
 const cues=plan.expression?.researchCues||null;
 const palette=plan.instrumentChoice?.palette||STORY_INSTRUMENTS[plan.gameStyle]||null;
 function timbreWave(name,phase){
  const s=Math.sin(TAU*phase),s2=Math.sin(TAU*phase*2),s3=Math.sin(TAU*phase*3);
  const x=phase-Math.floor(phase),tri=1-4*Math.abs(x-.5);
  switch(name){
   case 'ocarina':return .92*s+.055*s2+.025*s3;
   case 'synthlead':return .35*s+.31*tri+.23*Math.sin(TAU*phase*1.006)+.11*s2;
   case 'synthpad':return .46*s+.28*Math.sin(TAU*phase*.997)+.18*Math.sin(TAU*phase*1.005)+.08*tri;
   case 'kalimba':return .74*s+.17*Math.sin(TAU*phase*2.01)+.09*Math.sin(TAU*phase*4.13);
   case 'harp':return .76*s+.15*s2+.07*s3+.02*Math.sin(TAU*phase*4);
   case 'marimba':return .76*s+.17*Math.sin(TAU*phase*3.96)+.07*Math.sin(TAU*phase*9.12);
   case 'strings':return .47*s+.31*Math.sin(TAU*phase*1.007)+.16*s2+.06*s3;
   case 'celesta':return .66*s+.21*Math.sin(TAU*phase*2.98)+.13*Math.sin(TAU*phase*5.37);
   case 'musicbox':return .79*s+.15*Math.sin(TAU*phase*2.01)+.06*Math.sin(TAU*phase*3.96);
   case 'bell':return .49*s+.26*Math.sin(TAU*phase*2.42)+.17*Math.sin(TAU*phase*3.8)+.08*Math.sin(TAU*phase*5.4);
   case 'flute':return .88*s+.09*s2+.03*s3;
   case 'softpiano':return .72*s+.20*s2+.08*Math.sin(TAU*phase*3.01);
   default:return null;
  }
 }
 function wave(voice,phase,timbre){
  const special=timbre?timbreWave(timbre,phase):null;
  if(special!==null)return special;
  const x=phase-Math.floor(phase),sin=Math.sin(TAU*phase),sin2=Math.sin(TAU*phase*2);
  switch(voice){
   case 'lead':
     if(palette?.family==='musicbox')return .79*sin+.15*Math.sin(TAU*phase*2.01)+.06*Math.sin(TAU*phase*3.96);
     if(palette?.family==='bell')return .49*sin+.26*Math.sin(TAU*phase*2.42)+.17*Math.sin(TAU*phase*3.8)+.08*Math.sin(TAU*phase*5.4);
     if(palette?.family==='flute')return .88*sin+.09*sin2+.03*Math.sin(TAU*phase*3);
     if(palette?.family==='softpiano')return .72*sin+.20*sin2+.08*Math.sin(TAU*phase*3.01);
     return leadTone==='reed'?.66*(x<.5?1:-1)+.24*sin:
     leadTone==='glass'?.70*sin+.25*Math.sin(TAU*phase*2.004):
     leadTone==='warm'?.67*sin+.21*sin2+.08*Math.sin(TAU*phase*3):
     .45*(x<.5?1:-1)+.33*sin+.11*sin2;
   case 'counter':return .66*sin+.22*sin2+.07*Math.sin(TAU*phase*3);
   case 'chords':return .47*sin+.27*sin2+.16*Math.sin(TAU*phase*3);
   case 'arp':return .62*sin+.24*Math.sin(TAU*phase*2.012)+.12*Math.sin(TAU*phase*4.01);
   case 'pad':return .59*sin+.24*Math.sin(TAU*phase*.998);
   case 'bass':return .77*sin+.20*sin2;
   case 'sparkle':return .70*sin+.22*Math.sin(TAU*phase*2.01)+.08*Math.sin(TAU*phase*4.02);
  }
  return sin;
 }
 // Keep event generation deterministic and stable across A/B.
 for(const n of s.notes){
  const start=Math.floor(n.t*SR),length=Math.min(N-start,Math.floor(n.d*SR));
  const freq=440*Math.pow(2,(n.midi-69)/12);
  const timbre=n.timbre||(palette&&n.voice==='lead'?palette.family:null);
  const wind=['flute','ocarina'].includes(timbre);
  const bowed=['strings','synthpad'].includes(timbre);
  const struck=['musicbox','bell','kalimba','harp','marimba','celesta','softpiano'].includes(timbre);
  const attack=wind?.08:bowed?.18:struck?.003:n.voice==='pad'?.08:.007;
  const release=wind?.24:bowed?.39:struck?.18:n.voice==='pad'?.23:.08;
  const decay=wind?.07:bowed?.04:
     timbre==='marimba'?2.7:timbre==='kalimba'?1.5:
     timbre==='harp'?1.12:timbre==='celesta'?.82:
     timbre==='musicbox'?1.65:timbre==='bell'?.86:
     timbre==='softpiano'?.95:
     n.voice==='pad'?.12:n.voice==='arp'?.9:n.voice==='sparkle'?1.8:emotional?.kind==='melancholy'?.12:.34;
  let phase=0,prev=0,noiseState=(Math.imul(n.midi+17,2654435761)^Math.floor(n.t*1000))>>>0;
  const expressiveTone=['ocarina','flute','strings','synthpad','softpiano','kalimba','celesta','musicbox','harp','marimba'].includes(timbre);
  for(let i=0;i<length;i++){
   const x=i/SR,env=Math.min(1,x/attack,(n.d-x)/release)*Math.exp(-decay*x);
   const vibrato=(wind&&x>.12?.0028*Math.sin(TAU*4.8*(x-.12)):bowed?.0018*Math.sin(TAU*5.1*x):0);
   phase+=freq*(1+vibrato)/SR;
   let y=wave(n.voice,phase,timbre);
   if(expressiveTone){
     // Attacks contain a short nonperiodic transient; sustained notes gently darken.
     noiseState^=noiseState<<13;noiseState^=noiseState>>>17;noiseState^=noiseState<<5;
     const noise=((noiseState>>>0)/2147483648-1);
     const transient=wind?.016:struck?.065:.009;
     y+=noise*transient*Math.exp(-x*(wind?24:75));
     const harmonics=struck?.20:wind?.07:bowed?.14:.12;
     y+=harmonics*Math.sin(TAU*phase*2.012)*Math.exp(-x*(struck?8.3:1.2));
     if(timbre==='softpiano'||timbre==='kalimba'||timbre==='marimba'){
       y+=.095*Math.sin(TAU*phase*3.993)*Math.exp(-x*12);
     }
   }
   // One-pole filter emulates a small sample-ROM / FM-style mellowing.
   const smoothing=wind?.23:bowed?.17:timbre==='marimba'?.72:timbre==='synthlead'?.61:timbre==='harp'?.47:timbre==='kalimba'?.55:palette?.family==='musicbox'?.49:palette?.family==='bell'?.62:
     emotional?.kind==='melancholy'?.23:emotional?.kind==='uneasy'?.38:n.voice==='chords'?.50:n.voice==='pad'?.28:.74;
   prev=prev*(1-smoothing)+y*smoothing;
   const brightness=cues?.brightness??1;
   out[start+i]+=prev*n.volume*clamp(env,0,1)*(.76+.24*brightness);
  }
 }
 const r=random((plan.seed^0x7ca1f3d2)>>>0);
 for(const hit of s.drums){
  const start=Math.floor(hit.t*SR),len=Math.min(N-start,Math.floor(
   SR*(hit.kind==='crash'?.42:hit.kind==='hat'?.065:.18)));
  let h=0;
  for(let i=0;i<len;i++){
   const x=i/SR,z=r()*2-1;h=.79*h+.21*z;
   const noise=z-h;
   const val=hit.kind==='hat'?noise*Math.exp(-x*77)*.22:
    hit.kind==='crash'?noise*Math.exp(-x*9)*.22:
    hit.kind==='kick'?Math.sin(TAU*(87*x-90*x*x))*Math.exp(-x*31)*.40:
    hit.kind==='snare'?(noise*.70+Math.sin(TAU*198*x)*.1)*Math.exp(-x*24)*.29:
    noise*Math.exp(-x*46)*.22;
   out[start+i]+=val*hit.volume;
  }
 }
 // A single delay makes the counter/lead/chord layers sound cohesive.
 const d1=Math.floor(.093*SR),d2=Math.floor(.17*SR);
 for(let i=d2;i<N;i++)out[i]+=.042*out[i-d1]+.023*out[i-d2];
 // Soft early-reflection tail; distinct from a loud 8-bit delay.
 const reflections=[{delay:.031,gain:.055},{delay:.067,gain:.045},{delay:.143,gain:.032},{delay:.281,gain:.018}];
 for(const reflect of reflections){
   reflect.gain*=cues?(.45+(cues.reverbWet||0)*5):1;
   const offset=Math.floor(reflect.delay*SR);
   for(let i=offset;i<N;i++)out[i]+=out[i-offset]*reflect.gain;
 }
 let peak=0;
 for(let i=0;i<N;i++)peak=Math.max(peak,Math.abs(out[i]));
 const gain=Math.min(2.4,.79/Math.max(peak,.11));
 for(let i=0;i<N;i++)out[i]=Math.tanh(out[i]*gain);
 // Lapped window at playback boundary; align final sample to exact loop start.
 const span=Math.min(1600,Math.floor(N/50));
 for(let i=0;i<span;i++){
  const a=(i+1)/span;
  out[N-span+i]=out[N-span+i]*(1-a)+out[i]*a;
 }
 const guard=Math.min(170,Math.floor(span/3));
 for(let i=0;i<guard;i++){
  const a=(i+1)/guard,j=N-guard+i;
  out[j]=out[j]*(1-a)+out[0]*a;
 }
 return {samples:out,sampleRate:SR,score:s,details:s.details};
}
function wavBlob(samples,rate=SR){
 const buffer=new ArrayBuffer(44+samples.length*2),v=new DataView(buffer);
 function str(i,s){for(let j=0;j<s.length;j++)v.setUint8(i+j,s.charCodeAt(j));}
 str(0,'RIFF');v.setUint32(4,36+samples.length*2,true);
 str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);
 v.setUint16(20,1,true);v.setUint16(22,1,true);
 v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);
 v.setUint16(32,2,true);v.setUint16(34,16,true);
 str(36,'data');v.setUint32(40,samples.length*2,true);
 for(let i=0;i<samples.length;i++)v.setInt16(44+i*2,Math.round(clamp(samples[i],-1,1)*32767),true);
 return new Blob([buffer],{type:'audio/wav'});
}
root.PlotuneHandheld={STYLES,GROUPS,MOODS,STORY_INSTRUMENTS,chooseStyle,chooseInstrumentPalette,analyzeEmotionalArc,prepare,score,render,wavBlob};
})(window);
