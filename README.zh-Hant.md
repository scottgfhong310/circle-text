# circle-text

> 版本 v1.0｜最後更新 2026-08-04

[English](README.md) ｜ [繁體中文](README.zh-Hant.md) ｜ [日本語](README.ja.md)

**圓形排字的版面計算器**——曼陀羅、印章、錢幣、真言輪、圓形標籤。給它總字數與字級，
它算出每一圈放幾個字、各圈半徑、整體外徑，以及中間還剩多少空間。

採**固定圈距模型**：圈距固定，所以周長（也就是可容納字數）隨圈序線性增加。

```
R₁ = N₁ · s / 2π            內圈基線半徑
Rᵢ = R₁ + i · g             第 i+1 圈（圈距 g 固定）
cᵢ = 2π · Rᵢ / s            該圈可容納字數
T(n) = n·N₁ + δ·n(n−1)/2    n 圈的理論總字數，δ = 2πg/s
```

## 唯一值得先知道的一件事

要讓總字數**剛好**命中目標，四個參數裡必須有一個讓步。多數計算器的做法是默默把字距拉開，
卻繼續顯示你原本設定的字級。這支要你自己挑，然後**一律回報實際排出來的字距**：

| 配平方式 | 解出什麼 | 能精確命中嗎 |
|---|---|---|
| 調圈數 | 需要幾圈 | 否——圈數是整數 |
| 調圈距 | 圈距 | **能**——圈距是連續值 |
| 調內圈字數 | 內圈起幾字 | 否——字數是整數 |
| 縮放字距 | 什麼都不解，直接縮放字數 | 能，代價是字距失真 |
| 不配平 | 什麼都不解，理論值四捨五入 | 不適用 |

不論選哪一個，**實際每字弧長**都在畫面上；與設定字級相差超過 1% 就出現警告。
幾何與字數必須同時說得通，說不通就該看見。

## 功能

- 五種明講的配平方式；解出的欄位會被標記並鎖定，不會讓人以為改得動。
- 即時重算——每個出口（JSON、連結、SVG）都由當下欄位重算，不存快取，不可能複製到舊值。
- pt 與 mm 並陳，內圈直徑欄雙向連動，可直接套實體尺寸限制。
- SVG 示意圖：基線、安全區、半徑標尺；**下載即實際印刷尺寸**（帶 `pt` 單位）。
- 參數全部寫在網址列——複製連結就等於存檔。
- 可貼上 JSON 匯入，含舊版 `circle-text-3` 的格式。
- 圈距過小、有圈分不到字、字距失真都會出警告。
- 三語（`zh-Hant` / `en` / `ja`）、light + dark 主題。

## 執行

```bash
npm install
npm start          # → http://localhost:3000/apps/circle-text/
```

`PORT` 可覆寫預設的 3000。**沒有資料庫、沒有 API**——後端只負責靜態檔、根路徑轉址，
以及 `/api/` 之下的 JSON 404。

```bash
npm run verify     # 17 條契約檢查
node scripts/verify.js --selftest   # 確認每條檢查真的抓得到問題
```

## 結構

```
circle-text/
├─ app.js                          Express：static + / → 302 + JSON 404 + PORT||3000
├─ scripts/verify.js               契約檢查（markup ↔ handler、i18n、幾何）
└─ public/apps/circle-text/
   ├─ index.html                   純結構
   ├─ circle-text.css              主題 token + 本頁樣式
   ├─ circle-text.js               控制器：DOM、事件、i18n、toast
   ├─ circle-text-lib.js           核心：純邏輯，不碰 DOM
   ├─ i18n.js · locales/{zh-Hant,en,ja}.js
   ├─ side-tool.css · side-tool.js · materialize-dark.css     家族共用件
   └─ icons/                       favicon / apple-touch / PWA manifest
```

## HTTP

| Method | Path | 說明 |
|---|---|---|
| GET | `/` | 302 → `/apps/circle-text/` |
| GET | `/apps/circle-text/` | 應用頁 |
| — | `/api/*` | 無端點；回 `{ ok: false, error: 'Not found' }` |

## 深連結

