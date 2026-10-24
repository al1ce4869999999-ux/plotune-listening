/* Plotune Story Analyzer v2 - local heuristic analysis, no network */
(function (root) {
  'use strict';
  const MOODS = ['whimsy', 'warm', 'melancholy', 'suspense', 'adventure', 'serene'];
  const LABELS = {whimsy:'コミカル',warm:'あたたかい',melancholy:'切ない',suspense:'不穏・緊張',adventure:'冒険・躍動',serene:'静か・穏やか'};
  const FEATURES = [
    ['whimsy',/たぬき|どたばた|ドタバタ|転ん|転ぶ|ころころ|失敗|おかし|笑|愉快|いたずら|はしゃ|ぴょん|ぽんぽん|あわて|慌て|へんてこ|ふざけ|わくわく|ごろごろ/g,2],
    ['warm',/やさし|優し|ぬくもり|あたたか|温か|抱きしめ|笑顔|ほほえ|微笑|安心|家族|守る|一緒|なで|帰ろう|愛し|大切|ほっと/g,2],
    ['melancholy',/寂し|さびし|悲し|泣|涙|別れ|失|後悔|孤独|せつな|切な|恋し|消え|思い出|あきらめ|ひとり|独り|儚/g,2.2],
    ['suspense',/恐怖|怖|こわ|震え|怯|不穏|暗闇|物音|怪異|化け物|追跡|逃げ|迫る|危険|緊張|息を潜|血|死|悲鳴|罠|隠れ|怪し/g,2.2],
    ['adventure',/走|飛び|跳|戦|旅|駆け|疾走|冒険|挑戦|追いかけ|突進|発見|目指|勝負|突破|急い|勇気|全力|大ジャンプ/g,2],
    ['serene',/静か|穏やか|昼寝|眠|まどろ|ゆっくり|そよ風|夕暮|月明かり|星空|夜空|散歩|雨音|木漏れ日|風に揺|ぼんやり|見つめ/g,1.7]
  ];
  const SHIFT = /ところが|しかし|だが|けれど|なのに|そのとき|その時|突然|次の瞬間|急に|すると|一転|ふいに|ところで/g;
  const ACTION = /走|飛|跳|落ち|ぶつか|転|叩|追い|急|戦|叫|投げ|蹴|逃|登|壊/;
  const NEGATE = /^(?:じゃない|ではない|くない|なかった|ない|ず|なく|ません|ぬ|ことはない)/;
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  function splitScene(text) {
    const sentences = (text || '').split(/(?<=[。！？!?\n])|(?<=、)|(?<=，)/u).map(s => s.trim()).filter(Boolean);
    return sentences.length ? sentences : [''];
  }
  function analyzeText(text) {
    const scores = Object.fromEntries(MOODS.map(m => [m, 0]));
    const found = [];
    const src = (text || '').slice(0, 12000);
    for (const [mood, pattern, weight] of FEATURES) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(src)) !== null) {
        const after = src.slice(match.index + match[0].length, match.index + match[0].length + 7);
        if (NEGATE.test(after)) continue;
        scores[mood] += weight;
        if (found.length < 25 && !found.includes(match[0])) found.push(match[0]);
      }
    }
    let shifts = (src.match(SHIFT) || []).length;
    let action = (src.match(new RegExp(ACTION.source, 'g')) || []).length;
    return {scores, found, shifts, action, total: Object.values(scores).reduce((a,b)=>a+b,0)};
  }
  function rank(scores) {
    return MOODS.slice().sort((a,b) => scores[b] - scores[a]);
  }
  function analyze(input) {
    const profile = analyzeText(input.character || '');
    const world = analyzeText(input.world || '');
    const scene = analyzeText(input.scene || '');
    const weighted = {};
    MOODS.forEach(m => { weighted[m] = profile.scores[m]*0.55 + world.scores[m]*0.35 + scene.scores[m]*1.75; });
    const ordered = rank(weighted), primary = ordered[0];
    const sentences = splitScene(input.scene || '');
    const local = sentences.map(s => analyzeText(s));
    const arc = Array.from({length:8}, (_, i) => {
      const at = Math.min(local.length-1, Math.floor((i+0.5)*local.length/8));
      const part = local[Math.max(0,at)];
      const current = part.scores;
      const danger = current.suspense*0.08+current.adventure*0.05+part.action*0.07;
      const base = 0.26 + danger + part.shifts*0.21 + (i>0 ? .04 : 0);
      return clamp(base, .12, .98);
    });
    // Smooth long, quiet passages without erasing clear scene changes.
    if (scene.total === 0 && scene.action === 0) arc.fill(.33);
    const combined = profile.total + world.total + scene.total;
    const confidence = combined === 0 ? 'low' : scene.total >= 4 ? 'medium' : 'low';
    const pace = clamp(.32 + scene.action*.047 + scene.shifts*.09, .20, .95);
    const atmosphere = clamp(.25 + scene.scores.suspense*.055 + scene.scores.melancholy*.025, .2, .95);
    const hasSwitch = scene.shifts > 0;
    return {
      primary, secondary: ordered[1], label: LABELS[primary],
      scores: weighted, confidence, pace, atmosphere, arc, hasSwitch,
      keywords: scene.found.slice(0,8),
      characterKeywords: profile.found.slice(0,5),
      worldKeywords: world.found.slice(0,5),
      sentences: sentences.length,
      source: {profile:profile.total, world:world.total, scene:scene.total}
    };
  }
  // Phase 1: planning targets, not measured listener emotions.
  // The six legacy mood signals are mapped to a non-exclusive GEMS-inspired
  // representation. Coefficients are design heuristics, not fitted psychology.
  const EMOTION_KEYS = ['wonder','transcendence','tenderness','nostalgia','peacefulness','power','joy','tension','sadness'];
  function emotionVector(scores) {
    const x = mood => Math.max(0, Number(scores?.[mood]) || 0);
    const raw = {
      wonder: x('adventure')*.45+x('serene')*.2,
      transcendence: x('adventure')*.25+x('serene')*.3,
      tenderness: x('warm')*.85,
      nostalgia: x('melancholy')*.55+x('warm')*.18,
      peacefulness: x('serene')*.85+x('warm')*.25,
      power: x('adventure')*.75,
      joy: x('whimsy')*.8+x('warm')*.18,
      tension: x('suspense')*.9+x('adventure')*.12,
      sadness: x('melancholy')*.9
    };
    const max = Math.max(1,...Object.values(raw));
    return Object.fromEntries(EMOTION_KEYS.map(key=>[key,Math.round(clamp(raw[key]/max,0,1)*1000)/1000]));
  }
  function emotionPlan(input,analysis,sections) {
    const sceneParts=splitScene(input.scene||'');
    const global=emotionVector(analysis.scores);
    const override=input.emotionTargets;
    if(override && typeof override==='object' && !Array.isArray(override)) {
      for(const key of EMOTION_KEYS) {
        if(Object.hasOwn(override,key) && Number.isFinite(override[key]))
          global[key]=Math.round(clamp(override[key],0,1)*1000)/1000;
      }
    }
    const explicit=override && typeof override==='object' && !Array.isArray(override);
    return {schema:'plotune.emotion-plan',version:1,
      source:explicit?'user-with-heuristic-fallback':'heuristic',
      global,
      sections:sections.map((section,i)=>{
        const from=Math.floor(i*sceneParts.length/sections.length);
        const to=Math.max(from+1,Math.ceil((i+1)*sceneParts.length/sections.length));
        const slice=sceneParts.slice(from,to).join('');
        const local=emotionVector(analyzeText(slice).scores);
        // When a manual target is specified, do not silently overwrite it
        // with keyword-based local guesses.
        const target=explicit?{...global}:Object.fromEntries(EMOTION_KEYS.map(key=>[
          key,Math.round(clamp(global[key]*.4+local[key]*.6,0,1)*1000)/1000
        ]));
        return {id:'section-'+(i+1),name:section.name,start:section.start,end:section.end,
          intensity:section.intensity,target};
      })
    };
  }
  function hash(str) {
    let h = 2166136261;
    for (let i=0;i<str.length;i++) {h ^= str.charCodeAt(i);h = Math.imul(h,16777619);}
    return h>>>0;
  }
  function plan(input, analysis, variant = 0) {
    const requested = input.style || 'auto';
    const styles = ['chip','piano','horror','pop','fantasy','ambient'];
    const genre = requested !== 'auto' && styles.includes(requested) ? requested : ({
      whimsy:'chip',warm:'fantasy',melancholy:'piano',suspense:'horror',adventure:'fantasy',serene:'ambient'
    })[analysis.primary];
    const minor = ['melancholy','suspense'].includes(analysis.primary) || genre==='horror';
    const bpmBase = ({chip:126,piano:88,horror:76,pop:116,fantasy:108,ambient:72})[genre];
    const bpm = Math.round(clamp(bpmBase + (analysis.pace-.4)*30,-1,165));
    const duration = [15,30,60].includes(Number(input.duration)) ? Number(input.duration):30;
    const characterSeed = hash((input.title||'')+'|'+(input.character||'')+'|'+(input.world||''));
    const sceneSeed = hash(input.scene || '');
    const seed = (characterSeed ^ sceneSeed ^ Math.imul(variant,2654435761))>>>0;
    const mode = minor ? 'minor':'major';
    const progressions = minor ? [[0,5,2,6],[0,3,5,4],[0,5,6,4]] : [[0,5,3,4],[0,3,4,0],[0,4,5,3]];
    const progression = progressions[characterSeed%progressions.length];
    const phrases = Math.max(2,Math.ceil(duration/(240/bpm*4)));
    const sections = Array.from({length:4},(_,i)=>({
      name:['導入','展開','山場','余韻'][i],
      intensity:analysis.arc[Math.min(7,i*2+1)],
      start:i/4,
      end:(i+1)/4
    }));
    if (analysis.hasSwitch) sections[2].intensity=clamp(sections[2].intensity+.22,0,1);
    const emotion=emotionPlan(input,analysis,sections);
    return {genre,mode,bpm,duration,characterSeed,seed,progression,phrases,sections,emotionPlan:emotion,
      root:minor?57:60, analysis};
  }
  root.PlotuneAnalysis = {analyze,plan,analyzeText,splitScene,LABELS};
})(window);
