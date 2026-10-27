/**
 * 个人主页内容保存服务
 * - GET  /api/site  读取主页内容（JSON）
 * - POST /api/site  保存主页内容（JSON）
 * - /               托管上层目录的 index.html 等静态文件
 * 数据库：同目录 homepage.db（SQLite 单文件，可直接备份/拷走）
 */
const path = require("path");
const express = require("express");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "homepage.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS site_config (
    id         INTEGER PRIMARY KEY CHECK (id = 1),
    data       TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "..")));

/* 允许 file:// 或其他端口打开的页面跨域读写数据库 */
app.use("/api", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/api/site", (req, res) => {
  const row = db.prepare("SELECT data FROM site_config WHERE id = 1").get();
  res.json(row ? JSON.parse(row.data) : {});
});

app.post("/api/site", (req, res) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({ error: "invalid payload" });
  }
  db.prepare(`
    INSERT INTO site_config (id, data, updated_at)
    VALUES (1, ?, datetime('now', 'localtime'))
    ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `).run(JSON.stringify(req.body));
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`个人主页服务已启动: http://localhost:${PORT}`);
  console.log(`数据文件: ${path.join(__dirname, "homepage.db")}`);
});
