# circle-text

> 版本 v1.1｜最後更新 2026-08-04

[English](README.md) ｜ [繁體中文](README.zh-Hant.md) ｜ [日本語](README.ja.md)

**同心円状に文字を組むためのレイアウト計算機**——曼荼羅、印章、貨幣、真言輪、円形ラベル。
総文字数と文字サイズを与えると、各リングに何文字入るか、各半径、全体の外径、
そして中央にどれだけ余白が残るかを算出します。

**等間隔リングモデル**を採用：リング間隔が一定なので、円周（＝収容文字数）はリング番号に比例して増えます。

```
R₁ = N₁ · s / 2π            内側ベースライン半径
Rᵢ = R₁ + i · g             i+1 番目のリング（間隔 g は一定）
cᵢ = 2π · Rᵢ / s            そのリングの収容文字数
T(n) = n·N₁ + δ·n(n−1)/2    n リングの理論総文字数、δ = 2πg/s
```

## 最初に知っておくべき一点

総文字数を目標に**ちょうど**合わせるには、4 つのパラメータのいずれかが譲る必要があります。
多くの計算機は字送りを黙って広げ、それでいて設定した文字サイズを表示し続けます。
このアプリは自分で選ばせ、そのうえで**実際に組み上がる字送りを必ず報告します**：

| 調整方法 | 何を解くか | ちょうど一致するか |
|---|---|---|
| リング数を解く | 必要なリング数 | いいえ——リング数は整数 |
| リング間隔を解く | リング間隔 | **はい**——間隔は連続値 |
| 内側文字数を解く | 内側リングの文字数 | いいえ——文字数は整数 |
| 字送りを伸縮 | 何も解かず文字数を比例配分 | はい、ただし字送りが歪む |
| 調整しない | 何も解かず理論値を四捨五入 | 該当なし |

どれを選んでも**実際の 1 文字あたり弧長**が画面に出ており、設定した文字サイズから 1% を超えて
ずれると警告が出ます。形状と文字数は同時に成り立たなければならず、成り立たないなら見えるべきです。

## 機能

- 5 つの明示的な調整方法。解かれた項目は印が付いてロックされ、編集できるように見えません。
- 即時再計算——すべての出力（JSON・リンク・SVG）は現在の入力欄から計算され、キャッシュを持ちません。
- pt と mm を併記。内径欄は双方向で、物理的な寸法制約をそのまま入力できます。
- SVG 図：ベースライン、セーフエリア、半径スケール。**実寸のままダウンロード**（`pt` 単位）。
- **外径の上限**による制約（A2–A5／Letter の用紙換算つき）。どのモードでも収まるか検査します。
- **用紙から逆算**：総文字数・外径の上限・中空部の直径を与えると、成立する文字サイズ／リング数／間隔の組み合わせを列挙します。
- すべてのパラメータが URL に入るので、リンクのコピーがそのまま保存になります。
- JSON の貼り付けによる読み込み（旧版 `circle-text-3` の形式にも対応）。
- 間隔が狭すぎる／文字が配分されないリング／字送りのずれを警告。
- 三言語（`zh-Hant` / `en` / `ja`）、ライト + ダークテーマ。

## 実行

```bash
npm install
npm start          # → http://localhost:3000/apps/circle-text/
```

`PORT` で既定の 3000 を上書きできます。**データベースも API もありません**——
サーバーは静的ファイル、ルートのリダイレクト、`/api/` 配下の JSON 404 のみを担当します。

```bash
npm run verify     # 20 項目の契約チェック
node scripts/verify.js --selftest   # 各チェックが実際に失敗し得ることを確認
```

## 構成

```
circle-text/
├─ app.js                          Express：static + / → 302 + JSON 404 + PORT||3000
├─ scripts/verify.js               契約チェック（markup ↔ handler・i18n・幾何）
└─ public/apps/circle-text/
   ├─ index.html                   構造のみ
   ├─ circle-text.css              テーマトークン + ページスタイル
   ├─ circle-text.js               コントローラ：DOM・イベント・i18n・toast
   ├─ circle-text-lib.js           コア：純粋ロジック、DOM に触れない
   ├─ i18n.js · locales/{zh-Hant,en,ja}.js
   ├─ side-tool.css · side-tool.js · materialize-dark.css     ファミリー共有アセット
   └─ icons/                       favicon / apple-touch / PWA manifest
```

## HTTP

| Method | Path | 説明 |
|---|---|---|
| GET | `/` | 302 → `/apps/circle-text/` |
| GET | `/apps/circle-text/` | アプリ本体 |
| — | `/api/*` | エンドポイントなし；`{ ok: false, error: 'Not found' }` を返す |

## ディープリンク

すべてのパラメータがクエリ項目なので、URL 1 本でレイアウトを完全に表現できます：

```
/apps/circle-text/?total=2066&rings=18&fontSize=12.47&gap=16.99&n1=42&padding=24&outerMaxMm=267&mode=scale
```

`mode` は `rings` `gap` `n1` `scale` `none` のいずれか。未知・不正な項目は無視され、
編集に応じて URL が書き換わるので、アドレスバーは常に画面と一致します。

## 外径の上限から逆算する

**総文字数**・**外径の上限** `W`・**中空部の直径** `D` を固定すると、意外なことが起きます：

```
R₁ = (D + s)/2 、Rₒ = (W − s)/2   ⇒   R₁ + Rₒ = (D + W)/2      文字サイズが消える
T  = π·n·(R₁ + Rₒ)/s              ⇒   n = s · 2T/(π(D + W))
```

