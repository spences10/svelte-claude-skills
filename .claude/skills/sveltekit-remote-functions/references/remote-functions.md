# Remote Functions Detailed Guide

## Contents

- Overview
- Configuration (Experimental)
- Async Svelte Integration
- Available Functions (command, query, form, prerender)
- Validation
- Serialization Rules
- Access Request Context
- Error Handling
- File Naming Convention
- Performance Tips
- Caching Strategies
- Common Patterns
- TypeScript Tips
- Comparison with Traditional Approaches

## Overview

Remote functions (`command()`, `query()`, `form()`, `prerender()`)
from `$app/server` enable server-side code execution from client
components. They automatically handle serialization, network
transport, and validation.

**Key benefit:** Component-level data fetching instead of page-level
load functions. No more hot-potato-ing data from load → props. Just
import and call.

## Configuration (Experimental)

Enable in `svelte.config.js`:

```javascript
export default {
	kit: {
		experimental: {
			remoteFunctions: true,
			asyncSvelte: true, // enables await anywhere in components
		},
	},
};
```

## Async Svelte Integration

With `asyncSvelte: true`, you can `await` anywhere in components:

```svelte
<script>
	import { get_posts } from '$lib/posts.remote';

	// Top-level await - SSR works automatically
	const posts = await get_posts();
</script>

{#each posts as post}
	<article>{post.title}</article>
{/each}
```

Even inside `$derived`:

```svelte
<script>
	let category = $state('all');

	// Reactive + async
	const posts = $derived(await get_posts_by_category(category));
</script>
```

## Available Functions

### command()

**Purpose:** One-time server actions (writes, updates, deletes)

**Signatures:**

```typescript
// With validation
command<T>(schema: StandardSchemaV1, handler: (input: T) => Promise<Result>)

// Without validation
command(handler: () => Promise<Result>)

// Unchecked mode
command.unchecked(handler: (input: unknown) => Promise<Result>)
```

**Example:**

```typescript
import { command } from '$app/server';
import * as v from 'valibot';

export const create_post = command(
	v.object({
		title: v.string(),
		content: v.string(),
	}),
	async ({ title, content }) => {
		const post = await db.posts.create({ title, content });
		return { id: post.id };
	},
);
```

### query()

**Purpose:** Repeated reads, data fetching (supports batching)

**Example:**

```typescript
// users.remote.ts
import { query } from '$app/server';
import * as v from 'valibot';

export const get_user = query(
	v.object({ id: v.string() }),
	async ({ id }) => {
		return await db.users.findById(id);
	},
);
```

**Client usage - multiple patterns:**

```svelte
<script>
	import { get_user } from '$lib/users.remote';

	// Pattern 1: Await for SSR (recommended)
	const user = await get_user({ id: '1' });

	// Pattern 2: Non-blocking with reactive properties
	const userQuery = get_user({ id: '1' });
	// Access: userQuery.current, userQuery.loading, userQuery.error
</script>

<!-- Await inside template, even in loops -->
{#each userIds as id}
	{#await get_user({ id })}
		<p>Loading...</p>
	{:then user}
		<p>{user.name}</p>
	{/await}
{/each}
```

**Query methods:**

```typescript
// Manually refresh data
query.refresh();

// Set data directly (avoid refetch after mutation returns new data)
query.set(newData);
```

#### query.batch()

Batch queries within same microtask into single network request:

```typescript
// weather.remote.ts
export const get_weather = query.batch(
	v.string(), // city name
	async (cities) => {
		// cities is array - one DB call for all
		return await db.weather.findMany({ city: { in: cities } });
	}
);
```

```svelte
<!-- Each iteration batched into single request -->
{#each cities as city}
	{#await get_weather(city) then weather}
		<p>{city}: {weather.temp}°</p>
	{/await}
{/each}
```

### form()

**Purpose:** Progressively enhanced forms with validation. Works
with/without JS.

This is the "killer feature" - handles client + server validation from
one schema.

**Server definition:**

```typescript
// posts.remote.ts
import { form } from '$app/server';
import * as v from 'valibot';

export const create_post = form(
	v.object({
		title: v.pipe(v.string(), v.minLength(1)),
		content: v.string(),
		published: v.boolean(),
	}),
	async ({ title, content, published }) => {
		const post = await db.posts.create({ title, content, published });
		return { id: post.id };
	}
);
```

