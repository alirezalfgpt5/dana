// src/db/sqliteAdapter.ts
// Native Node.js SQLite adapter using node:sqlite DatabaseSync
// Drop-in replacement for better-sqlite3 with zero native C++ compilation requirements

import { DatabaseSync } from 'node:sqlite';

export interface RunResult {
  changes: number;
  lastInsertRowid: number;
}

export interface Statement<T = any> {
  source: string;
  raw(val?: boolean): Statement<T>;
  bind(...params: any[]): Statement<T>;
  all(...params: any[]): T[];
  get(...params: any[]): T | undefined;
  run(...params: any[]): RunResult;
  iterate(...params: any[]): IterableIterator<T>;
}

export class BetterSqlite3Adapter {
  public syncDb: DatabaseSync;
  public open: boolean;
  public inTransaction: boolean;

  constructor(filename: string = ':memory:', options?: any) {
    this.syncDb = new DatabaseSync(filename || ':memory:');
    this.open = true;
    this.inTransaction = false;
  }

  exec(sql: string): this {
    this.syncDb.exec(sql);
    return this;
  }

  pragma(pragmaStr: string): any {
    try {
      this.syncDb.exec(`PRAGMA ${pragmaStr};`);
    } catch {
      // ignore pragma failures
    }
  }

  prepare<T = any>(sql: string): Statement<T> {
    const rawStmt = this.syncDb.prepare(sql);
    let isRaw = false;

    const stmt: Statement<T> = {
      source: sql,
      raw(val?: boolean) {
        isRaw = val !== false;
        return stmt;
      },
      bind(..._params: any[]) {
        return stmt;
      },
      all(...params: any[]): T[] {
        const args = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
        const rows = (rawStmt as any).all(...args) as any[];
        if (isRaw) {
          return rows.map((r: any) => Object.values(r)) as any[];
        }
        return rows as T[];
      },
      get(...params: any[]): T | undefined {
        const args = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
        const row = (rawStmt as any).get(...args);
        if (!row) return undefined;
        if (isRaw) {
          return Object.values(row) as any;
        }
        return row as T;
      },
      run(...params: any[]): RunResult {
        const args = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
        const res = (rawStmt as any).run(...args);
        return {
          changes: Number(res.changes ?? 0),
          lastInsertRowid: Number(res.lastInsertRowid ?? 0),
        };
      },
      *iterate(...params: any[]): IterableIterator<T> {
        const rows = stmt.all(...params);
        for (const row of rows) {
          yield row;
        }
      },
    };

    return stmt;
  }

  transaction<F extends (...args: any[]) => any>(fn: F): F {
    return ((...args: any[]) => {
      this.syncDb.exec('BEGIN TRANSACTION;');
      this.inTransaction = true;
      try {
        const result = fn(...args);
        this.syncDb.exec('COMMIT;');
        this.inTransaction = false;
        return result;
      } catch (err) {
        try {
          this.syncDb.exec('ROLLBACK;');
        } catch {}
        this.inTransaction = false;
        throw err;
      }
    }) as F;
  }

  close(): void {
    this.open = false;
    this.syncDb.close();
  }
}

export default function Database(filename: string = ':memory:', options?: any) {
  return new BetterSqlite3Adapter(filename, options);
}
