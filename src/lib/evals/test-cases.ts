/**
 * Test cases for Claude Code skill evaluations
 */

export type SkillName =
	| 'svelte5-runes'
	| 'sveltekit-data-flow'
	| 'sveltekit-structure'
	| 'sveltekit-remote-functions';

export interface ActivationTestCase {
	id: string;
	query: string;
	expected_skill: SkillName;
	should_activate: boolean;
	description: string;
}

export interface QualityTestCase {
	id: string;
	skill: SkillName;
	query: string;
	expected_facts: string[];
	must_not_contain?: string[];
	description: string;
}

export interface AntiPatternTestCase {
	id: string;
	skill: SkillName;
	bad_code: string;
	expected_issue: string;
	expected_fix?: string;
	description: string;
}

/**
 * Activation Tests - Verify correct skill triggers for queries
 */
export const activation_tests: ActivationTestCase[] = [
	// svelte5-runes activations
	{
		id: 'act-001',
		query: 'How do I use $state in Svelte 5?',
		expected_skill: 'svelte5-runes',
		should_activate: true,
		description: '$state query should activate svelte5-runes',
	},
	{
		id: 'act-002',
		query: 'How do I create reactive state with $derived?',
		expected_skill: 'svelte5-runes',
		should_activate: true,
		description: '$derived query should activate svelte5-runes',
	},
	{
		id: 'act-003',
		query: 'How do I use $effect for side effects?',
		expected_skill: 'svelte5-runes',
		should_activate: true,
		description: '$effect query should activate svelte5-runes',
	},
	{
		id: 'act-004',
		query: 'How do I create bindable props in Svelte 5?',
		expected_skill: 'svelte5-runes',
		should_activate: true,
		description: 'Bindable props should activate svelte5-runes',
	},
	{
		id: 'act-005',
		query: 'How do I migrate from Svelte 4 to Svelte 5?',
		expected_skill: 'svelte5-runes',
		should_activate: true,
		description: 'Migration questions should activate svelte5-runes',
	},

	// sveltekit-data-flow activations
	{
		id: 'act-006',
		query: 'How do I create a load function in SvelteKit?',
		expected_skill: 'sveltekit-data-flow',
		should_activate: true,
		description:
			'Load function query should activate sveltekit-data-flow',
	},
	{
		id: 'act-007',
		query: 'How do form actions work in SvelteKit?',
		expected_skill: 'sveltekit-data-flow',
		should_activate: true,
		description: 'Form actions should activate sveltekit-data-flow',
	},
	{
		id: 'act-008',
		query: 'What can I return from a server load function?',
		expected_skill: 'sveltekit-data-flow',
		should_activate: true,
		description:
			'Serialization query should activate sveltekit-data-flow',
	},
	{
		id: 'act-009',
		query: 'How do I use fail() in a form action?',
		expected_skill: 'sveltekit-data-flow',
		should_activate: true,
		description: 'fail() query should activate sveltekit-data-flow',
	},
	{
		id: 'act-010',
		query: 'When should I use +page.server.ts vs +page.ts?',
		expected_skill: 'sveltekit-data-flow',
		should_activate: true,
		description:
			'Server vs universal load should activate sveltekit-data-flow',
	},

	// sveltekit-structure activations
	{
		id: 'act-011',
		query: 'How does file-based routing work in SvelteKit?',
		expected_skill: 'sveltekit-structure',
		should_activate: true,
		description: 'Routing query should activate sveltekit-structure',
	},
	{
		id: 'act-012',
		query: 'How do I create nested layouts in SvelteKit?',
		expected_skill: 'sveltekit-structure',
		should_activate: true,
		description: 'Layout query should activate sveltekit-structure',
	},
	{
		id: 'act-013',
		query: 'Where do I put error boundaries in SvelteKit?',
		expected_skill: 'sveltekit-structure',
		should_activate: true,
		description:
			'Error boundaries should activate sveltekit-structure',
	},
	{
		id: 'act-014',
		query: 'How do I handle SSR in SvelteKit?',
		expected_skill: 'sveltekit-structure',
		should_activate: true,
		description: 'SSR query should activate sveltekit-structure',
	},
	{
		id: 'act-015',
		query:
			'What is the difference between +page.svelte and +layout.svelte?',
		expected_skill: 'sveltekit-structure',
		should_activate: true,
		description: 'File naming should activate sveltekit-structure',
	},

	// sveltekit-remote-functions activations
	{
		id: 'act-016',
		query: 'How do I use command() in SvelteKit?',
		expected_skill: 'sveltekit-remote-functions',
		should_activate: true,
		description:
			'command() query should activate sveltekit-remote-functions',
	},
	{
		id: 'act-017',
		query: 'How do I create a remote function with query()?',
		expected_skill: 'sveltekit-remote-functions',
		should_activate: true,
		description: 'query() should activate sveltekit-remote-functions',
	},
	{
		id: 'act-018',
		query: 'What are .remote.ts files in SvelteKit?',
		expected_skill: 'sveltekit-remote-functions',
		should_activate: true,
		description:
			'.remote.ts should activate sveltekit-remote-functions',
	},
	{
		id: 'act-019',
		query: 'How do I call server functions from a Svelte component?',
		expected_skill: 'sveltekit-remote-functions',
		should_activate: true,
		description:
			'Server functions should activate sveltekit-remote-functions',
	},
	{
		id: 'act-020',
		query: 'How do I validate input in remote functions?',
		expected_skill: 'sveltekit-remote-functions',
		should_activate: true,
		description:
			'Remote function validation should activate sveltekit-remote-functions',
	},

	// Cross-skill queries - ensure correct skill activates
	{
		id: 'act-021',
		query: 'How do I use $state in a form action?',
		expected_skill: 'svelte5-runes',
		should_activate: true,
		description:
			'$state is primary topic, should activate svelte5-runes',
	},
	{
		id: 'act-022',
		query: 'How do I load data for my Svelte 5 component?',
		expected_skill: 'sveltekit-data-flow',
		should_activate: true,
		description:
			'Loading data is primary topic, should activate sveltekit-data-flow',
	},
];

