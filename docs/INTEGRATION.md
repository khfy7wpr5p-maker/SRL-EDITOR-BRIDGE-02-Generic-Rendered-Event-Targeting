# Integration plan

## ST Score Rendering Layer

1. Add a generic `RenderedEventTargetRef` union for `NOTE | REST`.
2. During OSMD hit-index rebuild, register both ordinary notes and rests as explicit target owners.
3. Add `resolveTargetAtClientPointDetailed()` at the OSMD adapter boundary.
4. Add `BrowserScoreHost.hitTestTargetDetailed()` and preserve `renderEpoch` + bounded `sourceId` evidence.
5. Keep `hitTestNoteDetailed()` as a compatibility projection over the generic target API.
6. Expose the generic method through Workstation/browser runtime exports.
7. Do not return DOM nodes, OSMD objects, raw SVG ids, source XML, pitch, duration, or bounding boxes as identity.

For the existing OSMD adapter, rests are already present in the same graphical traversal as notes (`sourceNote.isRest()`). The implementation should stop registering those groups as `NO_NOTE_OWNER` and instead register an explicit `REST` target with the same rendered traversal coordinates used to construct the current note locator.

## ST Score Editor Core

1. Build a current-revision rendered-target map when generating the render request.
2. Resolve generic `NOTE` and `REST` targets to `SemanticAddressV3` only through that map.
3. Require current `renderEpoch` / `sourceId` evidence before accepting a selection.
4. Remove the special rest DOM fallback only after generic rest targeting is proven by regression and physical-device tests.
5. Keep all mutation in `EditorSessionV4`; the bridge selects targets but never edits the score.

## Physical P05 regression

The final regression must exercise the real mobile toolbar path, not direct controller calls:

```text
C -> Start -> D -> Copy -> trailing half rest -> Paste once -> Undo once
```

Automated WebKit coverage must additionally assert that the visible `NOTE` elements are inside the iframe viewport using bounding rectangles. Counting `.vf-stavenote` nodes alone is insufficient because off-screen nodes can still make the test pass.

## Rollout

- Phase A: bridge contract + conformance tests (this repository)
- Phase B: Rendering Layer generic NOTE/REST target implementation
- Phase C: Editor Core current-revision resolver
- Phase D: remove legacy rest fallback
- Phase E: physical iPhone Safari acceptance

No production deployment or merge is implied by this repository.
