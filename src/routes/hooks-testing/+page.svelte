<script lang="ts">
	import {
		get_hook_effectiveness,
		get_test_runs,
		run_single_test,
		save_test_run,
	} from '#lib/hooks-testing.remote.ts';
	import { onMount } from 'svelte';

	// Test configuration
	let prompt = $state(
		'Create a new route at /posts/new with a form to create a blog post (title and content fields). On successful submission, redirect to /posts. Show validation errors if title is empty.',
	);
	let iterations = $state(10);
	let hook_config = $state<'none' | 'simple' | 'llm-eval' | 'forced'>(
		'forced',
	);
	let expected_skills = $state('');
	let model = $state('claude-haiku-4-5-20251001');

	// Test state
	let is_running = $state(false);
	let current_iteration = $state(0);
	let current_results = $state<any[]>([]);
	let summary = $state<any | null>(null);

	// Historical data
	let historical_runs = $state<any[]>([]);
	let hook_effectiveness = $state<any[]>([]);

	onMount(async () => {
		await load_historical_data();
	});

	async function load_historical_data() {
		historical_runs = await get_test_runs(20);
		hook_effectiveness = await get_hook_effectiveness();
	}

	async function start_test_run() {
		is_running = true;
		current_iteration = 0;
		current_results = [];
		summary = null;

		const expected_skills_array = expected_skills
			? expected_skills.split(',').map((s) => s.trim())
			: undefined;

		try {
			// Run tests one at a time for real-time UI updates
			for (let i = 1; i <= iterations; i++) {
				current_iteration = i;

				const result = await run_single_test({
					prompt,
					iteration: i,
					total_iterations: iterations,
					hook_config,
					expected_skills: expected_skills_array,
					model,
				});

				// Update UI immediately after each test completes
				current_results = [...current_results, result];
			}

			// Save all results to database
			const test_summary = await save_test_run({
				hook_config,
				model,
				prompt,
				expected_skills: expected_skills_array,
				results: current_results,
			});

			summary = test_summary;

			// Reload historical data
			await load_historical_data();
		} catch (error: any) {
			console.error('Test run failed:', error);
			alert(`Test run failed: ${error.message}`);
		} finally {
			is_running = false;
		}
	}

	const pass_rate = $derived(() => {
		if (current_results.length === 0) return 0;
		const passed = current_results.filter((r) => r.passed).length;
		return ((passed / current_results.length) * 100).toFixed(1);
	});
</script>

