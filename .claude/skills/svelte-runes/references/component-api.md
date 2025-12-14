# Component API: $props and $bindable

## $props() - Accepting Props

### Basic Usage

```svelte
<script>
	let { name, age } = $props();
</script>

<p>{name} is {age} years old</p>

<!-- Usage: <Person name="Alex" age={30} /> -->
```

### With Defaults

```svelte
<script>
	let { name = 'Anonymous', age = 18 } = $props();
</script>
```

### With TypeScript

```svelte
<script lang="ts">
	interface Props {
		name: string;
		age?: number; // Optional with default
	}

	let { name, age = 18 }: Props = $props();
</script>
```

### Rest Props

Capture all additional props:

```svelte
<script>
	let { name, age, ...rest } = $props();
</script>

<div {...rest}>
	<p>{name} is {age}</p>
</div>

<!-- Usage: <Person name="Alex" age={30} class="card" id="p1" /> -->
<!-- rest = { class: 'card', id: 'p1' } -->
```

### Accessing All Props

```svelte
<script>
	let props = $props();
</script>

<p>{props.name} is {props.age}</p>
```

**When to use:**

- When you need to pass all props to a child
- When you don't know prop names in advance
- When you want to iterate over props

## $bindable() - Two-Way Binding

### Basic Bindable Prop

```svelte
<!-- Toggle.svelte -->
<script>
  let { checked = $bindable(false) } = $props();
</script>

<input type="checkbox" bind:checked />

<!-- Usage -->
<script>
  let isEnabled = $state(false);
</script>

<Toggle bind:checked={isEnabled} />
<p>Enabled: {isEnabled}</p>
```

### When to Use $bindable

**Use when:**

- Parent needs to read the value
- Parent needs to update the value
- Two-way data flow is appropriate

**Examples:**

- Form inputs (text, checkbox, select)
- Toggles, sliders, color pickers
- Custom input components

### Default Values

```svelte
<script>
	let { value = $bindable('') } = $props();
	//                       ^^^^^ default if parent doesn't provide
</script>
```

### Optional Bindable Props

```svelte
<script lang="ts">
	interface Props {
		value?: string; // Optional
	}

	let { value = $bindable('default') }: Props = $props();
</script>
```

### Multiple Bindable Props

```svelte
<!-- Slider.svelte -->
<script>
  let { min = $bindable(0), max = $bindable(100) } = $props();
</script>

<input type="range" bind:value={min} />
<input type="range" bind:value={max} />

<!-- Usage -->
<script>
  let minPrice = $state(0);
  let maxPrice = $state(1000);
</script>

<Slider bind:min={minPrice} bind:max={maxPrice} />
<p>Range: ${minPrice} - ${maxPrice}</p>
```

## Common Patterns

### Form Input Wrapper

```svelte
<!-- Input.svelte -->
<script>
  let {
    value = $bindable(''),
    label,
    type = 'text',
    ...rest
  } = $props();
</script>

<label>
  {label}
  <input {type} bind:value {...rest} />
</label>

<!-- Usage -->
<script>
  let email = $state('');
</script>

<Input
  bind:value={email}
  label="Email"
  type="email"
  placeholder="you@example.com"
  required
/>
```

### Controlled Component (No $bindable)

When parent fully controls the state:

```svelte
<!-- Counter.svelte -->
<script>
  let { count, onIncrement } = $props();
</script>

<button onclick={onIncrement}>
  Count: {count}
</button>

<!-- Usage -->
<script>
  let count = $state(0);
</script>

<Counter
  {count}
  onIncrement={() => count++}
/>
```

**Use this pattern when:**

- Parent should control all updates
- You need to validate/transform updates
- Side effects should run on change

### Hybrid: Bindable with Callback

```svelte
<!-- Slider.svelte -->
<script>
  let {
    value = $bindable(50),
    onChange
  } = $props();

  function handleChange() {
    onChange?.(value);  // Notify parent
  }
</script>

<input
  type="range"
  bind:value
  oninput={handleChange}
/>

<!-- Usage -->
<script>
  let volume = $state(50);
</script>

<Slider
  bind:value={volume}
  onChange={(v) => console.log('Volume changed:', v)}
/>
```

