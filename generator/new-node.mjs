#!/usr/bin/env node
/**
 * nodes:new — deterministic RocketRide node scaffolder.
 *
 * Emits the *irreducible skeleton* of a new node: every file that is
 * mechanically determined by the archetype (directory layout, license headers,
 * services.json structure, correct base-class wiring, a network-free test stub,
 * a README carrying the ROCKETRIDE:GENERATED:PARAMS markers, and a node-ops.json
 * vendor-metadata file). The vendor-specific JUDGMENT (which operations to
 * expose, request/response shaping, model lists) is left as clearly-marked TODOs
 * for the node-building skill / a human to fill.
 *
 * Why deterministic: ~30-70% of a node (bimodal by archetype) is pure
 * boilerplate that an LLM re-deriving every time both wastes tokens and gets
 * subtly wrong (stale base-class paths, dropped `experimental`, copied
 * anti-patterns). Generating it guarantees the structure is correct and passes
 * `builder nodes:test-contracts` on the first run.
 *
 * In production this file lives at nodes/scripts/new-node.mjs and is registered
 * in nodes/scripts/tasks.js as `{ name: 'nodes:new', action: ... }`, mirroring
 * the existing `nodes:docs-generate` (gen-node-tables.mjs).
 *
 * Base-class wiring is verified against origin/develop (June 2026):
 *   tool      IGlobal(IGlobalBase from rocketlib), IInstance(IInstanceBase from rocketlib)
 *   llm       IGlobal(IGlobalBase from rocketlib)+ChatBase, IInstance(LLMBase from ai.common.llm_base)
 *   processor IGlobal(IGlobalBase from rocketlib),  IInstance(IInstanceBase from rocketlib) lane handlers
 *   database  IGlobal(DatabaseGlobalBase from ai.common.database), IInstance(DatabaseInstanceBase ...)
 *
 * Usage:
 *   node new-node.mjs --archetype tool --vendor deepl --title DeepL \
 *        --out /path/to/rocketride-server [--api-base https://api.deepl.com] [--dry-run]
 *   node new-node.mjs --archetype database --vendor neon --title Neon \
 *        --variant-of db_postgres --out ...        # hosted flavor -> services.<flavor>.json only
 */

import { mkdirSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) {
	const a = argv[i];
	if (a.startsWith('--')) {
		const key = a.slice(2);
		const next = argv[i + 1];
		if (next === undefined || next.startsWith('--')) {
			args[key] = true;
		} else {
			args[key] = next;
			i++;
		}
	}
}

