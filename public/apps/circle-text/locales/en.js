/* English (en) */
I18n.register('en', {
  'title.page': 'Circular Text Layout Calculator',
  'app.title': 'Circular Text Layout Calculator',
  'app.sub': 'Consistent gap model: fixed ring spacing ⇒ circumference and capacity grow linearly with ring index',

  /* Parameters */
  'param.legend': 'Parameters',
  'param.total': 'Total characters (target)',
  'param.rings': 'Rings',
  'param.fontSize': 'Font size / char width (pt)',
  'param.gap': 'Ring gap (pt)',
  'param.n1': 'Inner ring count N<sub>1</sub>',
  'param.innerDiameter': 'Inner diameter (mm)',
  'param.padding': 'SVG padding (pt)',
  'param.mode': 'Balancing method',
  'param.solved': 'solved by balancing',

  /* Balancing modes */
  'mode.rings': 'Solve rings',
  'mode.gap': 'Solve gap',
  'mode.n1': 'Solve inner count',
  'mode.scale': 'Scale spacing',
  'mode.none': 'No balancing',
  'mode.hint.rings': 'Gap and inner count stay put; the ring count is derived. Rings are integers, so the total can only be approached.',
  'mode.hint.gap': 'Ring count and inner count stay put; the gap is derived. The gap is continuous — <strong>the only mode that hits the target exactly</strong>.',
  'mode.hint.n1': 'Ring count and gap stay put; the inner ring count is derived. The inner radius moves with it.',
  'mode.hint.scale': 'Geometry untouched — character counts are simply scaled. <strong>The cost is that real spacing no longer equals the font size.</strong>',
  'mode.hint.none': 'No balancing; theoretical counts are just rounded. The total follows from the geometry.',

  /* Dimensions */
  'dims.title': 'Dimensions',
  'dims.r1': 'R<sub>1</sub> (inner radius, baseline)',
  'dims.router': 'R<sub>o</sub> (outer radius, baseline)',
  'dims.outer': 'Outer W × H',
  'dims.inner': 'Inner W × H (hollow)',
  'dims.charSize': 'Char width / height (setting)',
  'dims.arc': 'Actual arc per character',
  'dims.central': 'Max central glyph size',
  'dims.note': 'pt is a print unit; 1pt ≈ 1.333px (96dpi). The outer size already includes the font-size/2 extension beyond the outermost baseline.',

  /* Per-ring distribution */
  'table.title': 'Per-ring distribution',
  'table.ring': 'Ring',
  'table.chars': 'Chars',
  'table.radius': 'Radius (pt)',
  'table.arc': 'Spacing (pt)',
  'table.sum': '{n} characters total',
  'table.sumTarget': '{n} characters total (target {t})',

  /* Warnings and errors */
  'warn.arcOff': 'Actual arc per character is {arc} pt, {pct}% off the {fontSize} pt font size — the spacing you get is not the one you set.',
  'warn.gapTight': 'A gap of {gap} pt is smaller than the {fontSize} pt font size; characters on adjacent rings will overlap vertically.',
  'warn.emptyRing': '{n} ring(s) received 0 characters.',
  'warn.sumMismatch': 'Total {got} does not match the target {want}.',
  'err.title': 'Cannot compute',
  'err.badFontSize': 'Font size must be a number greater than 0.',
  'err.badGap': 'Ring gap must be 0 or a positive number.',
  'err.badN1': 'Inner ring count must be an integer greater than 0.',
  'err.badRings': 'Ring count must be an integer greater than 0.',
  'err.badTotal': 'Total characters must be a number greater than 0.',
  'err.solveFail': 'No solution for these parameters — please adjust and try again.',
  'err.gapNeedsTwoRings': 'With a single ring the gap does not affect the total, so it cannot be used for balancing — pick another method.',

  /* Side tools */
  'tool.preview': 'SVG diagram',
  'tool.copyJson': 'Copy JSON',
  'tool.downloadSvg': 'Download SVG',
  'tool.copyLink': 'Copy link to these parameters',
  'tool.import': 'Import from pasted JSON',
  'tool.guide': 'Usage guide',
  'tool.mode': 'Toggle light / dark',
  'tool.lang': 'Language',

  /* SVG */
  'svg.title': 'SVG diagram (units: pt)',
  'svg.legend': 'Legend',
  'svg.baselines': 'Ring baselines',
  'svg.first': 'First ring R1 (solid) and inner safe edge (dashed)',
  'svg.last': 'Outermost ring Ro (solid) and outer safe edge (dashed)',
  'svg.band': 'Text band (safe area)',

  /* Import */
  'import.title': 'Import from pasted JSON',
  'import.hint': 'Accepts JSON copied from this page, and the legacy circle-text-3 format (with its boolean fit field). Only parameters are read; everything else is ignored.',
  'import.placeholder': 'Paste JSON here…',

  /* Guide */
  'guide.title': 'Usage guide',
  'guide.model.h': 'What this computes',
  'guide.model.p': 'Consistent gap model: the inner radius follows from the inner ring count and character width (R1 = N1·width / 2π); every subsequent ring adds a fixed gap, and each ring holds circumference ÷ character width. Capacity therefore grows linearly with the ring index.',
  'guide.fit.h': 'Balancing: which variable gives way',
  'guide.fit.p': 'To land exactly on a target total, one of the four parameters has to give way. This app does not decide for you — the balancing method states outright whether it is the ring count, the gap, the inner count, or the spacing. <strong>Only "solve gap" hits the target exactly</strong>, because the gap is continuous; the other three are integers and leave a residual.',
  'guide.arc.h': 'Why the actual arc per character is always shown',
  'guide.arc.p': 'Rounding and balancing both push the real spacing away from the font size you set. This number is the arc each character actually gets; a gap of more than 1% raises a warning. <strong>The geometry and the character counts have to hold at the same time</strong> — and when they do not, you should be able to see it.',
  'guide.io.h': 'Getting parameters in and out',
  'guide.io.p': 'Every parameter lives in the URL, so copying the link is saving your work. You can also copy JSON (including per-ring counts for downstream text splitting), download the SVG, or paste JSON back in to restore a setup.',

  /* Buttons */
  'btn.close': 'Close',
  'btn.apply': 'Apply',
  'btn.cancel': 'Cancel',

  /* Toast */
  'toast.lang': 'Switched to {name}',
  'toast.copied': 'Copied',
  'toast.copyFail': 'Copy failed',
  'toast.downloaded': 'Downloaded: {n}',
  'toast.imported': 'Settings imported',
  'toast.importFail': 'Could not parse — please check that the pasted text is valid JSON'
});
