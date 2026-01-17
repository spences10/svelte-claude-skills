# Svelte Claude Skills

[![Run in Smithery](https://smithery.ai/badge/skills/spences10)](https://smithery.ai/skills?ns=spences10&utm_source=github&utm_medium=badge)


A curated collection of [Claude Code](https://claude.com/claude-code)
skills for Svelte 5 and SvelteKit development. These skills provide
context-aware guidance, best practices, and common patterns to help
you build Svelte applications more effectively.

## What are Claude Code Skills?

Skills are specialized knowledge modules that enhance Claude Code's
ability to help with specific frameworks and technologies. When
activated, they provide detailed guidance on framework-specific
patterns, anti-patterns, migration paths, and best practices.

## Available Skills

### 1. **svelte5-runes** (90% verified)

Comprehensive guidance for Svelte 5's runes system.

**Covers:**

- `$state()` - Reactive state with deep reactivity
- `$derived()` - Computed values and lazy evaluation
- `$effect()` - Side effects and lifecycle
- `$props()` / `$bindable()` - Component props and two-way binding
- Svelte 4 → 5 migration patterns
- Common mistakes and anti-patterns

**Recent updates:**

- ✅ Svelte 5.25+ breaking change documented ($derived mutability)
- ✅ Deep reactivity patterns verified
- ✅ All examples tested against official docs

### 2. **sveltekit-data-flow** (95% verified)

Master data flow patterns in SvelteKit.

**Covers:**

- Server vs universal load functions (`+page.server.ts` vs `+page.ts`)
- Form actions with `fail()`, `redirect()`, `error()`
- Data serialization rules and limitations
- Error and redirect handling patterns
- Progressive enhancement

**Key learnings:**

- ALWAYS throw `redirect()` and `error()` (not return)
- Form actions ONLY in `+page.server.ts`
- Server load data flows to universal load as `data` parameter

### 3. **sveltekit-structure** (92% verified)

Navigate SvelteKit's file-based routing and structure.

**Covers:**

- File naming conventions (`+page`, `+layout`, `+error`, `+server`)
- Nested layouts and layout groups
- Error boundaries and placement
- SSR and hydration patterns
- Dynamic routing and parameters

**Key patterns:**

- `{@render children()}` in layouts (Svelte 5)
- `(groups)` for organization without URL impact
- Error boundaries must be ABOVE failing routes

## Installation

### Option 1: Clone this repository

```bash
# Clone into your Claude skills directory
git clone https://github.com/yourusername/svelte-claude-skills.git ~/.claude/skills/svelte

# Or clone into a specific project
git clone https://github.com/yourusername/svelte-claude-skills.git .claude/skills/
```

### Option 2: Symlink individual skills

```bash
# Link specific skills to your global or project Claude skills directory
ln -s /path/to/svelte-claude-skills/.claude/skills/svelte5-runes ~/.claude/skills/
ln -s /path/to/svelte-claude-skills/.claude/skills/sveltekit-data-flow ~/.claude/skills/
ln -s /path/to/svelte-claude-skills/.claude/skills/sveltekit-structure ~/.claude/skills/
```

## Usage

Once installed, Claude Code will automatically detect and activate
these skills when working with Svelte/SvelteKit projects. You can also
manually invoke them:

```
# In Claude Code, use the Skill tool
Ask about $bindable props
Help me understand load functions
Show me error handling patterns
```

The skills use progressive disclosure - starting with quick references
and expanding to detailed documentation as needed.

## Verification Status

All skills have been verified against official Svelte and SvelteKit
documentation:

| Skill               | Accuracy | Last Verified | Status              |
| ------------------- | -------- | ------------- | ------------------- |
| svelte5-runes       | 90%      | 2025-01-11    | ✅ Production Ready |
| sveltekit-data-flow | 95%      | 2025-01-11    | ✅ Production Ready |
| sveltekit-structure | 92%      | 2025-01-11    | ✅ Production Ready |

### Verification Methodology

Skills are validated using:

- Official Svelte documentation (svelte.dev)
- Official SvelteKit documentation (kit.svelte.dev)
- Community feedback (GitHub issues, Reddit, Stack Overflow)
- Real-world testing with current framework versions

## Recent Updates

### January 11, 2025

- **CRITICAL:** Fixed Svelte 5.25+ breaking change regarding
  `$derived` mutability
  - `$derived` values can now be reassigned (but will recalculate on
    dependency change)
  - Updated all documentation to recommend `const` for truly read-only
    derived values
- Corrected deep reactivity documentation (objects/arrays are deeply
  reactive by default)
- Added version tracking to all skills

## What Makes These Skills Accurate?

- ✅ Verified against official documentation using actual source
  content
- ✅ Cross-checked with community discussions and GitHub issues
- ✅ Tested with current framework versions
- ✅ Updated for breaking changes (Svelte 5.25+)
- ✅ Include decision trees and clear anti-patterns
- ✅ Production-ready examples

## Contributing

Found an inaccuracy or have a suggestion?

1. Check the skill's reference files in
   `.claude/skills/[skill-name]/references/`
2. Verify against [official Svelte docs](https://svelte.dev/docs)
3. Open an issue or PR with:
   - What the skill currently says
   - What the official docs actually say (with links)
   - Suggested correction

## Skill Development

These skills follow the
[Claude Code Skills](https://docs.claude.com/en/docs/claude-code)
guidelines:

- Progressive disclosure (Level 1: description, Level 2: quick start,
  Level 3: detailed references)
- Single-file quick starts (<50 lines)
- Detailed references in separate files
- TypeScript examples where applicable
- Clear anti-patterns with fixes

## Project Structure

```
.claude/skills/
├── svelte5-runes/
│   ├── SKILL.md                    # Quick start
│   └── references/
│       ├── reactivity-patterns.md
│       ├── migration-gotchas.md
│       ├── component-api.md
│       ├── snippets-vs-slots.md
│       └── common-mistakes.md
├── sveltekit-data-flow/
│   ├── SKILL.md
│   └── references/
│       ├── load-functions.md
│       ├── form-actions.md
│       ├── serialization.md
│       └── error-redirect-handling.md
└── sveltekit-structure/
    ├── SKILL.md
    └── references/
        ├── file-naming.md
        ├── layout-patterns.md
        ├── error-handling.md
        └── ssr-hydration.md
```

## Resources

- [Svelte Documentation](https://svelte.dev/docs)
- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [Claude Code Documentation](https://docs.claude.com/en/docs/claude-code)
- [Svelte 5 Migration Guide](https://svelte.dev/docs/svelte/v5-migration-guide)

## Skills Ecosystem

| Project | Purpose |
|---------|---------|
| [claude-code-toolkit](https://github.com/spences10/claude-code-toolkit) | Performance, productivity, ecosystem tools |
| [svelte-skills-kit](https://github.com/spences10/svelte-skills-kit) | Svelte 5 & SvelteKit skills marketplace |
| [claude-skills-cli](https://github.com/spences10/claude-skills-cli) | CLI for creating skills with validation |
| [svelte-claude-skills](https://github.com/spences10/svelte-claude-skills) | Original Svelte skills collection |

## Tools Ecosystem

| Project | Purpose |
|---------|---------|
| [mcp-omnisearch](https://github.com/spences10/mcp-omnisearch) | Unified search MCP (Tavily, Kagi, GitHub) |
| [mcp-sqlite-tools](https://github.com/spences10/mcp-sqlite-tools) | Safe SQLite operations MCP |
| [mcpick](https://github.com/spences10/mcpick) | Dynamic MCP server toggling |
| [cclog](https://github.com/spences10/cclog) | Claude Code transcript → SQLite |

## License

MIT

## Acknowledgments

Built with verification methodology inspired by the `research` skill
pattern - always verify against actual source content, never trust
summaries without checking sources.