每個參數都是查詢欄位，所以一條網址就完整描述一組版面：

```
/apps/circle-text/?total=2066&rings=20&fontSize=12&gap=14&n1=57&padding=24&mode=gap
```

`mode` 為 `rings` `gap` `n1` `scale` `none` 之一。不認識或格式錯誤的欄位一律忽略；
編輯時網址會即時改寫，所以網址列永遠與畫面一致。

## 核心 library

`circle-text-lib.js` 是零依賴的 IIFE，掛出 `window.CircleTextLib`。它不碰 DOM，
所以在 Node 裡可以原封不動跑：

```js
const CT = window.CircleTextLib;

const result = CT.compute({ total: 2066, rings: 20, fontSize: 12, gap: 14, n1: 57, mode: 'gap' });
result.solved.gap        // 9.3081  — 讓總字數剛好 2066 的圈距
result.arc.mean          // 12       — 實際每字弧長
result.counts            // [57, 62, 67, …]

CT.buildSvg(result, { labels: { legend: '圖例' } });     // → SVG 字串
JSON.stringify(CT.snapshot(result), null, 2);            // → 複製鈕產生的那份 JSON
```

| 函式 | 回傳 |
|---|---|
| `compute(input)` | 完整結果；輸入不合法時回 `{ ok: false, error }` |
| `solveRings/solveGap/solveN1(input)` | 自由變數的解，或 `null` |
| `largestRemainder(intended, target)` | 總和恰為 `target` 的整數陣列 |
| `buildSvg(result, opts)` | SVG 字串（純字串組裝，所以放得進 lib） |
| `snapshot(result)` | 可 JSON 化的物件（見下） |
| `parseQuery/buildQuery` | 深連結往返 |
| `parseSnapshot(text)` | 由貼上的 JSON 取回輸入，失敗回 `null` |

## 資料結構

`snapshot()`——也就是「複製 JSON」放進剪貼簿的內容：

```jsonc
{
  "app": "circle-text",
  "updatedAt": "2026-08-04T09:00:00.000Z",   // ISO 8601，複製當下產生
  "inputs": {
    "total": 2066, "rings": 20, "fontSize": 12,
    "gap": 9.3081,                            // 解出來的值，不是你打的那個
    "n1": 57, "padding": 24,
    "mode": "gap",                            // rings | gap | n1 | scale | none
    "innerDiameterMm": 76.81
  },
  "solved": { "field": "gap", "value": 9.3081 },   // 沒有解任何變數時 field 為 null
  "derived": {
    "R1": 108.86, "R_outer": 285.71,
    "outerExtent": 291.71, "innerExtent": 102.86,
    "width": 583.43, "height": 583.43,
    "centralMaxSize": 145.47, "centralMaxSizePx": 193.96,
    "arcMean": 12.0,                          // 實際每字弧長
    "arcDeltaPct": 0.0                        // 與 fontSize 的落差（%）
  },
  "distribution": {
    "raw": [57.0, 61.87, …],                  // 取整前的理論值
    "balanced": [57, 62, …],                  // 整數，總和 === inputs.total
    "sumCharacters": 2066,
    "scale": 1.0
  },
  "warnings": [ { "code": "gapTight", "gap": 9.31, "fontSize": 12 } ],
  "rings": [
    { "ring": 1, "characters": 57, "theoretical": 57.0, "radiusPt": 108.86, "arcPt": 12.0 }
  ]
}
```

`rings[].characters` 是下游逐圈切字用的欄位，**鍵名是契約**，由 `scripts/verify.js` 把關。

## 說明

- 全篇以 **pt** 為單位，mm 並陳。下載的 SVG 在 `width`/`height` 帶 `pt`，
  在向量軟體開啟即為實際尺寸。
- 假設字寬等於字級——中日韓文成立，拉丁字母只是近似。
- 本 app 是純前端，但 PWA manifest 的 `start_url`/`scope` 綁在 `/apps/circle-text/`，
  掛到別的路徑需要調整 manifest。**未針對 GitHub Pages 設定。**

[MIT](LICENSE) © 2026 [Scott G.F. Hong](https://github.com/scottgfhong310)