const ARCHETYPES = ['tool', 'llm', 'processor', 'database'];
const archetype = String(args.archetype || '').toLowerCase();
const vendor = String(args.vendor || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
const title = String(args.title || (vendor ? vendor[0].toUpperCase() + vendor.slice(1) : ''));
const out = args.out || process.env.ROCKETRIDE_SERVER_DIR;
const dryRun = !!args['dry-run'];
const variantOf = args['variant-of'] ? String(args['variant-of']) : null;
const apiBase = args['api-base'] ? String(args['api-base']) : `https://api.${vendor}.com`;

function die(msg) {
	console.error(`nodes:new: ${msg}`);
	process.exit(1);
}
if (!ARCHETYPES.includes(archetype)) die(`--archetype must be one of ${ARCHETYPES.join(', ')}`);
if (!vendor) die('--vendor is required (lowercase identifier, e.g. deepl)');
if (!out) die('--out <rocketride-server checkout> is required (or set ROCKETRIDE_SERVER_DIR)');

// node_name by archetype convention (verified on develop)
const nodeName =
	archetype === 'tool' ? `tool_${vendor}` :
	archetype === 'llm' ? `llm_${vendor}` :
	archetype === 'database' ? `db_${vendor}` :
	vendor; // processor: descriptive snake_case
const prefix =
	archetype === 'llm' ? 'llm' :
	archetype === 'database' ? vendor :
	vendor;
const protocol = `${nodeName}://`;

// ---------------------------------------------------------------------------
// shared
// ---------------------------------------------------------------------------
const LICENSE = `# =============================================================================
# MIT License
# Copyright (c) 2026 Aparavi Software AG
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
# =============================================================================`;

const MARK_START = '<!-- ROCKETRIDE:GENERATED:PARAMS START -->';
const MARK_END = '<!-- ROCKETRIDE:GENERATED:PARAMS END -->';

// JSON emitter: stable key order, 4-space indent (matches repo services.json)
const json = (o) => JSON.stringify(o, null, '\t') + '\n';

const svg = (label) =>
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="4"/><text x="12" y="16" font-size="10" text-anchor="middle" fill="#fff">${label}</text></svg>\n`;

// README with the GENERATED markers (gen-node-tables.mjs owns the inner block).
const readme = (opsLine) =>
	`# ${nodeName}

A RocketRide ${archetype} node for ${title}.

## What it does

TODO: 2-3 sentences describing the capability (what an agent / pipeline can do with this node).

## Configuration

TODO: document each config field and any non-obvious auth/transport decisions.

${opsLine}

${MARK_START}
<!-- Generated by nodes:docs-generate. Do not edit by hand. -->
${MARK_END}
`;

// node-ops.json — machine-readable "what we support", read by the release-tracker differ.
const nodeOps = (operations) => json({
	vendor: title,
	node: nodeName,
	archetype,
	api_version: 'TODO',
	openapi_url: `TODO: ${apiBase}/openapi.json (or null)`,
	changelog_url: `TODO: ${title} changelog URL (or null)`,
	supported_operations: operations,
	generated_by: 'nodes:new',
});

// ---------------------------------------------------------------------------
// archetype emitters -> returns { files: {relpath: content}, ops: [...], opsLine }
// relpaths are relative to the rocketride-server checkout root.
// ---------------------------------------------------------------------------
const dir = `nodes/src/nodes/${nodeName}`;

function emitTool() {
	const CONST = vendor.toUpperCase();
	const services = {
		title, protocol, classType: ['tool'], capabilities: ['invoke', 'experimental'],
		register: 'filter', node: 'python', path: `nodes.${nodeName}`, prefix,
		icon: `${vendor}.svg`,
		description: [`Exposes ${title} to an AI agent as callable tools.`],
		tile: [], lanes: {},
		preconfig: { default: 'default', profiles: { default: { title, apikey: '' } } },
		fields: {
			[`${nodeName}.apikey`]: {
				type: 'string', title: 'API Key', description: `${title} API key`,
				default: '', secure: true, ui: { 'ui:widget': 'ApiKeyWidget' },
			},
		},
		shape: [{ section: 'Pipe', title, properties: ['type', `${nodeName}.apikey`] }],
	};
	const files = {
		[`${dir}/__init__.py`]: `${LICENSE}\n\nfrom .IGlobal import IGlobal\nfrom .IInstance import IInstance\n\n__all__ = ['IGlobal', 'IInstance']\n`,
		[`${dir}/IGlobal.py`]: `${LICENSE}\n\n"""${title} tool node - global (per-run) state: reads and holds the API key."""\n\nfrom __future__ import annotations\n\nfrom ai.common.config import Config\nfrom rocketlib import IGlobalBase, OPEN_MODE, warning\n\n\nclass IGlobal(IGlobalBase):\n    """Global state for ${nodeName}."""\n\n    apikey: str = ''\n\n    def beginGlobal(self) -> None:\n        if self.IEndpoint.endpoint.openMode == OPEN_MODE.CONFIG:\n            return\n        cfg = Config.getNodeConfig(self.glb.logicalType, self.glb.connConfig)\n        self.apikey = str(cfg.get('apikey') or '').strip()\n        if not self.apikey:\n            raise Exception('${nodeName}: apikey is required')\n\n    def validateConfig(self) -> None:\n        try:\n            cfg = Config.getNodeConfig(self.glb.logicalType, self.glb.connConfig)\n            if not str(cfg.get('apikey') or '').strip():\n                warning('apikey is required')\n        except Exception as e:  # noqa: BLE001\n            warning(str(e))\n\n    def endGlobal(self) -> None:\n        self.apikey = ''\n`,
		[`${dir}/IInstance.py`]: `${LICENSE}\n\n"""${title} tool node instance. Exposes ${title} operations as agent tools.\n\nERROR MODEL: raise on failure. Do NOT return {'success': False} dicts\n(tool_tavily ships that grandfathered style; the framework wraps raised\nexceptions into structured error payloads — copy tool_v0's raise semantics).\n"""\n\nfrom __future__ import annotations\n\nfrom typing import Any, Dict\n\nfrom rocketlib import IInstanceBase, tool_function, warning\nfrom ai.common.utils import normalize_tool_input, post_with_retry\n\nfrom .IGlobal import IGlobal\n\n${CONST}_API_BASE = '${apiBase}'\n${CONST}_TIMEOUT = 30  # seconds\n\n\nclass IInstance(IInstanceBase):\n    """Node instance exposing ${title} as agent tools."""\n\n    IGlobal: IGlobal\n\n    @tool_function(\n        input_schema={\n            'type': 'object',\n            'required': ['query'],\n            'properties': {\n                'query': {'type': 'string', 'description': 'TODO: describe this parameter.'},\n            },\n        },\n        output_schema={\n            'type': 'object',\n            'properties': {\n                'success': {'type': 'boolean'},\n                'result': {'type': 'object', 'description': 'TODO: describe the result.'},\n            },\n        },\n        description='TODO: describe what this tool does for the agent.',\n    )\n    def example_operation(self, args):\n        """TODO: rename + implement. One @tool_function per operation in node-ops.json."""\n        args = normalize_tool_input(args, tool_name='${vendor}')\n        query = (args.get('query') or '').strip()\n        if not query:\n            raise ValueError('query is required')\n\n        resp = post_with_retry(\n            f'{${CONST}_API_BASE}/TODO',\n            headers={'Authorization': f'Bearer {self.IGlobal.apikey}'},\n            json={'query': query},\n            timeout=${CONST}_TIMEOUT,\n        )\n        try:\n            body = resp.json()\n        except ValueError as exc:\n            warning(f'${title} returned a non-JSON response: status={getattr(resp, \"status_code\", None)}')\n            raise RuntimeError('${title} returned a non-JSON response body') from exc\n        if isinstance(body, dict) and body.get('error'):\n            err = body['error']\n            msg = err.get('message') if isinstance(err, dict) else str(err)\n            raise RuntimeError(f'${title} API error: {msg}')\n        return {'success': True, 'result': body}\n`,
		[`${dir}/requirements.txt`]: `# ${nodeName} talks to the ${title} REST API via the shared post_with_retry\n# helper (ai.common.utils), so requests is the only runtime dependency.\nrequests\n`,
		[`${dir}/${vendor}.svg`]: svg(title.slice(0, 2)),
		[`nodes/test/test_${nodeName}.py`]: toolTest(),
	};
	const ops = [{ name: 'example_operation', kind: 'tool_function', status: 'TODO' }];
	return { files, services, ops, opsLine: '## Available tools\n\nTODO: document each `@tool_function` (inputs, outputs, errors).' };
}

