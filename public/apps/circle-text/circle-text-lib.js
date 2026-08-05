/**
 * circle-text-lib.js — 圓形排字版面計算核心（純邏輯，不碰 DOM）
 *
 * 模型：固定圈距（Consistent Gap Model）
 *   R₁ = N₁·s / 2π                 內圈基線半徑（由內圈字數與字寬決定）
 *   Rᵢ = R₁ + i·g                  第 i+1 圈基線半徑（圈距固定）
 *   cᵢ = 2πRᵢ / s                   該圈可容納字數（周長 ÷ 字寬）
 *   T(n) = n·N₁ + δ·n(n−1)/2       n 圈的理論總字數，δ = 2πg/s
 *
 * 配平（讓總字數命中目標）＝**指定一個自由變數去解 T(n) = total**：
 *   mode 'rings' → 解 n（整數，量化後有殘差）
 *   mode 'gap'   → 解 g（連續，可精確命中）
 *   mode 'n1'    → 解 N₁（整數，量化後有殘差）
 *   mode 'scale' → 不解幾何，直接把字數等比縮放（＝**默默改掉字距**，故一律回報 arc）
 *   mode 'none'  → 不配平，理論值四捨五入
 *
 * ⚠️ 任何模式都會回 `arc.mean`（實際每字弧長）與 `arc.deltaPct`（與設定字寬的落差）。
 *    這是本 lib 的核心約定：**幾何與字數必須同時說得通，說不通就要說出來。**
 *
 * 資料格式（snapshot）與消費端相容性見 README §資料結構；`rings[].characters`
 * 是下游切字用的欄位，鍵名不可更動。
 *
 * Public API（window.CircleTextLib）
 *   PT_TO_MM / MM_TO_PT / MODES
 *   innerRadius(n1, fontSize)                → R₁ (pt)
 *   ringCountFromDiameter(diameterPt, fontSize)
 *   theoreticalTotal(rings, n1, fontSize, gap)
 *   solveRings / solveGap / solveN1(input)   → number | null
 *   largestRemainder(intended, target)       → int[]
 *   compute(input)                           → result（唯一入口，見下）
 *   buildSvg(result, opts)                   → SVG 字串（純字串組裝）
 *   snapshot(result)                         → 可 JSON 化的物件
 *   parseQuery(search) / buildQuery(input)   → 深連結
 *   parseSnapshot(text)                      → 由貼上的 JSON 還原輸入
 *   formatNumber(x, d)
 */
