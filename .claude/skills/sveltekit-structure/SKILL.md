---
name: sveltekit-structure
# IMPORTANT: Keep description on ONE line for Claude Code compatibility
# prettier-ignore
description: SvelteKit structure guidance. Use for routing, layouts, error handling, and SSR. Covers file naming (+page vs +layout vs +server), nested layouts, error boundaries, and hydration.
---

# SvelteKit Structure

## Quick Start

**File types:** `+page.svelte` (page) | `+layout.svelte` (wrapper) |
`+error.svelte` (error boundary) | `+server.ts` (API endpoint)

**Routes:** `src/routes/about/+page.svelte` → `/about` |
`src/routes/posts/[id]/+page.svelte` → `/posts/123`

**Layouts:** Apply to all child routes. `+layout.svelte` at any level
wraps descendants.

## Example

```
src/routes/
├── +layout.svelte              # Root layout (all pages)
├── +page.svelte                # Homepage /
├── about/+page.svelte          # /about
└── dashboard/
    ├── +layout.svelte          # Dashboard layout (dashboard pages only)
    ├── +page.svelte            # /dashboard
    └── settings/+page.svelte   # /dashboard/settings
```

```svelte
<!-- +layout.svelte -->
<script>
	let { children } = $props();
</script>

<nav><!-- Navigation --></nav>
<main>{@render children()}</main>
<footer><!-- Footer --></footer>
```

## Reference Files

- [references/file-naming.md](references/file-naming.md) - File naming
  conventions
- [references/layout-patterns.md](references/layout-patterns.md) -
  Nested layouts
- [references/error-handling.md](references/error-handling.md) - Error
  boundary placement
- [references/ssr-hydration.md](references/ssr-hydration.md) - SSR and
  browser-only code

## Notes

- Layouts must render `{@render children()}` in Svelte 5
- Error boundaries (+error.svelte) must be _above_ failing route
- Use `(groups)` for layout organization without affecting URL
- Check `browser` from `$app/environment` for client-only code
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
