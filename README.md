# circle-text

> 版本 v1.1｜最後更新 2026-08-04

[English](README.md) ｜ [繁體中文](README.zh-Hant.md) ｜ [日本語](README.ja.md)

A layout calculator for **text set in concentric rings** — mandalas, seals, coins, mantra wheels,
circular labels. Give it a character count and a type size; it tells you how many characters go on
each ring, the radii, the overall diameter, and how much room is left in the middle.

It runs on the **consistent gap model**: ring spacing is fixed, so circumference — and therefore
capacity — grows linearly with the ring index.

```
R₁ = N₁ · s / 2π            inner baseline radius
Rᵢ = R₁ + i · g             ring i (fixed gap g)
cᵢ = 2π · Rᵢ / s            capacity of ring i
T(n) = n·N₁ + δ·n(n−1)/2    total over n rings, δ = 2πg/s
```

## The one idea worth knowing

To land **exactly** on a target character count, one of the four parameters has to give way.
Most calculators quietly stretch the letter spacing and keep reporting your original type size.
This one makes you pick, and then always reports what the spacing actually came out to:

| Balancing method | What it solves for | Hits the target exactly? |
|---|---|---|
| `rings` | how many rings you need | no — rings are integers |
| `gap` | the ring spacing | **yes** — the gap is continuous |
| `n1` | the inner ring's character count | no — counts are integers |
| `scale` | nothing; counts are scaled | yes, by distorting the spacing |
| `none` | nothing; theoretical counts rounded | n/a |

Whatever you choose, the **actual arc per character** is on screen, and a warning appears when it
drifts more than 1% from the type size you set. The geometry and the character counts have to hold
at the same time — and when they do not, you should be able to see it.

## Features

- Five explicit balancing methods; the solved field is marked and locked so it never looks editable.
- Live recompute — every export (JSON, link, SVG) is derived from the current fields, never a cached snapshot.
- Millimetre readouts alongside points, plus a two-way inner-diameter field for physical constraints.
- SVG diagram: baselines, safe area, radius scale; **downloadable at true print size** (`pt` units).
- A **max outer diameter** constraint (with an A2–A5 / Letter paper helper) checked in every mode.
- **Solve from the sheet**: give it a total, a width limit and a hollow diameter, and it lists every
  workable combination of type size, ring count and gap.
- Every parameter lives in the URL — copying the link is saving your work.
- Import from pasted JSON, including the legacy `circle-text-3` format.
- Warnings for tight gaps, empty rings and spacing drift.
- Trilingual UI (`zh-Hant` / `en` / `ja`), light + dark themes, keyboard-free operation not required.

## Run

```bash
npm install
npm start          # → http://localhost:3000/apps/circle-text/
```

`PORT` overrides the default 3000. There is **no database and no API** — the server only serves
static files, redirects `/`, and returns JSON 404s under `/api/`.

```bash
npm run verify     # 20 contract checks
node scripts/verify.js --selftest   # confirm each check can actually fail
```

## Structure

```
circle-text/
├─ app.js                          Express: static + / → 302 + JSON 404 + PORT||3000
├─ scripts/verify.js               contract checks (markup ↔ handler, i18n, geometry)
└─ public/apps/circle-text/
   ├─ index.html                   structure only
   ├─ circle-text.css              theme tokens + page styles
   ├─ circle-text.js               controller: DOM, events, i18n, toasts
   ├─ circle-text-lib.js           core: pure logic, never touches the DOM
   ├─ i18n.js · locales/{zh-Hant,en,ja}.js
   ├─ side-tool.css · side-tool.js · materialize-dark.css     shared family assets
   └─ icons/                       favicon / apple-touch / PWA manifest
```

## HTTP

| Method | Path | Notes |
|---|---|---|
| GET | `/` | 302 → `/apps/circle-text/` |
| GET | `/apps/circle-text/` | the application |
| — | `/api/*` | no endpoints; returns `{ ok: false, error: 'Not found' }` |

## Deep links

Every parameter is a query field, so a URL fully describes a layout:

```
/apps/circle-text/?total=2066&rings=18&fontSize=12.47&gap=16.99&n1=42&padding=24&outerMaxMm=267&mode=scale
```

`mode` is one of `rings` `gap` `n1` `scale` `none`. Unknown or malformed fields are ignored, and the
app rewrites the URL as you edit, so the address bar always matches what is on screen.

## Solving from a width limit

Fix the **total**, the **max outer diameter** `W` and the **hollow diameter** `D`, and something
surprising happens:

```
R₁ = (D + s)/2 ,  Rₒ = (W − s)/2   ⇒   R₁ + Rₒ = (D + W)/2      the type size cancels
T  = π·n·(R₁ + Rₒ)/s               ⇒   n = s · 2T/(π(D + W))
```

Ring count and type size are **strictly proportional**, so these three constraints do not have one
solution — they have a whole family of them. The app therefore does not pick: it lists every integer
ring count with the type size, gap and leading ratio that follow, and you choose.

