/**
 * Database storage for test runs and results
 */

import { command } from '$app/server';
import type {
	ActivationTestResult,
	QualityTestResult,
} from '$lib/evals.remote';
import { db } from '$lib/server/eval-db';
import { randomUUID } from 'node:crypto';
import * as v from 'valibot';

/**
 * Create a new test run record
 */
export const create_test_run = command(
	v.object({
		model: v.string(),
		git_commit_hash: v.optional(v.string()),
		test_type: v.union([
			v.literal('activation'),
			v.literal('quality'),
			v.literal('anti-pattern'),
		]),
		total_tests: v.number(),
	}),
	async ({
		model,
		git_commit_hash,
		test_type,
		total_tests,
	}): Promise<string> => {
		const run_id = randomUUID();
		const now = Date.now();

		const stmt = db.prepare(`
			INSERT INTO test_runs (
				id, run_timestamp, model, git_commit_hash,
				total_tests, passed_tests, failed_tests, test_type,
				total_input_tokens, total_output_tokens, total_cache_read_tokens,
				total_latency_ms, total_cost_usd, avg_latency_ms, created_at
			)
			VALUES (?, ?, ?, ?, ?, 0, 0, ?, 0, 0, 0, 0, 0.0, 0.0, ?)
		`);

		stmt.run(
			run_id,
			now,
			model,
			git_commit_hash || null,
			total_tests,
			test_type,
			now,
		);

		return run_id;
	},
);

/**
 * Update test run with final results
 */
export const update_test_run = command(
	v.object({
		run_id: v.string(),
		passed_tests: v.number(),
		failed_tests: v.number(),
		total_input_tokens: v.number(),
		total_output_tokens: v.number(),
		total_cache_read_tokens: v.number(),
		total_latency_ms: v.number(),
		total_cost_usd: v.number(),
		avg_latency_ms: v.number(),
	}),
	async ({
		run_id,
		passed_tests,
		failed_tests,
		total_input_tokens,
		total_output_tokens,
		total_cache_read_tokens,
		total_latency_ms,
		total_cost_usd,
		avg_latency_ms,
	}): Promise<void> => {
		const stmt = db.prepare(`
			UPDATE test_runs
			SET
				passed_tests = ?,
				failed_tests = ?,
				total_input_tokens = ?,
				total_output_tokens = ?,
				total_cache_read_tokens = ?,
				total_latency_ms = ?,
				total_cost_usd = ?,
				avg_latency_ms = ?
			WHERE id = ?
		`);

		stmt.run(
			passed_tests,
			failed_tests,
			total_input_tokens,
			total_output_tokens,
			total_cache_read_tokens,
			total_latency_ms,
			total_cost_usd,
			avg_latency_ms,
			run_id,
		);
	},
);

/**
 * Store activation test result
 */
