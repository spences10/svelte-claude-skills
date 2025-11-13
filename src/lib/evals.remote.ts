import { command } from '$app/server';
import { ANTHROPIC_API_KEY } from '$env/static/private';
import { query } from '@anthropic-ai/claude-agent-sdk';
import * as v from 'valibot';
import { calculate_cost } from './evals/cost-calculator';
import {
	calculate_total_tokens,
	type UsageData,
} from './evals/metrics-tracker';
import {
	link_test_run_to_skill_versions,
	store_skill_versions,
} from './evals/skill-version-storage.remote';
import {
	create_test_run,
	store_activation_result,
	store_quality_result,
	update_test_run,
} from './evals/test-run-storage.remote';

if (ANTHROPIC_API_KEY) {
	process.env.ANTHROPIC_API_KEY = ANTHROPIC_API_KEY;
} else {
	throw new Error('ANTHROPIC_API_KEY not found.');
}

export interface ActivationTestResult {
	test_id: string;
	passed: boolean;
	expected_skill: string;
	activated_skill: string | null;
	error?: string;
	logs: string[];
	metrics?: {
		input_tokens: number;
		output_tokens: number;
		cache_creation_tokens: number;
		cache_read_tokens: number;
		thinking_tokens?: number;
		total_tokens: number;
		latency_ms: number;
		estimated_cost_usd: number;
	};
}

export interface QualityTestResult {
	test_id: string;
	passed: boolean;
	missing_facts: string[];
	forbidden_content: string[];
	response_preview: string;
	response_full_text?: string;
	error?: string;
	logs: string[];
	metrics?: {
		input_tokens: number;
		output_tokens: number;
		cache_creation_tokens: number;
		cache_read_tokens: number;
		thinking_tokens?: number;
		total_tokens: number;
		latency_ms: number;
		estimated_cost_usd: number;
	};
}

// Validation schemas
const activation_test_schema = v.object({
	id: v.string(),
	query: v.string(),
	expected_skill: v.union([
		v.literal('svelte5-runes'),
		v.literal('sveltekit-data-flow'),
		v.literal('sveltekit-structure'),
		v.literal('sveltekit-remote-functions'),
	]),
	should_activate: v.boolean(),
	description: v.string(),
	model: v.optional(v.string()),
});

const quality_test_schema = v.object({
	id: v.string(),
	skill: v.union([
		v.literal('svelte5-runes'),
		v.literal('sveltekit-data-flow'),
		v.literal('sveltekit-structure'),
		v.literal('sveltekit-remote-functions'),
	]),
	query: v.string(),
	expected_facts: v.optional(v.array(v.string())),
	must_not_contain: v.optional(v.array(v.string())),
	description: v.string(),
	model: v.optional(v.string()),
});

/**
 * Test skill activation - verify correct skill triggers for query
 */