<div class="container mx-auto max-w-7xl p-8">
	<h1 class="mb-2 text-4xl font-bold">Hook Effectiveness Testing</h1>
	<p class="mb-8 text-lg text-gray-600">
		Test different hook configurations to measure skill activation
		rates
	</p>

	<div class="grid gap-8 lg:grid-cols-2">
		<!-- Test Configuration -->
		<div class="card bg-base-200 p-6">
			<h2 class="mb-4 text-2xl font-semibold">Test Configuration</h2>

			<div class="form-control mb-4">
				<label class="label" for="prompt">
					<span class="label-text">Prompt</span>
				</label>
				<textarea
					id="prompt"
					class="textarea-bordered textarea h-32"
					bind:value={prompt}
					disabled={is_running}></textarea>
			</div>

			<div class="form-control mb-4">
				<label class="label" for="iterations">
					<span class="label-text">Iterations</span>
				</label>
				<input
					id="iterations"
					type="number"
					class="input-bordered input"
					bind:value={iterations}
					disabled={is_running}
					min="1"
					max="50"
				/>
			</div>

			<div class="form-control mb-4">
				<label class="label" for="hook-config">
					<span class="label-text">Hook Config (label)</span>
				</label>
				<select
					id="hook-config"
					class="select-bordered select"
					bind:value={hook_config}
					disabled={is_running}
				>
					<option value="none">None</option>
					<option value="simple">Simple</option>
					<option value="llm-eval">LLM Eval</option>
					<option value="forced">Forced</option>
				</select>
				<div class="label">
					<span class="label-text-alt text-warning">
						⚠️ Actual hook comes from .claude/settings.json
					</span>
				</div>
			</div>

			<div class="form-control mb-4">
				<label class="label" for="expected-skills">
					<span class="label-text"
						>Expected Skills (comma-separated, optional)</span
					>
				</label>
				<input
					id="expected-skills"
					type="text"
					class="input-bordered input"
					bind:value={expected_skills}
					disabled={is_running}
					placeholder="svelte5-runes,sveltekit-data-flow"
				/>
			</div>

			<div class="form-control mb-4">
				<label class="label" for="model">
					<span class="label-text">Model</span>
				</label>
				<select
					id="model"
					class="select-bordered select"
					bind:value={model}
					disabled={is_running}
				>
					<option value="claude-haiku-4-5-20251001"
						>Claude Haiku 4.5</option
					>
					<option value="claude-sonnet-4-5-20250929"
						>Claude Sonnet 4.5</option
					>
					<option value="claude-opus-4-1-20250805"
						>Claude Opus 4.1</option
					>
				</select>
			</div>

			<button
				class="btn w-full btn-primary"
				onclick={start_test_run}
				disabled={is_running}
			>
				{#if is_running}
					<span class="loading loading-spinner"></span>
					Running tests...
				{:else}
					Run Tests
				{/if}
			</button>
			{#if is_running}
				<div class="mt-2 text-center text-sm opacity-75">
					Running test {current_iteration}/{iterations} - this may take
					a while
				</div>
			{/if}
		</div>

		<!-- Test Results -->
		<div class="card bg-base-200 p-6">
			<h2 class="mb-4 text-2xl font-semibold">Test Results</h2>

			{#if is_running}
				<div
					class="mb-4 flex items-center gap-4 rounded-lg bg-base-300 p-4"
				>
					<span class="loading loading-lg loading-spinner"></span>
					<div>
						<div class="font-semibold">
							Running test {current_iteration}/{iterations}...
						</div>
						<div class="text-sm opacity-75">
							This may take several minutes
						</div>
					</div>
				</div>
			{:else if current_results.length > 0}
				<div class="stats mb-4 shadow">
					<div class="stat">
						<div class="stat-title">Tests Run</div>
						<div class="stat-value text-sm">
							{current_results.length}
						</div>
					</div>
					<div class="stat">
						<div class="stat-title">Pass Rate</div>
						<div class="stat-value text-sm">{pass_rate()}%</div>
					</div>
				</div>
			{/if}

			{#if current_results.length > 0}
				<div
					class="max-h-96 space-y-2 overflow-y-auto rounded-lg bg-base-300 p-4"
				>
					{#each current_results as result}
						<div
							class="flex items-center justify-between rounded-lg p-3"
							class:bg-success={result.passed}
							class:bg-error={!result.passed}
							class:bg-opacity-20={true}
						>
							<div class="flex items-center gap-3">
								<span class="text-2xl">
									{#if result.passed}✓{:else}✗{/if}
								</span>
								<div>
									<div class="font-semibold">
										Test {result.iteration}/{result.total_iterations}
									</div>
									{#if result.activated_skills.length > 0}
										<div class="text-xs opacity-75">
											{result.activated_skills.join(', ')}
										</div>
									{:else}
										<div class="text-xs opacity-75">
											No skills activated
										</div>
									{/if}
								</div>
							</div>
							<div class="text-right text-xs">
								<div>{result.latency_ms}ms</div>
								<div>${result.cost_usd.toFixed(4)}</div>
							</div>
						</div>
					{/each}
				</div>

				{#if summary}
					<div class="mt-4 alert alert-success">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-6 w-6 shrink-0 stroke-current"
							fill="none"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<div>
							<div class="font-bold">Test Run Complete!</div>
							<div class="text-sm">
								{summary.passed_tests}/{summary.passed_tests +
									summary.failed_tests} passed • $
								{summary.total_cost_usd.toFixed(4)} total
							</div>
						</div>
					</div>
				{/if}
			{:else if !is_running}
				<div class="flex h-64 items-center justify-center opacity-50">
					<div class="text-center">
						<div class="mb-2 text-4xl">🧪</div>
						<div>Configure and run tests to see results</div>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Hook Effectiveness Comparison -->
	{#if hook_effectiveness.length > 0}
		<div class="card mt-8 bg-base-200 p-6">
			<h2 class="mb-4 text-2xl font-semibold">
				Hook Effectiveness Comparison
			</h2>

			<div class="overflow-x-auto">
				<table class="table">
					<thead>
						<tr>
							<th>Hook Type</th>
							<th>Test Runs</th>
							<th>Total Tests</th>
							<th>Pass Rate</th>
							<th>Avg Cost</th>
							<th>Avg Latency</th>
						</tr>
					</thead>
					<tbody>
						{#each hook_effectiveness as row}
							<tr>
								<td>
									<span class="badge badge-primary"
										>{row.hook_config}</span
									>
								</td>
								<td>{row.test_runs}</td>
								<td>{row.total_tests}</td>
								<td>
									<div class="flex items-center gap-2">
										<progress
											class="progress w-24"
											class:progress-success={row.pass_rate >= 0.8}
											class:progress-warning={row.pass_rate >= 0.4 &&
												row.pass_rate < 0.8}
											class:progress-error={row.pass_rate < 0.4}
											value={row.pass_rate * 100}
											max="100"
										></progress>
										<span class="font-semibold"
											>{(row.pass_rate * 100).toFixed(1)}%</span
										>
									</div>
								</td>
								<td>${row.avg_cost_usd.toFixed(4)}</td>
								<td>{row.avg_latency_ms.toFixed(0)}ms</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- Historical Test Runs -->
	{#if historical_runs.length > 0}
		<div class="card mt-8 bg-base-200 p-6">
			<h2 class="mb-4 text-2xl font-semibold">Recent Test Runs</h2>

			<div class="overflow-x-auto">
				<table class="table table-zebra">
					<thead>
						<tr>
							<th>Date</th>
							<th>Hook Config</th>
							<th>Model</th>
							<th>Tests</th>
							<th>Pass Rate</th>
							<th>Cost</th>
						</tr>
					</thead>
					<tbody>
						{#each historical_runs as run}
							<tr>
								<td class="text-xs">{run.run_time}</td>
								<td>
									<span class="badge badge-sm"
										>{run.hook_config || 'N/A'}</span
									>
								</td>
								<td class="text-xs">{run.model}</td>
								<td>
									{run.passed_tests}/{run.total_tests}
								</td>
								<td>
									<span
										class="font-semibold"
										class:text-success={run.pass_rate >= 80}
										class:text-warning={run.pass_rate >= 40 &&
											run.pass_rate < 80}
										class:text-error={run.pass_rate < 40}
									>
										{run.pass_rate.toFixed(1)}%
									</span>
								</td>
								<td class="text-xs"
									>${run.total_cost_usd.toFixed(4)}</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
