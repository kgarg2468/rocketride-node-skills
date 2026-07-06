# Future spec: node-ops watcher

This is a spec only. Do not implement automation as part of ordinary node builds.

Goal: keep nodes current with vendor API changes without letting automation mutate production
code unsupervised.

## Proposed metadata

Future nodes may add `node-ops.json` beside `services.json`:

```json
{
  "vendor": "<vendor>",
  "docsUrls": ["https://..."],
  "openapiUrls": ["https://..."],
  "changelogUrls": ["https://..."],
  "apiVersion": "<version/date>",
  "supportedOperations": ["operation_a", "operation_b"]
}
```

## Watcher behavior

- Fetch vendor changelog/OpenAPI/docs URLs on a schedule.
- Diff discovered operations, schemas, auth rules, limits, and deprecations against
  `supportedOperations` and current README docs.
- Open a draft issue or draft PR with the diff, proposed skill/node updates, and tests to run.
- Never auto-merge, never silently widen node scope, and never change supported operations
  without a human Gate A-style scope decision.

## Non-goals

- No runtime node API change is required now.
- No node build should block on creating `node-ops.json`.
- Do not add JSON-lane or other open-PR behavior here until it is merged in `rocketride-server`.
