#!/usr/bin/env node
/**
 * node-ops-diff — deterministic vendor-drift detector (the release tracker, done right).
 *
 * Reads a node's node-ops.json (what we support) and a vendor OpenAPI spec
 * (what the vendor offers), diffs the operation sets, and reports operations the
 * vendor exposes that the node does not yet implement. With --open-draft it
 * PRINTS the `gh pr create --draft` command it would run (it never merges, never
 * runs without a human, and makes ZERO model calls).
 *
 * This is the debate's verdict made concrete: the release tracker is pure
 * mechanical diffing, so it is a plain script — not a headless LLM agent that
 * could self-approve a gate. Draft-only is a hard default here, not a flag.
 *
 * In production this is a scheduled GitHub Action (one per node with a
 * node-ops.json + a real openapi_url). Usage:
 *   node node-ops-diff.mjs --node-ops <path/to/node-ops.json> --openapi <path|url> [--open-draft]
 */

import { readFileSync } from 'fs';

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) {
	if (argv[i].startsWith('--')) {
		const k = argv[i].slice(2);
		const v = argv[i + 1];
		if (v === undefined || v.startsWith('--')) args[k] = true;
		else { args[k] = v; i++; }
	}
}
if (!args['node-ops'] || !args.openapi) {
	console.error('usage: node-ops-diff.mjs --node-ops <file> --openapi <file|url> [--open-draft]');
	process.exit(1);
}

const nodeOps = JSON.parse(readFileSync(args['node-ops'], 'utf8'));
const supported = new Set(
	(nodeOps.supported_operations || []).map((o) => (o.name || String(o)).toLowerCase())
);

// Load the OpenAPI spec. File only in this demo (network fetch is a one-line add
// but kept off by default — cost-sensitive + deterministic/offline).
function loadOpenapi(src) {
	if (/^https?:\/\//.test(src)) {
		console.error('node-ops-diff: remote fetch disabled in demo; pass a local --openapi file');
		process.exit(2);
	}
	return JSON.parse(readFileSync(src, 'utf8'));
}
const spec = loadOpenapi(args.openapi);

// Extract the vendor's operation set: prefer operationId, else METHOD path.
const vendorOps = [];
for (const [p, methods] of Object.entries(spec.paths || {})) {
	for (const [method, op] of Object.entries(methods)) {
		if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
		const id = op.operationId || `${method.toUpperCase()} ${p}`;
		vendorOps.push({ id, summary: op.summary || '' });
	}
}

const missing = vendorOps.filter((o) => {
	const id = o.id.toLowerCase();
	// crude name match: supported op name appears in (or equals) the vendor id
	for (const s of supported) {
		if (s === 'todo' || s === 'example_operation') continue; // generator placeholders
		if (id === s || id.includes(s) || s.includes(id)) return false;
	}
	return true;
});

const vendorVer = spec.info?.version || 'unknown';
const driftVer = nodeOps.api_version && nodeOps.api_version !== 'TODO' && nodeOps.api_version !== vendorVer;

console.log(`\nnode-ops-diff: ${nodeOps.node}  (vendor: ${nodeOps.vendor})`);
console.log(`  supported operations : ${[...supported].join(', ') || '(none)'}`);
console.log(`  vendor OpenAPI v${vendorVer}, ${vendorOps.length} operations`);
if (driftVer) console.log(`  ⚠ api_version drift: node says "${nodeOps.api_version}", vendor is "${vendorVer}"`);

if (!missing.length) {
	console.log('  ✓ no missing operations — node is current.\n');
	process.exit(0);
}

console.log(`\n  ${missing.length} vendor operation(s) NOT yet supported:`);
for (const o of missing) console.log(`    - ${o.id}${o.summary ? `  (${o.summary})` : ''}`);

const title = `chore(${nodeOps.node}): vendor added ${missing.length} operation(s) (${vendorVer})`;
const body = [
	`The ${nodeOps.vendor} OpenAPI (v${vendorVer}) exposes operations not implemented by \`${nodeOps.node}\`:`,
	'',
	...missing.map((o) => `- \`${o.id}\`${o.summary ? ` — ${o.summary}` : ''}`),
	'',
	'Auto-detected by node-ops-diff. **Draft** — a human decides whether each belongs in scope (the Gate-A menu rule still applies). Never auto-merged.',
].join('\n');

console.log('\n  Draft PR this would open (draft-only, never auto-merge):');
console.log(`    title: ${title}`);
if (args['open-draft']) {
	console.log('    [--open-draft] command (NOT executed in demo):');
	console.log(`    gh pr create --draft --title ${JSON.stringify(title)} --body <generated>`);
} else {
	console.log('    (dry-run; pass --open-draft to print the gh command)');
}
console.log('');
// Exit 1 to signal drift (useful as a CI/cron gate).
process.exit(1);
