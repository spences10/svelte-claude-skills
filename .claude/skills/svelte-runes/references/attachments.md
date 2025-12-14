# Attachments: The Modern Alternative to Actions

> Available in Svelte 5.29+

## Quick Decision

**Use `@attach` instead of `use:` for new code.** Attachments are more
flexible and composable.

## Basic Syntax

```svelte
<script>
	const myAttachment = (element) => {
		console.log(element.nodeName);
		return () => console.log('cleanup');
	};
</script>

<div {@attach myAttachment}>...</div>
```

## Key Differences from Actions

| Feature                 | Actions (`use:`) | Attachments (`@attach`) |
| ----------------------- | ---------------- | ----------------------- |
| Re-runs on arg change   | No               | Yes                     |
| Multiple per element    | Yes              | Yes                     |
| Composable              | Limited          | Fully                   |
| Pass through components | Manual           | Automatic via spread    |

## Attachment Factories (Common Pattern)

```svelte
<script>
	function tooltip(content) {
		return (element) => {
			const instance = tippy(element, { content });
			return instance.destroy;
		};
	}

	let content = $state('Hello');
</script>

<!-- Re-runs when content changes -->
<button {@attach tooltip(content)}>Hover me</button>
```

## Inline Attachments

```svelte
<canvas
	{@attach (canvas) => {
		const ctx = canvas.getContext('2d');

		$effect(() => {
			ctx.fillStyle = color;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		});
	}}
/>
```

## Component Pass-Through

Attachments pass through automatically when spreading props:

```svelte
<!-- Button.svelte -->
<script>
	let { children, ...props } = $props();
</script>

<button {...props}>
	{@render children?.()}
</button>

<!-- Usage -->
<Button {@attach tooltip('Help')}>Click me</Button>
```

## Avoid Expensive Re-runs

Pass data via accessor functions to prevent setup re-execution:

```svelte
<script>
	function expensiveAttachment(getData) {
		return (node) => {
			veryExpensiveSetup(node); // Runs once

			$effect(() => {
				update(node, getData()); // Re-runs on data change
			});
		};
	}

	let data = $state({ value: 1 });
</script>

<div {@attach expensiveAttachment(() => data.value)}>...</div>
```

## Converting Actions to Attachments

Use `fromAction` for existing action libraries:

```svelte
<script>
	import { fromAction } from 'svelte/attachments';
	import { someAction } from 'some-library';

	const attached = fromAction(someAction);
</script>

<div {@attach attached(options)}>...</div>
```

## When to Still Use Actions

- Legacy code/libraries not yet updated
- When you specifically DON'T want re-runs on arg change
