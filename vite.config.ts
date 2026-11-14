import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';
import { defineConfig } from 'vite-plus';
import { playwright } from 'vite-plus/test/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			adapter: adapter(),
			preprocess: [vitePreprocess(), mdsvex()],
			experimental: { remoteFunctions: true },
			compilerOptions: { experimental: { async: true } },
			extensions: ['.svelte', '.svx'],
		}),
	],
	fmt: {
		useTabs: true,
		singleQuote: true,
		trailingComma: 'all',
		printWidth: 70,
		proseWrap: 'always',
		svelte: true,
		sortTailwindcss: { stylesheet: './src/app.css' },
		ignorePatterns: [
			'pnpm-lock.yaml',
			'package-lock.json',
			'yarn.lock',
			'bun.lock',
			'bun.lockb',
			'static/**',
		],
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }],
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
				},
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
				},
			},
		],
	},
});
