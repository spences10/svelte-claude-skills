import { command, query } from '$app/server';
import { ANTHROPIC_API_KEY } from '$app/env/private';
import { query as agent_query } from '@anthropic-ai/claude-agent-sdk';
import Database from 'better-sqlite3';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import * as v from 'valibot';

if (ANTHROPIC_API_KEY) {
	process.env.ANTHROPIC_API_KEY = ANTHROPIC_API_KEY;
} else {
	throw new Error('ANTHROPIC_API_KEY not found.');
}

// Configuration for hook testing
const CONFIG = {
	SDK_OPTIONS: {
		cwd: process.cwd(),
		settingSources: ['project'] as const,
		allowedTools: ['Skill'] as const,
		maxTurns: 2,
	},
	PRICING: {
		INPUT_PER_MTOK: 3.0,
		OUTPUT_PER_MTOK: 15.0,
		CACHE_READ_PER_MTOK: 0.3,
	},
	TEST_TYPE: 'activation',
	TEST_CASE_SOURCE: 'real_session',
	EVAL_PATTERNS: ['Step 1', 'EVALUATE', 'Step 2', 'ACTIVATE'],
	DB_PATH: './data/evals.db',
};

type TestRunConfig = {
	prompt: string;
	iterations: number;
	hook_config: 'none' | 'simple' | 'llm-eval' | 'forced';
	expected_skills?: string[];
	model: string;
};

type TestResult = {
	iteration: number;
	total_iterations: number;
	passed: boolean;
	activated_skills: string[];
	has_eval_pattern: boolean;
	input_tokens: number;
	output_tokens: number;
	cache_read_tokens: number;
	latency_ms: number;
	cost_usd: number;
	error?: string;
};

type TestRunSummary = {
	run_id: string;
	passed_tests: number;
	failed_tests: number;
	total_cost_usd: number;
	total_latency_ms: number;
	skill_counts: Record<string, number>;
};

// Validation schema for test run configuration
const TestRunConfigSchema = v.object({
	prompt: v.string(),
	iterations: v.pipe(v.number(), v.minValue(1), v.maxValue(50)),
	hook_config: v.union([
		v.literal('none'),
		v.literal('simple'),
		v.literal('llm-eval'),
		v.literal('forced'),
	]),
	expected_skills: v.optional(v.array(v.string())),
	model: v.string(),
});

/**
 * Run hook effectiveness tests
 * Returns all results after completion
 */
