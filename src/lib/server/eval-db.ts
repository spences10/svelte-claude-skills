import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { get_eval_database_path } from './eval-db-path';

// Initialize database connection
const db_path = get_eval_database_path();
console.log(`Initializing eval database at: ${db_path}`);

// Ensure parent directory exists
const db_dir = path.dirname(db_path);
mkdirSync(db_dir, { recursive: true });

export const eval_db = new Database(db_path);

// Configure database for optimal performance and safety
eval_db.pragma('foreign_keys = ON'); // Enforce referential integrity
eval_db.pragma('journal_mode = WAL'); // Write-Ahead Logging for concurrency
eval_db.pragma('busy_timeout = 5000'); // Wait 5s on database locks
eval_db.pragma('synchronous = NORMAL'); // Balance durability/performance

// Graceful shutdown
process.on('exit', () => {
	eval_db.close();
});

process.on('SIGINT', () => {
	eval_db.close();
	process.exit(0);
});

export { eval_db as db };
