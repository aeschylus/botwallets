import BetterSqlite3 from 'better-sqlite3';
import { ALL_MIGRATIONS } from './schema.js';

export class Database {
  readonly db: BetterSqlite3.Database;

  constructor(dbPath: string) {
    this.db = new BetterSqlite3(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.runMigrations();
  }

  private runMigrations(): void {
    const migrate = this.db.transaction(() => {
      for (const sql of ALL_MIGRATIONS) {
        this.db.exec(sql);
      }
    });
    migrate();
  }

  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  close(): void {
    this.db.close();
  }
}
