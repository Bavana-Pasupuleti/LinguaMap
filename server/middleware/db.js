const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.SQLITE_PATH || path.join(__dirname, '..', 'linguamap.db');
const USE_POSTGRES = !!process.env.DATABASE_URL;

let pool = null;
let sqlite = null;

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
    sqlite = new Database(DB_PATH);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
  }
  return sqlite;
}

async function query(sql, params = []) {
  if (USE_POSTGRES) {
    const result = await pool.query(sql, params);
    return result.rows;
  }

  const db = getSqlite();
  // Convert PostgreSQL-style $1, $2 to SQLite ? placeholders
  let sqliteSQL = sql;
  let idx = 1;
  while (sqliteSQL.includes(`$${idx}`)) {
    sqliteSQL = sqliteSQL.replace(`$${idx}`, '?');
    idx++;
  }

  // Strip PostgreSQL-specific syntax that SQLite doesn't support
  sqliteSQL = sqliteSQL.replace(/::int\s*\*/g, '*');
  sqliteSQL = sqliteSQL.replace(/::int/g, '');
  sqliteSQL = sqliteSQL.replace(/::text\[\]/g, '');
  sqliteSQL = sqliteSQL.replace(/::float/g, '');
  sqliteSQL = sqliteSQL.replace(/INTERVAL\s+'(\d+)\s+days?'/gi, "'$1 days'");
  sqliteSQL = sqliteSQL.replace(/NOW\(\)/g, "datetime('now')");
  sqliteSQL = sqliteSQL.replace(/CURRENT_DATE/g, "date('now')");

  // Handle INTERVAL arithmetic: >= SOMETHING - INTERVAL '30 days' → >= date('now', '-30 days')
  sqliteSQL = sqliteSQL.replace(
    />=\s*(?:datetime\('now'\)|date\('now'\))\s*-\s*'(\d+)\s+days?'/gi,
    ">= date('now', '-$1 days')"
  );
  sqliteSQL = sqliteSQL.replace(
    />=\s*(?:datetime\('now'\)|date\('now'\))\s*-\s*\?\s*\*\s*INTERVAL\s*'1\s*day'/gi,
    ">= date('now', '-' || ? || ' days')"
  );

  const isSelect = sqliteSQL.trim().toUpperCase().startsWith('SELECT');
  if (isSelect) {
    return db.prepare(sqliteSQL).all(...params);
  } else {
    db.prepare(sqliteSQL).run(...params);
    return [];
  }
}

module.exports = { query, pool, getSqlite };
