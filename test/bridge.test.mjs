import test from "node:test";
import assert from "node:assert/strict";
import {
  SRL_EDITOR_BRIDGE_CONTRACT_VERSION,
  createGenericRenderedEventBridge,
  createRenderedTargetMap,
} from "../src/index.mjs";

const note = Object.freeze({ contractVersion: SRL_EDITOR_BRIDGE_CONTRACT_VERSION, kind: "NOTE", partId: "P1", measureIndex: 0, eventIndex: 0, voice: 1 });
const rest = Object.freeze({ contractVersion: SRL_EDITOR_BRIDGE_CONTRACT_VERSION, kind: "REST", partId: "P1", measureIndex: 0, eventIndex: 2, voice: 1 });
const noteAddress = Object.freeze({ kind: "event", eventId: "event-note-1", revisionId: "rev:2" });
const restAddress = Object.freeze({ kind: "event", eventId: "event-rest-3", revisionId: "rev:2" });

function hit(target, epoch = "render-2", sourceId = "rev:2") {
  return { kind: "HIT", renderEpoch: epoch, sourceId, target };
}

function bridgeForMap(map) {
  return createGenericRenderedEventBridge({ resolveCanonical: target => map.resolve(target) });
}

test("resolves NOTE and REST through the same current-render bridge", () => {
  const map = createRenderedTargetMap([
    { target: note, semanticAddress: noteAddress },
    { target: rest, semanticAddress: restAddress },
  ]);
  const bridge = bridgeForMap(map);
  bridge.activateRender({ renderEpoch: "render-2", sourceId: "rev:2" });
  assert.deepEqual(bridge.resolveHit(hit(note)), { kind: "RESOLVED", target: note, semanticAddress: noteAddress, evidence: { renderEpoch: "render-2", sourceId: "rev:2" } });
  assert.deepEqual(bridge.resolveHit(hit(rest)), { kind: "RESOLVED", target: rest, semanticAddress: restAddress, evidence: { renderEpoch: "render-2", sourceId: "rev:2" } });
});

test("stale epoch fails closed before canonical resolution", () => {
  let calls = 0;
  const bridge = createGenericRenderedEventBridge({ resolveCanonical: () => { calls += 1; return restAddress; } });
  bridge.activateRender({ renderEpoch: "render-3", sourceId: "rev:3" });
  assert.deepEqual(bridge.resolveHit(hit(rest, "render-2", "rev:3")), { kind: "ABSTAIN", reason: "STALE_RENDER_EPOCH", observedRenderEpoch: "render-2" });
  assert.equal(calls, 0);
});

test("source mismatch fails closed", () => {
  const bridge = createGenericRenderedEventBridge({ resolveCanonical: () => restAddress });
  bridge.activateRender({ renderEpoch: "render-2", sourceId: "rev:2" });
  assert.deepEqual(bridge.resolveHit(hit(rest, "render-2", "rev:old")), { kind: "ABSTAIN", reason: "SOURCE_ID_MISMATCH" });
});

test("renderer MISS stays an explicit abstention", () => {
  const bridge = createGenericRenderedEventBridge({ resolveCanonical: () => restAddress });
  bridge.activateRender({ renderEpoch: "render-2" });
  assert.deepEqual(
    bridge.resolveHit({ kind: "MISS", renderEpoch: "render-2", reason: "AMBIGUOUS_OWNERSHIP" }),
    { kind: "ABSTAIN", reason: "RENDERER_MISS", missReason: "AMBIGUOUS_OWNERSHIP" },
  );
});

test("invalid evidence and resolver errors fail closed", () => {
  const bridge = createGenericRenderedEventBridge({ resolveCanonical: () => { throw new Error("no"); } });
  bridge.activateRender({ renderEpoch: "render-2" });
  assert.deepEqual(bridge.resolveHit({ kind: "HIT", renderEpoch: "render-2", target: { ...rest, x: 4 } }), { kind: "ABSTAIN", reason: "INVALID_HIT_EVIDENCE" });
  assert.deepEqual(bridge.resolveHit({ kind: "HIT", renderEpoch: "render-2", target: rest }), { kind: "ABSTAIN", reason: "RESOLVER_REJECTED" });
});

test("invalidation prevents reuse of otherwise-current evidence", () => {
  const bridge = createGenericRenderedEventBridge({ resolveCanonical: () => restAddress });
  bridge.activateRender({ renderEpoch: "render-2" });
  bridge.invalidateRender();
  assert.deepEqual(bridge.resolveHit({ kind: "HIT", renderEpoch: "render-2", target: rest }), { kind: "ABSTAIN", reason: "NO_ACTIVE_RENDER" });
});
