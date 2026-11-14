import { defineEnvVars } from '@sveltejs/kit/env';
import * as v from 'valibot';

export const variables = defineEnvVars({
	ANTHROPIC_API_KEY: { static: true },
	DATABASE_EVAL_PATH: { schema: v.optional(v.string(), '') },
});
