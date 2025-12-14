---
name: research
# prettier-ignore
description: Research topics by verifying actual source content. Use when asked to research or study links and documentation.
# prettier-ignore
allowed-tools: WebFetch, mcp__mcp-omnisearch__web_search,
  mcp__mcp-omnisearch__kagi_summarizer_process, Read, Grep, Bash, Task
---

# Verified Research

## Quick Start

When researching, always fetch and verify actual sources:

```bash
# Always do this
WebFetch URL → read content → verify claims → present findings

# Never do this
WebSearch → present snippets without verification
```

## Core Rule

**Never present findings without examining actual source content.**

Steps:

1. Fetch the actual source (WebFetch or extract tools)
2. Read the complete relevant sections
3. Verify claims match what source actually says
4. Quote specific passages when making claims

## Common Pitfalls

❌ Presenting search snippets as facts ❌ Trusting summaries without
checking sources ❌ Citing sources you haven't read

## When Uncertain

If you can't verify (paywall, 404, contradictions): **Say so
explicitly.** Don't present unverified info as fact.

## References

For detailed patterns and examples:

- [references/verification-patterns.md](references/verification-patterns.md)
- [references/repo-cloning-pattern.md](references/repo-cloning-pattern.md) -
  Clone repos via subagent for source-level research
