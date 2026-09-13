import test from "node:test";
import assert from "node:assert/strict";
import {
  SRL_EDITOR_BRIDGE_CONTRACT_VERSION,
  createRenderedOwnershipIndex,
  createRenderedTargetMap,
} from "../src/index.mjs";

const note = Object.freeze({ contractVersion: SRL_EDITOR_BRIDGE_CONTRACT_VERSION, kind: "NOTE", partId: "P1", measureIndex: 0, eventIndex: 0 });
const rest = Object.freeze({ contractVersion: SRL_EDITOR_BRIDGE_CONTRACT_VERSION, kind: "REST", partId: "P1", measureIndex: 0, eventIndex: 2 });

test("ownership index makes a rest a first-class rendered owner", () => {
  const index = createRenderedOwnershipIndex();
  const restGroup = {};
  index.register(restGroup, rest);
  assert.deepEqual(index.resolve(restGroup), rest);
  assert.deepEqual(index.resolvePath([{}, restGroup]), { kind: "HIT", target: rest });
});

test("conflicting ancestry fails closed as ambiguous", () => {
  const index = createRenderedOwnershipIndex();
  const child = {};
  const parent = {};
  index.register(child, note);
  index.register(parent, rest);
  assert.deepEqual(index.resolvePath([child, parent]), { kind: "MISS", reason: "AMBIGUOUS_OWNERSHIP" });
});

test("unmapped ownership path does not fall through to guessed targets", () => {
  const index = createRenderedOwnershipIndex();
  assert.deepEqual(index.resolvePath([{}, {}]), { kind: "MISS", reason: "UNMAPPED_ELEMENT" });
});

test("one rendered owner cannot silently change target", () => {
  const index = createRenderedOwnershipIndex();
  const owner = {};
  index.register(owner, note);
  assert.throws(() => index.register(owner, rest), /two different targets/);
});

test("target map rejects duplicate renderer locators", () => {
  assert.throws(() => createRenderedTargetMap([
    { target: rest, semanticAddress: { eventId: "r1" } },
    { target: rest, semanticAddress: { eventId: "r2" } },
  ]), /ambiguous/);
});
