# The stub-import test pattern

Canonical example: `nodes/test/test_tool_v0.py` on `origin/develop` (22 tests, zero network).
Read it before writing yours; the recipe:

## 1. Build stub modules

Stub everything the node imports that belongs to the engine runtime or network:

```python
import types
from types import SimpleNamespace

rocketlib = types.ModuleType('rocketlib')
rocketlib.IInstanceBase = object
rocketlib.IGlobalBase = object
rocketlib.tool_function = lambda *_a, **_k: lambda fn: fn   # identity decorator
rocketlib.warning = _stub_warning      # append to a list so tests can assert on warnings
rocketlib.debug = lambda *_a, **_k: None
rocketlib.error = lambda *_a, **_k: None
rocketlib.OPEN_MODE = SimpleNamespace(CONFIG='config')

requests = types.ModuleType('requests')
# real exception classes so `except requests.exceptions.Timeout:` works
requests.exceptions = SimpleNamespace(Timeout=TimeoutError, ConnectionError=ConnectionError, ...)

# ai.common.utils stub: capture-and-replay post_with_retry
_POST = SimpleNamespace(calls=[], return_body=None, side_effect=None)
def _stub_post_with_retry(url, *, headers=None, json=None, timeout=None, **_kw):
    _POST.calls.append({'url': url, 'headers': headers, 'json': json, 'timeout': timeout})
    if _POST.side_effect: raise _POST.side_effect
    resp = MagicMock(); resp.json.return_value = _POST.return_body
    return resp
```

## 2. Install stubs BEFORE import, pop after

Insert the stubs into `sys.modules`, import the module under test via
`importlib.util.spec_from_file_location` pointing at
`nodes/src/nodes/<name>/IInstance.py`, then pop the stubs so nothing leaks into other tests.

## 3. What to assert

- **Request building:** URL, headers (auth header present, key not logged), body, timeout.
- **Response parsing:** success shapes, API-error bodies, empty/missing fields.
- **Error paths:** bad input raises `ValueError`; API errors raise `RuntimeError`;
  timeouts/connection errors mapped to clear messages.
- **Log redaction:** secrets never appear in `warning()`/`debug()` capture lists.
- **Input normalization:** wrapped/Pydantic/JSON-string args get unwrapped
  (`normalize_tool_input`).
- For data-flow nodes: pass-through when unconfigured, no input mutation (compare object
  identity / deep-equal of originals), downstream `write*` forwarding.

## 4. Live-credential tests

Anything needing real credentials gets `@pytest.mark.skip(reason=...)` and the PR says so
honestly — "not claimed as passing".

## Run

```bash
uvx --python 3.11 --with pytest --with pytest-asyncio pytest nodes/test/test_<name>.py -v
uvx --python 3.11 --with pytest --with pytest-asyncio pytest nodes/test/test_contracts.py
# full catalog contract suite — must stay green. Always include --with pytest-asyncio:
# nodes/test/conftest.py hard-imports it; bare pytest fails to collect.
```
