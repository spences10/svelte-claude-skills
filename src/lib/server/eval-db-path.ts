import { env } from '$env/dynamic/private';
import path from 'node:path';

/**
 * Get the path to the eval results database
 * Defaults to data/evals.db in project root
 * Can be overridden with DATABASE_EVAL_PATH env var
 */
export const get_eval_database_path = (): string => {
	// Default to project directory
	const default_path = path.join(process.cwd(), 'data', 'evals.db');

	// Allow override via env var for custom deployments
	const db_path = env.DATABASE_EVAL_PATH || default_path;

	return db_path;
};