## Props vs Bindable Decision Tree

```
Parent needs to read child state?
├─ No → Just pass callbacks (controlled component)
├─ Yes → Parent needs to UPDATE child state?
    ├─ No → Callback to notify parent (onChange pattern)
    └─ Yes → Use $bindable (two-way binding)
```

## TypeScript Best Practices

### Strict Props Interface

```svelte
<script lang="ts">
	interface Props {
		// Required props
		name: string;
		age: number;

		// Optional props
		email?: string;

		// Props with defaults (must be optional in interface)
		role?: string;

		// Bindable props
		checked?: boolean;

		// Callbacks
		onSave?: (data: FormData) => void;

		// Rest props (for spreading to elements)
		[key: string]: unknown;
	}

	let {
		name,
		age,
		email,
		role = 'user',
		checked = $bindable(false),
		onSave,
		...rest
	}: Props = $props();
</script>
```

### Generic Components

```svelte
<script lang="ts" generics="T">
	interface Props<T> {
		items: T[];
		selected?: T;
		onSelect?: (item: T) => void;
	}

	let { items, selected, onSelect }: Props<T> = $props();
</script>

{#each items as item}
	<button onclick={() => onSelect?.(item)}>
		{item}
	</button>
{/each}
```

## Common Mistakes

### ❌ Forgetting $bindable

```svelte
<!-- WRONG -->
<script>
  let { value } = $props();
</script>
<input bind:value />

<!-- Parent tries: <Component bind:value={text} /> -->
<!-- ERROR: Cannot bind to non-bindable prop -->

<!-- RIGHT -->
<script>
  let { value = $bindable() } = $props();
</script>
<input bind:value />
```

### ❌ Mutating Non-Bindable Props

```svelte
<!-- WRONG -->
<script>
  let { count } = $props();  // Not bindable!

  function increment() {
    count++;  // BAD - mutating prop from parent
  }
</script>

<!-- RIGHT - Option 1: Use callback -->
<script>
  let { count, onIncrement } = $props();
</script>
<button onclick={onIncrement}>+</button>

<!-- RIGHT - Option 2: Make bindable -->
<script>
  let { count = $bindable(0) } = $props();
</script>
<button onclick={() => count++}>+</button>
```

### ❌ Not Providing Default for Bindable

```svelte
<!-- RISKY -->
<script>
  let { value = $bindable() } = $props();
  //                       ^^^ undefined if parent doesn't provide
</script>

<!-- SAFER -->
<script>
  let { value = $bindable('default') } = $props();
  //                       ^^^^^^^^^ explicit default
</script>
```

### ❌ Unnecessary Bindable

```svelte
<!-- WRONG - Overkill -->
<script>
  let { label = $bindable('Submit') } = $props();
</script>
<button>{label}</button>

<!-- RIGHT - Label doesn't need to be bindable -->
<script>
  let { label = 'Submit' } = $props();
</script>
<button>{label}</button>
```

**Rule of thumb:** Only use `$bindable` when parent _needs_ to update
the prop value.

## Prop Drilling vs Context

For deeply nested components, consider Context API instead of prop
drilling:

```svelte
<!-- App.svelte -->
<script>
  import { setContext } from 'svelte';
  let theme = $state('dark');

  setContext('theme', {
    get current() { return theme; },
    set current(value) { theme = value; }
  });
</script>

<!-- DeepChild.svelte -->
<script>
  import { getContext } from 'svelte';
  const theme = getContext('theme');
</script>

<p>Current theme: {theme.current}</p>
<button onclick={() => theme.current = 'light'}>
  Switch to light
</button>
```

## Performance: Props Are Reactive

Props are automatically reactive - no need for extra $derived:

```svelte
<!-- UNNECESSARY -->
<script>
  let { count } = $props();
  let doubled = $derived(count * 2);  // Overkill if just used once
</script>
<p>{doubled}</p>

<!-- SIMPLER -->
<script>
  let { count } = $props();
</script>
<p>{count * 2}</p>
```

**Use $derived when:**

- Value is used multiple times
- Computation is expensive
- You need to derive from multiple props
