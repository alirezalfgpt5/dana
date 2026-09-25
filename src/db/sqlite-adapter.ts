import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';

export interface SqliteRunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export interface SqliteStatement {
  all(...params: any[]): any[];
  get(...params: any[]): any;
  run(...params: any[]): SqliteRunResult;
  raw(val?: boolean): SqliteStatement;
  iterate(...params: any[]): IterableIterator<any>;
  columns(): any[];
  bind(...params: any[]): SqliteStatement;
}

export class BetterSqlite3Compat {
  private _db: DatabaseSync;
  private _filename: string;

  constructor(filename: string) {
    this._filename = filename;
    this._db = new DatabaseSync(filename);
  }

  prepare(sql: string): SqliteStatement {
    const stmt = this._db.prepare(sql);
    let isRaw = false;

    const proxy: SqliteStatement = {
      raw(val = true) {
        isRaw = val;
        return this;
      },
      all(...params: any[]) {
        const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const rows = stmt.all(...flat);
        if (isRaw) {
          return rows.map((r: any) => Object.values(r));
        }
        return rows;
      },
      get(...params: any[]) {
        const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const row = stmt.get(...flat);
        if (!row) return undefined;
        if (isRaw) {
          return Object.values(row);
        }
        return row;
      },
      run(...params: any[]) {
        const flat = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        const res = stmt.run(...flat);
        return {
          changes: Number(res.changes),
          lastInsertRowid: res.lastInsertRowid,
        };
      },
      iterate(...params: any[]) {
        const allRows = this.all(...params);
        return allRows[Symbol.iterator]();
      },
      columns() {
        return (stmt as any).columns ? (stmt as any).columns() : [];
      },
      bind() {
        return this;
      },
    };

    return proxy;
  }

  async backup(destPath: string): Promise<void> {
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

  transaction<T extends (...args: any[]) => any>(fn: T): any {
    const makeRunner = (mode: string) => {
      return (...args: any[]) => {
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

    const wrapped: any = makeRunner('IMMEDIATE');
    wrapped.deferred = makeRunner('DEFERRED');
    wrapped.immediate = makeRunner('IMMEDIATE');
    wrapped.exclusive = makeRunner('EXCLUSIVE');
    return wrapped;
  }

  exec(sql: string): void {
    this._db.exec(sql);
  }

  pragma(sql: string): any[] {
    try {
      const trimmed = sql.trim().replace(/^PRAGMA\s+/i, '');
      return this._db.prepare(`PRAGMA ${trimmed}`).all();
    } catch {
      return [];
    }
  }

  close(): void {
    this._db.close();
  }
}

export default BetterSqlite3Compat;