function toolTest() {
	return `"""Unit tests for ${nodeName} IInstance (no network).

Stubs rocketlib + ai.common.* so the module imports without the engine, then
asserts request building / validation / error paths against mocked transport.
"""

from __future__ import annotations

import importlib.util
import sys
import types
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

NODE_DIR = Path(__file__).resolve().parents[1] / 'src' / 'nodes' / '${nodeName}'


def _stubs():
    rl = types.ModuleType('rocketlib')
    rl.IInstanceBase = object
    rl.IGlobalBase = object
    rl.tool_function = lambda *_a, **_k: (lambda fn: fn)
    rl.warning = lambda *_a, **_k: None
    rl.OPEN_MODE = SimpleNamespace(CONFIG='config')
    ai = types.ModuleType('ai'); ai.__path__ = []
    ai_common = types.ModuleType('ai.common'); ai_common.__path__ = []
    ai_utils = types.ModuleType('ai.common.utils')
    ai_utils.normalize_tool_input = lambda a, **_k: a if isinstance(a, dict) else {}
    ai_utils.post_with_retry = lambda *_a, **_k: MagicMock()
    ai_config = types.ModuleType('ai.common.config'); ai_config.Config = MagicMock()
    return {'rocketlib': rl, 'ai': ai, 'ai.common': ai_common,
            'ai.common.utils': ai_utils, 'ai.common.config': ai_config}


def _load():
    added = []
    for name, stub in _stubs().items():
        if name not in sys.modules:
            sys.modules[name] = stub; added.append(name)
    # Private package context so 'from .IGlobal import IGlobal' resolves when the
    # module is loaded by file path (mirrors nodes/test/test_tool_v0.py). All
    # scaffolding is removed afterwards so nothing leaks into the shared session.
    pkg = '${nodeName}'
    scaffold = []
    pkg_stub = types.ModuleType(pkg)
    pkg_stub.__path__ = [str(NODE_DIR)]
    pkg_stub.__package__ = pkg
    sys.modules[pkg] = pkg_stub; scaffold.append(pkg)
    ig = types.ModuleType(pkg + '.IGlobal')
    ig.IGlobal = type('IGlobal', (), {})
    sys.modules[pkg + '.IGlobal'] = ig; scaffold.append(pkg + '.IGlobal')
    pkg_stub.IGlobal = ig
    try:
        spec = importlib.util.spec_from_file_location(
            pkg + '.IInstance', NODE_DIR / 'IInstance.py', submodule_search_locations=[])
        mod = importlib.util.module_from_spec(spec)
        mod.__package__ = pkg
        sys.modules[pkg + '.IInstance'] = mod; scaffold.append(pkg + '.IInstance')
        spec.loader.exec_module(mod)
        return mod
    finally:
        for name in added + scaffold:
            sys.modules.pop(name, None)


_mod = _load()
_mod.normalize_tool_input = lambda a, **_k: a if isinstance(a, dict) else {}
IInstance = _mod.IInstance


def test_missing_query_raises():
    inst = IInstance.__new__(IInstance)
    inst.IGlobal = SimpleNamespace(apikey='k')
    with pytest.raises(ValueError, match='query'):
        inst.example_operation({})
`;
}