export const run_hook_tests = command(
	TestRunConfigSchema,
	async (config: TestRunConfig) => {
		const db = new Database(CONFIG.DB_PATH);
		db.pragma('foreign_keys = ON');

		const run_id = randomUUID();
		const run_timestamp = Date.now();

		// Get git commit hash
		let git_commit_hash: string | null = null;
		try {
			git_commit_hash = execSync('git rev-parse HEAD', {
				encoding: 'utf8',
			}).trim();
		} catch (e) {
			// Ignore git errors
		}

		const results: TestResult[] = [];
		let total_input_tokens = 0;
		let total_output_tokens = 0;
		let total_cache_read_tokens = 0;
		let total_latency_ms = 0;
		let total_cost_usd = 0;

		// Run each test iteration
		for (let i = 1; i <= config.iterations; i++) {
			const start_time = Date.now();

			try {
				const result = await agent_query({
					prompt: config.prompt,
					options: {
						...CONFIG.SDK_OPTIONS,
						model: config.model,
						settingSources: [...CONFIG.SDK_OPTIONS.settingSources],
						allowedTools: [...CONFIG.SDK_OPTIONS.allowedTools],
					},
				});

				let activated_skills: string[] = [];
				let first_response_text = '';
				let has_eval_pattern = false;
				let usage: any = null;

				// Consume the stream
				for await (const event of result) {
					if (event.type === 'assistant' && event.message?.content) {
						for (const content of event.message.content) {
							if (content.type === 'text' && !first_response_text) {
								first_response_text = content.text;
								has_eval_pattern = CONFIG.EVAL_PATTERNS.some(
									(pattern) => content.text.includes(pattern),
								);
							}
							if (
								content.type === 'tool_use' &&
								content.name === 'Skill' &&
								typeof content.input === 'object' &&
								content.input !== null &&
								'skill' in content.input &&
								typeof content.input.skill === 'string'
							) {
								activated_skills.push(content.input.skill);
							}
						}

						if (event.message.usage) {
							usage = event.message.usage;
						}
					}

					if (event.type === 'result' && event.usage) {
						usage = event.usage;
					}
				}

				const latency_ms = Date.now() - start_time;
				const input_tokens = usage?.input_tokens || 0;
				const output_tokens = usage?.output_tokens || 0;
				const cache_read_tokens = usage?.cache_read_input_tokens || 0;

				const cost_usd =
					(input_tokens / 1_000_000) * CONFIG.PRICING.INPUT_PER_MTOK +
					(output_tokens / 1_000_000) *
						CONFIG.PRICING.OUTPUT_PER_MTOK +
					(cache_read_tokens / 1_000_000) *
						CONFIG.PRICING.CACHE_READ_PER_MTOK;

				total_input_tokens += input_tokens;
				total_output_tokens += output_tokens;
				total_cache_read_tokens += cache_read_tokens;
				total_latency_ms += latency_ms;
				total_cost_usd += cost_usd;

				// Determine if test passed
				let passed = false;
				if (
					config.expected_skills &&
					config.expected_skills.length > 0
				) {
					passed = config.expected_skills.every((skill) =>
						activated_skills.includes(skill),
					);
				} else {
					passed = activated_skills.length > 0;
				}

				const test_result: TestResult = {
					iteration: i,
					total_iterations: config.iterations,
					passed,
					activated_skills,
					has_eval_pattern,
					input_tokens,
					output_tokens,
					cache_read_tokens,
					latency_ms,
					cost_usd,
				};

				results.push(test_result);
			} catch (error: any) {
				const test_result: TestResult = {
					iteration: i,
					total_iterations: config.iterations,
					passed: false,
					activated_skills: [],
					has_eval_pattern: false,
					input_tokens: 0,
					output_tokens: 0,
					cache_read_tokens: 0,
					latency_ms: Date.now() - start_time,
					cost_usd: 0,
					error: error.message,
				};

				results.push(test_result);
			}
		}

		// Calculate final stats
		const passed_tests = results.filter((r) => r.passed).length;
		const failed_tests = results.filter((r) => !r.passed).length;
		const avg_latency_ms = total_latency_ms / config.iterations;

		// Insert test run into database
		db.prepare(
			`
      INSERT INTO test_runs (
        id, run_timestamp, model, hook_config, git_commit_hash,
        total_tests, passed_tests, failed_tests, test_type,
        total_input_tokens, total_output_tokens, total_cache_read_tokens,
        total_latency_ms, total_cost_usd, avg_latency_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
		).run(
			run_id,
			run_timestamp,
			config.model,
			config.hook_config,
			git_commit_hash,
			config.iterations,
			passed_tests,
			failed_tests,
			CONFIG.TEST_TYPE,
			total_input_tokens,
			total_output_tokens,
			total_cache_read_tokens,
			total_latency_ms,
			total_cost_usd,
			avg_latency_ms,
			Date.now(),
		);

		// Insert individual results
		const insert_result = db.prepare(`
      INSERT INTO activation_results (
        id, run_id, test_id, query, expected_skill, activated_skill,
        should_activate, passed, error, test_case_source,
        input_tokens, output_tokens, cache_read_tokens,
        latency_ms, estimated_cost_usd, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

		results.forEach((result, index) => {
			const expected_skill =
				config.expected_skills && config.expected_skills.length > 0
					? config.expected_skills.join(',')
					: 'any';
			const activated_skill =
				result.activated_skills.length > 0
					? result.activated_skills.join(',')
					: null;

			insert_result.run(
				randomUUID(),
				run_id,
				`hook-test-${index + 1}`,
				config.prompt,
				expected_skill,
				activated_skill,
				1,
				result.passed ? 1 : 0,
				result.error || null,
				CONFIG.TEST_CASE_SOURCE,
				result.input_tokens,
				result.output_tokens,
				result.cache_read_tokens,
				result.latency_ms,
				result.cost_usd,
				Date.now(),
			);
		});

		// Calculate skill counts
		const skill_counts: Record<string, number> = {};
		results.forEach((r) => {
			r.activated_skills.forEach((skill) => {
				skill_counts[skill] = (skill_counts[skill] || 0) + 1;
			});
		});

		db.close();

		// Return all results and summary
		const summary: TestRunSummary = {
			run_id,
			passed_tests,
			failed_tests,
			total_cost_usd,
			total_latency_ms,
			skill_counts,
		};

		return {
			results,
			summary,
		};
	},
);

/**
 * Run a single test iteration
 * Returns result immediately for real-time UI updates
 */
export const run_single_test = command(
	v.object({
		prompt: v.string(),
		iteration: v.number(),
		total_iterations: v.number(),
		hook_config: v.union([
			v.literal('none'),
			v.literal('simple'),
			v.literal('llm-eval'),
			v.literal('forced'),
		]),
		expected_skills: v.optional(v.array(v.string())),
		model: v.string(),
	}),
	async (config: {
		prompt: string;
		iteration: number;
		total_iterations: number;
		hook_config: 'none' | 'simple' | 'llm-eval' | 'forced';
		expected_skills?: string[];
		model: string;
	}) => {
		const start_time = Date.now();

		try {
			const result = await agent_query({
				prompt: config.prompt,
				options: {
					...CONFIG.SDK_OPTIONS,
					model: config.model,
					settingSources: [...CONFIG.SDK_OPTIONS.settingSources],
					allowedTools: [...CONFIG.SDK_OPTIONS.allowedTools],
				},
			});

			let activated_skills: string[] = [];
			let first_response_text = '';
			let has_eval_pattern = false;
			let usage: any = null;

			// Consume the stream
			for await (const event of result) {
				if (event.type === 'assistant' && event.message?.content) {
					for (const content of event.message.content) {
						if (content.type === 'text' && !first_response_text) {
							first_response_text = content.text;
							has_eval_pattern = CONFIG.EVAL_PATTERNS.some(
								(pattern) => content.text.includes(pattern),
							);
						}
						if (
							content.type === 'tool_use' &&
							content.name === 'Skill' &&
							typeof content.input === 'object' &&
							content.input !== null &&
							'skill' in content.input &&
							typeof content.input.skill === 'string'
						) {
							activated_skills.push(content.input.skill);
						}
					}

					if (event.message.usage) {
						usage = event.message.usage;
					}
				}

				if (event.type === 'result' && event.usage) {
					usage = event.usage;
				}
			}

			const latency_ms = Date.now() - start_time;
			const input_tokens = usage?.input_tokens || 0;
			const output_tokens = usage?.output_tokens || 0;
			const cache_read_tokens = usage?.cache_read_input_tokens || 0;

			const cost_usd =
				(input_tokens / 1_000_000) * CONFIG.PRICING.INPUT_PER_MTOK +
				(output_tokens / 1_000_000) * CONFIG.PRICING.OUTPUT_PER_MTOK +
				(cache_read_tokens / 1_000_000) *
					CONFIG.PRICING.CACHE_READ_PER_MTOK;

			// Determine if test passed
			let passed = false;
			if (
				config.expected_skills &&
				config.expected_skills.length > 0
			) {
				passed = config.expected_skills.every((skill) =>
					activated_skills.includes(skill),
				);
			} else {
				passed = activated_skills.length > 0;
			}

			const test_result: TestResult = {
				iteration: config.iteration,
				total_iterations: config.total_iterations,
				passed,
				activated_skills,
				has_eval_pattern,
				input_tokens,
				output_tokens,
				cache_read_tokens,
				latency_ms,
				cost_usd,
			};

			return test_result;
		} catch (error: any) {
			const test_result: TestResult = {
				iteration: config.iteration,
				total_iterations: config.total_iterations,
				passed: false,
				activated_skills: [],
				has_eval_pattern: false,
				input_tokens: 0,
				output_tokens: 0,
				cache_read_tokens: 0,
				latency_ms: Date.now() - start_time,
				cost_usd: 0,
				error: error.message,
			};

			return test_result;
		}
	},
);

/**
 * Save test results to database after all tests complete
 */
export const save_test_run = command(
	v.object({
		hook_config: v.union([
			v.literal('none'),
			v.literal('simple'),
			v.literal('llm-eval'),
			v.literal('forced'),
		]),
		model: v.string(),
		prompt: v.string(),
		expected_skills: v.optional(v.array(v.string())),
		results: v.array(
			v.object({
				iteration: v.number(),
				total_iterations: v.number(),
				passed: v.boolean(),
				activated_skills: v.array(v.string()),
				has_eval_pattern: v.boolean(),
				input_tokens: v.number(),
				output_tokens: v.number(),
				cache_read_tokens: v.number(),
				latency_ms: v.number(),
				cost_usd: v.number(),
				error: v.optional(v.string()),
			}),
		),
	}),
	async (config: {
		hook_config: 'none' | 'simple' | 'llm-eval' | 'forced';
		model: string;
		prompt: string;
		expected_skills?: string[];
		results: TestResult[];
	}) => {
		const db = new Database(CONFIG.DB_PATH);
		db.pragma('foreign_keys = ON');

		const run_id = randomUUID();
		const run_timestamp = Date.now();

		// Get git commit hash
		let git_commit_hash: string | null = null;
		try {
			git_commit_hash = execSync('git rev-parse HEAD', {
				encoding: 'utf8',
			}).trim();
		} catch (e) {
			// Ignore git errors
		}

		// Calculate totals
		let total_input_tokens = 0;
		let total_output_tokens = 0;
		let total_cache_read_tokens = 0;
		let total_latency_ms = 0;
		let total_cost_usd = 0;

		config.results.forEach((result) => {
			total_input_tokens += result.input_tokens;
			total_output_tokens += result.output_tokens;
			total_cache_read_tokens += result.cache_read_tokens;
			total_latency_ms += result.latency_ms;
			total_cost_usd += result.cost_usd;
		});

		const passed_tests = config.results.filter(
			(r) => r.passed,
		).length;
		const failed_tests = config.results.filter(
			(r) => !r.passed,
		).length;
		const avg_latency_ms = total_latency_ms / config.results.length;

		// Insert test run into database
		db.prepare(
			`
      INSERT INTO test_runs (
        id, run_timestamp, model, hook_config, git_commit_hash,
        total_tests, passed_tests, failed_tests, test_type,
        total_input_tokens, total_output_tokens, total_cache_read_tokens,
        total_latency_ms, total_cost_usd, avg_latency_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
		).run(
			run_id,
			run_timestamp,
			config.model,
			config.hook_config,
			git_commit_hash,
			config.results.length,
			passed_tests,
			failed_tests,
			CONFIG.TEST_TYPE,
			total_input_tokens,
			total_output_tokens,
			total_cache_read_tokens,
			total_latency_ms,
			total_cost_usd,
			avg_latency_ms,
			Date.now(),
		);

		// Insert individual results
		const insert_result = db.prepare(`
      INSERT INTO activation_results (
        id, run_id, test_id, query, expected_skill, activated_skill,
        should_activate, passed, error, test_case_source,
        input_tokens, output_tokens, cache_read_tokens,
        latency_ms, estimated_cost_usd, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

		config.results.forEach((result, index) => {
			const expected_skill =
				config.expected_skills && config.expected_skills.length > 0
					? config.expected_skills.join(',')
					: 'any';
			const activated_skill =
				result.activated_skills.length > 0
					? result.activated_skills.join(',')
					: null;

			insert_result.run(
				randomUUID(),
				run_id,
				`hook-test-${index + 1}`,
				config.prompt,
				expected_skill,
				activated_skill,
				1,
				result.passed ? 1 : 0,
				result.error || null,
				CONFIG.TEST_CASE_SOURCE,
				result.input_tokens,
				result.output_tokens,
				result.cache_read_tokens,
				result.latency_ms,
				result.cost_usd,
				Date.now(),
			);
		});

		// Calculate skill counts
		const skill_counts: Record<string, number> = {};
		config.results.forEach((r) => {
			r.activated_skills.forEach((skill) => {
				skill_counts[skill] = (skill_counts[skill] || 0) + 1;
			});
		});

		db.close();

		// Return summary
		const summary: TestRunSummary = {
			run_id,
			passed_tests,
			failed_tests,
			total_cost_usd,
			total_latency_ms,
			skill_counts,
		};

		return summary;
	},
);

/**
 * Get historical test runs
 */
export const get_test_runs = query(
	v.pipe(v.number(), v.minValue(1), v.maxValue(100)),
	async (limit: number): Promise<any[]> => {
		const db = new Database(CONFIG.DB_PATH);

		const runs = db
			.prepare(
				`
      SELECT
        id,
        datetime(run_timestamp/1000, 'unixepoch') as run_time,
        model,
        hook_config,
        total_tests,
        passed_tests,
        failed_tests,
        CAST(passed_tests AS REAL) / total_tests * 100 as pass_rate,
        total_cost_usd,
        avg_latency_ms
      FROM test_runs
      WHERE test_type = ?
      ORDER BY run_timestamp DESC
      LIMIT ?
    `,
			)
			.all(CONFIG.TEST_TYPE, limit);

		db.close();
		return runs;
	},
);

/**
 * Get hook effectiveness comparison
 */
export const get_hook_effectiveness = query(
	async (): Promise<any[]> => {
		const db = new Database(CONFIG.DB_PATH);

		const effectiveness = db
			.prepare(
				`
      SELECT * FROM v_hook_effectiveness
      WHERE hook_config IS NOT NULL
      ORDER BY test_type, pass_rate DESC
    `,
			)
			.all();

		db.close();
		return effectiveness;
	},
);

/**
 * Get detailed results for a specific test run
 */
export const get_run_details = query(
	v.object({ run_id: v.string() }),
	async ({ run_id }: { run_id: string }): Promise<any> => {
		const db = new Database(CONFIG.DB_PATH);

		const run = db
			.prepare(
				`
      SELECT * FROM test_runs WHERE id = ?
    `,
			)
			.get(run_id);

		const results = db
			.prepare(
				`
      SELECT * FROM activation_results WHERE run_id = ? ORDER BY created_at
    `,
			)
			.all(run_id);

		db.close();

		return { run, results };
	},
);
