# SRL-EDITOR-BRIDGE-02 — Generic Rendered Event Targeting

A small, dependency-free conformance/reference package for first-class rendered `NOTE` and `REST` targeting between **ST Score Rendering Layer** and **ST Score Editor Core**.

## Why

The previous note-only interaction bridge can identify rendered notes but deliberately reports a rendered rest as `NO_NOTE_OWNER`. That forces consumers to add rest-specific DOM/fallback logic. Bridge-02 replaces that asymmetry with one presentation-only target contract for both notes and rests.

## What this repository owns

- strict `RenderedEventTargetRef` validation;
- `NOTE | REST` rendered target kinds;
- render-epoch/source correlation;
- explicit fail-closed abstention;
- a renderer-local ownership index with no DOM dependency;
- current-render target-to-semantic mapping helper;
- regression/conformance tests.

## What it does **not** own

- `ScoreDocumentV3` / `NotationDocumentV4` canonical truth;
- `SemanticAddressV3` creation;
- score mutation, Undo/Redo, teacher approval;
- OSMD/VexFlow DOM identity as canonical identity;
- nearest-note/rest guessing.

## Example

```js
import {
  SRL_EDITOR_BRIDGE_CONTRACT_VERSION,
  createGenericRenderedEventBridge,
  createRenderedTargetMap,
} from "./src/index.mjs";

const restTarget = {
  contractVersion: SRL_EDITOR_BRIDGE_CONTRACT_VERSION,
  kind: "REST",
  partId: "P1",
  measureIndex: 0,
  eventIndex: 2,
  voice: 1,
};

const map = createRenderedTargetMap([
  { target: restTarget, semanticAddress: { kind: "event", eventId: "event-rest-3", revisionId: "rev:42" } },
]);

const bridge = createGenericRenderedEventBridge({
  resolveCanonical: target => map.resolve(target),
});

bridge.activateRender({ renderEpoch: "render-7", sourceId: "rev:42" });

const result = bridge.resolveHit({
  kind: "HIT",
  renderEpoch: "render-7",
  sourceId: "rev:42",
  target: restTarget,
});
```

The result is `RESOLVED` only when current render evidence matches and the consumer mapping resolves the target exactly.

## Development

```bash
npm run ci
```

No runtime dependencies are required.

## Documents

- [Architecture](docs/ARCHITECTURE.md)
- [Integration plan](docs/INTEGRATION.md)
- [Conformance gates](docs/CONFORMANCE.md)

## Current scope

V1 is intentionally limited to **NOTE + REST**. Chord, clef, barline, tie, slur and other notation targets should be added only after NOTE/REST is integrated and physically validated.