function emitLlm() {
	const services = {
		title, protocol, classType: ['llm'], capabilities: ['invoke'],
		register: 'filter', node: 'python', path: `nodes.${nodeName}`, prefix: 'llm',
		icon: `${vendor}.svg`,
		description: [`Connects ${title} models to your pipeline.`],
		documentation: 'https://docs.rocketride.org',
		tile: [`Model: \${parameters.${nodeName}.profile}`],
		lanes: { questions: ['answers'] },
		preconfig: {
			default: 'default',
			profiles: {
				custom: { model: '', modelTotalTokens: 8192, apikey: '' },
				default: { title: `${title} (default)`, model: 'TODO-model-id', modelSource: vendor, modelTotalTokens: 128000, modelOutputTokens: 8192, apikey: '' },
			},
		},
		fields: {
			model: { type: 'string', title: 'Model', description: `${title} model ID` },
			modelTotalTokens: { type: 'number', title: 'Tokens', description: 'Total Tokens' },
			[`${nodeName}.profile`]: {
				title: 'Model', description: 'LLM model', type: 'string', default: 'default',
				enum: ['*>preconfig.profiles.*.title'],
			},
		},
		shape: [{ section: 'Pipe', title, properties: [`${nodeName}.profile`] }],
	};
	const files = {
		[`${dir}/__init__.py`]: `${LICENSE}\n\nfrom .IGlobal import IGlobal\nfrom .IInstance import IInstance\n\n\ndef getChat():\n    from .${vendor} import Chat\n\n    return Chat\n\n\n__all__ = ['IGlobal', 'IInstance', 'getChat']\n`,
		// IInstance is ~100% boilerplate for llm nodes (verified llm_anthropic).
		[`${dir}/IInstance.py`]: `${LICENSE}\n\nfrom ai.common.llm_base import LLMBase\n\n\nclass IInstance(LLMBase):\n    pass\n`,
		[`${dir}/IGlobal.py`]: `${LICENSE}\n\n"""${title} LLM node - per-run global state. Builds the Chat client; validates config."""\n\nimport os\n\nfrom rocketlib import IGlobalBase, warning\nfrom ai.common.config import Config\nfrom ai.common.chat import ChatBase\n\n\nclass IGlobal(IGlobalBase):\n    chat: ChatBase | None = None\n\n    def validateConfig(self):\n        from depends import depends  # type: ignore\n        depends(os.path.dirname(os.path.realpath(__file__)) + '/requirements.txt')\n        try:\n            cfg = Config.getNodeConfig(self.glb.logicalType, self.glb.connConfig)\n            if not str(cfg.get('apikey') or '').strip():\n                warning('apikey is required')\n            tokens = cfg.get('modelTotalTokens')\n            if tokens is not None and tokens <= 0:\n                warning('Token limit must be greater than 0')\n            # TODO: light-touch ${title} API probe to validate the key/model.\n        except Exception as e:  # noqa: BLE001\n            warning(str(e))\n\n    def beginGlobal(self):\n        from depends import depends  # type: ignore\n        depends(os.path.dirname(os.path.realpath(__file__)) + '/requirements.txt')\n        from .${vendor} import Chat\n        cfg = Config.getNodeConfig(self.glb.logicalType, self.glb.connConfig)\n        self.chat = Chat(self.glb.logicalType, cfg, self.IEndpoint.endpoint.bag)\n\n    def endGlobal(self):\n        self.chat = None\n`,
		[`${dir}/${vendor}.py`]: `${LICENSE}\n\n"""${title} Chat client. Wraps the vendor SDK / LangChain provider."""\n\nfrom typing import Any, Dict\n\nfrom ai.common.chat import ChatBase\nfrom ai.common.config import Config\n\n\nclass Chat(ChatBase):\n    """Create a ${title} chat bot."""\n\n    def __init__(self, provider: str, connConfig: Dict[str, Any], bag: Dict[str, Any]):\n        cfg = Config.getNodeConfig(provider, connConfig)\n        apikey = cfg.get('apikey')\n        if not apikey:\n            raise ValueError('${title}: apikey is required')\n        super().__init__(provider, connConfig, bag)\n        # TODO: instantiate the ${title} LangChain wrapper, e.g.:\n        #   from langchain_${vendor} import Chat${title}\n        #   self._llm = Chat${title}(model=cfg.get('model'), api_key=apikey, ...)\n        bag['chat'] = self\n`,
		[`${dir}/requirements.txt`]: `# Plugin ${title}\nlangchain-${vendor}\n${vendor}\n\n# LangChain deps\nlangchain-core\nlangchain\n`,
		[`${dir}/${vendor}.svg`]: svg(title.slice(0, 2)),
		[`nodes/test/test_${nodeName}.py`]: llmTest(),
	};
	const ops = [{ name: 'default', kind: 'model', model_id: 'TODO-model-id', status: 'TODO' }];
	return { files, services, ops, opsLine: '## Profiles\n\nTODO: table of model profiles (id, context tokens, output tokens).' };
}

