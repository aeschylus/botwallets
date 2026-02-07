import { CashuEngine } from './cashu/CashuEngine.js';
import { Database } from './storage/Database.js';

const engines = new Map<string, CashuEngine>();
const databases = new Map<string, Database>();

export function getEngine(mintUrl: string, unit: string): CashuEngine {
  const key = `${mintUrl}::${unit}`;
  let engine = engines.get(key);
  if (!engine) {
    engine = new CashuEngine(mintUrl, unit);
    engines.set(key, engine);
  }
  return engine;
}

export function getDatabase(dbPath: string): Database {
  let db = databases.get(dbPath);
  if (!db) {
    db = new Database(dbPath);
    databases.set(dbPath, db);
  }
  return db;
}

export function destroyAll(): void {
  for (const db of databases.values()) {
    try { db.close(); } catch {}
  }
  databases.clear();
  engines.clear();
}
