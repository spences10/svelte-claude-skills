# Migration Gotchas: Svelte 4 → Svelte 5

## Quick Translation Table

| Svelte 4                      | Svelte 5                                       | Notes                  |
| ----------------------------- | ---------------------------------------------- | ---------------------- |
| `let count = 0`               | `let count = $state(0)`                        | Make reactive          |
| `$: doubled = count * 2`      | `let doubled = $derived(count * 2)`            | Computed value         |
| `$: { console.log(count); }`  | `$effect(() => { console.log(count); })`       | Side effect            |
| `$: if (count > 10) { ... }`  | `$effect(() => { if (count > 10) { ... } })`   | Conditional effect     |
| `export let name`             | `let { name } = $props()`                      | Props                  |
| `export let value` (bindable) | `let { value = $bindable() } = $props()`       | Two-way binding        |
| `on:click={handler}`          | `onclick={handler}`                            | Event handler          |
| `on:click\|preventDefault`    | `onclick={(e) => { e.preventDefault(); ... }}` | Event modifier         |
| `<slot />`                    | `{@render children()}`                         | Default slot           |
| `<slot name="header" />`      | `{@render header()}`                           | Named slot             |
| N/A                           | `{#snippet name()}...{/snippet}`               | Define reusable markup |

## Critical Differences

### 1. Reactive Statements → Runes

**Svelte 4:**

```svelte
<script>
	let count = 0;
	$: doubled = count * 2; // Computed
	$: {
		// Effect
		console.log(count);
		document.title = `Count: ${count}`;
	}
</script>
```

**Svelte 5:**

```svelte
<script>
	let count = $state(0);
	let doubled = $derived(count * 2); // Computed

	$effect(() => {
		// Effect
		console.log(count);
		document.title = `Count: ${count}`;
	});
</script>
```

**Why:** Runes are more explicit about intent (derived vs effect) and
avoid ambiguity.

### 2. Props

**Svelte 4:**

```svelte
<script>
	export let name;
	export let age = 18;
</script>
```

**Svelte 5:**

```svelte
<script>
	let { name, age = 18 } = $props();
</script>
```

**With rest props:**

```svelte
<script>
	let { name, age, ...rest } = $props();
</script>

<div {...rest}>{name}</div>
```

### 3. Two-Way Binding (bind:)

**Svelte 4:**

```svelte
<!-- Child.svelte -->
<script>
	export let value;
</script>

<input bind:value />

<!-- Parent: <Child bind:value={text} /> -->
```

**Svelte 5:**

```svelte
<!-- Child.svelte -->
<script>
	let { value = $bindable() } = $props();
</script>

<input bind:value />

<!-- Parent: <Child bind:value={text} /> -->
```

**Why:** Explicit `$bindable()` makes it clear which props support
two-way binding.

### 4. Event Handlers

**Svelte 4:**

```svelte
<button on:click={handleClick}>Click</button>
<button on:click|preventDefault={handleClick}>Click</button>
<button on:click={() => count++}>Increment</button>
```

**Svelte 5:**

```svelte
<button onclick={handleClick}>Click</button>
<button
	onclick={(e) => {
		e.preventDefault();
		handleClick(e);
	}}>Click</button
>
<button onclick={() => count++}>Increment</button>
```

**Why:** Standard DOM properties instead of directives.

### 5. Slots → Children & Snippets

**Svelte 4:**

```svelte
<!-- Layout.svelte -->
<div class="layout">
	<header><slot name="header" /></header>
	<main><slot /></main>
</div>

<!-- Usage -->
<Layout>
	<div slot="header">Header content</div>
	Main content
</Layout>
```

**Svelte 5:**

```svelte
<!-- Layout.svelte -->
<script>
	let { header, children } = $props();
</script>

<div class="layout">
	<header>{@render header()}</header>
	<main>{@render children()}</main>
</div>

<!-- Usage -->
<Layout>
	{#snippet header()}
		Header content
	{/snippet}
	Main content
</Layout>
```

**Why:** More explicit and composable.

### 6. Lifecycle Functions