export const store_activation_result = command(
	v.object({
		run_id: v.string(),
		result: v.any(), // ActivationTestResult type
		query: v.optional(v.string()),
		should_activate: v.optional(v.boolean()),
		test_case_source: v.optional(v.string()),
		session_context: v.optional(v.string()),
	}),
	async ({
		run_id,
		result,
		query,
		should_activate,
		test_case_source,
		session_context,
	}): Promise<void> => {
		const result_id = randomUUID();
		const r = result as ActivationTestResult;

		const stmt = db.prepare(`
			INSERT INTO activation_results (
				id, run_id, test_id, query, expected_skill, activated_skill,
				should_activate, passed, error, test_case_source, session_context,
				input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens, thinking_tokens,
				latency_ms, estimated_cost_usd, created_at
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		stmt.run(
			result_id,
			run_id,
			r.test_id,
			query || '',
			r.expected_skill,
			r.activated_skill,
			should_activate !== undefined ? (should_activate ? 1 : 0) : 1,
			r.passed ? 1 : 0,
			r.error || null,
			test_case_source || 'synthetic',
			session_context || null,
			r.metrics?.input_tokens || null,
			r.metrics?.output_tokens || null,
			r.metrics?.cache_creation_tokens || null,
			r.metrics?.cache_read_tokens || null,
			r.metrics?.thinking_tokens || null,
			r.metrics?.latency_ms || null,
			r.metrics?.estimated_cost_usd || null,
			Date.now(),
		);

		// Store logs
		if (r.logs && r.logs.length > 0) {
			const log_stmt = db.prepare(`
				INSERT INTO test_logs (test_result_id, test_type, log_message, log_timestamp)
				VALUES (?, 'activation', ?, ?)
			`);

			for (const log of r.logs) {
				log_stmt.run(result_id, log, Date.now());
			}
		}
	},
);

/**
 * Store quality test result
 */
export const store_quality_result = command(
	v.object({
		run_id: v.string(),
		result: v.any(), // QualityTestResult type
		query: v.string(),
		skill: v.string(),
		response_full_text: v.optional(v.string()),
		test_case_source: v.optional(v.string()),
		session_context: v.optional(v.string()),
	}),
	async ({
		run_id,
		result,
		query,
		skill,
		response_full_text,
		test_case_source,
		session_context,
	}): Promise<void> => {
		const result_id = randomUUID();
		const r = result as QualityTestResult;

		const stmt = db.prepare(`
			INSERT INTO quality_results (
				id, run_id, test_id, skill, query, response_preview, response_full_text,
				passed, error, test_case_source, session_context,
				input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens, thinking_tokens,
				latency_ms, estimated_cost_usd, created_at
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		stmt.run(
			result_id,
			run_id,
			r.test_id,
			skill,
			query,
			r.response_preview,
			response_full_text || null,
			r.passed ? 1 : 0,
			r.error || null,
			test_case_source || 'synthetic',
			session_context || null,
			r.metrics?.input_tokens || null,
			r.metrics?.output_tokens || null,
			r.metrics?.cache_creation_tokens || null,
			r.metrics?.cache_read_tokens || null,
			r.metrics?.thinking_tokens || null,
			r.metrics?.latency_ms || null,
			r.metrics?.estimated_cost_usd || null,
			Date.now(),
		);

		// Store missing facts
		if (r.missing_facts && r.missing_facts.length > 0) {
			const fact_stmt = db.prepare(`
				INSERT INTO missing_facts (quality_result_id, fact)
				VALUES (?, ?)
			`);

			for (const fact of r.missing_facts) {
				fact_stmt.run(result_id, fact);
			}
		}

		// Store forbidden content
		if (r.forbidden_content && r.forbidden_content.length > 0) {
			const content_stmt = db.prepare(`
				INSERT INTO forbidden_content (quality_result_id, content)
				VALUES (?, ?)
			`);

			for (const content of r.forbidden_content) {
				content_stmt.run(result_id, content);
			}
		}

		// Store logs
		if (r.logs && r.logs.length > 0) {
			const log_stmt = db.prepare(`
				INSERT INTO test_logs (test_result_id, test_type, log_message, log_timestamp)
				VALUES (?, 'quality', ?, ?)
			`);

			for (const log of r.logs) {
				log_stmt.run(result_id, log, Date.now());
			}
		}
	},
);

/**
 * Get test run summary
 */
export const get_test_run_summary = command(
	v.object({
		run_id: v.string(),
	}),
	async ({ run_id }) => {
		const stmt = db.prepare(`
			SELECT * FROM test_runs WHERE id = ?
		`);

		return stmt.get(run_id);
	},
);

/**
 * Get recent test runs
 */
export const get_recent_test_runs = command(
	v.object({
		limit: v.optional(v.number()),
		test_type: v.optional(
			v.union([
				v.literal('activation'),
				v.literal('quality'),
				v.literal('anti-pattern'),
			]),
		),
	}),
	async ({ limit = 10, test_type }) => {
		let query = `
			SELECT * FROM test_runs
		`;

		if (test_type) {
			query += ` WHERE test_type = '${test_type}'`;
		}

		query += ` ORDER BY run_timestamp DESC LIMIT ${limit}`;

		const stmt = db.prepare(query);
		return stmt.all();
	},
);
