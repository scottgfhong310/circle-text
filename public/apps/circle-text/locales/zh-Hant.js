/* 繁體中文（zh-Hant） */
I18n.register('zh-Hant', {
  'title.page': '圓形排字版面計算',
  'app.title': '圓形排字版面計算',
  'app.sub': '固定圈距模型：圈距固定 ⇒ 周長與可容納字數隨圈序線性增加',

  /* 參數 */
  'param.legend': '參數',
  'param.total': '總字數（配平目標）',
  'param.rings': '圈數',
  'param.fontSize': '字級 / 字寬 (pt)',
  'param.gap': '圈距 (pt)',
  'param.n1': '內圈字數 N<sub>1</sub>',
  'param.innerDiameter': '內圈直徑 (mm)',
  'param.padding': 'SVG 邊界 (pt)',
  'param.mode': '配平方式',
  'param.solved': '由配平解出',

  /* 配平模式 */
  'mode.rings': '調圈數',
  'mode.gap': '調圈距',
  'mode.n1': '調內圈字數',
  'mode.scale': '縮放字距',
  'mode.none': '不配平',
  'mode.hint.rings': '圈距與內圈字數不動，反推需要幾圈。圈數是整數，故總字數只能逼近。',
  'mode.hint.gap': '圈數與內圈字數不動，反推圈距。圈距是連續值，<strong>唯一能精確命中總字數</strong>的模式。',
  'mode.hint.n1': '圈數與圈距不動，反推內圈該起幾字。內圈半徑會跟著變。',
  'mode.hint.scale': '幾何完全不動，直接把字數等比縮放——<strong>代價是實際字距不再等於字級</strong>。',
  'mode.hint.none': '不配平，只把理論字數四捨五入；總字數由幾何決定。',

  /* 尺寸 */
  'dims.title': '尺寸計算',
  'dims.r1': 'R<sub>1</sub>（內圈半徑，基線）',
  'dims.router': 'R<sub>o</sub>（最外圈半徑，基線）',
  'dims.outer': '外徑 寬 × 高',
  'dims.inner': '內徑 寬 × 高（中空）',
  'dims.charSize': '字寬 / 字高（設定值）',
  'dims.arc': '實際每字弧長',
  'dims.central': '中心單字最大字級',
  'dims.note': 'pt 為印刷單位；1pt ≈ 1.333px（96dpi）。外徑已含最外圈基線外推 字級/2。',

  /* 每圈分配 */
  'table.title': '每圈分配',
  'table.ring': '圈',
  'table.chars': '字數',
  'table.radius': '半徑 (pt)',
  'table.arc': '字距 (pt)',
  'table.sum': '合計 {n} 字',
  'table.sumTarget': '合計 {n} 字（目標 {t}）',

  /* 警告與錯誤 */
  'warn.arcOff': '實際每字弧長 {arc} pt，與設定字級 {fontSize} pt 相差 {pct}%——排出來的字距不是你設定的那個。',
  'warn.gapTight': '圈距 {gap} pt 小於字級 {fontSize} pt，相鄰兩圈的字會在縱向重疊。',
  'warn.emptyRing': '有 {n} 圈分配到 0 個字。',
  'warn.sumMismatch': '總和 {got} 與目標 {want} 不符。',
  'err.title': '無法計算',
  'err.badFontSize': '字級必須是大於 0 的數字。',
  'err.badGap': '圈距必須是 0 或正數。',
  'err.badN1': '內圈字數必須是大於 0 的整數。',
  'err.badRings': '圈數必須是大於 0 的整數。',
  'err.badTotal': '總字數必須是大於 0 的數字。',
  'err.solveFail': '這組參數解不出來，請調整後再試。',
  'err.gapNeedsTwoRings': '只有一圈時圈距不影響總字數，無法用它配平——請改用其他配平方式。',

  /* 側邊工具 */
  'tool.preview': 'SVG 示意圖',
  'tool.copyJson': '複製 JSON',
  'tool.downloadSvg': '下載 SVG',
  'tool.copyLink': '複製本組參數的連結',
  'tool.import': '貼上 JSON 匯入',
  'tool.guide': '使用說明',
  'tool.mode': '切換 light / dark',
  'tool.lang': '語言',
  'tool.more': '更多工具',

  /* SVG */
  'svg.title': 'SVG 示意圖（單位：pt）',
  'svg.legend': '圖例',
  'svg.baselines': '各圈基線',
  'svg.first': '第 1 圈基線 R1（實線）與內安全邊界（虛線）',
  'svg.last': '最外圈基線 Ro（實線）與外安全邊界（虛線）',
  'svg.band': '文字帶安全區',

  /* 匯入 */
  'import.title': '貼上 JSON 匯入',
  'import.hint': '接受本頁複製出去的 JSON，也接受舊版 circle-text-3 的格式（含布林 fit 欄位）。只讀取參數，其餘欄位忽略。',
  'import.placeholder': '把 JSON 貼在這裡…',

  /* 說明 */
  'guide.title': '使用說明',
  'guide.model.h': '這支在算什麼',
  'guide.model.p': '固定圈距模型：內圈半徑由內圈字數與字寬決定（R1 = N1·字寬 / 2π），之後每圈半徑加一個固定圈距，每圈可容納字數＝該圈周長 ÷ 字寬。所以字數隨圈序線性增加。',
  'guide.fit.h': '配平：要犧牲哪個變數',
  'guide.fit.p': '要讓總字數剛好命中目標，四個參數裡必須有一個讓步。這支不替你決定——由「配平方式」明講犧牲的是圈數、圈距、內圈字數，還是字距。<strong>只有「調圈距」能精確命中</strong>，因為圈距是連續值；其餘三個都是整數，會留下殘差。',
  'guide.arc.h': '為什麼一直顯示「實際每字弧長」',
  'guide.arc.p': '字數取整與配平都會讓實際字距偏離你設定的字級。這個數字就是排出來以後真正的每字弧長，與字級的落差超過 1% 會出現警告。<strong>幾何與字數必須同時說得通</strong>，說不通就該看見。',
  'guide.io.h': '參數怎麼帶進帶出',
  'guide.io.p': '參數全部寫在網址列，複製連結就等於存檔。另可複製 JSON（含每圈字數，供下游切字用）、下載 SVG，或把 JSON 貼回來還原設定。',

  /* 按鈕 */
  'btn.close': '關閉',
  'btn.apply': '套用',
  'btn.cancel': '取消',

  /* 外徑上限・紙張・版面反解 */
  'param.outerMax': '外徑上限 (mm)',
  'param.paper': '紙張',
  'param.paperMargin': '單邊留邊 (mm)',
  'paper.custom': '自訂',
  'dims.fits': '放得下（上限 {max} mm）',
  'dims.overLimit': '超出上限 {max} mm',
  'warn.overWidth': '外徑 {outer} mm 超出上限 {max} mm，超出 {over} mm——放不進去。',
  'err.paperMargin': '留邊太大，這張紙沒有可用寬度了。',
  'tool.plan': '由外徑反解參數',
  'plan.title': '由外徑反解參數',
  'plan.intro': '給定<strong>總字數</strong>、<strong>外徑上限</strong>與<strong>內圈直徑</strong>後，字級與圈數會嚴格成正比——因為 R<sub>1</sub> + R<sub>o</sub> 只由內外徑決定，字級在總字數的方程式裡被消掉了。所以這組約束<strong>不是唯一解，而是一整族解</strong>：下表每一列都成立，差別在行距的鬆緊。',
  'plan.note': '外徑與總字數<strong>釘死</strong>（不能超出紙張、字要全放得下）；圈數與內圈字數必須是整數，所以讓<strong>內徑</strong>小幅讓步——括號內是與你設定值的差。行距比＝圈距 ÷ 字級，小於 1 表示相鄰兩圈的字會縱向重疊。',
  'plan.innerTarget': '保留中空直徑 (mm)',
  'plan.rings': '圈數',
  'plan.fontSize': '字級',
  'plan.gap': '圈距 (pt)',
  'plan.ratio': '行距比',
  'plan.n1': '內圈字數',
  'plan.inner': '實際內徑 (mm)',
  'plan.hidden': '另有 {n} 組解未列出——行距比不在 {lo}–{hi} 之間（過緊會重疊，過鬆則字小到沒有意義）。',
  'plan.apply': '套用',
  'plan.cTotal': '總字數',
  'plan.cOuter': '外徑上限',
  'plan.cInner': '中空直徑',
  'planErr.badTotal': '請先填總字數。',
  'planErr.badOuterMax': '請先填外徑上限（或用紙張換算）。',
  'planErr.badInnerTarget': '請先填內圈直徑。',
  'planErr.innerGeOuter': '內圈直徑必須小於外徑上限。',
  'planErr.noCandidate': '這組約束算不出可用的版面，請放寬外徑或縮小內徑。',
  'toast.planApplied': '已套用 {n} 圈的方案',

  /* Toast */
  'toast.lang': '已切換為 {name}',
  'toast.copied': '已複製',
  'toast.copyFail': '複製失敗',
  'toast.downloaded': '已下載：{n}',
  'toast.imported': '已匯入設定',
  'toast.importFail': '解析失敗，請確認貼上的是有效的 JSON'
});