**Client usage - Basic (progressive enhancement):**

```svelte
<script>
	import { create_post } from '$lib/posts.remote';
</script>

<!-- Spread form for progressive enhancement -->
<form {...create_post}>
	<input name="title" />
	<textarea name="content"></textarea>
	<button>Create</button>
</form>
```

**Client usage - Field spreading (auto-sets type, id, validation):**

```svelte
<script>
	import { create_post } from '$lib/posts.remote';
</script>

<form {...create_post}>
	<label>
		Title
		<!-- Spreads: type="text", id, name, validation attributes -->
		<input {...create_post.fields.title.as('text')} />
	</label>

	<label>
		Content
		<textarea {...create_post.fields.content.as('textarea')}
		></textarea>
	</label>

	<label>
		<input {...create_post.fields.published.as('checkbox')} />
		Published
	</label>

	<button>Create</button>
</form>
```

**Field validation & errors:**

```svelte
<label>
	Title
	<input {...create_post.fields.title.as('text')} />
	{#if create_post.fields.title.error}
		<span class="error">{create_post.fields.title.error}</span>
	{/if}
</label>
```

**Programmatic field access:**

```typescript
// Get current value
const currentTitle = create_post.fields.title.value;

// Set value programmatically
create_post.fields.title.set('New Title');

// Reset entire form
create_post.reset();
```

**Enhanced mode (custom JS handling):**

```svelte
<form
	{...create_post}
	use:create_post.enhance={async ({ submit }) => {
		const result = await submit();

		if (result.id) {
			toast.success('Post created!');
			goto(`/posts/${result.id}`);
		}
	}}
>
	<!-- inputs -->
</form>
```

### prerender()

**Purpose:** Query that only runs at build time (static site
generation).

```typescript
// stats.remote.ts
import { prerender } from '$app/server';

export const get_build_stats = prerender(async () => {
	return {
		buildTime: new Date().toISOString(),
		postCount: await db.posts.count(),
	};
});
```

Use for static sites where data shouldn't change after build.

## Validation

Remote functions support **StandardSchemaV1** - a universal schema
standard. Use any validation library:

- **Valibot** (used in Svelte docs, lightweight)
- **Zod** (most popular)
- **ArkType** (fast, type-first)
- **Effect Schema**
- **TypeBox**, **Joy**, and many more

Benefits of standard schema:

- Pick your preferred library
- Schema → HTML input attributes (for `form()`)
- Schema → TypeScript types (automatic)
- Schema → client + server validation

### With Valibot

```typescript
import * as v from 'valibot';

export const update_settings = command(
	v.object({
		theme: v.union([v.literal('light'), v.literal('dark')]),
		notifications: v.boolean(),
	}),
	async (settings) => {
		// settings is fully typed and validated
		await db.settings.update(settings);
	},
);
```

### Without Validation

```typescript
export const simple_action = command(async () => {
	// No input validation
	return { timestamp: Date.now() };
});
```

### Unchecked Mode

```typescript
export const flexible_action = command.unchecked(async (input) => {
	// input is unknown - validate manually if needed
	return process(input);
});
```

## Serialization Rules

**Can serialize:**

- Primitives: string, number, boolean, null
- Plain objects and arrays
- Date objects
- Maps and Sets
- RegExp
- TypedArrays

**Cannot serialize:**

- Functions
- Class instances (unless they have toJSON)
- Symbols
- Circular references

**Example:**

```typescript
// ✅ Valid
return {
	name: 'Alice',
	age: 30,
	created: new Date(),
};

// ❌ Invalid
return {
	user: new User(), // Class instance
	callback: () => {}, // Function
};
```

## Access Request Context

Use `getRequestEvent()` inside remote functions to access cookies,
headers, etc:

```typescript
import { command, getRequestEvent } from '$app/server';

export const get_session = command(async () => {
	const event = getRequestEvent();
	const sessionId = event.cookies.get('session');

	return { sessionId };
});
```

## Error Handling

Thrown errors are serialized and re-thrown on the client:

```typescript
export const risky_action = command(
	v.object({ id: v.string() }),
	async ({ id }) => {
		const item = await db.items.find(id);
		if (!item) {
			throw new Error('Item not found');
		}
		return item;
	},
);

// Client side:
try {
	await risky_action({ id: '123' });
} catch (error) {
	console.error(error.message); // "Item not found"
}
```

