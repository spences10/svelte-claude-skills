/**
 * Database storage functions for skill versions
 */

import { command } from '$app/server';
import { db } from '#lib/server/eval-db.ts';
import * as v from 'valibot';
import {
	get_all_skill_versions,
	type SkillVersion,
} from './skill-versioning';

/**
 * Store skill versions in database
 * Returns version IDs that were stored (new or existing)
 */
export const store_skill_versions = command(
	v.optional(v.any()),
	async (
		_?: unknown,
	): Promise<{
		stored: number;
		versions: Array<{ id: string; skill_name: string; hash: string }>;
	}> => {
		const versions = get_all_skill_versions();
		const stored_versions: Array<{
			id: string;
			skill_name: string;
			hash: string;
		}> = [];
		let stored_count = 0;

		for (const version of versions) {
			// Use content_hash as ID for deduplication
			const version_id = version.content_hash;

			// Check if this version already exists
			const existing = db
				.prepare(
					`SELECT id FROM skill_versions WHERE content_hash = ?`,
				)
				.get(version.content_hash);

			if (!existing) {
				// Store new version
				const stmt = db.prepare(`
					INSERT INTO skill_versions (id, skill_name, content_hash, files_json, created_at)
					VALUES (?, ?, ?, ?, ?)
				`);

				stmt.run(
					version_id,
					version.skill_name,
					version.content_hash,
					JSON.stringify(version.files),
					version.created_at,
				);

				stored_count++;
			}

			stored_versions.push({
				id: version_id,
				skill_name: version.skill_name,
				hash: version.content_hash.substring(0, 8),
			});
		}

		return {
			stored: stored_count,
			versions: stored_versions,
		};
	},
);

/**
 * Link test run to skill versions
 */
export const link_test_run_to_skill_versions = command(
	v.object({
		test_run_id: v.string(),
		skill_version_ids: v.array(v.string()),
	}),
	async ({
		test_run_id,
		skill_version_ids,
	}): Promise<{ linked: number }> => {
		const stmt = db.prepare(`
			INSERT OR IGNORE INTO test_run_skill_versions (test_run_id, skill_version_id)
			VALUES (?, ?)
		`);

		let linked = 0;
		for (const version_id of skill_version_ids) {
			const result = stmt.run(test_run_id, version_id);
			if (result.changes > 0) {
				linked++;
			}
		}

		return { linked };
	},
);

/**
 * Get skill versions for a test run
 */
export const get_test_run_skill_versions = command(
	v.object({
		test_run_id: v.string(),
	}),
	async ({ test_run_id }): Promise<SkillVersion[]> => {
		const stmt = db.prepare(`
			SELECT sv.id, sv.skill_name, sv.content_hash, sv.files_json, sv.created_at
			FROM skill_versions sv
			INNER JOIN test_run_skill_versions trsv ON sv.id = trsv.skill_version_id
			WHERE trsv.test_run_id = ?
		`);

		const rows = stmt.all(test_run_id) as Array<{
			id: string;
			skill_name: string;
			content_hash: string;
			files_json: string;
			created_at: number;
		}>;

		return rows.map((row) => ({
			skill_name: row.skill_name,
			content_hash: row.content_hash,
			files: JSON.parse(row.files_json),
			created_at: row.created_at,
		}));
	},
);

/**
 * Get latest version of a skill
 */
export const get_latest_skill_version = command(
	v.object({
		skill_name: v.string(),
	}),
	async ({ skill_name }): Promise<SkillVersion | null> => {
		const stmt = db.prepare(`
			SELECT id, skill_name, content_hash, files_json, created_at
			FROM skill_versions
			WHERE skill_name = ?
			ORDER BY created_at DESC
			LIMIT 1
		`);

		const row = stmt.get(skill_name) as
			| {
					id: string;
					skill_name: string;
					content_hash: string;
					files_json: string;
					created_at: number;
			  }
			| undefined;

		if (!row) return null;

		return {
			skill_name: row.skill_name,
			content_hash: row.content_hash,
			files: JSON.parse(row.files_json),
			created_at: row.created_at,
		};
	},
);

/**
 * Compare pass rates across skill versions
 */
export const compare_skill_version_performance = command(
	v.object({
		skill_name: v.string(),
		version1_hash: v.string(),
		version2_hash: v.string(),
	}),
	async ({
		skill_name,
		version1_hash,
		version2_hash,
	}): Promise<{
		version1: {
			hash: string;
			total_tests: number;
			passed_tests: number;
			pass_rate: number;
		};
		version2: {
			hash: string;
			total_tests: number;
			passed_tests: number;
			pass_rate: number;
		};
		delta: number;
	}> => {
		// Get performance for version 1
		const v1_stmt = db.prepare(`
			SELECT
				COUNT(*) as total,
				SUM(CASE WHEN ar.passed = 1 THEN 1 ELSE 0 END) as passed
			FROM test_runs tr
			INNER JOIN test_run_skill_versions trsv ON tr.id = trsv.test_run_id
			INNER JOIN activation_results ar ON tr.id = ar.run_id
			WHERE trsv.skill_version_id = ? AND ar.expected_skill = ?
		`);

		const v1_result = v1_stmt.get(version1_hash, skill_name) as {
			total: number;
			passed: number;
		};

		// Get performance for version 2
		const v2_result = v1_stmt.get(version2_hash, skill_name) as {
			total: number;
			passed: number;
		};

		const v1_pass_rate =
			v1_result.total > 0 ? v1_result.passed / v1_result.total : 0;
		const v2_pass_rate =
			v2_result.total > 0 ? v2_result.passed / v2_result.total : 0;

		return {
			version1: {
				hash: version1_hash.substring(0, 8),
				total_tests: v1_result.total,
				passed_tests: v1_result.passed,
				pass_rate: v1_pass_rate,
			},
			version2: {
				hash: version2_hash.substring(0, 8),
				total_tests: v2_result.total,
				passed_tests: v2_result.passed,
				pass_rate: v2_pass_rate,
			},
			delta: v2_pass_rate - v1_pass_rate,
		};
	},
);