/**
 * Quality Tests - Verify responses contain correct facts
 */
export const qualityTests: QualityTestCase[] = [
	// svelte5-runes quality tests
	{
		id: 'qual-001',
		skill: 'svelte5-runes',
		query: 'Can I reassign a $derived variable?',
		expected_facts: [
			'Svelte 5.25+',
			'can be reassigned',
			'const for read-only',
		],
		description: 'Should mention $derived mutability change in 5.25+',
	},
	{
		id: 'qual-002',
		skill: 'svelte5-runes',
		query: 'Are objects deeply reactive with $state?',
		expected_facts: ['deeply reactive', 'objects', 'arrays'],
		must_not_contain: ['need to reassign'],
		description:
			'Should confirm deep reactivity, not suggest reassignment',
	},
	{
		id: 'qual-003',
		skill: 'svelte5-runes',
		query: 'Can I use runes inside functions?',
		expected_facts: ['top-level', 'cannot', 'class fields'],
		description:
			'Should explain runes are top-level only (except class fields)',
	},
	{
		id: 'qual-004',
		skill: 'svelte5-runes',
		query: 'How do I handle click events in Svelte 5?',
		expected_facts: ['onclick'],
		must_not_contain: ['on:click'],
		description: 'Should use onclick not on:click in Svelte 5',
	},
	{
		id: 'qual-005',
		skill: 'svelte5-runes',
		query: 'How do I render children in Svelte 5?',
		expected_facts: ['{@render', 'children()'],
		must_not_contain: ['{children}'],
		description: 'Should use {@render children()} not {children}',
	},

	// sveltekit-data-flow quality tests
	{
		id: 'qual-006',
		skill: 'sveltekit-data-flow',
		query: 'How do I redirect in a form action?',
		expected_facts: ['throw', 'redirect'],
		must_not_contain: ['return redirect'],
		description: 'Must throw redirect(), not return it',
	},
	{
		id: 'qual-007',
		skill: 'sveltekit-data-flow',
		query: 'Can form actions be in +page.ts?',
		expected_facts: ['+page.server.ts', 'only', 'server'],
		must_not_contain: ['+page.ts'],
		description: 'Form actions only in +page.server.ts',
	},
	{
		id: 'qual-008',
		skill: 'sveltekit-data-flow',
		query: 'Can I return a Date object from a load function?',
		expected_facts: ['cannot', 'serialize', 'Date'],
		description:
			'Dates do not serialize, must convert to string/number',
	},
	{
		id: 'qual-009',
		skill: 'sveltekit-data-flow',
		query: 'When should I use fail() vs error()?',
		expected_facts: ['fail', 'form', 'error', 'unexpected'],
		description:
			'Should explain fail() for validation, error() for unexpected issues',
	},

	// sveltekit-structure quality tests
	{
		id: 'qual-010',
		skill: 'sveltekit-structure',
		query:
			'Where should I put the error boundary for /dashboard/settings?',
		expected_facts: ['above', '+error.svelte'],
		description: 'Error boundary must be above failing route',
	},
	{
		id: 'qual-011',
		skill: 'sveltekit-structure',
		query: 'How do I check if code is running on the server?',
		expected_facts: ['browser', '$app/environment'],
		description: 'Should use browser from $app/environment',
	},
	{
		id: 'qual-012',
		skill: 'sveltekit-structure',
		query: 'Do layout groups affect the URL?',
		expected_facts: ['do not', '(groups)', 'URL'],
		description: 'Layout groups (parentheses) do not affect URL',
	},

	// sveltekit-remote-functions quality tests
	{
		id: 'qual-013',
		skill: 'sveltekit-remote-functions',
		query: 'Can I return a class instance from command()?',
		expected_facts: ['cannot', 'serialize', 'JSON'],
		description: 'Remote functions must return serializable data',
	},
	{
		id: 'qual-014',
		skill: 'sveltekit-remote-functions',
		query: 'What file extension should I use for remote functions?',
		expected_facts: ['.remote.ts'],
		description: 'Should mention .remote.ts naming convention',
	},
	{
		id: 'qual-015',
		skill: 'sveltekit-remote-functions',
		query: 'How do I validate inputs in command()?',
		expected_facts: ['schema', 'valibot', 'StandardSchemaV1'],
		description:
			'Should explain schema validation with StandardSchemaV1',
	},
	{
		id: 'qual-016',
		skill: 'sveltekit-remote-functions',
		query: 'Can I access cookies in a remote function?',
		expected_facts: ['getRequestEvent', 'cookies'],
		description:
			'Should mention getRequestEvent() for cookies access',
	},
	{
		id: 'qual-017',
		skill: 'sveltekit-remote-functions',
		query: 'What is the difference between command() and query()?',
		expected_facts: [
			'command',
			'writes',
			'query',
			'reads',
			'batching',
		],
		description:
			'Should explain command for writes, query for reads with batching',
	},
];

