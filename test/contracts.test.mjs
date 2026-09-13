import test from "node:test";
import assert from "node:assert/strict";
import {
  SRL_EDITOR_BRIDGE_CONTRACT_VERSION,
  normalizeRenderedEventTargetRef,
  normalizeRenderedEventHit,
  renderedTargetKey,
  sameRenderedEventTarget,
} from "../src/index.mjs";

const note = {
  contractVersion: SRL_EDITOR_BRIDGE_CONTRACT_VERSION,
  kind: "NOTE",
  partId: "P1",
  measureIndex: 0,
  eventIndex: 1,
  voice: 1,
};

const rest = { ...note, kind: "REST", eventIndex: 2 };

test("normalizes NOTE and REST targets without canonical or DOM fields", () => {
  assert.deepEqual(normalizeRenderedEventTargetRef(note), note);
  assert.deepEqual(normalizeRenderedEventTargetRef(rest), rest);
  assert.equal(Object.isFrozen(normalizeRenderedEventTargetRef(rest)), true);
});

test("rejects unknown target fields and kinds", () => {
  assert.throws(() => normalizeRenderedEventTargetRef({ ...note, domId: "svg-4" }), /unsupported field/);
  assert.throws(() => normalizeRenderedEventTargetRef({ ...note, kind: "CLEF" }), /NOTE or REST/);
});

test("validates bounded indices and identifiers", () => {
  assert.throws(() => normalizeRenderedEventTargetRef({ ...note, measureIndex: -1 }), /non-negative/);
  assert.throws(() => normalizeRenderedEventTargetRef({ ...note, partId: " P1" }), /bounded string/);
});

test("normalizes current render HIT and MISS evidence", () => {
  const hit = normalizeRenderedEventHit({ kind: "HIT", renderEpoch: "render-2", sourceId: "rev:2", target: rest });
  assert.equal(hit.kind, "HIT");
  assert.equal(hit.target.kind, "REST");
  const miss = normalizeRenderedEventHit({ kind: "MISS", renderEpoch: "render-2", reason: "UNMAPPED_ELEMENT" });
  assert.deepEqual(miss, { kind: "MISS", renderEpoch: "render-2", reason: "UNMAPPED_ELEMENT" });
});

test("rendered target key distinguishes kind and event position", () => {
  assert.notEqual(renderedTargetKey(note), renderedTargetKey(rest));
  assert.equal(sameRenderedEventTarget(note, { ...note }), true);
  assert.equal(sameRenderedEventTarget(note, rest), false);
});
