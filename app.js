/**
 * circle-text — 獨立執行的 Express 伺服器
 *
 * 圓形排字版面計算器：固定圈距模型下，算出每圈字數、半徑、外徑與示意圖。
 * 純計算工具——輸入在網址與表單裡、輸出走剪貼簿與下載，**沒有任何持久化**，
 * 故後端無 API（同 faber-castell-color 先例，DESIGN_GUIDELINES §3.1 的最小形）：
 * 只負責靜態檔、根路徑轉址、JSON 404。
 *
 * 啟動： npm install && npm start
 *        預設 http://localhost:3000/apps/circle-text/
 */

const express = require('express');
const path = require('path');
const logger = require('morgan');

const app = express();

app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));

// 根路徑導向應用頁
app.get('/', (req, res) => res.redirect('/apps/circle-text/'));

// 404（API 回 JSON，其餘回純文字）
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ ok: false, error: 'Not found' });
  res.status(404).type('text/plain').send('Not found');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[circle-text] →  http://localhost:${PORT}/apps/circle-text/`));