export const test_skill_activation = command(
	activation_test_schema,
	async (test_case): Promise<ActivationTestResult> => {
		const logs: string[] = [];
		const log = (msg: string) => {
			console.log(msg);
			logs.push(msg);
		};

		const model = test_case.model || 'claude-sonnet-4-5-20250929';
		log(`[ACTIVATION TEST] Starting: ${test_case.id}`);
		log(`[ACTIVATION TEST] Using model: ${model}`);
		log(`[ACTIVATION TEST] Query: "${test_case.query}"`);

		try {
			let activated_skill: string | null = null;
			const start_time = Date.now();

			// Initialize usage tracking
			const usage: UsageData = {
				input_tokens: 0,
				output_tokens: 0,
				cache_creation_tokens: 0,
				cache_read_tokens: 0,
				thinking_tokens: 0,
			};

			// Run query using Claude Agent SDK
			log('[ACTIVATION TEST] Calling Claude Agent SDK...');
			const query_result = query({
				prompt: test_case.query,
				options: {
					cwd: process.cwd(),
					settingSources: ['project'],
					allowedTools: ['Skill', 'Read'],
					model,
				},
			});

			// Check messages for Skill tool invocation
			log('[ACTIVATION TEST] Processing messages...');
			for await (const message of query_result) {
				log(`[ACTIVATION TEST] Message type: ${message.type}`);

				// Extract usage data from assistant messages
				if (message.type === 'assistant' && message.message?.usage) {
					const msg_usage = message.message.usage;
					usage.input_tokens += msg_usage.input_tokens || 0;
					usage.output_tokens += msg_usage.output_tokens || 0;
					usage.cache_creation_tokens +=
						msg_usage.cache_creation_input_tokens || 0;
					usage.cache_read_tokens +=
						msg_usage.cache_read_input_tokens || 0;
					if (msg_usage.thinking_tokens) {
						usage.thinking_tokens =
							(usage.thinking_tokens || 0) +
							msg_usage.thinking_tokens;
					}
				}

				if (message.type === 'assistant') {
					// Tool uses are in message.message.content array
					const content = message.message.content;
					if (Array.isArray(content)) {
						for (const block of content) {
							if (block.type === 'tool_use') {
								log(
									`[ACTIVATION TEST] Tool use detected: ${block.name}`,
								);
							}
							if (
								block.type === 'tool_use' &&
								block.name === 'Skill' &&
								typeof block.input === 'object' &&
								block.input !== null &&
								'skill' in block.input
							) {
								activated_skill = String(block.input.skill);
								log(
									`[ACTIVATION TEST] Skill activated: ${activated_skill}`,
								);
								break;
							}
						}
					}
					if (activated_skill) break;
				}
			}

			const passed =
				activated_skill === test_case.expected_skill &&
				test_case.should_activate;

			// Calculate metrics
			const latency_ms = Date.now() - start_time;
			const total_tokens = calculate_total_tokens(usage);
			const estimated_cost_usd = calculate_cost(usage, model);

			log(
				`[ACTIVATION TEST] ${test_case.id} - Expected: ${test_case.expected_skill}, Got: ${activated_skill}, Passed: ${passed}`,
			);
			log(
				`[ACTIVATION TEST] Metrics - Tokens: ${total_tokens}, Latency: ${latency_ms}ms, Cost: $${estimated_cost_usd.toFixed(4)}`,
			);

			return {
				test_id: test_case.id,
				passed,
				expected_skill: test_case.expected_skill,
				activated_skill,
				error: undefined,
				logs,
				metrics: {
					input_tokens: usage.input_tokens,
					output_tokens: usage.output_tokens,
					cache_creation_tokens: usage.cache_creation_tokens,
					cache_read_tokens: usage.cache_read_tokens,
					thinking_tokens: usage.thinking_tokens,
					total_tokens,
					latency_ms,
					estimated_cost_usd,
				},
			};
		} catch (error) {
			const errorMsg =
				error instanceof Error ? error.message : 'Unknown error';
			log(`[ACTIVATION TEST] Error in ${test_case.id}: ${errorMsg}`);
			return {
				test_id: test_case.id,
				passed: false,
				expected_skill: test_case.expected_skill,
				activated_skill: null,
				error: errorMsg,
				logs,
			};
		}
	},
);

/**
 * Test response quality - verify responses contain expected facts
 */
export const test_response_quality = command(
	quality_test_schema,
	async (test_case): Promise<QualityTestResult> => {
		const logs: string[] = [];
		const log = (msg: string) => {
			console.log(msg);
			logs.push(msg);
		};

		const model = test_case.model || 'claude-sonnet-4-5-20250929';
		log(`[QUALITY TEST] Starting: ${test_case.id}`);
		log(`[QUALITY TEST] Using model: ${model}`);
		log(`[QUALITY TEST] Query: "${test_case.query}"`);

		try {
			const start_time = Date.now();

			// Initialize usage tracking
			const usage: UsageData = {
				input_tokens: 0,
				output_tokens: 0,
				cache_creation_tokens: 0,
				cache_read_tokens: 0,
				thinking_tokens: 0,
			};

			// Get response from Claude with skill activated
			log('[QUALITY TEST] Calling Claude Agent SDK...');
			const query_result = query({
				prompt: test_case.query,
				options: {
					cwd: process.cwd(),
					settingSources: ['project'],
					allowedTools: ['Skill', 'Read'],
					model,
				},
			});

			// Extract text response from assistant messages
			let response_text = '';
			log('[QUALITY TEST] Processing messages...');
			for await (const message of query_result) {
				log(`[QUALITY TEST] Message type: ${message.type}`);

				// Extract usage data from assistant messages
				if (message.type === 'assistant' && message.message?.usage) {
					const msg_usage = message.message.usage;
					usage.input_tokens += msg_usage.input_tokens || 0;
					usage.output_tokens += msg_usage.output_tokens || 0;
					usage.cache_creation_tokens +=
						msg_usage.cache_creation_input_tokens || 0;
					usage.cache_read_tokens +=
						msg_usage.cache_read_input_tokens || 0;
					if (msg_usage.thinking_tokens) {
						usage.thinking_tokens =
							(usage.thinking_tokens || 0) +
							msg_usage.thinking_tokens;
					}
				}

				if (message.type === 'assistant') {
					const content = message.message.content;
					if (Array.isArray(content)) {
						for (const block of content) {
							if (block.type === 'text') {
								response_text += block.text;
								log(
									`[QUALITY TEST] Got text response (${block.text.length} chars)`,
								);
							}
						}
					}
				}
			}

			// Check for expected facts
			const missing_facts: string[] = [];
			if (test_case.expected_facts) {
				for (const fact of test_case.expected_facts) {
					if (
						!response_text.toLowerCase().includes(fact.toLowerCase())
					) {
						missing_facts.push(fact);
					}
				}
			}

			// Check for forbidden content
			const forbidden_content: string[] = [];
			if (test_case.must_not_contain) {
				for (const forbidden of test_case.must_not_contain) {
					if (
						response_text
							.toLowerCase()
							.includes(forbidden.toLowerCase())
					) {
						forbidden_content.push(forbidden);
					}
				}
			}

			const passed =
				missing_facts.length === 0 && forbidden_content.length === 0;

			// Calculate metrics
			const latency_ms = Date.now() - start_time;
			const total_tokens = calculate_total_tokens(usage);
			const estimated_cost_usd = calculate_cost(usage, model);

			log(`[QUALITY TEST] ${test_case.id} - Passed: ${passed}`);
			if (missing_facts.length > 0) {
				log(
					`[QUALITY TEST] Missing facts: ${missing_facts.join(', ')}`,
				);
			}
			if (forbidden_content.length > 0) {
				log(
					`[QUALITY TEST] Forbidden content found: ${forbidden_content.join(', ')}`,
				);
			}
			log(
				`[QUALITY TEST] Metrics - Tokens: ${total_tokens}, Latency: ${latency_ms}ms, Cost: $${estimated_cost_usd.toFixed(4)}`,
			);

			return {
				test_id: test_case.id,
				passed,
				missing_facts,
				forbidden_content,
				response_preview: response_text.substring(0, 200),
				response_full_text: response_text,
				error: undefined,
				logs,
				metrics: {
					input_tokens: usage.input_tokens,
					output_tokens: usage.output_tokens,
					cache_creation_tokens: usage.cache_creation_tokens,
					cache_read_tokens: usage.cache_read_tokens,
					thinking_tokens: usage.thinking_tokens,
					total_tokens,
					latency_ms,
					estimated_cost_usd,
				},
			};
		} catch (error) {
			const errorMsg =
				error instanceof Error ? error.message : 'Unknown error';
			log(`[QUALITY TEST] Error in ${test_case.id}: ${errorMsg}`);
			return {
				test_id: test_case.id,
				passed: false,
				missing_facts: [],
				forbidden_content: [],
				response_preview: '',
				error: errorMsg,
				logs,
			};
		}
	},
);