function llmTest() {
	return `"""Unit tests for ${nodeName} (no network): config validation + Chat wiring."""

from __future__ import annotations

import importlib.util
import sys
import types
from pathlib import Path

NODE_DIR = Path(__file__).resolve().parents[1] / 'src' / 'nodes' / '${nodeName}'


def _load_chat():
    saved = {}
    for name in ('ai', 'ai.common', 'ai.common.chat', 'ai.common.config'):
        saved[name] = sys.modules.get(name)
    ai = types.ModuleType('ai'); ai.__path__ = []
    ai_common = types.ModuleType('ai.common'); ai_common.__path__ = []
    ai_chat = types.ModuleType('ai.common.chat')
    ai_chat.ChatBase = type('ChatBase', (), {'__init__': lambda self, *a, **k: None})
    ai_config = types.ModuleType('ai.common.config')

    class _Cfg:
        store = {'apikey': 'k', 'model': 'm'}

        @staticmethod
        def getNodeConfig(*_a, **_k):
            return dict(_Cfg.store)

    ai_config.Config = _Cfg
    sys.modules.update({'ai': ai, 'ai.common': ai_common,
                        'ai.common.chat': ai_chat, 'ai.common.config': ai_config})
    try:
        spec = importlib.util.spec_from_file_location('_chat', NODE_DIR / '${vendor}.py')
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod, _Cfg
    finally:
        for name, v in saved.items():
            if v is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = v


def test_missing_apikey_raises():
    import pytest
    mod, cfg = _load_chat()
    cfg.store = {'apikey': '', 'model': 'm'}
    with pytest.raises(ValueError, match='apikey'):
        mod.Chat('${nodeName}', {}, {})
`;
}