/**
 * Anti-Pattern Tests - Verify detection of common mistakes
 */
export const antiPatternTests: AntiPatternTestCase[] = [
	{
		id: 'anti-001',
		skill: 'svelte5-runes',
		bad_code: `let doubled = 0;
$effect(() => {
  doubled = count * 2;
});`,
		expected_issue: 'Using $effect for derived state',
		expected_fix: 'const doubled = $derived(count * 2)',
		description: 'Should detect $effect used instead of $derived',
	},
	{
		id: 'anti-002',
		skill: 'svelte5-runes',
		bad_code: `<button on:click={handleClick}>Click</button>`,
		expected_issue: 'Svelte 4 syntax',
		expected_fix: 'onclick={handleClick}',
		description: 'Should detect Svelte 4 event handler syntax',
	},
	{
		id: 'anti-003',
		skill: 'svelte5-runes',
		bad_code: `let items = [1, 2, 3];
$effect(() => {
  items = [...items, items.length + 1];
});`,
		expected_issue: 'infinite loop',
		description: 'Should detect effect updating its own dependencies',
	},
	{
		id: 'anti-004',
		skill: 'sveltekit-data-flow',
		bad_code: `export const actions = {
  default: async () => {
    return redirect(303, '/success');
  }
};`,
		expected_issue: 'returning redirect',
		expected_fix: "throw redirect(303, '/success')",
		description:
			'Should detect returning instead of throwing redirect',
	},
	{
		id: 'anti-005',
		skill: 'sveltekit-data-flow',
		bad_code: `export async function load() {
  const user = await db.getUser();
  return { user }; // user is a class instance
}`,
		expected_issue: 'non-serializable',
		description: 'Should detect returning class instances',
	},
	{
		id: 'anti-006',
		skill: 'sveltekit-structure',
		bad_code: `// In +layout.svelte
{#if children}
  {children}
{/if}`,
		expected_issue: 'Svelte 4 syntax',
		expected_fix: '{@render children()}',
		description: 'Should detect Svelte 4 children syntax in layout',
	},
	{
		id: 'anti-007',
		skill: 'sveltekit-structure',
		bad_code: `// In +page.svelte
<script>
  localStorage.setItem('key', 'value');
</script>`,
		expected_issue: 'SSR',
		expected_fix: 'browser check',
		description: 'Should detect browser API usage without SSR check',
	},
];

/**
 * Helper to get all test cases by type
 */
export const testSuites = {
	activation: activation_tests,
	quality: qualityTests,
	antiPattern: antiPatternTests,
};

/**
 * Get test statistics
 */
export function getTestStats() {
	return {
		activation: activation_tests.length,
		quality: qualityTests.length,
		antiPattern: antiPatternTests.length,
		total:
			activation_tests.length +
			qualityTests.length +
			antiPatternTests.length,
	};
}
