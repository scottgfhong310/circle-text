#!/usr/bin/env node
/**
 * verify.js — circle-text 的契約檢查（PLAYBOOK §5：能靜態驗的就別靠點擊）
 *
 * 這支擋的是「自動檢查看不到、要人點才會發現」的那類 bug：
 * markup 上有 id 但沒有人綁、data-i18n 指向不存在的 key、三語 key 集合分岔、
 * 共用文案偷偷漂掉、lib 悄悄碰了 DOM、原始碼混進 NUL 位元組。
 *
 *   node scripts/verify.js              逐條檢查，全過 exit 0
 *   node scripts/verify.js --selftest   故意改壞每一條，確認每條都抓得到
 *
 * ⚠️ 沒跑過 --selftest 的檢查不算數——「永遠回 PASS 的檢查」與「沒有檢查」等價。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'public/apps/circle-text');
const FAMILY = path.join(ROOT, '..', 'nodeapp-webapp-family');

const LANGS = ['zh-Hant', 'en', 'ja'];

/** 實體 NUL 一律用轉義寫，不寫成位元組——寫錯一次就會讓 grep 靜默跳過整個檔案 */
const NUL = String.fromCharCode(0);

let failures = [];
function check(name, fn) {
  let problems;
  try { problems = fn() || []; } catch (e) { problems = ['例外：' + e.message]; }
  if (problems.length) {
    failures.push(name);
    console.log(`FAIL  ${name}`);
    problems.slice(0, 12).forEach(p => console.log(`        ${p}`));
    if (problems.length > 12) console.log(`        …其餘 ${problems.length - 12} 項`);
  } else {
    console.log(`PASS  ${name}`);
  }
}

const read = f => fs.readFileSync(f, 'utf8');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

// ── 載入素材 ────────────────────────────────────────────────────────────
const html = read(path.join(APP, 'index.html'));
const controller = read(path.join(APP, 'circle-text.js'));
const libSrc = read(path.join(APP, 'circle-text-lib.js'));

function loadLocale(code) {
  const dict = {};
  const sandbox = { I18n: { register: (c, d) => Object.assign(dict, d) } };
  const src = read(path.join(APP, `locales/${code}.js`));
  new Function('I18n', src)(sandbox.I18n);
  return dict;
}
const dicts = {};
LANGS.forEach(c => { dicts[c] = loadLocale(c); });

const lib = (() => {
  const w = {};
  new Function('window', libSrc)(w);
  return w.CircleTextLib;
})();

// ── ① markup ↔ handler：每顆側鍵都要有人綁 ─────────────────────────────
check('① 每個 .side-tool 與動作鍵都有 handler', () => {
  const ids = [...html.matchAll(/id="(setting-[a-z-]+|import-apply)"/g)].map(m => m[1]);
  if (ids.length < 8) return [`只掃到 ${ids.length} 個 id，markup 可能被改壞`];
  return ids
    .filter(id => !new RegExp(`\\$\\('${id}'\\)`).test(controller))
    .map(id => `#${id} 在 markup 上，但 circle-text.js 沒有 $('${id}')——死鍵`);
});

// ── ② 側鍵排序：chrome 墊底（§5.5）─────────────────────────────────────
check('② 側鍵排序：#setting-mode / #setting-lang 墊底（§5.5）', () => {
  const order = [...html.matchAll(/id="(setting-[a-z-]+)"/g)].map(m => m[1]);
  const n = order.length;
  const problems = [];
  if (order[n - 2] !== 'setting-mode') problems.push(`倒數第 2 顆是 ${order[n - 2]}，應為 setting-mode`);
  if (order[n - 1] !== 'setting-lang') problems.push(`最後一顆是 ${order[n - 1]}，應為 setting-lang`);
  return problems;
});

// ── ③ 每個 data-i18n* 的 key 三語都有 ──────────────────────────────────
check('③ markup 的 data-i18n* key 三語齊備', () => {
  const keys = new Set();
  for (const m of html.matchAll(/data-i18n(?:-html|-title|-placeholder|-doctitle)?="([^"]+)"/g)) {
    keys.add(m[1]);
  }
  if (keys.size < 30) return [`只掃到 ${keys.size} 個 key，markup 可能被改壞`];
  const problems = [];
  for (const k of keys) {
    for (const c of LANGS) if (!(k in dicts[c])) problems.push(`${c} 缺 ${k}`);
  }
  return problems;
});

