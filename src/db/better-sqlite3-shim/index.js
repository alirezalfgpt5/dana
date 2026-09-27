import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';

function sanitizeValue(val) {
  if (val === undefined) return null;
  if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Uint8Array) && !(val instanceof Date)) {
    const obj = {};
    for (const key of Object.keys(val)) {
      obj[key] = sanitizeValue(val[key]);
    }
    return obj;
  }
  return val;
}

function sanitizeParams(params) {
  return params.map(sanitizeValue);
}

export class BetterSqlite3Compat {
  constructor(filename) {
    this._filename = filename;
    this._db = new DatabaseSync(filename);
  }

  prepare(sql) {
    const stmt = this._db.prepare(sql);

    const proxy = {
      raw(val = true) {
        if (!val) return proxy;
        return {
          ...proxy,
          all(...p) {
            const res = proxy.all(...p);
            return res.map(r => (Array.isArray(r) ? r : Object.values(r)));
          },
          get(...p) {
            const res = proxy.get(...p);
            return res ? (Array.isArray(res) ? res : Object.values(res)) : undefined;
          },
        };
      },
      all(...params) {
        const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const sanitized = sanitizeParams(flat);
        return stmt.all(...sanitized);
      },
      get(...params) {
        const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const sanitized = sanitizeParams(flat);
        return stmt.get(...sanitized);
      },
      run(...params) {
        const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const sanitized = sanitizeParams(flat);
        const res = stmt.run(...sanitized);
        return {
          changes: Number(res.changes),
          lastInsertRowid: res.lastInsertRowid,
        };
      },
      iterate(...params) {
        const allRows = this.all(...params);
        return allRows[Symbol.iterator]();
      },
      columns() {
        return stmt.columns ? stmt.columns() : [];
      },
      bind() {
        return this;
      },
    };

    return proxy;
  }

  async backup(destPath) {
    try {
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      const escaped = destPath.replace(/'/g, "''");
      this._db.exec(`VACUUM INTO '${escaped}'`);
    } catch {
      fs.copyFileSync(this._filename, destPath);
    }
  }

  transaction(fn) {
    const makeRunner = (mode) => {
      return (...args) => {
        this._db.exec(`BEGIN ${mode}`);
        try {
          const res = fn(...args);
          this._db.exec('COMMIT');
          return res;
        } catch (err) {
          try {
            this._db.exec('ROLLBACK');
          } catch {}
          throw err;
        }
      };
    };

    const wrapped = makeRunner('IMMEDIATE');
    wrapped.deferred = makeRunner('DEFERRED');
    wrapped.immediate = makeRunner('IMMEDIATE');
    wrapped.exclusive = makeRunner('EXCLUSIVE');
    return wrapped;
  }

  exec(sql) {
    this._db.exec(sql);
  }

  pragma(sql) {
    try {
      const trimmed = sql.trim().replace(/^PRAGMA\s+/i, '');
      return this._db.prepare(`PRAGMA ${trimmed}`).all();
    } catch {
      return [];
    }
  }

  close() {
    this._db.close();
  }
}

export default BetterSqlite3Compat;
export { BetterSqlite3Compat as Database };