リング数と文字サイズは**厳密に比例**するため、この 3 つの制約の解は一つではなく**一族**です。
そこで本アプリは選びません——整数のリング数ごとに定まる文字サイズ・間隔・行間比をすべて並べ、
選ぶのは利用者です。

`n` と `N₁` は整数でなければならず、3 つの制約を同時に厳密に満たすことはできません。
**外径と総文字数を固定**し（用紙は硬い境界、文字は全部入る必要がある）、
**中空部の直径**が 1mm 未満だけ譲ります。各行にその差を表示します。

例——2066 文字を A3・片側余白 15mm（`W` = 267mm）・中空 55mm に：

| リング数 | 文字サイズ | 間隔 | 行間比 | 実際の内径 |
|---|---|---|---|---|
| 15 | 3.67 mm | 20.75 pt | 1.99 | 54.73（−0.27） |
| 18 | 4.40 mm | 16.99 pt | 1.36 | 54.41（−0.59） |
| 20 | 4.88 mm | 15.15 pt | 1.09 | 54.19（−0.81） |
| 21 | 5.15 mm | 14.26 pt | 0.98 | 55.49（+0.49）— リングが重なる |

行間比が 0.8–4 の範囲外の行は表示しません（詰まりすぎると重なり、緩すぎると文字が小さすぎる）。
**除外した件数は明示**し、黙って切り捨てません。

## コアライブラリ

`circle-text-lib.js` は依存ゼロの IIFE で、`window.CircleTextLib` を公開します。
DOM に触れないため Node でもそのまま動きます：

```js
const CT = window.CircleTextLib;

const result = CT.compute({ total: 2066, rings: 20, fontSize: 12, gap: 14, n1: 57, mode: 'gap' });
result.solved.gap        // 9.3081  — 総文字数を 2066 ちょうどにするリング間隔
result.arc.mean          // 12       — 実際の 1 文字あたり弧長
result.counts            // [57, 62, 67, …]

CT.buildSvg(result, { labels: { legend: '凡例' } });     // → SVG 文字列
JSON.stringify(CT.snapshot(result), null, 2);            // → コピーボタンが生成する JSON
```

| 関数 | 戻り値 |
|---|---|
| `compute(input)` | 完全な結果。入力が不正なら `{ ok: false, error }` |
| `solveRings/solveGap/solveN1(input)` | 自由変数の解、または `null` |
| `largestRemainder(intended, target)` | 合計がちょうど `target` になる整数配列 |
| `buildSvg(result, opts)` | SVG 文字列（純粋な文字列組み立てなので lib に置ける） |
| `snapshot(result)` | JSON 化可能なオブジェクト（下記） |
| `parseQuery/buildQuery` | ディープリンクの往復 |
| `parseSnapshot(text)` | 貼り付けた JSON から入力を復元。失敗時は `null` |
| `planByExtent(input)` | 外径の上限のもとで成立する候補すべて（上記） |
| `outerLimitFromPaper(id, margin)` | 用紙から使える幅 mm（短辺 − 2 × 余白） |
| `PAPER_SIZES` | A2／A3／A4／A5／Letter／Tabloid の mm 寸法 |

## データ構造

`snapshot()`——「JSON をコピー」がクリップボードに入れる内容でもあります：

```jsonc
{
  "app": "circle-text",
  "updatedAt": "2026-08-04T09:00:00.000Z",   // ISO 8601、コピー時に生成
  "inputs": {
    "total": 2066, "rings": 20, "fontSize": 12,
    "gap": 9.3081,                            // 解かれた値であり、入力した値ではない
    "n1": 57, "padding": 24,
    "mode": "gap",                            // rings | gap | n1 | scale | none
    "innerDiameterMm": 76.81
  },
  "solved": { "field": "gap", "value": 9.3081 },   // 何も解かれていなければ field は null
  "derived": {
    "R1": 108.86, "R_outer": 285.71,
    "outerExtent": 291.71, "innerExtent": 102.86,
    "width": 583.43, "height": 583.43,
    "centralMaxSize": 145.47, "centralMaxSizePx": 193.96,
    "arcMean": 12.0,                          // 実際の 1 文字あたり弧長
    "arcDeltaPct": 0.0                        // fontSize からのずれ（%）
  },
  "distribution": {
    "raw": [57.0, 61.87, …],                  // 丸め前の理論値
    "balanced": [57, 62, …],                  // 整数、合計 === inputs.total
    "sumCharacters": 2066,
    "scale": 1.0
  },
  "warnings": [ { "code": "gapTight", "gap": 9.31, "fontSize": 12 } ],
  "rings": [
    { "ring": 1, "characters": 57, "theoretical": 57.0, "radiusPt": 108.86, "arcPt": 12.0 }
  ]
}
```

`rings[].characters` は下流がリングごとに文章を分割するための項目で、**キー名は契約**です。
`scripts/verify.js` が守っています。

## 注記

- 単位は全体を通して **pt**、mm を併記します。ダウンロードした SVG は `width`/`height` に `pt` を
  持つため、ベクターソフトで実寸のまま開きます。
- 字幅は文字サイズと等しいと仮定します——CJK では成立、ラテン文字では近似です。
- 本アプリはフロントエンドのみですが、PWA マニフェストの `start_url`/`scope` が
  `/apps/circle-text/` に固定されているため、別のパスに置く場合はマニフェストの調整が必要です。
  **GitHub Pages 向けの設定はしていません。**

[MIT](LICENSE) © 2026 [Scott G.F. Hong](https://github.com/scottgfhong310)