/**
 * Run multiple activation tests in sequence
 */
export const run_activation_tests = command(
	v.array(activation_test_schema),
	async (test_cases): Promise<ActivationTestResult[]> => {
		console.log(
			`\n[RUN TESTS] Starting ${test_cases.length} activation tests`,
		);

		// Store skill versions and create test run
		let run_id: string | null = null;
		try {
			console.log('[RUN TESTS] Storing skill versions...');
			const { versions } = await store_skill_versions(undefined);
			console.log(
				`[RUN TESTS] Stored ${versions.length} skill versions`,
			);

			const model =
				test_cases[0]?.model || 'claude-sonnet-4-5-20250929';
			console.log('[RUN TESTS] Creating test run...');
			run_id = await create_test_run({
				model,
				test_type: 'activation',
				total_tests: test_cases.length,
			});
			console.log(`[RUN TESTS] Created test run: ${run_id}`);

			await link_test_run_to_skill_versions({
				test_run_id: run_id,
				skill_version_ids: versions.map((v) => v.id),
			});
			console.log('[RUN TESTS] Linked skill versions to test run');
		} catch (error) {
			console.error(
				'[RUN TESTS] Failed to initialize database storage:',
				error,
			);
			console.log(
				'[RUN TESTS] Continuing without database storage...',
			);
		}

		// Run tests and collect metrics
		const results: ActivationTestResult[] = [];
		let total_input_tokens = 0;
		let total_output_tokens = 0;
		let total_cache_read_tokens = 0;
		let total_latency_ms = 0;
		let total_cost_usd = 0;
		let passed_count = 0;

		for (let i = 0; i < test_cases.length; i++) {
			console.log(`\n[RUN TESTS] Test ${i + 1}/${test_cases.length}`);
			const test_case = test_cases[i];
			const result = await test_skill_activation(test_case);
			results.push(result);

			// Store result in database
			if (run_id) {
				try {
					await store_activation_result({
						run_id,
						result,
						query: test_case.query,
						should_activate: test_case.should_activate,
					});
				} catch (error) {
					console.error(
						`[RUN TESTS] Failed to store result for test ${test_case.id}:`,
						error,
					);
				}
			}

			// Aggregate metrics
			if (result.metrics) {
				total_input_tokens += result.metrics.input_tokens;
				total_output_tokens += result.metrics.output_tokens;
				total_cache_read_tokens += result.metrics.cache_read_tokens;
				total_latency_ms += result.metrics.latency_ms;
				total_cost_usd += result.metrics.estimated_cost_usd;
			}
			if (result.passed) passed_count++;
		}

		// Update test run with final metrics
		const failed_count = test_cases.length - passed_count;
		const avg_latency_ms =
			test_cases.length > 0
				? total_latency_ms / test_cases.length
				: 0;

		if (run_id) {
			try {
				await update_test_run({
					run_id,
					passed_tests: passed_count,
					failed_tests: failed_count,
					total_input_tokens,
					total_output_tokens,
					total_cache_read_tokens,
					total_latency_ms,
					total_cost_usd,
					avg_latency_ms,
				});
				console.log(
					`[RUN TESTS] Results stored in database (run_id: ${run_id})`,
				);
			} catch (error) {
				console.error(
					'[RUN TESTS] Failed to update test run:',
					error,
				);
			}
		}

		console.log(
			`\n[RUN TESTS] Completed. Passed: ${passed_count}/${test_cases.length}`,
		);
		console.log(
			`[RUN TESTS] Total cost: $${total_cost_usd.toFixed(4)}`,
		);

		return results;
	},
);