function emitProcessor() {
	const helper = `${title.replace(/[^A-Za-z0-9]/g, '')}Processor`;
	const services = {
		title, protocol, classType: ['text'], capabilities: ['experimental'],
		register: 'filter', node: 'python', path: `nodes.${nodeName}`, prefix,
		icon: `${vendor}.svg`,
		description: [`A RocketRide filter node that processes ${title} data flowing through the pipeline.`],
		tile: [], lanes: { text: ['text'] },
		preconfig: { default: 'default', profiles: { default: { title: `${title} (default)` } } },
		fields: {}, shape: [{ section: 'Pipe', title, properties: ['type'] }],
	};
	const files = {
		[`${dir}/__init__.py`]: `${LICENSE}\n\n"""${title} node. TODO: one-line description of the transform."""\n\nfrom .IGlobal import IGlobal\nfrom .IInstance import IInstance\n\n__all__ = ['IGlobal', 'IInstance']\n`,
		[`${dir}/IGlobal.py`]: `${LICENSE}\n\n"""${title} processor - per-run global state. Builds the shared helper once."""\n\nfrom rocketlib import IGlobalBase, debug, OPEN_MODE\nfrom ai.common.config import Config\n\n\nclass IGlobal(IGlobalBase):\n    processor = None\n\n    def beginGlobal(self):\n        if self.IEndpoint.endpoint.openMode == OPEN_MODE.CONFIG:\n            return\n        from .${vendor} import ${helper}\n        cfg = Config.getNodeConfig(self.glb.logicalType, self.glb.connConfig)\n        debug('    Loading ${nodeName} processor')\n        self.processor = ${helper}(cfg)\n\n    def endGlobal(self):\n        self.processor = None\n`,
		[`${dir}/IInstance.py`]: `${LICENSE}\n\n"""${title} processor instance. Lane handlers transform records as they pass through."""\n\nfrom typing import List\n\nfrom rocketlib import Entry, IInstanceBase\nfrom ai.common.schema import Doc\n\nfrom .IGlobal import IGlobal\n\n\nclass IInstance(IInstanceBase):\n    IGlobal: IGlobal\n\n    def open(self, obj: Entry):\n        pass\n\n    def writeText(self, text: str):\n        if self.IGlobal.processor is None:\n            self.instance.writeText(text)\n            return\n        # TODO: transform text via self.IGlobal.processor\n        self.instance.writeText(self.IGlobal.processor.process(text))\n\n    def closing(self):\n        pass\n\n    def close(self):\n        pass\n`,
		[`${dir}/${vendor}.py`]: `${LICENSE}\n\n"""${title} core logic. Keep IInstance thin; put real work here (unit-testable)."""\n\nfrom typing import Any, Dict\n\n\nclass ${helper}:\n    def __init__(self, config: Dict[str, Any]):\n        # TODO: read config params\n        pass\n\n    def process(self, text: str) -> str:\n        # TODO: implement the transform\n        return text\n`,
		[`${dir}/requirements.txt`]: `# ${nodeName} uses only the Python standard library. No external dependencies.\n`,
		[`${dir}/${vendor}.svg`]: svg(title.slice(0, 2)),
		[`nodes/test/test_${nodeName}.py`]: processorTest(helper),
	};
	const ops = [{ name: 'text', kind: 'lane', io: 'text->text', status: 'TODO' }];
	return { files, services, ops, opsLine: '## Lanes\n\n| Lane in | Lane out | Description |\n|---|---|---|\n| `text` | `text` | TODO |' };
}

function processorTest(helper) {
	return `"""Unit tests for ${nodeName} core logic (no engine)."""

import os
import sys
import types

rocketlib = types.ModuleType('rocketlib')
rocketlib.debug = lambda *a, **k: None
sys.modules.setdefault('rocketlib', rocketlib)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'nodes', '${nodeName}'))
from ${vendor} import ${helper}  # noqa: E402


def test_process_is_callable():
    p = ${helper}({})
    assert p.process('hello') is not None
`;
}

