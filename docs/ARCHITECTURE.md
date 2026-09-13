# SRL-EDITOR-BRIDGE-02 Architecture

## Goal

Make rendered `NOTE` and `REST` targets first-class, equally addressable presentation evidence without granting the renderer canonical edit authority.

## Authority model

```text
physical pointer/touch
        |
        v
ST Score Rendering Layer
  explicit rendered ownership
  NOTE / REST
        |
        v
RenderedEventTargetRef + renderEpoch + sourceId
        |
        v
SRL-EDITOR-BRIDGE-02
  strict validation
  stale-evidence rejection
  exact target mapping
        |
        v
ST Score Editor Core
  SemanticAddressV3 resolution
  current revision validation
  selection / mutation / Undo / Redo
```

The bridge never creates canonical identity from pitch, duration, geometry, nearest-neighbour distance, SVG id, DOM ancestry, or OSMD internals. DOM/OSMD objects remain renderer-local.

## V1 target contract

V1 deliberately supports only `NOTE` and `REST`.

```js
{
  contractVersion: "1.0.0",
  kind: "NOTE" | "REST",
  partId: "P1",
  measureIndex: 0,
  eventIndex: 2,
  voice: 1 // optional
}
```

`eventIndex` is a rendered/source traversal locator inside a part + measure (+ optional voice). It is not a canonical `ScoreDocument` array index. The consumer must resolve it through the mapping produced for the same render/revision.

## Freshness contract

A hit is eligible for canonical resolution only when:

1. the bridge has an active successful render;
2. `hit.renderEpoch === active.renderEpoch`;
3. optional `sourceId` values match exactly;
4. target shape is valid and target kind is enabled;
5. the current editor mapping resolves the target exactly once.

Any failure returns `ABSTAIN`; there is no nearest-note/rest fallback.

## Rest ownership

The previous note-only bridge treated a known rest as `NO_NOTE_OWNER`. Bridge-02 changes that design: a rendered rest group can own an explicit `REST` target. This removes the need for editor-side DOM guessing and unique-rest fallback logic.

## Compatibility

Existing note-only APIs can remain as compatibility shims:

- `hitTestNoteDetailed()` returns a hit only for generic `NOTE` targets;
- a generic `REST` hit maps to the legacy `NO_NOTE_OWNER` miss for old consumers;
- new consumers use `hitTestTargetDetailed()` and the Bridge-02 contract.

This permits staged adoption without making Bridge-02 a second authoring system.