## File Naming Convention

Use `*.remote.ts` (or `.js`) suffix. These files can live **anywhere**
in your project - not just in routes.

```
src/
  lib/
    users.remote.ts     ← Remote functions (can import anywhere)
    posts.remote.ts
    database.server.ts  ← Server-only utilities (no remote calls)
    utils.ts            ← Universal utilities
  routes/
    blog/
      actions.remote.ts ← Route-specific remote functions
```

The `.remote` suffix makes server boundary obvious - you know
instantly this code runs on server. No confusion about where imports
execute.

## Performance Tips

1. **Use query() for reads** - Benefits from batching
2. **Use query.batch()** - When looping, batch into single request
3. **Return minimal data** - Serialization has overhead
4. **Use query.set() after mutations** - Avoid refetch when mutation
   returns new data
5. **Await for SSR** - Ensures server rendering, no client waterfall

## Caching Strategies

Remote functions don't have built-in caching. Options:

**Service Worker + IndexedDB (client-side stale-while-revalidate):**

```typescript
// service-worker.ts - intercept remote function calls
// Save responses to IndexedDB, serve cached on next load
// ~150 lines for basic implementation
```

**Server-side key-value cache:**

```typescript
// In remote function
export const get_expensive_data = query(async () => {
	const cached = await kv.get('expensive-data');
	if (cached) return cached;

	const data = await expensiveOperation();
	await kv.set('expensive-data', data, { ttl: 3600 });
	return data;
});
```

**Note:** Component-level caching (cache entire rendered component)
not yet available in SvelteKit - only Next.js has this currently.

## Common Patterns

### CRUD Operations

```typescript
export const create_item = command(schema, async (data) => { ... });
export const read_item = query(idSchema, async ({ id }) => { ... });
export const update_item = command(updateSchema, async (data) => { ... });
export const delete_item = command(idSchema, async ({ id }) => { ... });
```

### With Authorization

```typescript
export const admin_action = command(schema, async (data) => {
	const event = getRequestEvent();
	const user = await getUserFromEvent(event);

	if (!user.isAdmin) {
		throw new Error('Unauthorized');
	}

	return performAdminAction(data);
});
```

### Optimistic Updates

```typescript
// Client code
let items = $state([...]);

async function addItem(item) {
	// Optimistic update
	items = [...items, item];

	try {
		await create_item(item);
	} catch (error) {
		// Rollback on error
		items = items.filter(i => i !== item);
		throw error;
	}
}
```

## TypeScript Tips

Remote functions maintain full type safety **without importing
types**. Standard schema provides types automatically - "effortlessly
good" DX.

```typescript
// Server - define once
export const get_post = query(
	v.object({ id: v.number() }),
	async ({ id }): Promise<{ title: string; body: string }> => {
		return await db.posts.find(id);
	},
);

// Client - fully typed automatically!
// No type imports needed
const post = await get_post({ id: 42 });
post.title; // ✅ string
post.invalid; // ❌ Type error

// Input is also typed
get_post({ id: 'wrong' }); // ❌ Type error - expected number
```

## Comparison with Traditional Approaches

| Approach                | Use Case              | Pros                               | Cons                           |
| ----------------------- | --------------------- | ---------------------------------- | ------------------------------ |
| Remote Functions        | Component data needs  | Simple, type-safe, component-level | Experimental (as of late 2024) |
| Form Actions            | Progressive forms     | SEO-friendly, works without JS     | Page-based, less flexible      |
| API Routes (+server.ts) | Public APIs, webhooks | Full control, RESTful              | More boilerplate               |
| Load Functions          | Page data             | Automatic, integrated with routing | Page-lifecycle bound           |

### Why Remote Functions Over Load Functions?

Load functions feel odd in a componentized world:

- All data lives at route level
- You "hot potato" data from load → props → child components
- Refreshing/invalidation affects entire route
- Form actions must live at route level

Remote functions solve this:

- Fetch data where you need it (any component)
- No prop drilling for data
- Granular refresh (just call `query.refresh()`)
- Form handling at component level

Choose remote functions when you need:

- Type-safe RPC from components
- Component-level data fetching (not page-level)
- Simple CRUD operations
- Granular data refresh without full page invalidation
- Forms that aren't tied to routes
