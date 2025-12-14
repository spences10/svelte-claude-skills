# Snippets vs Slots: New Content Composition in Svelte 5

## Quick Comparison

| Feature          | Svelte 4 (Slots)               | Svelte 5 (Snippets + Children)         |
| ---------------- | ------------------------------ | -------------------------------------- |
| Default content  | `<slot />`                     | `{@render children()}`                 |
| Named content    | `<slot name="header" />`       | `{@render header()}`                   |
| Provide content  | `<div slot="header">...</div>` | `{#snippet header()}...{/snippet}`     |
| Slot props       | `<slot item={data} />`         | `{@render item(data)}`                 |
| Fallback content | `<slot>Fallback</slot>`        | `{@render children?.() ?? 'Fallback'}` |

## Children (Default Slot Replacement)

### Svelte 4: <slot />

```svelte
<!-- Card.svelte -->
<div class="card">
	<slot />
</div>

<!-- Usage -->
<Card>
	<p>This is card content</p>
</Card>
```

### Svelte 5: {@render children()}

```svelte
<!-- Card.svelte -->
<script>
	let { children } = $props();
</script>

<div class="card">
	{@render children()}
</div>

<!-- Usage -->
<Card>
	<p>This is card content</p>
</Card>
```

**Key differences:**

- Must declare `children` in `$props()`
- Use `{@render children()}` to render
- More explicit

## Named Snippets (Named Slots Replacement)

### Svelte 4: Named Slots

```svelte
<!-- Layout.svelte -->
<div class="layout">
	<header><slot name="header" /></header>
	<main><slot /></main>
	<footer><slot name="footer" /></footer>
</div>

<!-- Usage -->
<Layout>
	<div slot="header">Header content</div>
	<div slot="footer">Footer content</div>
	Main content
</Layout>
```

### Svelte 5: Named Snippets

```svelte
<!-- Layout.svelte -->
<script>
	let { header, footer, children } = $props();
</script>

<div class="layout">
	<header>{@render header()}</header>
	<main>{@render children()}</main>
	<footer>{@render footer()}</footer>
</div>

<!-- Usage -->
<Layout>
	{#snippet header()}
		Header content
	{/snippet}

	{#snippet footer()}
		Footer content
	{/snippet}

	Main content
</Layout>
```

**Key differences:**

- Snippets are props
- More structured and typed
- Can pass snippets around like functions

## Snippet Parameters (Slot Props Replacement)

### Svelte 4: Slot Props

```svelte
<!-- List.svelte -->
<script>
	export let items;
</script>

<ul>
	{#each items as item}
		<li>
			<slot {item} index={i} />
		</li>
	{/each}
</ul>

<!-- Usage -->
<List items={users} let:item let:index>
	{index}: {item.name}
</List>
```

### Svelte 5: Snippet Parameters

```svelte
<!-- List.svelte -->
<script>
	let { items, children } = $props();
</script>

<ul>
	{#each items as item, i}
		<li>
			{@render children(item, i)}
		</li>
	{/each}
</ul>

<!-- Usage -->
<List items={users}>
	{#snippet children(item, index)}
		{index}: {item.name}
	{/snippet}
</List>
```

**Key improvements:**

- Parameters are explicit function arguments
- Better TypeScript support
- More intuitive syntax

## Optional Snippets (Fallback Content)

### With Fallback

```svelte
<!-- Card.svelte -->
<script>
	let { header, children } = $props();
</script>

<div class="card">
	{#if header}
		<h2>{@render header()}</h2>
	{:else}
		<h2>Default Title</h2>
	{/if}

	{@render children()}
</div>

<!-- Usage without header -->
<Card>
	<p>Content only</p>
</Card>

<!-- Usage with header -->
<Card>
	{#snippet header()}
		Custom Title
	{/snippet}
	<p>Content</p>
</Card>
```

### Shorthand with ?.()

```svelte
<script>
  let { header, children } = $props();
</script>

<div class="card">
  <h2>{@render header?.() ?? 'Default Title'}</h2>
  {@render children()}
</div>
```

## Reusable Snippets

Snippets can be defined and reused within a component:

```svelte
<script>
	let items = $state(['Apple', 'Banana', 'Cherry']);
</script>

{#snippet listItem(text)}
	<li class="item">{text}</li>
{/snippet}

<ul>
	{#each items as item}
		{@render listItem(item)}
	{/each}
</ul>

<ul>
	{#each items.slice(0, 2) as item}
		{@render listItem(item)}
	{/each}
</ul>
```

**Benefits:**

