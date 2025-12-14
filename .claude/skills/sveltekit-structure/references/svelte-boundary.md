# svelte:boundary Component

> Available in Svelte 5.3+

## Two Purposes

1. **Error boundaries** - catch rendering errors
2. **Pending UI** - show loading state while `await` resolves

## Basic Error Boundary

```svelte
<svelte:boundary onerror={(e, reset) => console.error(e)}>
	<RiskyComponent />

	{#snippet failed(error, reset)}
		<p>Error: {error.message}</p>
		<button onclick={reset}>Try again</button>
	{/snippet}
</svelte:boundary>
```

## Pending UI (Loading States)

```svelte
<svelte:boundary>
	{#await loadData()}
		<!-- This shows while loading -->
	{:then data}
		<DataView {data} />
	{/await}

	{#snippet pending()}
		<LoadingSpinner />
	{/snippet}
</svelte:boundary>
```

## Combined Error + Pending

```svelte
<svelte:boundary onerror={logError}>
	{#await fetchUser()}
		<!-- Will show pending snippet -->
	{:then user}
		<UserProfile {user} />
	{/await}

	{#snippet pending()}
		<p>Loading user...</p>
	{/snippet}

	{#snippet failed(error, reset)}
		<p>Failed to load user</p>
		<button onclick={reset}>Retry</button>
	{/snippet}
</svelte:boundary>
```

## What Gets Caught

**Caught:**

- Errors during rendering
- Errors in `$effect`

**NOT Caught:**

- Event handler errors (`onclick`, etc.)
- Errors after `setTimeout`
- Async errors outside boundary's await

## vs +error.svelte

| Feature  | svelte:boundary         | +error.svelte |
| -------- | ----------------------- | ------------- |
| Scope    | Component subtree       | Route segment |
| Reset    | Built-in reset function | Navigate away |
| Pending  | Yes (pending snippet)   | No            |
| Use case | Component-level         | Page-level    |

## Error Tracking Integration

```svelte
<svelte:boundary
	onerror={(error, reset) => {
		// Send to Sentry, LogRocket, etc.
		errorTracker.captureException(error);
	}}
>
	<App />

	{#snippet failed(error, reset)}
		<ErrorFallback {error} {reset} />
	{/snippet}
</svelte:boundary>
```

## Nested Boundaries

Inner boundary catches first:

```svelte
<svelte:boundary>
	<!-- Outer fallback -->
	{#snippet failed(e)}
		<p>Outer caught: {e.message}</p>
	{/snippet}

	<svelte:boundary>
		<!-- Inner fallback -->
		{#snippet failed(e)}
			<p>Inner caught: {e.message}</p>
		{/snippet}

		<ComponentThatMightFail />
	</svelte:boundary>
</svelte:boundary>
```

## Key Points

- Use `svelte:boundary` for component-level error isolation
- Use `+error.svelte` for route-level error pages
- `pending` snippet shows during initial `await` resolution
- `failed` snippet replaces content on error
- `reset` function lets users retry
- Errors in event handlers are NOT caught