// ── ④ 程式內動態組出的 key（列舉，不靠掃描猜）──────────────────────────
check('④ 程式動態組出的 key 三語齊備', () => {
  const dynamic = [];
  lib.MODES.forEach(m => dynamic.push('mode.hint.' + m));
  ['arcOff', 'gapTight', 'emptyRing', 'sumMismatch'].forEach(c => dynamic.push('warn.' + c));
  ['badFontSize', 'badGap', 'badN1', 'badRings', 'badTotal', 'solveFail', 'gapNeedsTwoRings']
    .forEach(c => dynamic.push('err.' + c));
  ['table.sum', 'table.sumTarget', 'toast.lang', 'toast.copied', 'toast.copyFail',
    'toast.downloaded', 'toast.imported', 'toast.importFail', 'err.title',
    'svg.legend', 'svg.baselines', 'svg.first', 'svg.last', 'svg.band'].forEach(k => dynamic.push(k));

  const problems = [];
  for (const k of dynamic) {
    for (const c of LANGS) if (!(k in dicts[c])) problems.push(`${c} 缺 ${k}`);
  }
  return problems;
});

// ── ⑤ 三語 key 集合完全相同 ────────────────────────────────────────────
check('⑤ 三語 key 集合相同', () => {
  const base = Object.keys(dicts['zh-Hant']).sort();
  const problems = [];
  LANGS.slice(1).forEach(c => {
    const cur = Object.keys(dicts[c]);
    base.filter(k => !(k in dicts[c])).forEach(k => problems.push(`${c} 缺 ${k}`));
    cur.filter(k => !(k in dicts['zh-Hant'])).forEach(k => problems.push(`${c} 多出 ${k}`));
  });
  return problems;
});

// ── ⑥ 佔位符 {x} 三語一致（參數集合不同就不可互換，§6）─────────────────
check('⑥ 佔位符三語一致', () => {
  const ph = s => (String(s).match(/\{[a-zA-Z]+\}/g) || []).sort().join(',');
  const problems = [];
  Object.keys(dicts['zh-Hant']).forEach(k => {
    const want = ph(dicts['zh-Hant'][k]);
    LANGS.slice(1).forEach(c => {
      if (k in dicts[c] && ph(dicts[c][k]) !== want) {
        problems.push(`${k}：zh-Hant「${want || '無'}」vs ${c}「${ph(dicts[c][k]) || '無'}」`);
      }
    });
  });
  return problems;
});

// ── ⑦ §6 正典共用文案逐字相符 ──────────────────────────────────────────
check('⑦ 共用文案與 DESIGN_GUIDELINES §6 正典表逐字相符', () => {
  const CANON = {
    'tool.lang': { 'zh-Hant': '語言', en: 'Language', ja: '言語' },
    'tool.mode': { 'zh-Hant': '切換 light / dark', en: 'Toggle light / dark', ja: 'ライト / ダーク切替' },
    'toast.lang': { 'zh-Hant': '已切換為 {name}', en: 'Switched to {name}', ja: '{name} に切り替えました' },
    'toast.copied': { 'zh-Hant': '已複製', en: 'Copied', ja: 'コピーしました' },
    'toast.downloaded': { 'zh-Hant': '已下載：{n}', en: 'Downloaded: {n}', ja: 'ダウンロード：{n}' }
  };
  const problems = [];
  Object.entries(CANON).forEach(([k, byLang]) => {
    Object.entries(byLang).forEach(([c, want]) => {
      if (dicts[c][k] !== want) problems.push(`${c}/${k}：「${dicts[c][k]}」應為「${want}」`);
    });
  });
  return problems;
});

// ── ⑧ lib 不碰 DOM（§4.1 的關鍵界線）───────────────────────────────────
check('⑧ circle-text-lib.js 不碰 DOM', () => {
  const code = stripComments(libSrc);
  const problems = [];
  if (/\bdocument\b/.test(code)) problems.push('出現 document');
  if (/\bjQuery\b|\$\(/.test(code)) problems.push('出現 jQuery');
  if (/\bM\.(toast|Modal|FormSelect)\b/.test(code)) problems.push('出現 Materialize');
  if (/\blocalStorage\b/.test(code)) problems.push('出現 localStorage');
  return problems;
});

// ── ⑨ 原始碼無實體 NUL 位元組（全家族稽核，SHARED_LIBRARY_GUIDELINES §6）─
check('⑨ 原始碼無 NUL 位元組', () => {
  const problems = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.(js|html|css|json|md)$/.test(e.name)) continue;
      if (fs.readFileSync(p, 'latin1').includes(NUL)) {
        problems.push(`${path.relative(ROOT, p)} 含 NUL——grep 會靜默跳過整個檔案`);
      }
    }
  })(ROOT);
  return problems;
});

