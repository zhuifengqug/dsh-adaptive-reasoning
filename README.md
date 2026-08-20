# dsh-adaptive-reasoning

A capability-aware reasoning-effort slider for the DeepSeek Harness Web GUI.

The plugin keeps DSH's official model selector and `/model` command intact. Clicking the selector's existing **Reasoning effort** / **推理等级** row opens an accessible slider panel. The panel reads the selected model's exact reasoning metadata from the Host and writes selections back through the normal `session.selectModel` RPC.

## What It Does

- Uses only the current model's advertised `reasoning.efforts`; it does not invent a global effort list.
- Supports sparse and provider-specific levels such as `off`, `high`, `max`, or an adapter-defined identifier.
- Previews while dragging, commits on pointer release or keyboard navigation, and returns to the last accepted value if the Host rejects a change.
- Uses DSH semantic design tokens and respects `prefers-reduced-motion`.
- Leaves official model selection, load failures, accessibility behavior, and the `/model` command unchanged.

## One-Click Auto-Declare

When you open the effort panel on a model that declares no `reasoningEfforts`, the panel shows a hint and an `自动补全` (Auto-declare) button. Clicking it asks the Host to fill in a conservative declaration for every model of the current provider that lacks one, then reloads the panel so the slider appears.

Source priority follows **mode C**: a confident [models.dev](https://models.dev) match wins when the catalog is reachable; otherwise a per-family heuristic decides (`deepseek`/`qwen`/`glm`/`claude`/`grok` → `off`/`low`/`high`/`max`; `gpt`/`gemini`/`minimax`/`step`/`kimi`/`moonshot`/`mimo`/`mistral`/… → `off`/`low`/`medium`/`high`; image models are skipped). Models that already declare efforts are never touched.

The button is an explicit per-click user action, so it is **not** gated behind a config flag; what it writes is the same `reasoningEfforts` field in `llm-pi-ai` settings (persisted to `settings.yaml`) that you would type by hand. It is dispatched as the host command `/adaptive-reasoning-declare <provider>`, which you can also run directly to backfill a whole provider.

## Optional models.dev Enrichment

Some manually configured `llm-pi-ai` models do not declare `reasoningEfforts`, so DSH correctly exposes no effort UI. This plugin can optionally enrich those missing declarations from [models.dev](https://models.dev) at startup.

This behavior is disabled by default because a catalog record cannot prove that a private gateway accepts the same reasoning protocol.

When enabled, the Host half:

- fetches `https://models.dev/api.json` and caches it in the system temporary directory;
- only updates models with no existing `reasoningEfforts` field;
- accepts only exact or uniquely normalized model-id matches;
- never supplies a family-heuristic fallback for unknown or ambiguous models (that fallback exists only behind the explicit Auto-declare button above);
- writes inferred entries to the `llm-pi-ai` settings section, where DSH validates them before use.

Enable it in the profile's `cordis.patch.yml` by overriding this entry:

```yaml
- replace:
    - id: adaptive-reasoning
      name: dsh-adaptive-reasoning
      config:
        enrichFromModelsDev: true
        cacheHours: 24
```

`cacheHours` must be a positive number. An unavailable catalog only disables enrichment for that run; it does not prevent DSH from starting.

## Install

The package contains prebuilt plain JavaScript and has no `prepare` script, so it can be installed from a local checkout, a packed tarball, or a registry without granting pnpm build permissions.

```sh
# Run from the directory that contains this checkout.
dsh plugin --profile web add ./dsh-adaptive-reasoning

# Verify that the bundle patch participates in the Web profile.
dsh --profile web --dump-config
```

Restart the existing `dsh web` process after installation. A client-plugin update hot-reloads only while the DSH checkout's `pnpm run dev:web` watcher is already rebuilding its bundles; this standalone bundle otherwise loads at the next Web process start.

To remove it:

```sh
dsh plugin --profile web remove dsh-adaptive-reasoning
```

## Design Notes

The Host is authoritative. The UI does not interpret an effort's wire spelling, map `off` to another value, or silently clamp an unsupported selection. The only values shown are those published by `session.models` for the exact selected route, and the Host decides whether a submitted value becomes the session's next request configuration.

The browser integration deliberately uses the official selector's effort row as its entry point rather than taking the single `conversation.input.model` seat. This avoids replacing DSH's official selector and preserves its model catalog, retry, locale, and error surfaces.

## Troubleshooting

### Custom relays reject requests with `role: developer`

pi-ai sends the system prompt with the OpenAI `developer` role whenever a model has reasoning enabled and the endpoint is judged to support that role. For unknown/custom relay URLs that auto-detection defaults to `supported`, and many OpenAI-compatible relays only accept `system` — the request then fails with something like `developer is not one of ['system', 'assistant', 'user', 'tool', 'function']`.

The `llm-pi-ai` configuration seam does not expose pi-ai's `supportsDeveloperRole` switch (as of `0.1.0-rc.7`), so it must be patched into the installed bundle. If your deployment hits this, apply the same surgical patch to `<dsh-install>/node_modules/@deepseek-ai/dsh-llm-pi-ai/lib/index.js` (back up the file first, and re-apply after any `dsh` upgrade), then set per route:

```yaml
compat:
  supportsDeveloperRole: false
```

A relay that does accept the `developer` role can leave the flag at its default or set it to `true`.

## Files

```text
dsh-adaptive-reasoning/
├── index.js            # Host half and optional models.dev enrichment
├── lib/client.js       # Browser half and slider panel
├── cordis.patch.yml    # Web profile bundle patch
├── package.json
└── README.md
```

## License

MIT
