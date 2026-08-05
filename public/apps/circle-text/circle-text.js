/**
 * circle-text.js — 頁面控制器／膠水
 *
 * 只做 DOM 的事：讀寫欄位、綁事件、i18n 重繪、toast。所有計算都在
 * circle-text-lib.js（純邏輯）。
 *
 * 核心約定：**控制器不保存任何計算結果。**
 * 畫面、複製 JSON、複製連結、下載 SVG 全部各自呼叫 currentResult()，
 * 由當下的欄位值重算一次。所以「畫面顯示的」與「複製出去的」不可能不一致
 * ——這條是針對原型那個「改了欄位卻複製到舊快照」的結構性修法，
 * 不是靠記得在每個出口補呼叫。
 */
(function () {
  'use strict';

  var Lib = window.CircleTextLib;
  var setIconDone = window.SideTool.setIconDone;

  var THEME_KEY = 'circle-text-theme';
  var DEFAULTS = {
    total: 2066, rings: 20, fontSize: 12,
    gap: 14, n1: 57, padding: 24, mode: 'rings'
  };

  /** 各配平模式解出的欄位（null＝不解，欄位全部可編輯） */
  var SOLVED_FIELD = { rings: 'rings', gap: 'gap', n1: 'n1', scale: null, none: null };

  var el = {};
  var selectInst = null;
  var paperInst = null;
  var planCandidates = [];

  /** 候選表只列這個行距比區間——低於下限是重疊、高於上限是字小到沒有意義 */
  var RATIO_MIN = 0.8;
  var RATIO_MAX = 4;

  /** 表格捲動區的最小高度：參數卡再矮也不讓它塌到看不見幾列 */
  var TABLE_MIN_H = 220;
  var writing = false;     // 程式寫欄位時抑制自己的 input handler
  var renderTimer = null;

  // ── 小工具 ────────────────────────────────────────────────────────────

  function $(id) { return document.getElementById(id); }
  function t(key, params) { return window.I18n ? window.I18n.t(key, params) : key; }
  function f2(x) { return Lib.formatNumber(x, 2); }

  function toast(html, cls) {
    if (window.M && M.toast) M.toast({ html: html, classes: cls || '', displayLength: 2200 });
  }

  function setValue(input, value) {
    writing = true;
    input.value = value;
    writing = false;
  }

  /** 複製到剪貼簿：clipboard API → execCommand 退路 → 紅色 toast（§11.1） */
  function copyText(text) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () {
        toast(t('toast.copied'), 'teal');
        return true;
      }).catch(function () {
        if (fallback()) { toast(t('toast.copied'), 'teal'); return true; }
        toast(t('toast.copyFail'), 'red');
        return false;
      });
    }
    var done = fallback();
    toast(t(done ? 'toast.copied' : 'toast.copyFail'), done ? 'teal' : 'red');
    return Promise.resolve(done);
  }

  function downloadText(name, text, mime) {
    var blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }

  function timestamp() {
    var d = new Date(), p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) +
      p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }

  // ── 輸入 ──────────────────────────────────────────────────────────────

  /** 讀取當前欄位值（唯一的輸入來源；不做任何快取） */
  function readInputs() {
    var out = { mode: el.mode.value };
    Lib.NUMERIC_FIELDS.forEach(function (k) { out[k] = el[k].value; });
    return out;
  }

  function currentResult() {
    return Lib.compute(readInputs());
  }

  function applyInputs(input) {
    Lib.NUMERIC_FIELDS.forEach(function (k) {
      var n = Lib.num(input[k]);
      if (isFinite(n)) setValue(el[k], String(n));
    });
    if (Lib.MODES.indexOf(input.mode) >= 0) {
      setValue(el.mode, input.mode);
      refreshSelect();
    }
    syncDiameterFromN1();
    if (window.M && M.updateTextFields) M.updateTextFields();
  }

  /**
   * 內圈直徑是由 N₁ 與字級推導的讀數；只有使用者在它裡面打字時才反過來設 N₁。
   * `force` 供 blur 使用——blur 事件觸發時 activeElement 可能還沒移開，
   * 不強制就會略過回寫，欄位會停在使用者打的原值而不是 N₁ 取整後的實際值。
   */
  function syncDiameterFromN1(force) {
    if (!force && document.activeElement === el.innerDiameter) return;   // 打字中不搶欄位
    var n1 = Lib.num(el.n1.value), fs = Lib.num(el.fontSize.value);
    if (!(n1 > 0) || !(fs > 0)) { setValue(el.innerDiameter, ''); return; }
    setValue(el.innerDiameter, (2 * Lib.innerRadius(n1, fs) * Lib.PT_TO_MM).toFixed(2));
  }

  function onDiameterInput() {
    var mm = Lib.num(el.innerDiameter.value), fs = Lib.num(el.fontSize.value);
    if (!(mm > 0) || !(fs > 0)) return;
    var n1 = Math.round(Lib.ringCountFromDiameter(mm * Lib.MM_TO_PT, fs));
    if (n1 > 0 && String(n1) !== el.n1.value) {
      setValue(el.n1, String(n1));
      if (window.M && M.updateTextFields) M.updateTextFields();
    }
  }

  // ── 渲染 ──────────────────────────────────────────────────────────────

  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 120);
  }

  function render() {
    var mode = el.mode.value;
    var result = currentResult();

    renderModeHint(mode);
    renderSolvedField(mode, result);
    renderMessages(result);
    renderMetrics(result);
    renderTable(result);
    syncDiameterFromN1();
    updateUrl();
    syncTableHeight();
  }

  function renderModeHint(mode) {
    el.modeHint.innerHTML = t('mode.hint.' + mode);
  }

  /**
   * 標記本次配平解出的欄位，並把解出的值寫回去。
   * 解出的欄位設 readonly——它由配平決定，讓人以為改得動才是誤導。
   */
  function renderSolvedField(mode, result) {
    var solved = SOLVED_FIELD[mode] || null;
    ['rings', 'gap', 'n1'].forEach(function (k) {
      var wrap = el.wrap[k];
      var isSolved = (k === solved);
      wrap.classList.toggle('is-solved', isSolved);
      el[k].readOnly = isSolved;
      if (isSolved && result.ok) {
        var v = result.solved[k];
        var text = (k === 'gap') ? String(Number(v.toFixed(4))) : String(v);
        if (el[k].value !== text) setValue(el[k], text);
      }
    });
    // 內圈直徑是 N₁ 的替代輸入；N₁ 一旦由配平解出，它就打了也沒用——
    // 讓一個沒有作用的欄位看起來可以編輯，就是在製造下一個「改了卻沒反應」。
    var diameterDerived = (solved === 'n1');
    el.wrap.innerDiameter.classList.toggle('is-solved', diameterDerived);
    el.innerDiameter.readOnly = diameterDerived;
    if (window.M && M.updateTextFields) M.updateTextFields();
  }

  function renderMessages(result) {
    var out = [];
    if (!result.ok) {
      out.push(msg('error', t('err.' + result.error)));
    } else {
      result.warnings.forEach(function (w) {
        out.push(msg('warn', t('warn.' + w.code, {
          arc: f2(w.arc), fontSize: f2(w.fontSize), pct: f2(w.pct),
          gap: f2(w.gap), n: w.n, got: w.got, want: w.want,
          outer: f2(w.outer), max: f2(w.max), over: f2(w.over)
        })));
      });
    }
    el.messages.innerHTML = out.join('');
  }

  function msg(kind, text) {
    var icon = kind === 'error' ? 'error_outline' : 'warning_amber';
    return '<div class="msg msg-' + kind + '"><i class="material-icons">' + icon + '</i>' +
      '<span>' + escapeHtml(text) + '</span></div>';
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderMetrics(result) {
    if (!result.ok) {
      ['r1', 'router', 'outer', 'inner', 'char', 'arc', 'central'].forEach(function (k) {
        el.m[k].textContent = '—';
      });
      el.m.outerMm.textContent = '';
      el.m.innerMm.textContent = '';
      el.m.centralPx.textContent = '';
      el.m.arcDelta.textContent = '';
      el.m.arcDelta.classList.remove('is-off');
      el.m.outerFit.textContent = '';
      el.m.outerFit.className = 'fit-badge';
      return;
    }
    var g = result.geom;
    el.m.r1.textContent = f2(result.R1);
    el.m.router.textContent = f2(result.Router);
    el.m.outer.textContent = f2(g.width) + ' × ' + f2(g.height);
    el.m.outerMm.textContent = f2(g.outerDiameterMm) + ' × ' + f2(g.outerDiameterMm) + ' mm';
    el.m.inner.textContent = f2(2 * g.innerExtent) + ' × ' + f2(2 * g.innerExtent);
    el.m.innerMm.textContent = f2(2 * g.innerExtent * Lib.PT_TO_MM) + ' × ' +
      f2(2 * g.innerExtent * Lib.PT_TO_MM) + ' mm';
    // 沒設上限就什麼都不顯示——「未判定」不該被畫成「合格」（三值語意）
    var fits = g.fitsOuterMax;
    el.m.outerFit.className = 'fit-badge' + (fits === true ? ' is-fit' : fits === false ? ' is-over' : '');
    el.m.outerFit.textContent = fits === null ? ''
      : t(fits ? 'dims.fits' : 'dims.overLimit', { max: f2(g.outerMaxMm) });

    el.m.char.textContent = f2(result.input.fontSize) + ' × ' + f2(result.input.fontSize);
    el.m.central.textContent = f2(g.centralMaxSize);
    el.m.centralPx.textContent = '≈ ' + f2(g.centralMaxSizePx) + ' px';

    el.m.arc.textContent = f2(result.arc.mean);
    var pct = result.arc.deltaPct;
    var off = isFinite(pct) && Math.abs(pct) > 1;
    el.m.arcDelta.textContent = isFinite(pct)
      ? (pct >= 0 ? '+' : '') + f2(pct) + '%'
      : '';
    el.m.arcDelta.classList.toggle('is-off', off);
  }

  function renderTable(result) {
    if (!result.ok) {
      el.rows.innerHTML = '';
      el.sum.textContent = '';
      return;
    }
    var rows = result.counts.map(function (c, i) {
      return '<tr' + (c === 0 ? ' class="is-empty"' : '') + '>' +
        '<td>' + (i + 1) + '</td>' +
        '<td class="chars">' + c.toLocaleString('en-US') + '</td>' +
        '<td>' + f2(result.radii[i]) + '</td>' +
        '<td>' + f2(result.arcs[i]) + '</td>' +
        '</tr>';
    });
    el.rows.innerHTML = rows.join('');

    var target = Math.round(result.input.total);
    var same = result.mode === 'none' || result.sumCounts === target;
    el.sum.innerHTML = same
      ? t('table.sum', { n: '<b>' + result.sumCounts.toLocaleString('en-US') + '</b>' })
      : t('table.sumTarget', {
        n: '<b>' + result.sumCounts.toLocaleString('en-US') + '</b>',
        t: target.toLocaleString('en-US')
      });
  }

  /** 網址列即存檔：參數隨改隨寫回 URL，於是「複製連結」永遠是當下這一組 */
  function updateUrl() {
    try {
      var q = Lib.buildQuery(readInputs());
      history.replaceState(null, '', location.pathname + q);
    } catch (e) { /* file:// 等情境忽略 */ }
  }

  /**
   * 讓「每圈分配」卡與「參數」卡等高。
   *
   * 兩張卡在 m 斷點不同列（參數在上、表格在下），所以 flex 的自動拉伸幫不上忙，
   * 只能量出來再寫回去：先算表格卡除了捲動區以外的固定高（標題＋合計＋padding），
   * 用參數卡的高度扣掉它，就是捲動區該有的高。
   * 寫進 --table-h，CSS 那邊是 `height`（不是 max-height——要等高就得撐得起來）。
   */
  function syncTableHeight() {
    var params = el.paramsCard, card = el.tableCard, scroll = el.tableScroll;
    if (!params || !card || !scroll) return;
    var chrome = card.offsetHeight - scroll.offsetHeight;      // 捲動區以外的固定高
    var target = params.offsetHeight - chrome;
    if (!isFinite(target)) return;
    target = Math.max(TABLE_MIN_H, Math.round(target));
    document.documentElement.style.setProperty('--table-h', target + 'px');
  }

  // ── 紙張換算：填的是「外徑上限」那一格 ────────────────────────────────

  function initPaperSelect() {
    var opts = ['<option value="custom">' + escapeHtml(t('paper.custom')) + '</option>'];
    Lib.PAPER_SIZES.forEach(function (p) {
      // 紙張名是**資料不是 UI 文案**（§6.1），三語都顯示同一個 A3；尺寸附在後面當佐證
      opts.push('<option value="' + escapeHtml(p.id) + '">' + escapeHtml(p.id) +
        '（' + p.shortMm + ' × ' + p.longMm + ' mm）</option>');
    });
    var keep = el.paper.value;
    el.paper.innerHTML = opts.join('');
    if (keep) el.paper.value = keep;
    if (paperInst) paperInst.destroy();
    paperInst = M.FormSelect.init(el.paper);
  }

  /** 紙張或留邊改動 → 算出可用外徑寫進 outerMaxMm */
  function applyPaper() {
    if (el.paper.value === 'custom') return;
    var mm = Lib.outerLimitFromPaper(el.paper.value, el.paperMargin.value);
    if (!isFinite(mm)) { toast(t('err.paperMargin'), 'red'); return; }
    setValue(el.outerMaxMm, String(Number(mm.toFixed(2))));
    if (window.M && M.updateTextFields) M.updateTextFields();
  }

  // ── 版面反解 ──────────────────────────────────────────────────────────

  function openPlanner() {
    // 預設帶入目前版面的**中空**直徑（不是面板那格「內圈直徑」——那是基線直徑 2R₁，
    // 且由 N₁ 與字級推導而來，正是反解要解的東西，拿它當輸入是循環定義）
    if (!Lib.num(el.planInner.value)) {
      var r = currentResult();
      var mm = r.ok ? 2 * r.geom.innerExtent * Lib.PT_TO_MM : 55;
      setValue(el.planInner, String(Number(mm.toFixed(1))));
      if (window.M && M.updateTextFields) M.updateTextFields();
    }
    renderPlan();
    M.Modal.getInstance(el.planModal).open();
  }

  function renderPlan() {
    var total = Lib.num(el.total.value);
    var outerMaxMm = Lib.num(el.outerMaxMm.value);
    var innerMm = Lib.num(el.planInner.value);

    el.planConstraints.innerHTML = [
      ['plan.cTotal', isFinite(total) ? total.toLocaleString('en-US') : '—'],
      ['plan.cOuter', isFinite(outerMaxMm) ? f2(outerMaxMm) + ' mm' : '—'],
      ['plan.cInner', isFinite(innerMm) ? f2(innerMm) + ' mm' : '—']
    ].map(function (p) {
      return '<span>' + escapeHtml(t(p[0])) + ' <b>' + escapeHtml(p[1]) + '</b></span>';
    }).join('');

    var plan = Lib.planByExtent({
      total: total, outerMaxMm: outerMaxMm, innerTargetMm: innerMm,
      minRings: 2, maxRings: 40
    });
    if (!plan.ok) {
      el.planMessages.innerHTML = msg('error', t('planErr.' + plan.error));
      el.planRows.innerHTML = '';
      return;
    }
    el.planMessages.innerHTML = '';

    // 每個整數圈數都是合法解，但兩端都荒謬（2 圈＝字級 0.49mm、行距比 215）。
    // 只列實用範圍，並**明講濾掉幾筆**——靜默截斷會被讀成「就這些解」。
    var shown = plan.candidates.filter(function (c) {
      return c.ratio >= RATIO_MIN && c.ratio <= RATIO_MAX;
    });
    var hidden = plan.candidates.length - shown.length;
    el.planHidden.textContent = hidden
      ? t('plan.hidden', { n: hidden, lo: RATIO_MIN, hi: RATIO_MAX })
      : '';

    el.planRows.innerHTML = shown.map(function (c, i) {
      // 行距比 <1 相鄰圈的字會重疊；1~1.1 很緊但還可以
      var cls = c.ratio < 1 ? ' class="is-overlap"' : c.ratio < 1.1 ? ' class="is-tight"' : '';
      return '<tr' + cls + '>' +
        '<td>' + c.rings + '</td>' +
        '<td class="chars">' + f2(c.fontSizeMm) + ' mm<br><span class="unit">' + f2(c.fontSize) + ' pt</span></td>' +
        '<td>' + f2(c.gap) + '</td>' +
        '<td class="ratio">' + Lib.formatNumber(c.ratio, 2) + '</td>' +
        '<td>' + c.n1 + '</td>' +
        '<td>' + f2(c.innerDiameterMm) +
        ' <span class="unit">(' + (c.innerDeltaMm >= 0 ? '+' : '') + f2(c.innerDeltaMm) + ')</span></td>' +
        '<td><button type="button" class="plan-apply" data-i="' + i + '">' +
        escapeHtml(t('plan.apply')) + '</button></td>' +
        '</tr>';
    }).join('');

    planCandidates = shown;
  }

  function applyCandidate(c) {
    setValue(el.rings, String(c.rings));
    setValue(el.n1, String(c.n1));
    setValue(el.fontSize, String(Number(c.fontSize.toFixed(4))));
    setValue(el.gap, String(Number(c.gap.toFixed(4))));
    // 候選的理論總字數恰等於目標，故 scale 模式的縮放係數為 1、字距不失真
    setValue(el.mode, 'scale');
    refreshSelect();
    if (window.M && M.updateTextFields) M.updateTextFields();
    clearTimeout(renderTimer);
    render();
    M.Modal.getInstance(el.planModal).close();
    toast(t('toast.planApplied', { n: c.rings }), 'teal');
  }

  // ── SVG ───────────────────────────────────────────────────────────────

  function svgLabels() {
    return {
      legend: t('svg.legend'),
      baselines: t('svg.baselines'),
      first: t('svg.first'),
      last: t('svg.last'),
      band: t('svg.band')
    };
  }

  function buildCurrentSvg() {
    var result = currentResult();
    if (!result.ok) return null;
    return Lib.buildSvg(result, { labels: svgLabels() });
  }

  function openPreview() {
    var svg = buildCurrentSvg();
    if (!svg) { toast(t('err.title'), 'red'); return; }
    el.svgHost.innerHTML = svg;
    M.Modal.getInstance(el.svgModal).open();
  }

  // ── 初始化 ────────────────────────────────────────────────────────────

  function refreshSelect() {
    if (selectInst) selectInst.destroy();
    selectInst = M.FormSelect.init(el.mode);
  }

  function applyTheme(theme) {
    var r = document.documentElement;
    r.setAttribute('data-theme', theme);
    r.classList.toggle('dark-mode', theme === 'dark');
    r.classList.toggle('light-mode', theme === 'light');
    el.modeIcon.textContent = theme === 'dark' ? 'dark_mode' : 'light_mode';
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { }
  }

  function cacheEls() {
    ['total', 'rings', 'fontSize', 'gap', 'n1', 'padding', 'outerMaxMm',
      'innerDiameter', 'mode', 'paper', 'paperMargin'].forEach(function (k) {
        el[k] = $(k);
      });
    el.wrap = {};
    ['rings', 'gap', 'n1', 'innerDiameter'].forEach(function (k) {
      el.wrap[k] = el[k].closest('[data-field]');
    });
    el.modeHint = $('mode-hint');
    el.messages = $('messages');
    el.rows = $('ring-rows');
    el.sum = $('ring-sum');
    el.svgHost = $('svg-host');
    el.svgModal = $('svg-modal');
    el.importModal = $('import-modal');
    el.importText = $('import-text');
    el.modeIcon = document.querySelector('#setting-mode i');
    el.planModal = $('plan-modal');
    el.planRows = $('plan-rows');
    el.planConstraints = $('plan-constraints');
    el.planMessages = $('plan-messages');
    el.planHidden = $('plan-hidden');
    el.planInner = $('planInner');
    el.paramsCard = document.querySelector('[aria-labelledby="params-title"]');
    el.tableCard = document.querySelector('[aria-labelledby="table-title"]');
    el.tableScroll = el.tableCard.querySelector('.table-scroll');
    el.m = {
      r1: $('m-r1'), router: $('m-router'),
      outer: $('m-outer'), outerMm: $('m-outer-mm'),
      inner: $('m-inner'), innerMm: $('m-inner-mm'),
      char: $('m-char'), central: $('m-central'), centralPx: $('m-central-px'),
      arc: $('m-arc'), arcDelta: $('m-arc-delta'),
      outerFit: $('m-outer-fit')
    };
  }

  function bindInputs() {
    Lib.NUMERIC_FIELDS.forEach(function (k) {
      el[k].addEventListener('input', function () {
        if (writing) return;
        scheduleRender();
      });
    });
    el.innerDiameter.addEventListener('input', function () {
      if (writing) return;
      onDiameterInput();
      scheduleRender();
    });
    el.innerDiameter.addEventListener('blur', function () {
      syncDiameterFromN1(true);
      if (window.M && M.updateTextFields) M.updateTextFields();
    });
    el.mode.addEventListener('change', function () {
      clearTimeout(renderTimer);
      render();
    });
    el.paper.addEventListener('change', function () { applyPaper(); scheduleRender(); });
    el.paperMargin.addEventListener('input', function () {
      if (writing) return;
      applyPaper(); scheduleRender();
    });
    // 手動改外徑上限＝不再跟著紙張，把紙張切回「自訂」免得畫面自相矛盾
    el.outerMaxMm.addEventListener('input', function () {
      if (writing) return;
      if (el.paper.value !== 'custom') { el.paper.value = 'custom'; initPaperSelect(); }
    });
  }

  function bindTools() {
    $('setting-preview').addEventListener('click', openPreview);

    $('setting-plan').addEventListener('click', openPlanner);

    el.planInner.addEventListener('input', function () {
      if (writing) return;
      renderPlan();
    });

    el.planRows.addEventListener('click', function (e) {
      var btn = e.target.closest('.plan-apply');
      if (!btn) return;
      var c = planCandidates[Number(btn.dataset.i)];
      if (c) applyCandidate(c);
    });

    $('setting-copy').addEventListener('click', function () {
      var result = currentResult();
      if (!result.ok) { toast(t('err.' + result.error), 'red'); return; }
      copyText(JSON.stringify(Lib.snapshot(result), null, 2));
      setIconDone('setting-copy');
    });

    $('setting-link').addEventListener('click', function () {
      var url = location.origin + location.pathname + Lib.buildQuery(readInputs());
      copyText(url);
      setIconDone('setting-link');
    });

    $('setting-download').addEventListener('click', function () {
      var svg = buildCurrentSvg();
      if (!svg) { toast(t('err.title'), 'red'); return; }
      var name = 'circle-text-' + timestamp() + '.svg';
      downloadText(name, svg, 'image/svg+xml');
      toast(t('toast.downloaded', { n: name }), 'green');
      setIconDone('setting-download');
    });

    $('setting-import').addEventListener('click', function () {
      el.importText.value = '';
      if (window.M && M.textareaAutoResize) M.textareaAutoResize(el.importText);
      M.Modal.getInstance(el.importModal).open();
    });

    $('import-apply').addEventListener('click', function () {
      var parsed = Lib.parseSnapshot(el.importText.value);
      if (!parsed) { toast(t('toast.importFail'), 'red'); return; }
      applyInputs(parsed);
      clearTimeout(renderTimer);
      render();
      M.Modal.getInstance(el.importModal).close();
      toast(t('toast.imported'), 'teal');
    });

    $('setting-guide').addEventListener('click', function () {
      M.Modal.getInstance($('guide-modal')).open();
    });

    $('setting-mode').addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    });

    $('setting-lang').addEventListener('click', function () {
      var next = window.I18n.cycle();
      toast(t('toast.lang', { name: window.I18n.name(next) }), 'teal');
      setIconDone('setting-lang');
    });
  }

  function init() {
    cacheEls();

    // 初始值：預設 ← 深連結覆蓋
    var input = {};
    Object.keys(DEFAULTS).forEach(function (k) { input[k] = DEFAULTS[k]; });
    var fromUrl = Lib.parseQuery(location.search);
    Object.keys(fromUrl).forEach(function (k) { input[k] = fromUrl[k]; });

    M.Modal.init(document.querySelectorAll('.modal'), { dismissible: true });
    selectInst = M.FormSelect.init(el.mode);
    setValue(el.paperMargin, '15');
    initPaperSelect();

    applyInputs(input);
    bindInputs();
    bindTools();

    window.I18n.apply();
    applyTheme(localStorage.getItem(THEME_KEY) || 'dark');

    // 參數卡的高度會隨語言（文案長度）、斷點、欄位顯示與否而變——
    // 用 ResizeObserver 觀察它本身，比逐個猜觸發點可靠（§5.5 的 --content-sb 同一手法）
    if (window.ResizeObserver) {
      new ResizeObserver(syncTableHeight).observe(el.paramsCard);
    } else {
      window.addEventListener('resize', syncTableHeight);
    }

    document.addEventListener('i18n:changed', function () {
      window.I18n.apply();
      refreshSelect();          // FormSelect 有自己的 DOM，換語言要重建
      initPaperSelect();
      render();
      if (el.planModal.classList.contains('open')) renderPlan();
      if (el.svgModal.classList.contains('open')) el.svgHost.innerHTML = buildCurrentSvg() || '';
    });

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