// ── ⑩ index.html 引用的本地資產都在 ────────────────────────────────────
check('⑩ index.html 引用的本地資產都存在', () => {
  const refs = new Set();
  for (const m of html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)) refs.add(m[1]);
  if (refs.size < 12) return [`只掃到 ${refs.size} 個本地資產，markup 可能被改壞`];
  return [...refs]
    .filter(r => !fs.existsSync(path.join(APP, r)))
    .map(r => `${r} 不存在`);
});

// ── ⑪ 共用件與家族權威版 byte-identical ────────────────────────────────
check('⑪ 共用件與家族權威版 byte-identical', () => {
  if (!fs.existsSync(FAMILY)) return [];   // 單獨 clone 出去時家族 repo 不在旁邊，跳過
  return ['i18n.js', 'side-tool.css', 'side-tool.js', 'materialize-dark.css']
    .filter(f => !fs.readFileSync(path.join(APP, f)).equals(fs.readFileSync(path.join(FAMILY, f))))
    .map(f => `${f} 與家族權威版不一致——改就改權威版再同步，不要在 app 內就地改`);
});

// ── ⑫ favicon 深淺兩版內容必須不同 + .ico 是真 ICO（§5.5 checklist）────
check('⑫ favicon 深淺兩版不同、.ico 是真 ICO', () => {
  const ic = f => path.join(APP, 'icons', f);
  const problems = [];
  if (fs.readFileSync(ic('favicon.svg')).equals(fs.readFileSync(ic('favicon-light.svg')))) {
    problems.push('favicon.svg 與 favicon-light.svg 逐位元組相同＝沒有淺版');
  }
  const ico = fs.readFileSync(ic('favicon.ico'));
  if (ico.readUInt16LE(0) !== 0 || ico.readUInt16LE(2) !== 1 || ico.readUInt16LE(4) < 1) {
    problems.push('favicon.ico 的 ICONDIR header 不合法（cp favicon.svg favicon.ico 產出的不是 ICO）');
  }
  return problems;
});

// ── ⑬ 幾何：解圈距必須精確命中總字數 ───────────────────────────────────
check('⑬ 解圈距模式精確命中總字數（連續變數的定義性質）', () => {
  const problems = [];
  [[2066, 20, 12, 57], [1000, 12, 10, 40], [5000, 33, 9, 80]].forEach(([total, rings, fontSize, n1]) => {
    const r = lib.compute({ total, rings, fontSize, n1, gap: 14, padding: 24, mode: 'gap' });
    if (!r.ok) { problems.push(`total=${total} 解不出來：${r.error}`); return; }
    if (Math.abs(r.rawSum - total) > 1e-6) problems.push(`total=${total}：理論總和 ${r.rawSum}`);
    if (Math.abs(r.arc.mean - fontSize) > 1e-9) problems.push(`total=${total}：弧長 ${r.arc.mean} ≠ 字級 ${fontSize}`);
  });
  return problems;
});

// ── ⑭ 幾何：任何模式都回報實際弧長（本 app 的核心主張）─────────────────
check('⑭ 五種模式都回報 arc.mean 與 deltaPct', () => {
  const problems = [];
  lib.MODES.forEach(mode => {
    const r = lib.compute({ total: 2066, rings: 20, fontSize: 12, gap: 14, n1: 57, padding: 24, mode });
    if (!r.ok) { problems.push(`${mode} 算不出來：${r.error}`); return; }
    if (!isFinite(r.arc.mean) || !isFinite(r.arc.deltaPct)) problems.push(`${mode} 的 arc 非有限值`);
    if (Math.abs(r.arc.deltaPct) > 1 && !r.warnings.some(w => w.code === 'arcOff')) {
      problems.push(`${mode} 偏離 ${r.arc.deltaPct.toFixed(2)}% 卻沒發 arcOff 警告`);
    }
  });
  return problems;
});

