import { eval_db } from '$lib/server/eval-db';
import { run_eval_migrations } from '$lib/server/eval-migrate';
import type { Handle } from '@sveltejs/kit';
import { readFileSync } from 'node:fs';

// Initialize schema on startup (gracefully handle errors for columns that don't exist yet)
const schema = readFileSync('eval-schema.sql', 'utf-8');
try {
	eval_db.exec(schema);
} catch (error: any) {
	// Handle errors for indexes on columns that don't exist yet (will be added by migrations)
	if (error.message?.includes('no such column')) {
		console.log(
			'⚠️  Eval schema initialization skipped some indexes (columns will be added by migrations)',
		);
	} else {
		throw error;
	}
}

// Run any pending migrations
run_eval_migrations();

// Re-apply schema to create any indexes that were skipped
try {
	eval_db.exec(schema);
} catch (error: any) {
	// Silently ignore errors on second pass
	if (
		!error.message?.includes('no such column') &&
		error.code !== 'SQLITE_ERROR'
	) {
		console.error('Error re-applying eval schema:', error);
	}
}

console.log('📊 Eval database initialized successfully');

export const handle: Handle = async ({ event, resolve }) => {
	return await resolve(event);
};