(function (window) {
  'use strict';

  var PT_TO_MM = 25.4 / 72;
  var MM_TO_PT = 72 / 25.4;
  var TWO_PI = 2 * Math.PI;

  /** 配平模式；順序即 UI 下拉順序 */
  var MODES = ['rings', 'gap', 'n1', 'scale', 'none'];

  /** 輸入欄位（深連結與 snapshot 共用同一組鍵）。`outerMaxMm` 以 mm 存，深連結才讀得懂 */
  var NUMERIC_FIELDS = ['total', 'rings', 'fontSize', 'gap', 'n1', 'padding', 'outerMaxMm'];

  /**
   * 紙張短邊（mm）——圓形版面吃的是短邊，長邊放不下也沒用。
   * 這是**資料不是 UI 文案**（§6.1）：換一支 app 顯示同一批紙張，A3 還是 297×420，
   * 所以放這裡、不進 locales。名稱本身不翻譯。
   */
  var PAPER_SIZES = [
    { id: 'A2', shortMm: 420, longMm: 594 },
    { id: 'A3', shortMm: 297, longMm: 420 },
    { id: 'A4', shortMm: 210, longMm: 297 },
    { id: 'A5', shortMm: 148, longMm: 210 },
    { id: 'Letter', shortMm: 215.9, longMm: 279.4 },
    { id: 'Tabloid', shortMm: 279.4, longMm: 431.8 }
  ];

  /** 外徑上限的比較容差（mm）；見 compute() 內的說明 */
  var OUTER_TOLERANCE_MM = 0.01;

  /** 超過這個比例就發 arcOff 警告（1%） */
  var ARC_TOLERANCE = 0.01;

  // ── 小工具 ────────────────────────────────────────────────────────────────

  /**
   * 寬鬆轉數字，但**空字串不當 0**。
   * （原型用 lodash 的 _.toNumber('') === 0，於是清空字級會算出滿桌 NaN 而不報錯。）
   */
  function num(v) {
    if (v === null || v === undefined) return NaN;
    if (typeof v === 'number') return v;
    var s = String(v).trim();
    if (s === '') return NaN;
    return Number(s);
  }

  function isPos(x) { return isFinite(x) && x > 0; }

  function formatNumber(x, d) {
    return isFinite(x) ? x.toFixed(d === undefined ? 2 : d) : '—';
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function sum(list) {
    var t = 0;
    for (var i = 0; i < list.length; i++) t += list[i];
    return t;
  }

  // ── 幾何 ──────────────────────────────────────────────────────────────────

  /** 內圈基線半徑：C₁ = N₁·s = 2πR₁ */
  function innerRadius(n1, fontSize) {
    return (n1 * fontSize) / TWO_PI;
  }

  /** 由內圈直徑反推內圈字數（D = N₁·s/π） */
  function ringCountFromDiameter(diameterPt, fontSize) {
    if (!isPos(diameterPt) || !isPos(fontSize)) return NaN;
    return (Math.PI * diameterPt) / fontSize;
  }

  /** n 圈的理論總字數 T(n) = n·N₁ + δ·n(n−1)/2 */
  function theoreticalTotal(rings, n1, fontSize, gap) {
    if (!isPos(fontSize)) return NaN;
    var delta = (TWO_PI * gap) / fontSize;
    return rings * n1 + delta * rings * (rings - 1) / 2;
  }

  // ── 反解（三個自由變數）───────────────────────────────────────────────────

  /**
   * 解圈數：δn² + (2N₁ − δ)n − 2·total = 0 的正根，四捨五入為整數。
   * gap 為 0 時退化成 n = total / N₁。
   */
  function solveRings(input) {
    var total = num(input.total), fontSize = num(input.fontSize);
    var gap = num(input.gap), n1 = num(input.n1);
    if (!isPos(total) || !isPos(fontSize) || !isPos(n1)) return null;
    if (!isFinite(gap) || gap < 0) return null;

    var delta = (TWO_PI * gap) / fontSize;
    if (!isFinite(delta)) return null;
    if (delta < 1e-9) return Math.max(1, Math.round(total / n1));

    var a = delta, b = 2 * n1 - delta, c = -2 * total;
    var disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    var root = (-b + Math.sqrt(disc)) / (2 * a);
    if (!isFinite(root) || root <= 0) return null;
    return Math.max(1, Math.round(root));
  }

  /**
   * 解圈距：δ = 2(total − n·N₁) / (n(n−1))，g = δ·s/2π。
   * **連續變數，可精確命中 total**（其餘三個模式都做不到）。
   * 單圈（n=1）時圈距不影響總數，無解。
   */
  function solveGap(input) {
    var total = num(input.total), rings = num(input.rings);
    var fontSize = num(input.fontSize), n1 = num(input.n1);
    if (!isPos(total) || !isPos(fontSize) || !isPos(n1)) return null;
    if (!isPos(rings) || rings < 2) return null;

    var delta = 2 * (total - rings * n1) / (rings * (rings - 1));
    var gap = delta * fontSize / TWO_PI;
    if (!isFinite(gap) || gap < 0) return null;
    return gap;
  }

  /** 解內圈字數：N₁ = (total − δ·n(n−1)/2) / n，四捨五入為整數。 */
  function solveN1(input) {
    var total = num(input.total), rings = num(input.rings);
    var fontSize = num(input.fontSize), gap = num(input.gap);
    if (!isPos(total) || !isPos(fontSize) || !isPos(rings)) return null;
    if (!isFinite(gap) || gap < 0) return null;

    var delta = (TWO_PI * gap) / fontSize;
    var n1 = (total - delta * rings * (rings - 1) / 2) / rings;
    if (!isFinite(n1) || n1 < 1) return null;
    return Math.max(1, Math.round(n1));
  }

  // ── 版面反解：由外徑上限與內徑反推參數 ────────────────────────────────────

  /** 紙張短邊減去兩側邊界＝可用外徑（mm）。圓形版面吃短邊，長邊放不下也沒用。 */
  function outerLimitFromPaper(paperId, marginMm) {
    var p = null;
    for (var i = 0; i < PAPER_SIZES.length; i++) {
      if (PAPER_SIZES[i].id === paperId) { p = PAPER_SIZES[i]; break; }
    }
    if (!p) return NaN;
    var m = num(marginMm);
    if (!isFinite(m) || m < 0) m = 0;
    var w = p.shortMm - 2 * m;
    return w > 0 ? w : NaN;
  }

  /**
   * 給總字數、外徑上限、內徑目標，反解「字級／圈數／圈距／內圈字數」。
   *
   * ⚠️ **這組約束不是唯一解，而是一整族解。** 推導：
   *   外徑釘住 ⇒ R_outer = (W − s)/2；內徑釘住 ⇒ R₁ = (D + s)/2
   *   總字數   T = Σ 2πRᵢ/s = π·n·(R₁ + R_outer)/s
   *   而 R₁ + R_outer = (D + W)/2 —— **s 被消掉了**
   *   ⇒ n = s · 2T/(π(D+W))     圈數與字級嚴格成正比，仍差一個判準才能定案。
   * 所以本函式**不挑**，而是把每個整數圈數對應的解都列出來，由呼叫端（使用者）選。
   *
   * 整數化的取捨：`n` 與 `N₁` 都必須是整數，三個約束無法同時精確滿足。
   * **釘死外徑與總字數**（硬約束：不能超出紙張、字要全放得下），
   * 讓**內徑**小幅讓步（它是保留區、軟目標）——每筆都回報實際內徑與偏差。
   * 給定整數 n 與 N₁ 時字級由此唯一決定：
   *   s = πW / (2T/n − N₁ + π)
   *
   * @param {object} input {total, outerMaxMm, innerTargetMm, minRings, maxRings}
   * @returns {object} { ok, error, candidates: [...] }（依圈數遞增）
   */
  function planByExtent(input) {
    input = input || {};
    var total = num(input.total);
    var W = num(input.outerMaxMm) * MM_TO_PT;
    var D = num(input.innerTargetMm) * MM_TO_PT;
    var minRings = Math.max(2, Math.round(num(input.minRings)) || 2);
    var maxRings = Math.round(num(input.maxRings)) || 40;

    if (!isPos(total)) return planFail('badTotal');
    if (!isPos(W)) return planFail('badOuterMax');
    if (!(isFinite(D) && D >= 0)) return planFail('badInnerTarget');
    if (D >= W) return planFail('innerGeOuter');

    // 理想（連續）解：n = k·s，用來替每個 n 取最接近的整數 N₁
    var k = 2 * total / (Math.PI * (D + W));
    if (!isPos(k)) return planFail('badTotal');

    var out = [];
    for (var n = minRings; n <= maxRings; n++) {
      var s0 = n / k;                                   // 該圈數下的理想字級
      if (!(s0 > 0)) continue;
      var n1Ideal = Math.PI * (D + s0) / s0;            // 2π·R₁/s，R₁=(D+s)/2
      if (!isFinite(n1Ideal) || n1Ideal < 1) continue;

      var best = null;
      var tries = [Math.floor(n1Ideal), Math.ceil(n1Ideal)];
      for (var t = 0; t < tries.length; t++) {
        var c = extentCandidate(n, tries[t], total, W, D);
        if (!c) continue;
        if (!best || Math.abs(c.innerDeltaMm) < Math.abs(best.innerDeltaMm)) best = c;
      }
      if (best) out.push(best);
    }
    if (!out.length) return planFail('noCandidate');
    return { ok: true, error: null, candidates: out };
  }

  /** 單一 (n, N₁) 的精確解；不合法（字級或圈距為負、圈重疊到負值）回 null */
  function extentCandidate(n, n1, total, W, D) {
    if (!(n >= 2) || !(n1 >= 1)) return null;
    var denom = 2 * total / n - n1 + Math.PI;
    if (!(denom > 0)) return null;
    var s = Math.PI * W / denom;
    if (!isPos(s) || s >= W) return null;

    var R1 = n1 * s / TWO_PI;
    var Router = (W - s) / 2;
    if (!(Router > R1)) return null;
    var gap = (Router - R1) / (n - 1);
    if (!(gap >= 0)) return null;

    var innerMm = 2 * (R1 - s / 2) * PT_TO_MM;
    return {
      rings: n,
      n1: n1,
      fontSize: s,
      fontSizeMm: s * PT_TO_MM,
      gap: gap,
      ratio: gap / s,                                   // 行距比：<1 表示相鄰圈的字會重疊
      R1: R1,
      Router: Router,
      outerDiameterMm: 2 * (Router + s / 2) * PT_TO_MM, // 恆等於上限（外徑被釘住）
      innerDiameterMm: innerMm,
      innerDeltaMm: innerMm - D * PT_TO_MM,             // 內徑讓步了多少
      total: Math.PI * n * (R1 + Router) / s            // 恆等於目標（總字數被釘住）
    };
  }

  function planFail(code) {
    return { ok: false, error: code, candidates: [] };
  }

  // ── 取整分配 ──────────────────────────────────────────────────────────────

  /**
   * 最大餘數法：先取 floor，再把差額依小數部分由大到小補 1，使總和恰為 target。
   * 不改輸入陣列（DATA_OBJECT_GUIDELINES：純函式不改輸入）。
   */
  function largestRemainder(intended, target) {
    var floors = [], fracs = [], i;
    for (i = 0; i < intended.length; i++) {
      var f = Math.floor(intended[i]);
      floors.push(isFinite(f) ? f : 0);
      fracs.push({ idx: i, frac: intended[i] - f });
    }
    var need = Math.round(target) - sum(floors);
    if (need > 0) {
      fracs.sort(function (a, b) { return b.frac - a.frac || a.idx - b.idx; });
      for (i = 0; i < Math.min(need, fracs.length); i++) floors[fracs[i].idx] += 1;
    } else if (need < 0) {
      // 目標低於 floor 總和：由小數最小者往下扣，且不扣成負數
      fracs.sort(function (a, b) { return a.frac - b.frac || a.idx - b.idx; });
      var left = -need;
      for (i = 0; i < fracs.length && left > 0; i++) {
        var take = Math.min(left, floors[fracs[i].idx]);
        floors[fracs[i].idx] -= take;
        left -= take;
      }
    }
    return floors;
  }

  // ── 主入口 ────────────────────────────────────────────────────────────────

  /**
   * 由一組輸入算出完整版面。**唯一入口**——畫面、複製 JSON、下載 SVG、
   * 深連結全部走這裡，故不可能出現「畫面與輸出不一致」。
   *
   * @param {object} input {total, rings, fontSize, gap, n1, padding, mode}
   * @returns {object} result（`ok:false` 時帶 `error`，其餘欄位不保證存在）
   */
  function compute(input) {
    input = input || {};
    var mode = MODES.indexOf(input.mode) >= 0 ? input.mode : 'rings';

    var total = num(input.total);
    var rings = num(input.rings);
    var fontSize = num(input.fontSize);
    var gap = num(input.gap);
    var n1 = num(input.n1);
    var padding = num(input.padding);
    if (!isFinite(padding) || padding < 0) padding = 0;
    var outerMaxMm = num(input.outerMaxMm);             // 選填的外徑上限（紙張寬度等硬邊界）

    // 驗證：任何一項不成立就明確失敗，不產出 NaN 表格
    if (!isPos(fontSize)) return fail('badFontSize', mode);
    if (!isFinite(gap) || gap < 0) return fail('badGap', mode);
    if (mode !== 'n1' && (!isPos(n1) || n1 < 1)) return fail('badN1', mode);
    if (mode !== 'rings' && (!isPos(rings) || rings < 1)) return fail('badRings', mode);
    if (mode !== 'none' && !isPos(total)) return fail('badTotal', mode);

    var warnings = [];
    var solvedField = null;
    var solved = { rings: rings, gap: gap, n1: n1 };

    // ── 反解自由變數 ──
    if (mode === 'rings') {
      var r = solveRings({ total: total, fontSize: fontSize, gap: gap, n1: n1 });
      if (r === null) return fail('solveFail', mode);
      solved.rings = r;
      solvedField = 'rings';
    } else if (mode === 'gap') {
      var g = solveGap({ total: total, rings: rings, fontSize: fontSize, n1: n1 });
      if (g === null) return fail(rings < 2 ? 'gapNeedsTwoRings' : 'solveFail', mode);
      solved.gap = g;
      solvedField = 'gap';
    } else if (mode === 'n1') {
      var v = solveN1({ total: total, rings: rings, fontSize: fontSize, gap: gap });
      if (v === null) return fail('solveFail', mode);
      solved.n1 = v;
      solvedField = 'n1';
    }

    if (!isPos(solved.rings) || solved.rings < 1) return fail('badRings', mode);
    if (!isPos(solved.n1) || solved.n1 < 1) return fail('badN1', mode);

    // ── 幾何 ──
    var R1 = innerRadius(solved.n1, fontSize);
    var k = TWO_PI / fontSize;               // 每半徑單位可容納字數
    var radii = [], raw = [], i;
    for (i = 0; i < solved.rings; i++) {
      var Ri = R1 + i * solved.gap;
      radii.push(Ri);
      raw.push(k * Ri);
    }
    var Router = R1 + (solved.rings - 1) * solved.gap;
    var rawSum = sum(raw);

    // ── 取整 / 配平 ──
    var counts, scale;
    if (mode === 'none') {
      counts = raw.map(function (x) { return Math.max(0, Math.round(x)); });
      scale = 1;
    } else {
      scale = rawSum > 0 ? total / rawSum : 0;
      counts = largestRemainder(raw.map(function (x) { return x * scale; }), total);
    }
    var sumCounts = sum(counts);

    // ── 實際字距（任何模式都要回報）──
    var circum = radii.map(function (R) { return TWO_PI * R; });
    var arcMean = sumCounts > 0 ? sum(circum) / sumCounts : NaN;
    var arcs = counts.map(function (c, idx) {
      return c > 0 ? circum[idx] / c : NaN;
    });
    var deltaPct = isFinite(arcMean) ? (arcMean / fontSize - 1) * 100 : NaN;

    // ── 尺寸 ──
    var outerExtent = Router + fontSize / 2;
    var innerExtent = Math.max(0, R1 - fontSize / 2);
    var centralMaxSize = innerExtent > 0 ? innerExtent * Math.SQRT2 : 0;

    // ── 警告 ──
    if (isFinite(deltaPct) && Math.abs(deltaPct) > ARC_TOLERANCE * 100) {
      warnings.push({ code: 'arcOff', arc: arcMean, fontSize: fontSize, pct: deltaPct });
    }
    if (solved.gap > 0 && solved.gap < fontSize) {
      warnings.push({ code: 'gapTight', gap: solved.gap, fontSize: fontSize });
    }
    if (counts.indexOf(0) >= 0) {
      warnings.push({ code: 'emptyRing', n: counts.filter(function (c) { return c === 0; }).length });
    }
    if (mode !== 'none' && sumCounts !== Math.round(total)) {
      warnings.push({ code: 'sumMismatch', got: sumCounts, want: Math.round(total) });
    }
    // 外徑上限是「放不放得進紙張」的硬邊界，任何模式都要檢查。
    // 容差 0.01mm：低於印刷解析度，且參數寫回欄位時的四捨五入殘差本來就在這個量級，
    // 用 1e-6 比會把「剛好貼齊上限」誤報成超出。
    var outerMm = 2 * outerExtent * PT_TO_MM;
    if (isPos(outerMaxMm) && outerMm > outerMaxMm + OUTER_TOLERANCE_MM) {
      warnings.push({ code: 'overWidth', outer: outerMm, max: outerMaxMm, over: outerMm - outerMaxMm });
    }

    return {
      ok: true,
      error: null,
      mode: mode,
      solvedField: solvedField,
      input: {
        total: total, rings: rings, fontSize: fontSize,
        gap: gap, n1: n1, padding: padding, mode: mode,
        outerMaxMm: isFinite(outerMaxMm) ? outerMaxMm : null
      },
      solved: solved,
      R1: R1,
      Router: Router,
      radii: radii,
      raw: raw,
      rawSum: rawSum,
      counts: counts,
      sumCounts: sumCounts,
      scale: scale,
      arcs: arcs,
      arc: { mean: arcMean, ratio: arcMean / fontSize, deltaPct: deltaPct },
      geom: {
        outerExtent: outerExtent,
        innerExtent: innerExtent,
        width: 2 * outerExtent,
        height: 2 * outerExtent,
        centralMaxSize: centralMaxSize,
        centralMaxSizePx: centralMaxSize * (96 / 72),
        innerDiameterPt: 2 * R1,
        innerDiameterMm: 2 * R1 * PT_TO_MM,
        outerDiameterPt: 2 * outerExtent,
        outerDiameterMm: 2 * outerExtent * PT_TO_MM,
        outerMaxMm: isFinite(outerMaxMm) ? outerMaxMm : null,
        fitsOuterMax: isPos(outerMaxMm) ? (2 * outerExtent * PT_TO_MM <= outerMaxMm + OUTER_TOLERANCE_MM) : null,
        padding: padding
      },
      warnings: warnings
    };
  }

  function fail(code, mode) {
    return { ok: false, error: code, mode: mode, warnings: [] };
  }

  // ── SVG（純字串組裝，故留在 lib；畫面與下載用同一份字串）─────────────────

  var SVG_DEFAULT_LABELS = {
    legend: 'Legend',
    baselines: 'Baselines',
    first: 'First ring R1 (solid) / inner safe edge (dashed)',
    last: 'Last ring Ro (solid) / outer safe edge (dashed)',
    band: 'Text band (safe area)'
  };

  /**
   * 產生示意圖 SVG 字串。單位為 pt（`width`/`height` 帶 pt 後綴，
   * 故下載後在向量軟體開啟即為實際印刷尺寸；螢幕上由 CSS 縮放）。
   *
   * @param {object} result compute() 的回傳
   * @param {object} [opts] {labels, background} — 文字由呼叫端傳入（lib 不依賴 I18n）
   */
  function buildSvg(result, opts) {
    if (!result || !result.ok) return '';
    opts = opts || {};
    var L = {}, key;
    for (key in SVG_DEFAULT_LABELS) L[key] = SVG_DEFAULT_LABELS[key];
    if (opts.labels) for (key in opts.labels) if (opts.labels[key]) L[key] = opts.labels[key];

    var g = result.geom;
    var pad = g.padding;
    var cw = g.width + 2 * pad, ch = g.height + 2 * pad;
    var cx = cw / 2, cy = ch / 2;
    var f2 = function (x) { return formatNumber(x, 2); };

    var C = {
      bg: opts.background || '#151718',
      frame: '#2a2d2e', grid: '#2a2d2e',
      band: '#3a7afe22', bandMark: '#3a7afeaa',
      first: '#00d4aa', last: '#ff9f43',
      base: '#4b4f51', text: '#cfd8dc', head: '#9fd1ff', scale: '#8f93a2'
    };
    var FONT = 'system-ui, -apple-system, \'Noto Sans TC\', \'Hiragino Sans\', sans-serif';

    var o = [];
    o.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + f2(cw) + 'pt" height="' + f2(ch) + 'pt"' +
      ' viewBox="0 0 ' + f2(cw) + ' ' + f2(ch) + '" role="img">');
    o.push('<rect x="0" y="0" width="' + f2(cw) + '" height="' + f2(ch) + '" fill="' + C.bg + '"/>');
    o.push('<rect x="0" y="0" width="' + f2(cw) + '" height="' + f2(ch) + '" fill="none" stroke="' + C.frame + '"/>');

    // 十字中心線
    o.push('<line x1="' + f2(cx) + '" y1="0" x2="' + f2(cx) + '" y2="' + f2(ch) +
      '" stroke="' + C.grid + '" stroke-dasharray="4 4"/>');
    o.push('<line x1="0" y1="' + f2(cy) + '" x2="' + f2(cw) + '" y2="' + f2(cy) +
      '" stroke="' + C.grid + '" stroke-dasharray="4 4"/>');

    // 文字帶（環狀安全區）：用 evenodd 真的挖空，不靠背景色覆蓋
    o.push('<path fill-rule="evenodd" fill="' + C.band + '" d="' +
      circlePath(cx, cy, g.outerExtent) + ' ' + circlePath(cx, cy, g.innerExtent) + '"/>');

    // 所有基線圈
    for (var i = 0; i < result.radii.length; i++) {
      var isFirst = i === 0, isLast = i === result.radii.length - 1;
      o.push('<circle cx="' + f2(cx) + '" cy="' + f2(cy) + '" r="' + f2(result.radii[i]) +
        '" fill="none" stroke="' + (isFirst ? C.first : isLast ? C.last : C.base) +
        '" stroke-opacity="' + (isFirst || isLast ? '0.9' : '0.3') + '"/>');
    }
    // 首末圈強調 + 內外安全邊界
    o.push('<circle cx="' + f2(cx) + '" cy="' + f2(cy) + '" r="' + f2(result.R1) +
      '" fill="none" stroke="' + C.first + '" stroke-width="1.5"/>');
    o.push('<circle cx="' + f2(cx) + '" cy="' + f2(cy) + '" r="' + f2(result.Router) +
      '" fill="none" stroke="' + C.last + '" stroke-width="1.5"/>');
    o.push('<circle cx="' + f2(cx) + '" cy="' + f2(cy) + '" r="' + f2(g.innerExtent) +
      '" fill="none" stroke="' + C.first + '" stroke-dasharray="6 4"/>');
    o.push('<circle cx="' + f2(cx) + '" cy="' + f2(cy) + '" r="' + f2(g.outerExtent) +
      '" fill="none" stroke="' + C.last + '" stroke-dasharray="6 4"/>');

    // 半徑標尺
    o.push('<line x1="' + f2(cx) + '" y1="' + f2(cy) + '" x2="' + f2(cx + g.outerExtent) +
      '" y2="' + f2(cy) + '" stroke="' + C.scale + '"/>');

    // 圖例
    var legend = [
      { c: C.base, t: L.baselines },
      { c: C.first, t: L.first },
      { c: C.last, t: L.last },
      { c: C.bandMark, t: L.band }
    ];
    o.push(text(12, 20, L.legend, C.head, 12));
    for (var j = 0; j < legend.length; j++) {
      var y = 40 + j * 18;
      o.push('<rect x="12" y="' + (y - 8) + '" width="12" height="6" fill="' + legend[j].c + '"/>');
      o.push(text(32, y, legend[j].t, C.text, 11));
    }

    // 數值標註（靠右，不用魔術偏移量）
    o.push(text(cx + g.outerExtent, cy - 8, 'outerExtent = ' + f2(g.outerExtent) + ' pt', C.scale, 11, 'end'));
    o.push(text(cx + result.Router, cy + 18, 'Ro = ' + f2(result.Router) + ' pt', C.last, 11, 'end'));
    o.push(text(cx + result.R1, cy + 32, 'R1 = ' + f2(result.R1) + ' pt', C.first, 11, 'end'));

    o.push('</svg>');
    return o.join('\n');

    function text(x, y, s, fill, size, anchor) {
      return '<text x="' + f2(x) + '" y="' + f2(y) + '" fill="' + fill +
        '" font-size="' + size + '" font-family="' + FONT + '"' +
        (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + esc(s) + '</text>';
    }
  }

  /** 一個圓的 path（兩段弧），供 fill-rule="evenodd" 組環 */
  function circlePath(cx, cy, r) {
    if (!(r > 0)) return '';
    var f2 = function (x) { return formatNumber(x, 2); };
    return 'M' + f2(cx - r) + ',' + f2(cy) +
      'a' + f2(r) + ',' + f2(r) + ' 0 1,0 ' + f2(2 * r) + ',0' +
      'a' + f2(r) + ',' + f2(r) + ' 0 1,0 ' + f2(-2 * r) + ',0';
  }

  // ── snapshot / 深連結 / 匯入 ─────────────────────────────────────────────

  /**
   * 可 JSON 化的完整快照。
   * ⚠️ `rings[].characters` 是下游切字用的欄位（見 README），**鍵名不可更動**。
   */
  function snapshot(result, updatedAt) {
    if (!result || !result.ok) {
      return { ok: false, error: result ? result.error : 'noResult' };
    }
    var ringDetails = result.counts.map(function (c, i) {
      return {
        ring: i + 1,
        characters: c,
        theoretical: result.raw[i],
        radiusPt: result.radii[i],
        arcPt: result.arcs[i]
      };
    });
    return {
      app: 'circle-text',
      updatedAt: updatedAt || new Date().toISOString(),
      inputs: {
        total: result.input.total,
        rings: result.solved.rings,
        fontSize: result.input.fontSize,
        gap: result.solved.gap,
        n1: result.solved.n1,
        padding: result.input.padding,
        mode: result.mode,
        innerDiameterMm: result.geom.innerDiameterMm,
        outerMaxMm: result.input.outerMaxMm
      },
      solved: { field: result.solvedField, value: result.solvedField ? result.solved[result.solvedField] : null },
      derived: {
        R1: result.R1,
        R_outer: result.Router,
        outerExtent: result.geom.outerExtent,
        innerExtent: result.geom.innerExtent,
        width: result.geom.width,
        height: result.geom.height,
        centralMaxSize: result.geom.centralMaxSize,
        centralMaxSizePx: result.geom.centralMaxSizePx,
        arcMean: result.arc.mean,
        arcDeltaPct: result.arc.deltaPct
      },
      distribution: {
        raw: result.raw,
        balanced: result.counts,
        sumCharacters: result.sumCounts,
        scale: result.scale
      },
      warnings: result.warnings,
      rings: ringDetails
    };
  }

  /** 深連結 → 輸入（未出現或不合法的欄位就不放進結果，由呼叫端決定預設） */
  function parseQuery(search) {
    var out = {};
    if (!search) return out;
    var q = String(search).replace(/^[?#]/, '');
    if (!q) return out;
    var parts = q.split('&');
    for (var i = 0; i < parts.length; i++) {
      var eq = parts[i].indexOf('=');
      if (eq < 0) continue;
      var k = decodeURIComponent(parts[i].slice(0, eq).replace(/\+/g, ' '));
      var v = decodeURIComponent(parts[i].slice(eq + 1).replace(/\+/g, ' '));
      if (NUMERIC_FIELDS.indexOf(k) >= 0) {
        var n = num(v);
        if (isFinite(n)) out[k] = n;
      } else if (k === 'mode' && MODES.indexOf(v) >= 0) {
        out.mode = v;
      }
    }
    return out;
  }

  /** 輸入 → 深連結（欄位順序固定，方便逐字比對） */
  function buildQuery(input) {
    input = input || {};
    var parts = [];
    for (var i = 0; i < NUMERIC_FIELDS.length; i++) {
      var k = NUMERIC_FIELDS[i], n = num(input[k]);
      if (isFinite(n)) parts.push(k + '=' + encodeURIComponent(String(n)));
    }
    if (MODES.indexOf(input.mode) >= 0) parts.push('mode=' + encodeURIComponent(input.mode));
    return parts.length ? '?' + parts.join('&') : '';
  }

  /**
   * 貼上的 JSON → 輸入。接受三種形狀：
   *   ① 本 app 的 snapshot（`{inputs:{…}}`）
   *   ② 裸輸入物件（`{total, rings, …}`）
   *   ③ 舊版 circle-text-3 的 snapshot（帶布林 `fit`）→ fit:true 對應 mode 'scale'
   * 解析失敗回 null（由呼叫端出 toast），不丟例外。
   */
  function parseSnapshot(text) {
    var data;
    try {
      data = (typeof text === 'string') ? JSON.parse(text) : text;
    } catch (e) { return null; }
    if (!data || typeof data !== 'object') return null;

    var src = (data.inputs && typeof data.inputs === 'object') ? data.inputs
      : (data.input && typeof data.input === 'object') ? data.input
        : data;

    var out = {};
    for (var i = 0; i < NUMERIC_FIELDS.length; i++) {
      var k = NUMERIC_FIELDS[i], n = num(src[k]);
      if (isFinite(n)) out[k] = n;
    }
    if (MODES.indexOf(src.mode) >= 0) {
      out.mode = src.mode;
    } else if (typeof src.fit === 'boolean') {
      out.mode = src.fit ? 'scale' : 'none';   // 舊版相容
    }
    // 沒有任何可用欄位就當作解析失敗，而不是回一個空物件讓呼叫端誤以為成功
    for (var key in out) if (Object.prototype.hasOwnProperty.call(out, key)) return out;
    return null;
  }

  window.CircleTextLib = {
    PT_TO_MM: PT_TO_MM,
    MM_TO_PT: MM_TO_PT,
    MODES: MODES,
    NUMERIC_FIELDS: NUMERIC_FIELDS,
    num: num,
    formatNumber: formatNumber,
    innerRadius: innerRadius,
    ringCountFromDiameter: ringCountFromDiameter,
    theoreticalTotal: theoreticalTotal,
    solveRings: solveRings,
    solveGap: solveGap,
    solveN1: solveN1,
    largestRemainder: largestRemainder,
    compute: compute,
    buildSvg: buildSvg,
    snapshot: snapshot,
    PAPER_SIZES: PAPER_SIZES,
    outerLimitFromPaper: outerLimitFromPaper,
    planByExtent: planByExtent,
    parseQuery: parseQuery,
    buildQuery: buildQuery,
    parseSnapshot: parseSnapshot
  };
})(window);