`n` and `N₁` must be integers, so the three constraints cannot all hold exactly. The outer diameter
and the total are **pinned** (the sheet is a hard edge and every character has to fit); the **hollow
diameter** gives way by well under a millimetre, and each row reports by how much.

Example — 2066 characters on A3 with 15 mm margins (`W` = 267 mm) and a 55 mm hollow:

| Rings | Type size | Gap | Leading | Inner Ø |
|---|---|---|---|---|
| 15 | 3.67 mm | 20.75 pt | 1.99 | 54.73 (−0.27) |
| 18 | 4.40 mm | 16.99 pt | 1.36 | 54.41 (−0.59) |
| 20 | 4.88 mm | 15.15 pt | 1.09 | 54.19 (−0.81) |
| 21 | 5.15 mm | 14.26 pt | 0.98 | 55.49 (+0.49) — rings overlap |

Rows outside a leading ratio of 0.8–4 are omitted (too tight overlaps, too loose makes the type
pointlessly small); the count omitted is stated, never silently dropped.

## Core library

`circle-text-lib.js` is a dependency-free IIFE exposing `window.CircleTextLib`. It touches no DOM,
so it runs unchanged in Node:

```js
const CT = window.CircleTextLib;

const result = CT.compute({ total: 2066, rings: 20, fontSize: 12, gap: 14, n1: 57, mode: 'gap' });
result.solved.gap        // 9.3081  — the ring spacing that hits 2066 exactly
result.arc.mean          // 12       — actual arc per character
result.counts            // [57, 62, 67, …]

CT.buildSvg(result, { labels: { legend: 'Legend' } });   // → SVG string
JSON.stringify(CT.snapshot(result), null, 2);            // → the JSON the copy button produces
```

| Function | Returns |
|---|---|
| `compute(input)` | full result; `{ ok: false, error }` on invalid input |
| `solveRings/solveGap/solveN1(input)` | the free variable, or `null` |
| `largestRemainder(intended, target)` | integer counts summing exactly to `target` |
| `buildSvg(result, opts)` | SVG string (pure string assembly — that is why it lives here) |
| `snapshot(result)` | JSON-ready object (below) |
| `parseQuery/buildQuery` | deep-link round trip |
| `parseSnapshot(text)` | inputs from pasted JSON, or `null` |
| `planByExtent(input)` | every workable candidate for a width limit (above) |
| `outerLimitFromPaper(id, margin)` | usable width in mm from a paper size (short edge − 2 × margin) |
| `PAPER_SIZES` | A2 / A3 / A4 / A5 / Letter / Tabloid, in mm |

## Data structure

`snapshot()` — also what the **Copy JSON** button puts on the clipboard:

```jsonc
{
  "app": "circle-text",
  "updatedAt": "2026-08-04T09:00:00.000Z",   // ISO 8601, generated at copy time
  "inputs": {
    "total": 2066, "rings": 20, "fontSize": 12,
    "gap": 9.3081,                            // the solved value, not what you typed
    "n1": 57, "padding": 24,
    "mode": "gap",                            // rings | gap | n1 | scale | none
    "innerDiameterMm": 76.81
  },
  "solved": { "field": "gap", "value": 9.3081 },   // field is null when nothing was solved
  "derived": {
    "R1": 108.86, "R_outer": 285.71,
    "outerExtent": 291.71, "innerExtent": 102.86,
    "width": 583.43, "height": 583.43,
    "centralMaxSize": 145.47, "centralMaxSizePx": 193.96,
    "arcMean": 12.0,                          // actual arc per character
    "arcDeltaPct": 0.0                        // drift from fontSize, in percent
  },
  "distribution": {
    "raw": [57.0, 61.87, …],                  // theoretical, before rounding
    "balanced": [57, 62, …],                  // integers, sum === inputs.total
    "sumCharacters": 2066,
    "scale": 1.0
  },
  "warnings": [ { "code": "gapTight", "gap": 9.31, "fontSize": 12 } ],
  "rings": [
    { "ring": 1, "characters": 57, "theoretical": 57.0, "radiusPt": 108.86, "arcPt": 12.0 }
  ]
}
```

`rings[].characters` is the field downstream consumers use to split text ring by ring; its name is a
contract and `scripts/verify.js` guards it.

## Notes

- Units are **points** throughout; millimetres are shown alongside. The downloaded SVG carries `pt`
  units on `width`/`height`, so it opens at true size in vector software.
- Character width is assumed equal to the type size — true for CJK, approximate for Latin.
- The app is pure front end, but the PWA manifest pins `start_url`/`scope` to `/apps/circle-text/`,
  so hosting it anywhere other than that path needs the manifest adjusted. **Not configured for GitHub Pages.**

[MIT](LICENSE) © 2026 [Scott G.F. Hong](https://github.com/scottgfhong310)
