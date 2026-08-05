# CLAUDE.md — circle-text

> 版本 v1.1｜最後更新 2026-08-05

圓形排字版面計算器。**單頁、零後端、零資料庫**——後端只有靜態檔、根路徑轉址、JSON 404。

## 先讀家族規範

- [DESIGN_GUIDELINES.md](https://github.com/scottgfhong310/nodeapp-webapp-family/blob/main/DESIGN_GUIDELINES.md)
  — 結構 / 後端 / 前端 / 視覺 / i18n / 安全
- [WORKFLOW.md](https://github.com/scottgfhong310/nodeapp-webapp-family/blob/main/WORKFLOW.md)
  — 新增／改版一支家族 app 的流程
- [SHARED_LIBRARY_GUIDELINES.md](https://github.com/scottgfhong310/nodeapp-webapp-family/blob/main/SHARED_LIBRARY_GUIDELINES.md)
  — 共用件的權威版與同步紀律

本 repo 的設計取捨（為什麼長這樣）見 [DESIGN.md](./DESIGN.md)；怎麼用見 [README.md](./README.md)。

## 結構

```
app.js                          Express：static + / → 302 + JSON 404 + PORT||3000
scripts/verify.js               契約檢查（`npm run verify`；`--selftest` 反向驗證）
public/apps/circle-text/
  index.html                    純結構（唯一 inline script ＝ §4.1 的防閃爍開機腳本）
  circle-text.css               主題 token + 本頁樣式
  circle-text.js                控制器：DOM / 事件 / i18n / toast
  circle-text-lib.js            核心：純邏輯，不碰 DOM → window.CircleTextLib
  i18n.js, locales/{zh-Hant,en,ja}.js
  side-tool.css, side-tool.js, materialize-dark.css
  icons/                        favicon / apple-touch / PWA manifest
```

## 執行與驗證

```bash
npm install && npm start        # → http://localhost:3000/apps/circle-text/
npm run verify                  # 20 條契約檢查，全過 exit 0
node scripts/verify.js --selftest
```

## 這支的 canon 重點

- **控制器不保存計算結果。** 畫面、複製 JSON、複製連結、下載 SVG 各自呼叫
  `currentResult()` 由當下欄位重算。改動任何出口時**不要**引入快取的 snapshot——
  那正是前身（InProgress 的 `lib/page/circle-text-3.html`）最嚴重的 bug。
- **`circle-text-lib.js` 不得碰 DOM**（§4.1 界線）。SVG 產生留在 lib 是因為它是**純字串組裝**；
  一旦改成 `createElementNS`，就必須移到控制器。verify 第 ⑧ 條擋著。
- **任何配平模式都必須回報 `arc.mean` 與 `deltaPct`**。這是本 app 存在的理由，
  verify 第 ⑭ 條擋著。新增模式時連同 `SOLVED_FIELD` 一起登記（第 ⑰ 條）。
- **`snapshot().rings[].characters` 是對下游的契約**，鍵名不可更動（第 ⑯ 條）。
- **版面反解（`planByExtent`）不挑答案，只列候選。** 給定總字數＋外徑上限＋中空直徑後
  字級會從方程式裡消掉、圈數與字級嚴格成正比，所以是**一整族解**而非唯一解。
  整數化時**釘死外徑與總字數**（硬約束）、讓中空直徑讓步——這條由 verify 第 ⑱ 條擋著。
  改動它之前先讀 `DESIGN.md §9.1`。
- **`geom.fitsOuterMax` 是三值**：`true`／`false`／`null`（沒設上限＝未判定）。
  未判定不可畫成合格——第 ⑳ 條擋著。
- 側鍵排序照 §5.5：`[入口鍵徽章] → app 工具 → #setting-mode → #setting-lang`（第 ② 條）。
- 共用文案照 §6 正典表逐字抄（第 ⑦ 條）。偏離要在 `db_inprogress.meta_i18n.fd_note` 寫理由。

## 複製件登記

以下檔案是**家族共用件的 byte-identical 複製件**——改就改權威版再同步各複製點，
**不要在本 repo 就地改**（`npm run verify` 第 ⑪ 條會比對）：

| 檔案 | 權威版 |
|---|---|
| `i18n.js` | 家族 repo 根 [`i18n.js`](https://github.com/scottgfhong310/nodeapp-webapp-family/blob/main/i18n.js) |
| `side-tool.css` / `side-tool.js` | 家族 repo 根（DESIGN_GUIDELINES §5.5） |
| `materialize-dark.css` | 家族 repo 根（§5.1） |

`icons/` 是本 app 自有資產，不是複製件。

## InProgress 鏡像

本 repo 是權威。改完要**回灌**孵化器（WORKFLOW A4）：

```bash
cp -R public/apps/circle-text/. /Users/Shared/nodeapp/InProgress/public/apps/circle-text/
diff -rq public/apps/circle-text /Users/Shared/nodeapp/InProgress/public/apps/circle-text
```

本 app 無後端 route，**不必**動 InProgress 的 `app.js`／`upload.js`。回灌後重啟常駐 monolith。
