-- Eval Results Database Schema
-- SQLite database for storing Claude Code skill evaluation results
-- Enables historical tracking, trend analysis, and LLM-assisted improvement

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Test Runs: Metadata for each evaluation run
CREATE TABLE IF NOT EXISTS test_runs (
	id TEXT PRIMARY KEY,
	run_timestamp INTEGER NOT NULL,
	model TEXT NOT NULL,
	git_commit_hash TEXT,
	total_tests INTEGER NOT NULL,
	passed_tests INTEGER NOT NULL,
	failed_tests INTEGER NOT NULL,
	test_type TEXT NOT NULL CHECK(test_type IN ('activation', 'quality', 'anti-pattern')),
	total_input_tokens INTEGER DEFAULT 0,
	total_output_tokens INTEGER DEFAULT 0,
	total_cache_read_tokens INTEGER DEFAULT 0,
	total_latency_ms INTEGER DEFAULT 0,
	total_cost_usd REAL DEFAULT 0.0,
	avg_latency_ms REAL,
	created_at INTEGER NOT NULL
);

-- Activation Test Results: Track skill activation accuracy
CREATE TABLE IF NOT EXISTS activation_results (
	id TEXT PRIMARY KEY,
	run_id TEXT NOT NULL,
	test_id TEXT NOT NULL,
	query TEXT NOT NULL,
	expected_skill TEXT NOT NULL,
	activated_skill TEXT,
	should_activate INTEGER NOT NULL,
	passed INTEGER NOT NULL,
	error TEXT,
	test_case_source TEXT DEFAULT 'synthetic' CHECK(test_case_source IN ('synthetic', 'real_session', 'regression', 'user_reported')),
	session_context TEXT,
	input_tokens INTEGER,
	output_tokens INTEGER,
	cache_creation_tokens INTEGER,
	cache_read_tokens INTEGER,
	thinking_tokens INTEGER,
	latency_ms INTEGER,
	estimated_cost_usd REAL,
	created_at INTEGER NOT NULL,
	FOREIGN KEY (run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

-- Quality Test Results: Track response quality and fact accuracy
CREATE TABLE IF NOT EXISTS quality_results (
	id TEXT PRIMARY KEY,
	run_id TEXT NOT NULL,
	test_id TEXT NOT NULL,
	skill TEXT NOT NULL,
	query TEXT NOT NULL,
	response_preview TEXT NOT NULL,
	response_full_text TEXT,
	passed INTEGER NOT NULL,
	error TEXT,
	test_case_source TEXT DEFAULT 'synthetic' CHECK(test_case_source IN ('synthetic', 'real_session', 'regression', 'user_reported')),
	session_context TEXT,
	input_tokens INTEGER,
	output_tokens INTEGER,
	cache_creation_tokens INTEGER,
	cache_read_tokens INTEGER,
	thinking_tokens INTEGER,
	latency_ms INTEGER,
	estimated_cost_usd REAL,
	created_at INTEGER NOT NULL,
	FOREIGN KEY (run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

-- Missing Facts: Expected facts that were not found in responses
CREATE TABLE IF NOT EXISTS missing_facts (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	quality_result_id TEXT NOT NULL,
	fact TEXT NOT NULL,
	FOREIGN KEY (quality_result_id) REFERENCES quality_results(id) ON DELETE CASCADE
);

-- Forbidden Content: Prohibited content that was found in responses
CREATE TABLE IF NOT EXISTS forbidden_content (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	quality_result_id TEXT NOT NULL,
	content TEXT NOT NULL,
	FOREIGN KEY (quality_result_id) REFERENCES quality_results(id) ON DELETE CASCADE
);

-- Test Logs: Detailed execution logs for debugging
CREATE TABLE IF NOT EXISTS test_logs (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	test_result_id TEXT NOT NULL,
	test_type TEXT NOT NULL CHECK(test_type IN ('activation', 'quality')),
	log_message TEXT NOT NULL,
	log_timestamp INTEGER NOT NULL
);

-- Skill Versions: Track skill file versions for regression detection
CREATE TABLE IF NOT EXISTS skill_versions (
	id TEXT PRIMARY KEY,
	skill_name TEXT NOT NULL,
	content_hash TEXT NOT NULL,
	files_json TEXT NOT NULL,
	created_at INTEGER NOT NULL
);

-- Test Run Skill Versions: Junction table linking test runs to skill versions
CREATE TABLE IF NOT EXISTS test_run_skill_versions (
	test_run_id TEXT NOT NULL,
	skill_version_id TEXT NOT NULL,
	PRIMARY KEY (test_run_id, skill_version_id),
	FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE,
	FOREIGN KEY (skill_version_id) REFERENCES skill_versions(id) ON DELETE CASCADE
);

-- Indexes for performance optimization

-- Test runs indexes
CREATE INDEX IF NOT EXISTS idx_test_runs_timestamp ON test_runs(run_timestamp);
CREATE INDEX IF NOT EXISTS idx_test_runs_model ON test_runs(model);
CREATE INDEX IF NOT EXISTS idx_test_runs_type ON test_runs(test_type);

-- Activation results indexes
CREATE INDEX IF NOT EXISTS idx_activation_results_run_id ON activation_results(run_id);
CREATE INDEX IF NOT EXISTS idx_activation_results_test_id ON activation_results(test_id);
CREATE INDEX IF NOT EXISTS idx_activation_results_passed ON activation_results(passed);
CREATE INDEX IF NOT EXISTS idx_activation_results_expected_skill ON activation_results(expected_skill);
CREATE INDEX IF NOT EXISTS idx_activation_results_activated_skill ON activation_results(activated_skill);

-- Quality results indexes
CREATE INDEX IF NOT EXISTS idx_quality_results_run_id ON quality_results(run_id);
CREATE INDEX IF NOT EXISTS idx_quality_results_test_id ON quality_results(test_id);
CREATE INDEX IF NOT EXISTS idx_quality_results_skill ON quality_results(skill);
CREATE INDEX IF NOT EXISTS idx_quality_results_passed ON quality_results(passed);

-- Missing facts indexes
CREATE INDEX IF NOT EXISTS idx_missing_facts_result_id ON missing_facts(quality_result_id);
CREATE INDEX IF NOT EXISTS idx_missing_facts_fact ON missing_facts(fact);

-- Forbidden content indexes
CREATE INDEX IF NOT EXISTS idx_forbidden_content_result_id ON forbidden_content(quality_result_id);

-- Test logs indexes
CREATE INDEX IF NOT EXISTS idx_test_logs_result_id ON test_logs(test_result_id);
CREATE INDEX IF NOT EXISTS idx_test_logs_type ON test_logs(test_type);
CREATE INDEX IF NOT EXISTS idx_test_logs_timestamp ON test_logs(log_timestamp);

-- Skill versions indexes
CREATE INDEX IF NOT EXISTS idx_skill_versions_name ON skill_versions(skill_name);
CREATE INDEX IF NOT EXISTS idx_skill_versions_hash ON skill_versions(content_hash);
CREATE INDEX IF NOT EXISTS idx_skill_versions_created_at ON skill_versions(created_at);

-- Test case source indexes
CREATE INDEX IF NOT EXISTS idx_activation_results_source ON activation_results(test_case_source);
CREATE INDEX IF NOT EXISTS idx_quality_results_source ON quality_results(test_case_source);

-- Views for analysis

-- Per-test activation history: Track how each test performs over time
CREATE VIEW IF NOT EXISTS v_activation_test_history AS
SELECT
	ar.test_id,
	ar.query,
	ar.expected_skill,
	ar.passed,
	ar.activated_skill,
	ar.test_case_source,
	tr.run_timestamp,
	tr.model,
	sv.content_hash as skill_version,
	sv.skill_name
FROM activation_results ar
JOIN test_runs tr ON ar.run_id = tr.id
JOIN test_run_skill_versions trsv ON tr.id = trsv.test_run_id
JOIN skill_versions sv ON trsv.skill_version_id = sv.id
WHERE sv.skill_name = ar.expected_skill
ORDER BY ar.test_id, tr.run_timestamp DESC;

-- Per-test quality history: Track quality metrics over time
CREATE VIEW IF NOT EXISTS v_quality_test_history AS
SELECT
	qr.test_id,
	qr.query,
	qr.skill,
	qr.passed,
	qr.test_case_source,
	COUNT(mf.id) as missing_facts_count,
	COUNT(fc.id) as forbidden_content_count,
	tr.run_timestamp,
	tr.model,
	sv.content_hash as skill_version
FROM quality_results qr
JOIN test_runs tr ON qr.run_id = tr.id
JOIN test_run_skill_versions trsv ON tr.id = trsv.test_run_id
JOIN skill_versions sv ON trsv.skill_version_id = sv.id
LEFT JOIN missing_facts mf ON qr.id = mf.quality_result_id
LEFT JOIN forbidden_content fc ON qr.id = fc.quality_result_id
WHERE sv.skill_name = qr.skill
GROUP BY qr.id
ORDER BY qr.test_id, tr.run_timestamp DESC;

-- Most commonly missing facts: Identify weak spots in skills
CREATE VIEW IF NOT EXISTS v_missing_facts_frequency AS
SELECT
	qr.skill,
	mf.fact,
	COUNT(*) as occurrence_count,
	COUNT(DISTINCT qr.test_id) as affected_tests,
	MAX(tr.run_timestamp) as last_seen
FROM missing_facts mf
JOIN quality_results qr ON mf.quality_result_id = qr.id
JOIN test_runs tr ON qr.run_id = tr.id
GROUP BY qr.skill, mf.fact
ORDER BY occurrence_count DESC;

-- Skill activation accuracy over time
CREATE VIEW IF NOT EXISTS v_skill_activation_trends AS
SELECT
	ar.expected_skill,
	tr.run_timestamp,
	sv.content_hash as skill_version,
	COUNT(*) as total_tests,
	SUM(ar.passed) as passed_tests,
	CAST(SUM(ar.passed) AS REAL) / COUNT(*) as pass_rate,
	AVG(ar.latency_ms) as avg_latency_ms,
	AVG(ar.estimated_cost_usd) as avg_cost_usd
FROM activation_results ar
JOIN test_runs tr ON ar.run_id = tr.id
JOIN test_run_skill_versions trsv ON tr.id = trsv.test_run_id
JOIN skill_versions sv ON trsv.skill_version_id = sv.id
WHERE sv.skill_name = ar.expected_skill
GROUP BY ar.expected_skill, tr.run_timestamp, sv.content_hash
ORDER BY ar.expected_skill, tr.run_timestamp DESC;

-- Quality test trends by skill
CREATE VIEW IF NOT EXISTS v_quality_test_trends AS
SELECT
	qr.skill,
	tr.run_timestamp,
	sv.content_hash as skill_version,
	COUNT(*) as total_tests,
	SUM(qr.passed) as passed_tests,
	CAST(SUM(qr.passed) AS REAL) / COUNT(*) as pass_rate,
	AVG(qr.latency_ms) as avg_latency_ms,
	AVG(qr.estimated_cost_usd) as avg_cost_usd
FROM quality_results qr
JOIN test_runs tr ON qr.run_id = tr.id
JOIN test_run_skill_versions trsv ON tr.id = trsv.test_run_id
JOIN skill_versions sv ON trsv.skill_version_id = sv.id
WHERE sv.skill_name = qr.skill
GROUP BY qr.skill, tr.run_timestamp, sv.content_hash
ORDER BY qr.skill, tr.run_timestamp DESC;

-- Real-world vs synthetic test comparison
CREATE VIEW IF NOT EXISTS v_test_source_comparison AS
SELECT
	test_case_source,
	COUNT(*) as total_tests,
	SUM(passed) as passed_tests,
	CAST(SUM(passed) AS REAL) / COUNT(*) as pass_rate
FROM (
	SELECT test_case_source, passed FROM activation_results
	UNION ALL
	SELECT test_case_source, passed FROM quality_results
) combined
GROUP BY test_case_source
ORDER BY pass_rate DESC;
