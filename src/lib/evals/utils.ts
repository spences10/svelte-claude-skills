import type {
	ActivationTestResult,
	QualityTestResult,
} from '#lib/evals.remote.ts';

/**
 * Get summary statistics for test results
 */
export function get_test_summary(
	results: (ActivationTestResult | QualityTestResult)[],
): {
	total: number;
	passed: number;
	failed: number;
	pass_rate: number;
} {
	const total = results.length;
	const passed = results.filter((r) => r.passed).length;
	const failed = total - passed;
	const pass_rate = total > 0 ? (passed / total) * 100 : 0;

	return {
		total,
		passed,
		failed,
		pass_rate,
	};
}
