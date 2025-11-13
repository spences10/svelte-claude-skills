<script lang="ts">
	import {
		run_activation_tests,
		run_quality_tests,
		type ActivationTestResult,
		type QualityTestResult,
	} from '$lib/evals.remote';
	import {
		activation_tests,
		qualityTests,
	} from '$lib/evals/test-cases';
	import { get_test_summary } from '$lib/evals/utils';
	import { fetch_available_models } from '$lib/models.remote';
	import { onMount } from 'svelte';

	let activation_results = $state<ActivationTestResult[]>([]);
	let quality_results = $state<QualityTestResult[]>([]);
	let is_running = $state(false);
	let current_test = $state('');
	let current_logs = $state<string[]>([]);
	let available_models = $state<
		{ id: string; display_name: string }[]
	>([]);
	let selected_model = $state('claude-haiku-4-5-20251001');
	let loading_models = $state(false);

	// Test filters
	let test_type_filter = $state<'all' | 'activation' | 'quality'>(
		'all',
	);
	let selected_activation_tests = $state<string[]>([]);
	let selected_quality_tests = $state<string[]>([]);

	onMount(() => {
		load_models();
	});

	async function load_models() {
		loading_models = true;
		try {
			console.log('Fetching available models...');
			const models = await fetch_available_models(undefined);
			console.log('Fetched models:', models);
			available_models = models;
		} catch (error) {
			console.error('Failed to load models:', error);
			// Fallback to default models if API call fails
			available_models = [
				{
					id: 'claude-sonnet-4-5-20250929',
					display_name: 'Claude Sonnet 4.5',
				},
				{
					id: 'claude-haiku-4-5-20251001',
					display_name: 'Claude Haiku 4.5',
				},
				{
					id: 'claude-opus-4-1-20250805',
					display_name: 'Claude Opus 4.1',
				},
			];
			console.log('Using fallback models:', available_models);
		} finally {
			loading_models = false;
			console.log(
				'Model loading complete. Available models:',
				available_models,
			);
		}
	}

	async function run_all_activation_tests() {
		is_running = true;
		activation_results = [];
		current_logs = [];

		// Filter tests based on selection
		const tests_to_run =
			selected_activation_tests.length > 0
				? activation_tests.filter((t) =>
						selected_activation_tests.includes(t.id),
					)
				: activation_tests;

		current_test = `Running ${tests_to_run.length} activation tests...`;

		try {
			// Call batch runner which handles DB storage
			const results = await run_activation_tests(
				tests_to_run.map((t) => ({ ...t, model: selected_model })),
			);
			activation_results = results;
			// Aggregate logs from all results
			current_logs = results.flatMap((r) => r.logs);
		} catch (error) {
			console.error('Error running tests:', error);
			current_logs = [`Error: ${error}`];
		}

		is_running = false;
		current_test = '';
	}

	async function run_all_quality_tests() {
		is_running = true;
		quality_results = [];
		current_logs = [];

		// Filter tests based on selection
		const tests_to_run =
			selected_quality_tests.length > 0
				? qualityTests.filter((t) =>
						selected_quality_tests.includes(t.id),
					)
				: qualityTests;

		current_test = `Running ${tests_to_run.length} quality tests...`;

		try {
			// Call batch runner which handles DB storage
			const results = await run_quality_tests(
				tests_to_run.map((t) => ({ ...t, model: selected_model })),
			);
			quality_results = results;
			// Aggregate logs from all results
			current_logs = results.flatMap((r) => r.logs);
		} catch (error) {
			console.error('Error running tests:', error);
			current_logs = [`Error: ${error}`];
		}

		is_running = false;
		current_test = '';
	}

	const activation_summary = $derived(() => {
		if (activation_results.length === 0) return null;
		return get_test_summary(activation_results);
	});

	const quality_summary = $derived(() => {
		if (quality_results.length === 0) return null;
		return get_test_summary(quality_results);
	});
</script>

