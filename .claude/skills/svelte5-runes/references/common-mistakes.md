# Common Mistakes: Anti-Patterns and Fixes

## Top 10 Svelte 5 Mistakes

### 1. Using $effect for Derived State ❌

**WRONG:**

```svelte
<script>
	let count = $state(0);
	let doubled = $state(0);

	$effect(() => {
		doubled = count * 2; // BAD - use $derived!
	});
</script>
```

**RIGHT:**

```svelte
<script>
	let count = $state(0);
	let doubled = $derived(count * 2); // GOOD - computed value
</script>
```

**Why:** `$effect` runs after DOM updates and is for side effects.
`$derived` is optimized for computed values.

---

### 2. Reassigning $derived Values ⚠️

**Note:** As of Svelte 5.25+, `$derived` CAN be reassigned, but will
recalculate when dependencies change.

**CONFUSING (works but not recommended):**

```svelte
<script>
	let count = $state(0);
	let doubled = $derived(count * 2);

	function reset() {
		doubled = 0; // Temporarily overrides, but recalculates when count changes
	}
</script>
```

**CLEARER - Use const for read-only:**

```svelte
<script>
	let count = $state(0);
	const doubled = $derived(count * 2); // const = truly read-only

	function reset() {
		count = 0; // Update source, derived updates automatically
	}
</script>
```

**Why:** While reassignment is allowed, it's clearer to update the
source state. Use `const` to enforce read-only behavior.

---

### 3. Creating Infinite Loops in $effect ❌

**WRONG:**

```svelte
<script>
	let count = $state(0);

	$effect(() => {
		count++; // INFINITE LOOP - effect triggers itself!
	});
</script>
```

**RIGHT - Don't update dependencies**

```svelte
<script>
	let count = $state(0);
	let log = $state([]);

	$effect(() => {
		log.push(count); // Updates different state
	});
</script>
```

**RIGHT - Use untrack() to read without subscribing**

```svelte
<script>
	import { untrack } from 'svelte';

	let count = $state(0);

	$effect(() => {
		console.log('Effect ran');
		// Read count without creating dependency
		const current = untrack(() => count);
		// Now updating count won't re-trigger this effect
	});
</script>
```

**Why:** `$effect` runs when any accessed `$state` changes. Updating
that state creates a loop. Use `untrack()` to read state without
creating a dependency.

---

### 4. Using Runes Inside Functions ❌

**WRONG:**

```svelte
<script>
	function createCounter() {
		let count = $state(0); // ERROR - runes must be top-level!
		return count;
	}

	const counter = createCounter();
</script>
```

**RIGHT - Option 1: Top-level runes**

```svelte
<script>
	let count = $state(0);
</script>
```

**RIGHT - Option 2: Reactive class fields**

```svelte
<script>
	class Counter {
		count = $state(0); // OK in class fields
	}

	const counter = new Counter();
</script>
```

**Why:** Runes must be statically analyzable at compile time. Use
classes for encapsulation.

---

### 5. Understanding Deep Reactivity in Svelte 5 ✅

**GOOD NEWS: Deep reactivity works by default!**

```svelte
<script>
	let user = $state({ profile: { name: 'Alex' } });

	function updateName() {
		user.profile.name = 'Bo'; // This DOES trigger reactivity!
	}
</script>

<p>{user.profile.name}</p> <!-- Will update correctly -->
```

**Why:** `$state()` creates deep reactive proxies by default. Nested
mutations trigger updates.

**When to use $state.raw() instead:**

```svelte
<script>
	// For large, immutable data structures where you don't need reactivity
	let config = $state.raw(hugeConfigObject); // Skip deep proxy overhead for performance

	// For data you'll fully replace, not mutate
	let apiResponse = $state.raw(data); // Will replace entire object later
</script>
```

**Why:** Use `$state.raw()` for **performance optimization** when you
don't need deep reactivity, not because deep reactivity doesn't work.

---

### 6. Mixing Svelte 4 and 5 Syntax ❌

**WRONG:**

```svelte
<script>
	let count = $state(0);
	$: doubled = count * 2; // DON'T MIX reactive statements with runes!
</script>

<button on:click={() => count++}>
	<!-- DON'T MIX on: with runes -->
	{count}
</button>
```

**RIGHT:**

```svelte
<script>
	let count = $state(0);
	let doubled = $derived(count * 2); // Use runes consistently
</script>

<button onclick={() => count++}>
	<!-- Use onclick -->
	{count}
</button>
```

**Why:** Svelte 5 requires consistent syntax. Pick one version.

---

### 7. Forgetting $state for Reactive Variables ❌

**WRONG:**

```svelte
<script>
	let count = 0; // Not reactive in Svelte 5!
</script>

<button onclick={() => count++}>{count}</button>
<!-- UI won't update! -->
```

**RIGHT:**

```svelte
<script>
	let count = $state(0); // Reactive
</script>

<button onclick={() => count++}>{count}</button>
```

**Why:** Plain variables aren't reactive in Svelte 5. Must use $state.

---

### 8. Not Using $bindable for Two-Way Binding ❌

**WRONG:**

```svelte
<!-- Child.svelte -->
<script>
	let { value } = $props(); // Not bindable!
</script>

<input bind:value />

<!-- Parent.svelte -->
<Child bind:value={text} />
<!-- ERROR - value is not bindable -->
```

**RIGHT:**