/**
 * Run multiple quality tests in sequence
 */
export const run_quality_tests = command(
	v.array(quality_test_schema),
	async (test_cases): Promise<QualityTestResult[]> => {
		console.log(
			`\n[RUN TESTS] Starting ${test_cases.length} quality tests`,
		);

		// Store skill versions and create test run
		let run_id: string | null = null;
		try {
			console.log('[RUN TESTS] Storing skill versions...');
			const { versions } = await store_skill_versions(undefined);
			console.log(
				`[RUN TESTS] Stored ${versions.length} skill versions`,
			);

			const model =
				test_cases[0]?.model || 'claude-sonnet-4-5-20250929';
			console.log('[RUN TESTS] Creating test run...');
			run_id = await create_test_run({
				model,
				test_type: 'quality',
				total_tests: test_cases.length,
			});
			console.log(`[RUN TESTS] Created test run: ${run_id}`);

			await link_test_run_to_skill_versions({
				test_run_id: run_id,
				skill_version_ids: versions.map((v) => v.id),
			});
			console.log('[RUN TESTS] Linked skill versions to test run');
		} catch (error) {
			console.error(
				'[RUN TESTS] Failed to initialize database storage:',
				error,
			);
			console.log(
				'[RUN TESTS] Continuing without database storage...',
			);
		}

		// Run tests and collect metrics
		const results: QualityTestResult[] = [];
		let total_input_tokens = 0;
		let total_output_tokens = 0;
		let total_cache_read_tokens = 0;
		let total_latency_ms = 0;
		let total_cost_usd = 0;
		let passed_count = 0;

		for (let i = 0; i < test_cases.length; i++) {
			console.log(`\n[RUN TESTS] Test ${i + 1}/${test_cases.length}`);
			const test_case = test_cases[i];
			const result = await test_response_quality(test_case);
			results.push(result);

			// Store result in database
			if (run_id) {
				try {
					await store_quality_result({
						run_id,
						result,
						query: test_case.query,
						skill: test_case.skill,
						response_full_text: result.response_full_text,
					});
				} catch (error) {
					console.error(
						`[RUN TESTS] Failed to store result for test ${test_case.id}:`,
						error,
					);
				}
			}

			// Aggregate metrics
			if (result.metrics) {
				total_input_tokens += result.metrics.input_tokens;
				total_output_tokens += result.metrics.output_tokens;
				total_cache_read_tokens += result.metrics.cache_read_tokens;
				total_latency_ms += result.metrics.latency_ms;
				total_cost_usd += result.metrics.estimated_cost_usd;
			}
			if (result.passed) passed_count++;
		}

		// Update test run with final metrics
		const failed_count = test_cases.length - passed_count;
		const avg_latency_ms =
			test_cases.length > 0
				? total_latency_ms / test_cases.length
				: 0;

		if (run_id) {
			try {
				await update_test_run({
					run_id,
					passed_tests: passed_count,
					failed_tests: failed_count,
					total_input_tokens,
					total_output_tokens,
					total_cache_read_tokens,
					total_latency_ms,
					total_cost_usd,
					avg_latency_ms,
				});
				console.log(
					`[RUN TESTS] Results stored in database (run_id: ${run_id})`,
				);
			} catch (error) {
				console.error(
					'[RUN TESTS] Failed to update test run:',
					error,
				);
			}
		}

		console.log(
			`\n[RUN TESTS] Completed. Passed: ${passed_count}/${test_cases.length}`,
		);
		console.log(
			`[RUN TESTS] Total cost: $${total_cost_usd.toFixed(4)}`,
		);

		return results;
	},
);