<div class="container mx-auto max-w-6xl p-8">
	<h1 class="mb-2 text-4xl font-bold">Skill Evaluations</h1>
	<p class="mb-8 text-lg text-gray-600">
		Test Claude Code skill activation and quality
	</p>

	<!-- Model Selection -->
	<div class="card mb-8 bg-base-200 p-6">
		<h2 class="mb-4 text-xl font-semibold">Model Selection</h2>
		<div class="form-control">
			<label class="label" for="model-select">
				<span class="label-text">Select model for testing:</span>
			</label>
			<select
				id="model-select"
				class="select-bordered select w-full max-w-md"
				bind:value={selected_model}
				disabled={is_running || loading_models}
			>
				{#if loading_models}
					<option>Loading models...</option>
				{:else if available_models.length === 0}
					<option>No models available</option>
				{:else}
					{#each available_models as model}
						<option value={model.id}>
							{model.display_name} ({model.id})
						</option>
					{/each}
				{/if}
			</select>
			<div class="label">
				<span class="label-text-alt">
					{#if loading_models}
						Fetching available models from API...
					{:else}
						Selected: {selected_model} | Available: {available_models.length}
						models
					{/if}
				</span>
			</div>
		</div>
		<!-- Debug info -->
		<details class="mt-4">
			<summary class="cursor-pointer text-sm opacity-50"
				>Debug Info</summary
			>
			<pre
				class="mt-2 overflow-auto rounded bg-base-300 p-2 text-xs">{JSON.stringify(
					{ loading_models, available_models, selected_model },
					null,
					2,
				)}</pre>
		</details>
	</div>

	<!-- Test Filters -->
	<div class="card mb-8 bg-base-200 p-6">
		<h2 class="mb-4 text-xl font-semibold">Test Filters</h2>

		<!-- Test Type Filter -->
		<div class="form-control mb-4">
			<label class="label" for="test-type-filter">
				<span class="label-text">Test Type:</span>
			</label>
			<select
				id="test-type-filter"
				class="select-bordered select w-full max-w-md"
				bind:value={test_type_filter}
				disabled={is_running}
			>
				<option value="all">All Tests</option>
				<option value="activation">Activation Only</option>
				<option value="quality">Quality Only</option>
			</select>
		</div>

		<!-- Specific Activation Tests -->
		{#if test_type_filter === 'all' || test_type_filter === 'activation'}
			<div class="form-control mb-4">
				<label class="label" for="activation-tests-filter">
					<span class="label-text"
						>Activation Tests (hold Ctrl/Cmd to select multiple, empty
						= all):</span
					>
				</label>
				<select
					id="activation-tests-filter"
					class="select-bordered select w-full"
					multiple
					size="5"
					bind:value={selected_activation_tests}
					disabled={is_running}
				>
					{#each activation_tests as test}
						<option value={test.id}
							>{test.id} - {test.description}</option
						>
					{/each}
				</select>
				<div class="label">
					<span class="label-text-alt"
						>Selected: {selected_activation_tests.length || 'All'}
						of {activation_tests.length}</span
					>
				</div>
			</div>
		{/if}

		<!-- Specific Quality Tests -->
		{#if test_type_filter === 'all' || test_type_filter === 'quality'}
			<div class="form-control">
				<label class="label" for="quality-tests-filter">
					<span class="label-text"
						>Quality Tests (hold Ctrl/Cmd to select multiple, empty =
						all):</span
					>
				</label>
				<select
					id="quality-tests-filter"
					class="select-bordered select w-full"
					multiple
					size="5"
					bind:value={selected_quality_tests}
					disabled={is_running}
				>
					{#each qualityTests as test}
						<option value={test.id}
							>{test.id} - {test.description}</option
						>
					{/each}
				</select>
				<div class="label">
					<span class="label-text-alt"
						>Selected: {selected_quality_tests.length || 'All'} of {qualityTests.length}</span
					>
				</div>
			</div>
		{/if}
	</div>

	<!-- Test Controls -->
	<div
		class="mb-8 grid gap-4"
		class:grid-cols-2={test_type_filter === 'all'}
		class:grid-cols-1={test_type_filter !== 'all'}
	>
		{#if test_type_filter === 'all' || test_type_filter === 'activation'}
			<div class="card bg-base-200 p-6">
				<h2 class="mb-4 text-2xl font-semibold">Activation Tests</h2>
				<p class="mb-4 text-sm">
					Verify correct skills trigger for queries
					{#if selected_activation_tests.length > 0}
						({selected_activation_tests.length} selected)
					{:else}
						({activation_tests.length} tests)
					{/if}
				</p>
				<button
					class="btn btn-primary"
					disabled={is_running}
					onclick={run_all_activation_tests}
				>
					{#if is_running && current_test.includes('activation')}
						Running...
					{:else if selected_activation_tests.length > 0}
						Run {selected_activation_tests.length} Activation Test{selected_activation_tests.length >
						1
							? 's'
							: ''}
					{:else}
						Run All Activation Tests
					{/if}
				</button>
			</div>
		{/if}

		{#if test_type_filter === 'all' || test_type_filter === 'quality'}
			<div class="card bg-base-200 p-6">
				<h2 class="mb-4 text-2xl font-semibold">Quality Tests</h2>
				<p class="mb-4 text-sm">
					Verify responses contain correct facts
					{#if selected_quality_tests.length > 0}
						({selected_quality_tests.length} selected)
					{:else}
						({qualityTests.length} tests)
					{/if}
				</p>
				<button
					class="btn btn-primary"
					disabled={is_running}
					onclick={run_all_quality_tests}
				>
					{#if is_running && current_test.includes('quality')}
						Running...
					{:else if selected_quality_tests.length > 0}
						Run {selected_quality_tests.length} Quality Test{selected_quality_tests.length >
						1
							? 's'
							: ''}
					{:else}
						Run All Quality Tests
					{/if}
				</button>
			</div>
		{/if}
	</div>

	<!-- Status -->
	{#if is_running}
		<div class="mb-8 alert alert-info">
			<span class="loading loading-spinner"></span>
			<span>{current_test}</span>
		</div>
	{/if}

	<!-- Live Logs -->
	{#if current_logs.length > 0}
		<div class="mb-8">
			<h2 class="mb-4 text-2xl font-semibold">Live Logs</h2>
			<div
				class="max-h-96 overflow-y-auto rounded-lg bg-base-300 p-4 font-mono text-sm"
			>
				{#each current_logs as log_line}
					<div class="py-1">{log_line}</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Activation Results -->
	{#if activation_results.length > 0}
		{#await activation_summary() then summary}
			{#if summary}
				<div class="mb-8">
					<h2 class="mb-4 text-2xl font-semibold">
						Activation Test Results
					</h2>

					<div class="stats mb-4 shadow">
						<div class="stat">
							<div class="stat-title">Total Tests</div>
							<div class="stat-value">{summary.total}</div>
						</div>
						<div class="stat">
							<div class="stat-title">Passed</div>
							<div class="stat-value text-success">
								{summary.passed}
							</div>
						</div>
						<div class="stat">
							<div class="stat-title">Failed</div>
							<div class="stat-value text-error">
								{summary.failed}
							</div>
						</div>
						<div class="stat">
							<div class="stat-title">Pass Rate</div>
							<div class="stat-value">
								{summary.pass_rate.toFixed(1)}%
							</div>
						</div>
					</div>

					<div class="overflow-x-auto">
						<table class="table table-zebra">
							<thead>
								<tr>
									<th>Test ID</th>
									<th>Status</th>
									<th>Expected Skill</th>
									<th>Activated Skill</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each activation_results as result}
									<tr
										class:bg-error={!result.passed}
										class:bg-opacity-20={!result.passed}
									>
										<td>{result.test_id}</td>
										<td>
											{#if result.passed}
												<span class="badge badge-success">✓ Pass</span
												>
											{:else}
												<span class="badge badge-error">✗ Fail</span>
											{/if}
										</td>
										<td>{result.expected_skill}</td>
										<td>{result.activated_skill || 'None'}</td>
										<td>
											<details class="dropdown">
												<summary class="btn btn-xs">Logs</summary>
												<div
													class="dropdown-content z-10 max-h-64 w-96 overflow-y-auto rounded-lg bg-base-300 p-4 shadow-lg"
												>
													<div class="font-mono text-xs">
														{#each result.logs as log_line}
															<div class="py-1">{log_line}</div>
														{/each}
													</div>
												</div>
											</details>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}
		{/await}
	{/if}

	<!-- Quality Results -->
	{#if quality_results.length > 0}
		{#await quality_summary() then summary}
			{#if summary}
				<div class="mb-8">
					<h2 class="mb-4 text-2xl font-semibold">
						Quality Test Results
					</h2>

					<div class="stats mb-4 shadow">
						<div class="stat">
							<div class="stat-title">Total Tests</div>
							<div class="stat-value">{summary.total}</div>
						</div>
						<div class="stat">
							<div class="stat-title">Passed</div>
							<div class="stat-value text-success">
								{summary.passed}
							</div>
						</div>
						<div class="stat">
							<div class="stat-title">Failed</div>
							<div class="stat-value text-error">
								{summary.failed}
							</div>
						</div>
						<div class="stat">
							<div class="stat-title">Pass Rate</div>
							<div class="stat-value">
								{summary.pass_rate.toFixed(1)}%
							</div>
						</div>
					</div>

					<div class="space-y-4">
						{#each quality_results as result}
							<div class="card bg-base-200">
								<div class="card-body">
									<div class="flex items-start justify-between">
										<h3 class="card-title">{result.test_id}</h3>
										{#if result.passed}
											<span class="badge badge-lg badge-success"
												>✓ Pass</span
											>
										{:else}
											<span class="badge badge-lg badge-error"
												>✗ Fail</span
											>
										{/if}
									</div>

									{#if result.missing_facts.length > 0}
										<div class="alert alert-warning">
											<span class="font-semibold">Missing Facts:</span
											>
											<ul class="list-inside list-disc">
												{#each result.missing_facts as fact}
													<li>{fact}</li>
												{/each}
											</ul>
										</div>
									{/if}

									{#if result.forbidden_content.length > 0}
										<div class="alert alert-error">
											<span class="font-semibold"
												>Forbidden Content Found:</span
											>
											<ul class="list-inside list-disc">
												{#each result.forbidden_content as content}
													<li>{content}</li>
												{/each}
											</ul>
										</div>
									{/if}

									{#if result.error}
										<div class="alert alert-error">
											<span class="font-semibold">Error:</span>
											<span>{result.error}</span>
										</div>
									{/if}

									<details
										class="collapse-arrow collapse bg-base-300"
									>
										<summary class="collapse-title font-medium"
											>Response Preview</summary
										>
										<div class="collapse-content">
											<pre
												class="text-sm whitespace-pre-wrap">{result.response_preview}</pre>
										</div>
									</details>

									<details
										class="collapse-arrow collapse mt-2 bg-base-300"
									>
										<summary class="collapse-title font-medium"
											>Logs</summary
										>
										<div class="collapse-content">
											<div class="font-mono text-xs">
												{#each result.logs as log_line}
													<div class="py-1">{log_line}</div>
												{/each}
											</div>
										</div>
									</details>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/await}
	{/if}
</div>