```svelte
<!-- Child.svelte -->
<script>
	let { value = $bindable() } = $props(); // Make it bindable
</script>

<input bind:value />

<!-- Parent.svelte -->
<Child bind:value={text} />
<!-- Works! -->
```

**Why:** Props must explicitly declare they're bindable with
$bindable().

---

### 9. Forgetting {@render} for Children ❌

**WRONG:**

```svelte
<script>
	let { children } = $props();
</script>

<div>{children}</div> <!-- Won't render! Shows [object Object] -->
```

**RIGHT:**

```svelte
<script>
	let { children } = $props();
</script>

<div>{@render children()}</div> <!-- Renders children -->
```

**Why:** Children is a snippet, not a value. Must use {@render}.

---

### 10. Using on: Event Handlers ❌

**WRONG:**

```svelte
<button on:click={handler}>Click</button>
<!-- Svelte 4 syntax -->
<button on:click|preventDefault={handler}>Click</button>
```

**RIGHT:**

```svelte
<button onclick={handler}>Click</button>
<!-- Svelte 5 syntax -->
<button
	onclick={(e) => {
		e.preventDefault();
		handler(e);
	}}>Click</button
>
```

**Why:** Svelte 5 uses standard DOM properties instead of `on:`
directives.

---

## Array and Object Mutations Work!

Svelte 5 has **deep reactivity** - array and object mutations trigger
updates:

### Arrays - All Methods Work

```svelte
<script>
	let items = $state([1, 2, 3]);

	function addItem() {
		items.push(4); // ✅ Works! Triggers reactivity
		// OR
		items[items.length] = 5; // ✅ Also works!
		// OR
		items = [...items, 6]; // ✅ Also works!
	}
</script>
```

### Nested Arrays - Also Work!

```svelte
<script>
	let data = $state({ items: [1, 2, 3], nested: { arr: [10, 20] } });

	function addItem() {
		data.items.push(4); // ✅ Works! Deep reactivity
	}

	function addNested() {
		data.nested.arr.push(30); // ✅ Works! Deeply reactive
	}
</script>
```

**All mutations trigger UI updates** because `$state()` creates deep
proxies.

## Performance Mistakes

### 1. Using $state When You Don't Need Reactivity

**UNNECESSARY:**

```svelte
<script>
	const API_URL = $state('https://api.example.com'); // Doesn't change!
</script>
```

**BETTER:**

```svelte
<script>
	const API_URL = 'https://api.example.com'; // Plain const
</script>
```

### 2. Using $state.raw for Performance

**When you have large immutable data:**

```svelte
<script>
	// Deep proxy has overhead for large objects
	let bigConfig = $state(hugeImmutableObject); // Slower

	// Skip proxies for data you don't mutate
	let bigConfig = $state.raw(hugeImmutableObject); // Faster
</script>
```

**Use $state.raw() when:**

- Data is large and immutable
- You'll replace entire object, not mutate it
- Performance is critical

**Don't use $state.raw() when:**

- You need to mutate nested properties
- Data is small/medium sized

### 3. Unnecessary $derived

**UNNECESSARY:**

```svelte
<script>
	let { count } = $props();
	let doubled = $derived(count * 2); // Used only once
</script>

<p>{doubled}</p>
```

**SIMPLER:**

```svelte
<script>
	let { count } = $props();
</script>

<p>{count * 2}</p> <!-- Inline is fine -->
```

## TypeScript Mistakes

### 1. Not Typing Props

**WRONG:**

```svelte
<script lang="ts">
	let { name, age } = $props(); // No types!
</script>
```

**RIGHT:**

```svelte
<script lang="ts">
	interface Props {
		name: string;
		age: number;
	}

	let { name, age }: Props = $props();
</script>
```

### 2. Wrong Bindable Type

**WRONG:**

```svelte
<script lang="ts">
	let { value = $bindable() }: { value: string } = $props();
	//                                   ^^^^^^ Should be optional
</script>
```

**RIGHT:**

```svelte
<script lang="ts">
	let { value = $bindable('') }: { value?: string } = $props();
	//                                       ^ Optional
</script>
```

## Error Messages and Fixes

### "Cannot access 'count' before initialization"

**Cause:** Using rune inside function or wrong order

```svelte
<!-- WRONG -->
<script>
  const doubled = count * 2;
  let count = $state(0);
</script>

<!-- RIGHT -->
<script>
  let count = $state(0);
  const doubled = $derived(count * 2);
</script>
```

### "Cannot read properties of undefined (reading '$effect')"

**Cause:** Using rune outside component scope

```svelte
<!-- WRONG -->
<script context="module">
	let count = $state(0); // ERROR - not in component scope
</script>

<!-- RIGHT -->
<script>
	let count = $state(0); // OK
</script>
```

### "bind:value is not available on this component"

**Cause:** Forgot $bindable

**Fix:** Add `$bindable()` to prop definition

## Best Practices Summary

1. ✅ Use `$derived` for computed values, not `$effect`
2. ✅ Never reassign `$derived` values
3. ✅ Don't update dependencies inside `$effect`
4. ✅ Keep runes at component top-level
5. ✅ Reassign objects/arrays for nested changes
6. ✅ Use consistent Svelte 5 syntax (no mixing)
7. ✅ Wrap reactive variables with `$state()`
8. ✅ Use `$bindable()` for two-way binding
9. ✅ Use `{@render children()}` not `{children}`
10. ✅ Use `onclick` not `on:click`
