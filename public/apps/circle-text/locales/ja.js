/* 日本語（ja） */
I18n.register('ja', {
  'title.page': '円形組版レイアウト計算',
  'app.title': '円形組版レイアウト計算',
  'app.sub': '等間隔リングモデル：リング間隔が一定 ⇒ 円周と収容文字数はリング番号に比例して増加',

  /* パラメータ */
  'param.legend': 'パラメータ',
  'param.total': '総文字数（目標）',
  'param.rings': 'リング数',
  'param.fontSize': '文字サイズ / 字幅 (pt)',
  'param.gap': 'リング間隔 (pt)',
  'param.n1': '内側リング文字数 N<sub>1</sub>',
  'param.innerDiameter': '内径 (mm)',
  'param.padding': 'SVG 余白 (pt)',
  'param.mode': '調整方法',
  'param.solved': '調整により算出',

  /* 調整モード */
  'mode.rings': 'リング数を解く',
  'mode.gap': 'リング間隔を解く',
  'mode.n1': '内側文字数を解く',
  'mode.scale': '字送りを伸縮',
  'mode.none': '調整しない',
  'mode.hint.rings': 'リング間隔と内側文字数はそのまま、必要なリング数を逆算します。リング数は整数なので総文字数には近づくだけです。',
  'mode.hint.gap': 'リング数と内側文字数はそのまま、リング間隔を逆算します。間隔は連続値なので<strong>目標にちょうど一致する唯一のモード</strong>です。',
  'mode.hint.n1': 'リング数と間隔はそのまま、内側リングの文字数を逆算します。内径もそれに伴って変わります。',
  'mode.hint.scale': '形状は一切変えず、文字数だけを比例配分します——<strong>代償として実際の字送りが文字サイズと一致しなくなります</strong>。',
  'mode.hint.none': '調整せず、理論値を四捨五入するだけ。総文字数は形状から決まります。',

  /* 寸法 */
  'dims.title': '寸法',
  'dims.r1': 'R<sub>1</sub>（内側半径・ベースライン）',
  'dims.router': 'R<sub>o</sub>（最外周半径・ベースライン）',
  'dims.outer': '外径 幅 × 高さ',
  'dims.inner': '内径 幅 × 高さ（中空）',
  'dims.charSize': '字幅 / 字高（設定値）',
  'dims.arc': '実際の 1 文字あたり弧長',
  'dims.central': '中央 1 文字の最大サイズ',
  'dims.note': 'pt は印刷単位、1pt ≈ 1.333px（96dpi）。外径には最外周ベースラインから 文字サイズ/2 の張り出しを含みます。',

  /* リング別配分 */
  'table.title': 'リング別配分',
  'table.ring': 'リング',
  'table.chars': '文字数',
  'table.radius': '半径 (pt)',
  'table.arc': '字送り (pt)',
  'table.sum': '合計 {n} 文字',
  'table.sumTarget': '合計 {n} 文字（目標 {t}）',

  /* 警告とエラー */
  'warn.arcOff': '実際の 1 文字あたり弧長は {arc} pt で、設定した文字サイズ {fontSize} pt と {pct}% ずれています——組み上がる字送りは設定値ではありません。',
  'warn.gapTight': 'リング間隔 {gap} pt が文字サイズ {fontSize} pt より小さいため、隣り合うリングの文字が縦方向に重なります。',
  'warn.emptyRing': '{n} 本のリングに文字が 1 つも配分されていません。',
  'warn.sumMismatch': '合計 {got} が目標 {want} と一致しません。',
  'err.title': '計算できません',
  'err.badFontSize': '文字サイズは 0 より大きい数値を指定してください。',
  'err.badGap': 'リング間隔は 0 以上の数値を指定してください。',
  'err.badN1': '内側リング文字数は 0 より大きい整数を指定してください。',
  'err.badRings': 'リング数は 0 より大きい整数を指定してください。',
  'err.badTotal': '総文字数は 0 より大きい数値を指定してください。',
  'err.solveFail': 'このパラメータでは解が得られません。値を調整してください。',
  'err.gapNeedsTwoRings': 'リングが 1 本のときは間隔が総文字数に影響しないため調整に使えません——別の方法を選んでください。',

  /* サイドツール */
  'tool.preview': 'SVG 図',
  'tool.copyJson': 'JSON をコピー',
  'tool.downloadSvg': 'SVG をダウンロード',
  'tool.copyLink': 'このパラメータのリンクをコピー',
  'tool.import': 'JSON を貼り付けて読み込み',
  'tool.guide': '使い方',
  'tool.mode': 'ライト / ダーク切替',
  'tool.lang': '言語',

  /* SVG */
  'svg.title': 'SVG 図（単位：pt）',
  'svg.legend': '凡例',
  'svg.baselines': '各リングのベースライン',
  'svg.first': '第 1 リング R1（実線）と内側セーフエリア境界（破線）',
  'svg.last': '最外周リング Ro（実線）と外側セーフエリア境界（破線）',
  'svg.band': '文字帯（セーフエリア）',

  /* 読み込み */
  'import.title': 'JSON を貼り付けて読み込み',
  'import.hint': 'このページからコピーした JSON のほか、旧版 circle-text-3 の形式（真偽値 fit を含む）にも対応します。パラメータのみ読み取り、その他の項目は無視します。',
  'import.placeholder': 'ここに JSON を貼り付け…',

  /* 使い方 */
  'guide.title': '使い方',
  'guide.model.h': 'これは何を計算するのか',
  'guide.model.p': '等間隔リングモデル：内側半径は内側リング文字数と字幅から決まり（R1 = N1·字幅 / 2π）、以降のリングは一定間隔ずつ外へ、各リングの収容文字数は 円周 ÷ 字幅 です。したがって収容数はリング番号に比例して増えます。',
  'guide.fit.h': '調整：どの変数を譲るか',
  'guide.fit.p': '総文字数を目標にちょうど合わせるには、4 つのパラメータのいずれかが譲る必要があります。このアプリは代わりに決めません——リング数・間隔・内側文字数・字送りのどれを譲るかを「調整方法」で明示します。<strong>ちょうど一致するのは「リング間隔を解く」だけ</strong>です。間隔は連続値だからで、他の 3 つは整数のため残差が出ます。',
  'guide.arc.h': '「実際の弧長」を常に表示する理由',
  'guide.arc.p': '文字数の丸めと調整は、実際の字送りを設定した文字サイズからずらします。この数値が実際に 1 文字が得る弧長で、1% を超えてずれると警告が出ます。<strong>形状と文字数は同時に成り立たなければならず</strong>、成り立たないなら見えるべきです。',
  'guide.io.h': 'パラメータの受け渡し',
  'guide.io.p': 'すべてのパラメータは URL に入っているので、リンクをコピーすれば保存になります。ほかに JSON のコピー（下流の文字分割用にリング別文字数を含む）、SVG のダウンロード、JSON を貼り戻しての復元ができます。',

  /* ボタン */
  'btn.close': '閉じる',
  'btn.apply': '適用',
  'btn.cancel': 'キャンセル',

  /* Toast */
  'toast.lang': '{name} に切り替えました',
  'toast.copied': 'コピーしました',
  'toast.copyFail': 'コピーに失敗しました',
  'toast.downloaded': 'ダウンロード：{n}',
  'toast.imported': '設定を読み込みました',
  'toast.importFail': '解析できません。有効な JSON か確認してください'
});