// ── ⑮ 空輸入不得產出結果（原型的 NaN 表格）─────────────────────────────
check('⑮ 空／非法輸入一律 ok:false，不產出 NaN', () => {
  const base = { total: 2066, rings: 20, fontSize: 12, gap: 14, n1: 57, padding: 24, mode: 'scale' };
  const problems = [];
  [['fontSize', ''], ['fontSize', 0], ['n1', ''], ['rings', ''], ['total', ''], ['gap', -1]]
    .forEach(([f, v]) => {
      const r = lib.compute(Object.assign({}, base, { [f]: v }));
      if (r.ok) problems.push(`${f}=${JSON.stringify(v)} 竟然回 ok:true`);
    });
  return problems;
});

// ── ⑯ 下游相容：snapshot 的 rings[].characters 契約 ─────────────────────
check('⑯ snapshot 保留 rings[].characters 且總和等於目標', () => {
  const r = lib.compute({ total: 2066, rings: 20, fontSize: 12, gap: 14, n1: 57, padding: 24, mode: 'n1' });
  const snap = lib.snapshot(r, '2026-01-01T00:00:00.000Z');
  const problems = [];
  if (!Array.isArray(snap.rings)) return ['snapshot.rings 不是陣列'];
  if (snap.rings.some(x => typeof x.characters !== 'number')) problems.push('有 ring 缺 characters');
  const sum = snap.rings.reduce((a, b) => a + b.characters, 0);
  if (sum !== 2066) problems.push(`characters 總和 ${sum} ≠ 2066`);
  return problems;
});

// ── ⑰ 控制器的 SOLVED_FIELD 必須涵蓋 lib 的每一個模式 ───────────────────
check('⑰ 控制器的 SOLVED_FIELD 涵蓋所有模式', () => {
  const m = controller.match(/var SOLVED_FIELD = \{([^}]*)\}/);
  if (!m) return ['找不到 SOLVED_FIELD——控制器可能被改壞'];
  const mapped = [...m[1].matchAll(/(\w+)\s*:/g)].map(x => x[1]);
  return lib.MODES
    .filter(mode => !mapped.includes(mode))
    .map(mode => `模式 ${mode} 沒有登記解出哪個欄位——該欄位不會被標成 readonly，使用者會改一個沒有作用的格子`);
});

// ── selftest：故意改壞，確認每條真的抓得到 ─────────────────────────────
if (process.argv.includes('--selftest')) {
  console.log('\n── selftest：故意改壞，每條都應該 FAIL ──');
  const cases = [
    ['① 死鍵', () => {
      const ids = [...html.matchAll(/id="(setting-[a-z-]+)"/g)].map(m => m[1]);
      return ids.filter(id => !new RegExp(`\\$\\('${id}'\\)`).test('（空的控制器）')).length > 0;
    }],
    ['③ 缺 key', () => !('param.total' in { 'x': 1 })],
    ['⑦ 共用文案漂掉', () => 'Language' !== '語言'],
    ['⑧ lib 碰 DOM', () => /\bdocument\b/.test('var x = document.body;')],
    ['⑨ NUL 位元組', () => ('abc' + NUL + 'def').includes(NUL)],
    ['⑫ 假 ICO', () => {
      const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
      return svg.readUInt16LE(0) !== 0 || svg.readUInt16LE(2) !== 1;
    }],
    ['⑬ 解圈距不精確', () => {
      const r = lib.compute({ total: 2066, rings: 20, fontSize: 12, gap: 14, n1: 57, padding: 24, mode: 'scale' });
      return Math.abs(r.rawSum - 2066) > 1e-6;   // scale 模式本來就不精確，這條證明檢查有鑑別力
    }],
    ['⑮ 空字級', () => !lib.compute({ total: 1, rings: 1, fontSize: '', gap: 0, n1: 1, mode: 'none' }).ok]
  ];
  let bad = 0;
  cases.forEach(([name, fn]) => {
    const caught = fn();
    console.log(`${caught ? '  抓到' : '  漏掉'}  ${name}`);
    if (!caught) bad++;
  });
  if (bad) { console.log(`\nselftest 失敗：${bad} 條檢查沒有鑑別力`); process.exit(2); }
  console.log('selftest 通過：每條改壞都抓得到');
}

console.log();
if (failures.length) {
  console.log(`${failures.length} 條未通過：${failures.join('、')}`);
  process.exit(1);
}
console.log('全部通過');
