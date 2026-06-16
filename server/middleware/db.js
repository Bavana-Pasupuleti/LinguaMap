const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.SQLITE_PATH || path.join(__dirname, '..', 'linguamap.db');
const USE_POSTGRES = !!process.env.DATABASE_URL;
const IS_VERCEL = !!process.env.VERCEL;

let pool = null;
let sqlite = null;
let sqlJsDb = null;

if (USE_POSTGRES) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
  });
}

function getSqlite() {
  if (!sqlite) {
    const Database = require('better-sqlite3');
    sqlite = new Database(DB_PATH);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
  }
  return sqlite;
}

async function getSqlJs() {
  if (!sqlJsDb) {
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      sqlJsDb = new SQL.Database(buffer);
    } else {
      sqlJsDb = new SQL.Database();
    }
  }
  return sqlJsDb;
}

function convertSql(sql) {
  let s = sql;
  let idx = 1;
  while (s.includes(`$${idx}`)) {
    s = s.replace(`$${idx}`, '?');
    idx++;
  }
  s = s.replace(/::int\s*\*/g, '*');
  s = s.replace(/::int/g, '');
  s = s.replace(/::text\[\]/g, '');
  s = s.replace(/::float/g, '');
  s = s.replace(/INTERVAL\s+'(\d+)\s+days?'/gi, "'$1 days'");
  s = s.replace(/NOW\(\)/g, "datetime('now')");
  s = s.replace(/CURRENT_DATE/g, "date('now')");
  s = s.replace(
    />=\s*(?:datetime\('now'\)|date\('now'\))\s*-\s*'(\d+)\s+days?'/gi,
    ">= date('now', '-$1 days')"
  );
  s = s.replace(
    />=\s*(?:datetime\('now'\)|date\('now'\))\s*-\s*\?\s*\*\s*INTERVAL\s*'1\s*day'/gi,
    ">= date('now', '-' || ? || ' days')"
  );
  return s;
}

async function query(sql, params = []) {
  if (USE_POSTGRES) {
    const result = await pool.query(sql, params);
    return result.rows;
  }

  const sqliteSQL = convertSql(sql);
  const isSelect = sqliteSQL.trim().toUpperCase().startsWith('SELECT');

  if (IS_VERCEL) {
    const db = await getSqlJs();
    if (isSelect) {
      const stmt = db.prepare(sqliteSQL);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    } else {
      db.run(sqliteSQL, params);
      return [];
    }
  }

  const db = getSqlite();
  if (isSelect) {
    return db.prepare(sqliteSQL).all(...params);
  } else {
    db.prepare(sqliteSQL).run(...params);
    return [];
  }
}

module.exports = { query, pool, getSqlite };