- DRY (Don't Repeat Yourself)
- Keeps markup organized
- Can be passed to child components

## Passing Snippets as Props

```svelte
<!-- Table.svelte -->
<script>
  let { data, renderCell } = $props();
</script>

<table>
  {#each data as row}
    <tr>
      {#each row as cell}
        <td>{@render renderCell(cell)}</td>
      {/each}
    </tr>
  {/each}
</table>

<!-- Usage -->
<script>
  let data = $state([[1, 2], [3, 4]]);
</script>

{#snippet boldCell(value)}
  <strong>{value}</strong>
{/snippet}

<Table {data} renderCell={boldCell} />
```

## TypeScript with Snippets

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		header?: Snippet;
		item?: Snippet<[{ name: string; age: number }]>; // Snippet with params
	}

	let { children, header, item }: Props = $props();
</script>

{#if header}
	{@render header()}
{/if}

{@render children()}

{#if item}
	{@render item({ name: 'Alex', age: 30 })}
{/if}
```

## Common Patterns

### Conditional Rendering

```svelte
<script>
	let { header, showHeader = true, children } = $props();
</script>

{#if showHeader && header}
	{@render header()}
{/if}

{@render children()}
```

### Multiple Children Sections

```svelte
<script>
	let { sidebar, main } = $props();
</script>

<div class="layout">
	<aside>{@render sidebar()}</aside>
	<main>{@render main()}</main>
</div>

<!-- Usage -->
<Layout>
	{#snippet sidebar()}
		<nav>Navigation</nav>
	{/snippet}

	{#snippet main()}
		<p>Main content</p>
	{/snippet}
</Layout>
```

### Snippet with Complex Logic

```svelte
{#snippet userCard(user)}
	<div class="card">
		<h3>{user.name}</h3>
		{#if user.email}
			<p>{user.email}</p>
		{/if}
		{#if user.premium}
			<span class="badge">Premium</span>
		{/if}
	</div>
{/snippet}

{#each users as user}
	{@render userCard(user)}
{/each}
```

## Migration Guide

### 1. Simple Slot → Children

**Before:**

```svelte
<div class="wrapper">
	<slot />
</div>
```

**After:**

```svelte
<script>
	let { children } = $props();
</script>

<div class="wrapper">
	{@render children()}
</div>
```

### 2. Named Slots → Named Snippets

**Before:**

```svelte
<slot name="title" />
<slot name="content" />
```

**After:**

```svelte
<script>
	let { title, content } = $props();
</script>

{@render title()}
{@render content()}
```

### 3. Slot Props → Snippet Parameters

**Before:**

```svelte
{#each items as item}
	<slot {item} />
{/each}
```

**After:**

```svelte
<script>
	let { children } = $props();
</script>

{#each items as item}
	{@render children(item)}
{/each}
```

### 4. Optional Slots → Optional Snippets

**Before:**

```svelte
{#if $$slots.header}
	<slot name="header" />
{:else}
	<h1>Default</h1>
{/if}
```

**After:**

```svelte
<script>
	let { header } = $props();
</script>

{#if header}
	{@render header()}
{:else}
	<h1>Default</h1>
{/if}
```

## Common Mistakes

### ❌ Forgetting to Declare children

```svelte
<!-- RIGHT -->
<script>
	let { children } = $props();
</script>

<!-- WRONG -->
<div>
	{@render children()}
	<!-- ERROR: children not defined -->
</div>

<div>
	{@render children()}
</div>
```

### ❌ Using Parentheses Wrong

```svelte
<!-- WRONG -->
<script>
  let { children } = $props();
</script>

{@render children}  <!-- Missing () -->

<!-- RIGHT -->
{@render children()}
```

### ❌ Mixing Svelte 4 and 5 Syntax

```svelte
<!-- WRONG -->
<script>
	let { children } = $props();
</script>

<slot />
<!-- Don't mix slot with snippet syntax! -->

<!-- RIGHT -->
{@render children()}
```

### ❌ Not Handling Missing Optional Snippets

```svelte
<!-- RISKY -->
<script>
	let { header } = $props();
</script>

{@render header()}
<!-- Error if header not provided! -->

<!-- SAFE -->
{#if header}
	{@render header()}
{/if}

<!-- OR -->
{@render header?.()}
```

## Why Snippets Are Better

1. **More explicit** - Props make it clear what content slots exist
2. **Better TypeScript support** - Can type snippet parameters
3. **More composable** - Snippets can be passed around like functions
4. **Cleaner syntax** - No `let:prop` bindings
5. **More powerful** - Can define reusable snippets within components
6. **Consistent** - Everything is a prop, not a special `<slot>`
   element
