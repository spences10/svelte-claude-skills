---
name: svelte5-runes
# IMPORTANT: Keep description on ONE line for Claude Code compatibility
# prettier-ignore
description: Svelte 5 runes guidance. Use for reactive state, props, effects, or Svelte 4→5 migration. Covers $state, $derived, $effect, $props, $bindable. Prevents mixing syntaxes and reactivity mistakes.
---

# Svelte 5 Runes

## Quick Start

**Which rune?** Props: `$props()` | Bindable: `$bindable()` |
Computed: `$derived()` | Side effect: `$effect()` | State: `$state()`

**Key rules:** Runes are top-level only. $derived can be overridden
(use `const` for read-only). Don't mix Svelte 4/5 syntax.
Objects/arrays are deeply reactive by default.

## Example

```svelte
<script>
	let count = $state(0); // Mutable state
	const doubled = $derived(count * 2); // Computed (const = read-only)

	$effect(() => {
		console.log(`Count is ${count}`); // Side effect
	});
</script>

<button onclick={() => count++}>
	{count} (doubled: {doubled})
</button>
```

## Reference Files

**Before suggesting code, check these:**

- [references/reactivity-patterns.md](references/reactivity-patterns.md) -
  When to use each rune
- [references/migration-gotchas.md](references/migration-gotchas.md) -
  Svelte 4 → 5 translation
- [references/component-api.md](references/component-api.md) -
  $props,
  $bindable patterns
- [references/snippets-vs-slots.md](references/snippets-vs-slots.md) -
  New snippet syntax
- [references/common-mistakes.md](references/common-mistakes.md) -
  Anti-patterns with fixes

## Notes

- Event handlers: Use `onclick` not `on:click` in Svelte 5
- Children: Use `{@render children()}` in layouts
- Check Svelte version before suggesting syntax
- **Svelte 5.25+ breaking change:** `$derived` can now be reassigned
  (use `const` for read-only)
- **Last verified:** 2025-01-11

<!--
PROGRESSIVE DISCLOSURE GUIDELINES:
- Keep this file ~50 lines total (max ~150 lines)
- Use 1-2 code blocks only (recommend 1)
- Keep description <200 chars for Level 1 efficiency
- Move detailed docs to references/ for Level 3 loading
- This is Level 2 - quick reference ONLY, not a manual

LLM WORKFLOW (when editing this file):
1. Write/edit SKILL.md
2. Format (if formatter available)
3. Run: claude-skills-cli validate <path>
4. If multi-line description warning: run claude-skills-cli doctor <path>
5. Validate again to confirm
-->