**Svelte 4:**

```svelte
<script>
	import { onMount, onDestroy } from 'svelte';

	onMount(() => {
		console.log('mounted');
		return () => console.log('cleanup');
	});

	onDestroy(() => {
		console.log('destroyed');
	});
</script>
```

**Svelte 5:**

```svelte
<script>
  import { onMount } from 'svelte';

  onMount(() => {
    console.log('mounted');
    return () => console.log('cleanup');
  });

  // For most cleanup, use $effect:
  $effect(() => {
    const interval = setInterval(() => {...}, 1000);
    return () => clearInterval(interval);
  });
</script>
```

**Why:** `$effect` with cleanup function covers most `onDestroy` use
cases.

## Common Migration Mistakes

### ❌ Mixing Svelte 4 and 5 Syntax

```svelte
<!-- WRONG - DON'T MIX -->
<script>
	let count = $state(0);
	$: doubled = count * 2; // Mixing runes with reactive statements!
</script>
```

**Fix:** Use runes consistently:

```svelte
<script>
	let count = $state(0);
	let doubled = $derived(count * 2);
</script>
```

### ❌ Forgetting to Use $state

```svelte
<!-- WRONG -->
<script>
	let count = 0; // Not reactive in Svelte 5!
</script>

<button onclick={() => count++}>{count}</button>
<!-- UI won't update! -->
```

**Fix:**

```svelte
<script>
	let count = $state(0);
</script>

<button onclick={() => count++}>{count}</button>
```

### ❌ Using on: Instead of onclick

```svelte
<!-- WRONG -->
<button on:click={handler}>Click</button>

<!-- RIGHT -->
<button onclick={handler}>Click</button>
```

### ❌ Forgetting {@render} for Children

```svelte
<!-- WRONG -->
<script>
	let { children } = $props();
</script>

<div>{children}</div>
<!-- Won't render! -->

<!-- RIGHT -->
<div>{@render children()}</div>
```

### ❌ Trying to Bind Without $bindable

```svelte
<!-- Child.svelte - WRONG -->
<script>
  let { value } = $props();  // Not bindable!
</script>

<!-- Parent tries: <Child bind:value={text} /> -->
<!-- Will error! -->

<!-- Child.svelte - RIGHT -->
<script>
  let { value = $bindable() } = $props();
</script>
```

## Stores Still Work!

Svelte stores (`writable`, `readable`, `derived`) still work in Svelte
5:

```svelte
<script>
	import { writable } from 'svelte/store';

	const count = writable(0);
</script>

<button onclick={() => $count++}>{$count}</button>
```

**When to use stores vs runes:**

- **Runes:** Component-local state
- **Stores:** Global state, shared across components

## TypeScript Changes

**Svelte 4:**

```svelte
<script lang="ts">
	export let count: number;
</script>
```

**Svelte 5:**

```svelte
<script lang="ts">
	interface Props {
		count: number;
	}

	let { count }: Props = $props();
</script>
```

## Reactive Class Fields

**Svelte 5 introduces reactive class fields:**

```svelte
<script>
	class Counter {
		count = $state(0);
		doubled = $derived(this.count * 2);

		increment() {
			this.count++;
		}
	}

	const counter = new Counter();
</script>

<button onclick={() => counter.increment()}>
	{counter.count} (doubled: {counter.doubled})
</button>
```

## Migration Strategy

1. **Don't mix syntaxes** - Migrate one component at a time fully
2. **Start with leaf components** - Migrate from bottom up
3. **Test incrementally** - Ensure each component works before moving
   on
4. **Use TypeScript** - Catch binding/prop errors at compile time
5. **Read the migration guide** -
   https://svelte.dev/docs/svelte/v5-migration-guide

## Feature Detection

If you need to support both Svelte 4 and 5:

```svelte
<script>
	import { VERSION } from 'svelte/compiler';

	const isSvelte5 = VERSION.startsWith('5');

	// Conditionally use syntax based on version
</script>
```

**But:** Generally better to fully migrate to Svelte 5 than maintain
dual syntax.