function emitDatabase() {
	const services = {
		title, protocol, classType: ['database', 'tool'], capabilities: ['noremote', 'invoke'],
		register: 'filter', node: 'python', path: `nodes.${nodeName}`, prefix,
		icon: `${vendor}.svg`,
		description: [`Takes structured table data and inserts it into a ${title} database; answers natural-language questions as SQL.`],
		documentation: 'https://docs.rocketride.org',
		invoke: { llm: { description: 'LLM to use to craft SQL queries from question', min: 1 } },
		lanes: { answers: [], questions: ['table', 'text', 'answers'] },
		preconfig: { default: 'default', profiles: { default: { database: vendor } } },
		fields: {
			[`${prefix}.host`]: { type: 'string', title: `${title} host`, default: 'localhost', description: `Host name or IP of the ${title} server (optionally host:port)` },
			[`${prefix}.user`]: { type: 'string', title: 'User', default: 'TODO', description: `User to connect to the ${title} server` },
			[`${prefix}.password`]: { type: 'string', title: 'Password', description: `Password to connect to the ${title} server`, secure: true, ui: { 'ui:widget': 'password' } },
			[`${prefix}.database`]: { type: 'string', title: 'Database name', default: 'TODO', description: 'Name of database' },
			[`${prefix}.table`]: { type: 'string', title: 'Table name', default: 'table', description: 'Name of table' },
			[`${prefix}.profile`]: { hidden: true, type: 'string', default: 'default', enum: [['default', 'Default']] },
		},
		shape: [{ section: 'Pipe', title, properties: [`${prefix}.profile`] }],
	};
	const files = {
		[`${dir}/__init__.py`]: `${LICENSE}\n\nimport os\nfrom depends import depends  # type: ignore\n\n# Install the DB driver before importing any driver code.\ndepends(os.path.dirname(os.path.realpath(__file__)) + '/requirements.txt')\n\nfrom .IGlobal import IGlobal  # noqa: E402\nfrom .IInstance import IInstance  # noqa: E402\n\n__all__ = ['IGlobal', 'IInstance']\n`,
		[`${dir}/IGlobal.py`]: `${LICENSE}\n\n"""${title} global state. Implements the two dialect-specific hooks; the base\n(ai.common.database.DatabaseGlobalBase) handles schema reflection + lifecycle."""\n\nimport urllib.parse\nfrom typing import Any, Dict\n\nfrom ai.common.database import DatabaseGlobalBase\n\n\nclass IGlobal(DatabaseGlobalBase):\n    def _connection_params(self, config: Dict[str, Any]) -> Dict[str, str]:\n        return {\n            'host': config.get('host', 'localhost').strip(),\n            'user': config.get('user', 'TODO').strip(),\n            'password': config.get('password', ''),  # do not strip\n            'database': config.get('database', 'TODO').strip(),\n            'table': config.get('table', 'table').strip(),\n        }\n\n    def _build_connection_url(self, params: Dict[str, str]) -> str:\n        user = urllib.parse.quote_plus(params['user'])\n        password = urllib.parse.quote_plus(params['password'])\n        database = urllib.parse.quote_plus(params['database'])\n        # TODO: set the correct SQLAlchemy dialect+driver for ${title}.\n        return f'TODO_DIALECT+TODO_DRIVER://{user}:{password}@{params[\"host\"]}/{database}'\n`,
		[`${dir}/IInstance.py`]: `${LICENSE}\n\n"""${title} instance. Tool methods + lane handlers are inherited from the base."""\n\nfrom ai.common.database import DatabaseInstanceBase\n\nfrom .IGlobal import IGlobal\n\n\nclass IInstance(DatabaseInstanceBase):\n    IGlobal: IGlobal\n\n    def _db_display_name(self) -> str:\n        return '${title}'\n\n    def _db_dialect(self) -> str:\n        return 'TODO'  # e.g. 'postgres', 'mysql'\n`,
		[`${dir}/requirements.txt`]: `# TODO: pin the ${title} SQLAlchemy driver, e.g. psycopg2-binary==2.9.12\nTODO-driver\n`,
		[`${dir}/${vendor}.svg`]: svg(title.slice(0, 2)),
		[`nodes/test/test_${nodeName}.py`]: dbTest(),
	};
	const ops = [
		{ name: `${prefix}.get_data`, kind: 'tool_function', status: 'inherited' },
		{ name: `${prefix}.get_schema`, kind: 'tool_function', status: 'inherited' },
		{ name: `${prefix}.get_sql`, kind: 'tool_function', status: 'inherited' },
	];
	return { files, services, ops, opsLine: '## As a tool\n\nInherits `get_data`, `get_schema`, `get_sql` from the database base.' };
}

