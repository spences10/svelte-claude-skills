import { command } from '$app/server';
import { ANTHROPIC_API_KEY } from '$app/env/private';
import * as v from 'valibot';

if (ANTHROPIC_API_KEY) {
	process.env.ANTHROPIC_API_KEY = ANTHROPIC_API_KEY;
}

interface Model {
	id: string;
	display_name: string;
	created_at: string;
	type: string;
}

interface ModelsResponse {
	data: Model[];
	has_more: boolean;
	first_id: string | null;
	last_id: string | null;
}

/**
 * Fetch available models from Anthropic API
 */
export const fetch_available_models = command(
	v.optional(v.any()),
	async (_?: unknown): Promise<Model[]> => {
		console.log('[MODELS] Fetching from Anthropic API...');
		try {
			const response = await fetch(
				'https://api.anthropic.com/v1/models',
				{
					headers: {
						'x-api-key': ANTHROPIC_API_KEY,
						'anthropic-version': '2023-06-01',
					},
				},
			);

			console.log('[MODELS] Response status:', response.status);

			if (!response.ok) {
				const errorText = await response.text();
				console.error('[MODELS] Error response:', errorText);
				throw new Error(
					`Failed to fetch models: ${response.statusText} - ${errorText}`,
				);
			}

			const data: ModelsResponse = await response.json();
			console.log('[MODELS] Fetched models:', data.data.length);
			return data.data;
		} catch (error) {
			console.error('[MODELS] Error fetching models:', error);
			throw error;
		}
	},
);
