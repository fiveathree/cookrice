// 用法：node tools/check-recipes.js
// 用每個食譜嘅預設設定（跟食譜設定 + seq 入面所有材料）計一次分，睇下難度有冇走樣。
globalThis.NODE_TEST = true;
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const js = html.match(/<script>\n([\s\S]*)<\/script>/)[1];
eval(js + ';globalThis.E={RECIPES,SC,ING,evaluate,newState,restock,wareCap,set:s=>S=s,get S(){return S}};');
const { RECIPES, SC, ING, evaluate, newState, restock, wareCap } = E;
E.set(newState()); restock(); const S = E.S;
const rows = [];
for (const r of RECIPES) {
  S.scene = r.s;
  const w = r.w.find(x => SC[r.s].wares.includes(x));
  S.sel[r.s] = { recipe: r.id, helper: '', method: r.m, ware: w, heat: Math.min(r.h, wareCap(r.s, w)) || 1, time: r.t };
  S.order = '五成';
  const ids = [...r.seq]; r.req.forEach(x => { if (!ids.includes(x)) ids.push(x); });
  if (r.m === 'fry') ids.splice(1, 0, 'oil');
  S.pot = ids.map(id => ({ id, price: ING[id].p, q: 1.1, srcn: '' }));
  const res = evaluate(false);
  rows.push([r.s, r.n, res.score, res.grade, res.match ? '' : '冇配對到食譜',
    res.items.filter(i => i.d && i.d.c !== 'ok').map(i => `${i.g.n}:${i.d.k}`).join(' '),
    res.notes.join('、')].join('\t'));
}
console.log(rows.join('\n'));