function dbTest() {
	return `"""Unit tests for ${nodeName}'s only dialect-specific logic (no engine).

Stubs ai.common.database so IGlobal imports without SQLAlchemy/rocketlib.
"""

from __future__ import annotations

import importlib.util
import sys
import types
from pathlib import Path

import pytest

NODE_DIR = Path(__file__).resolve().parents[1] / 'src' / 'nodes' / '${nodeName}'


@pytest.fixture(scope='module')
def IGlobal():
    saved = {k: sys.modules.get(k) for k in ('ai', 'ai.common', 'ai.common.database')}
    ai = types.ModuleType('ai'); ai.__path__ = []
    ai_common = types.ModuleType('ai.common'); ai_common.__path__ = []
    ai_db = types.ModuleType('ai.common.database')
    ai_db.DatabaseGlobalBase = type('DatabaseGlobalBase', (), {})
    sys.modules.update({'ai': ai, 'ai.common': ai_common, 'ai.common.database': ai_db})
    try:
        spec = importlib.util.spec_from_file_location('_ig', NODE_DIR / 'IGlobal.py')
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        yield mod.IGlobal
    finally:
        for k, v in saved.items():
            if v is None:
                sys.modules.pop(k, None)
            else:
                sys.modules[k] = v


def test_connection_params_strip_but_keep_password(IGlobal):
    g = IGlobal.__new__(IGlobal)
    p = g._connection_params({'host': ' h ', 'user': ' u ', 'password': '  pw  ', 'database': ' db '})
    assert (p['host'], p['user'], p['database']) == ('h', 'u', 'db')
    assert p['password'] == '  pw  '
`;
}

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------
const emitters = { tool: emitTool, llm: emitLlm, processor: emitProcessor, database: emitDatabase };
const result = emitters[archetype]();

// Hosted-flavor variant: emit ONLY services.<flavor>.json against the existing node's code path.
if (variantOf) {
	const flavorServices = { ...result.services, path: `nodes.${variantOf}` };
	const rel = `nodes/src/nodes/${variantOf}/services.${vendor}.json`;
	console.log(`nodes:new: variant mode — emitting ${rel} (reuses ${variantOf} code, no new node)`);
	writeOut({ [rel]: json(flavorServices), [`nodes/src/nodes/${variantOf}/${vendor}.svg`]: svg(title.slice(0, 2)) });
	process.exit(0);
}

result.files[`${dir}/services.json`] = json(result.services);
result.files[`${dir}/README.md`] = readme(result.opsLine);
result.files[`${dir}/node-ops.json`] = nodeOps(result.ops);

writeOut(result.files);
console.log(`\nnodes:new: scaffolded ${archetype} node '${nodeName}' (${Object.keys(result.files).length} files).`);
console.log('Next: open the TODOs (operations, request/response shaping, model list) — the judgment layer.');
console.log(`Verify structure: builder nodes:test-contracts  (or: pytest nodes/test/test_contracts.py -k ${nodeName})`);

function writeOut(files) {
	for (const [rel, content] of Object.entries(files)) {
		const abs = path.join(out, rel);
		if (dryRun) {
			console.log(`  [dry-run] ${rel} (${content.length} bytes)`);
			continue;
		}
		mkdirSync(path.dirname(abs), { recursive: true });
		if (existsSync(abs) && !args.force) die(`refusing to overwrite ${rel} (use --force)`);
		writeFileSync(abs, content);
		console.log(`  wrote ${rel}`);
	}
}
