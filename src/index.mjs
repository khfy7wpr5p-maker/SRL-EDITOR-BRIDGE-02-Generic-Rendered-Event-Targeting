export const SRL_EDITOR_BRIDGE_CONTRACT_VERSION = "1.0.0";
export const RENDERED_EVENT_TARGET_KINDS = Object.freeze(["NOTE", "REST"]);
export const RENDERED_EVENT_HIT_MISS_REASONS = Object.freeze([
  "NO_ELEMENT_AT_POINT",
  "OUTSIDE_RENDER_CONTAINER",
  "UNMAPPED_ELEMENT",
  "AMBIGUOUS_OWNERSHIP",
  "UNSUPPORTED_TARGET",
]);
export const BRIDGE_ABSTAIN_REASONS = Object.freeze([
  "NO_ACTIVE_RENDER",
  "INVALID_HIT_EVIDENCE",
  "STALE_RENDER_EPOCH",
  "SOURCE_ID_MISMATCH",
  "RENDERER_MISS",
  "TARGET_KIND_UNSUPPORTED",
  "TARGET_UNRESOLVED",
  "RESOLVER_REJECTED",
]);

const TARGET_KIND_SET = new Set(RENDERED_EVENT_TARGET_KINDS);
const MISS_REASON_SET = new Set(RENDERED_EVENT_HIT_MISS_REASONS);
const PART_ID_MAX = 128;
const EPOCH_MAX = 128;
const SOURCE_ID_MAX = 256;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requirePlainRecord(value, label) {
  if (!isObject(value)) throw new TypeError(`${label} must be a plain object.`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  return value;
}

function requireAllowedKeys(record, allowed, label) {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) throw new TypeError(`${label} contains unsupported field '${key}'.`);
  }
}

function requireBoundedToken(value, label, maxLength) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength ||
    value !== value.trim() ||
    value.includes("\u0000")
  ) {
    throw new TypeError(`${label} must be a non-empty bounded string without surrounding whitespace or NUL.`);
  }
  return value;
}

function requireIndex(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer.`);
  }
  return value;
}

function sameSourceId(left, right) {
  return left === right;
}

export function normalizeRenderedEventTargetRef(value) {
  const target = requirePlainRecord(value, "Rendered event target");
  requireAllowedKeys(
    target,
    new Set(["contractVersion", "kind", "partId", "measureIndex", "eventIndex", "voice"]),
    "Rendered event target",
  );
  if (target.contractVersion !== SRL_EDITOR_BRIDGE_CONTRACT_VERSION) {
    throw new TypeError(`Rendered event target contractVersion must be ${SRL_EDITOR_BRIDGE_CONTRACT_VERSION}.`);
  }
  if (!TARGET_KIND_SET.has(target.kind)) {
    throw new TypeError("Rendered event target kind must be NOTE or REST.");
  }
  const partId = requireBoundedToken(target.partId, "Rendered event target partId", PART_ID_MAX);
  const measureIndex = requireIndex(target.measureIndex, "Rendered event target measureIndex");
  const eventIndex = requireIndex(target.eventIndex, "Rendered event target eventIndex");
  const voice = target.voice;
  if (voice !== undefined) requireIndex(voice, "Rendered event target voice");
  return Object.freeze(
    voice === undefined
      ? {
          contractVersion: SRL_EDITOR_BRIDGE_CONTRACT_VERSION,
          kind: target.kind,
          partId,
          measureIndex,
          eventIndex,
        }
      : {
          contractVersion: SRL_EDITOR_BRIDGE_CONTRACT_VERSION,
          kind: target.kind,
          partId,
          measureIndex,
          eventIndex,
          voice,
        },
  );
}

export function normalizeRenderEvidence(value) {
  const evidence = requirePlainRecord(value, "Render evidence");
  requireAllowedKeys(evidence, new Set(["renderEpoch", "sourceId"]), "Render evidence");
  const renderEpoch = requireBoundedToken(evidence.renderEpoch, "renderEpoch", EPOCH_MAX);
  const sourceId = evidence.sourceId;
  if (sourceId !== undefined) requireBoundedToken(sourceId, "sourceId", SOURCE_ID_MAX);
  return Object.freeze(sourceId === undefined ? { renderEpoch } : { renderEpoch, sourceId });
}

export function normalizeRenderedEventHit(value) {
  const hit = requirePlainRecord(value, "Rendered event hit result");
  if (hit.kind === "HIT") {
    requireAllowedKeys(hit, new Set(["kind", "renderEpoch", "sourceId", "target"]), "Rendered event hit result");
    const evidence = normalizeRenderEvidence({ renderEpoch: hit.renderEpoch, ...(hit.sourceId === undefined ? {} : { sourceId: hit.sourceId }) });
    const target = normalizeRenderedEventTargetRef(hit.target);
    return Object.freeze({ kind: "HIT", ...evidence, target });
  }
  if (hit.kind === "MISS") {
    requireAllowedKeys(hit, new Set(["kind", "renderEpoch", "sourceId", "reason"]), "Rendered event hit result");
    const evidence = normalizeRenderEvidence({ renderEpoch: hit.renderEpoch, ...(hit.sourceId === undefined ? {} : { sourceId: hit.sourceId }) });
    if (!MISS_REASON_SET.has(hit.reason)) {
      throw new TypeError("Rendered event hit result contains an unsupported miss reason.");
    }
    return Object.freeze({ kind: "MISS", ...evidence, reason: hit.reason });
  }
  throw new TypeError("Rendered event hit result kind must be HIT or MISS.");
}

export function renderedTargetKey(value) {
  const target = normalizeRenderedEventTargetRef(value);
  return [
    target.contractVersion,
    target.kind,
    target.partId,
    String(target.measureIndex),
    String(target.eventIndex),
    target.voice === undefined ? "-" : String(target.voice),
  ].join("|");
}

export function sameRenderedEventTarget(left, right) {
  return renderedTargetKey(left) === renderedTargetKey(right);
}

export function createRenderedTargetMap(entries = []) {
  if (!Array.isArray(entries)) throw new TypeError("Rendered target map entries must be an array.");
  const map = new Map();
  for (const entry of entries) {
    const record = requirePlainRecord(entry, "Rendered target map entry");
    requireAllowedKeys(record, new Set(["target", "semanticAddress"]), "Rendered target map entry");
    const target = normalizeRenderedEventTargetRef(record.target);
    if (record.semanticAddress === null || record.semanticAddress === undefined) {
      throw new TypeError("Rendered target map semanticAddress must be present.");
    }
    const key = renderedTargetKey(target);
    if (map.has(key)) throw new Error(`Duplicate rendered target mapping is ambiguous: ${key}`);
    map.set(key, record.semanticAddress);
  }
  return Object.freeze({
    size: map.size,
    resolve(target) {
      return map.get(renderedTargetKey(target)) ?? null;
    },
  });
}

export function createRenderedOwnershipIndex() {
  let owners = new WeakMap();
  const registeredTargets = new Map();
  return Object.freeze({
    register(owner, targetValue) {
      if (!isObject(owner)) throw new TypeError("Rendered ownership owner must be an object.");
      const target = normalizeRenderedEventTargetRef(targetValue);
      const previous = owners.get(owner);
      if (previous !== undefined && !sameRenderedEventTarget(previous, target)) {
        throw new Error("Rendered ownership owner cannot be registered to two different targets.");
      }
      owners.set(owner, target);
      registeredTargets.set(renderedTargetKey(target), target);
      return target;
    },
    resolve(owner) {
      if (!isObject(owner)) return null;
      return owners.get(owner) ?? null;
    },
    resolvePath(path) {
      if (!Array.isArray(path)) throw new TypeError("Rendered ownership path must be an array.");
      let resolved = null;
      for (const owner of path) {
        if (!isObject(owner)) continue;
        const target = owners.get(owner);
        if (target === undefined) continue;
        if (resolved !== null && !sameRenderedEventTarget(resolved, target)) {
          return Object.freeze({ kind: "MISS", reason: "AMBIGUOUS_OWNERSHIP" });
        }
        resolved = target;
      }
      return resolved === null
        ? Object.freeze({ kind: "MISS", reason: "UNMAPPED_ELEMENT" })
        : Object.freeze({ kind: "HIT", target: resolved });
    },
    clear() {
      owners = new WeakMap();
      registeredTargets.clear();
    },
    get size() {
      return registeredTargets.size;
    },
  });
}

function abstain(reason, extras = {}) {
  return Object.freeze({ kind: "ABSTAIN", reason, ...extras });
}

export function createGenericRenderedEventBridge({ resolveCanonical, acceptedTargetKinds = RENDERED_EVENT_TARGET_KINDS } = {}) {
  if (typeof resolveCanonical !== "function") {
    throw new TypeError("Generic rendered event bridge requires resolveCanonical(target, evidence).");
  }
  if (!Array.isArray(acceptedTargetKinds) || acceptedTargetKinds.length === 0) {
    throw new TypeError("acceptedTargetKinds must be a non-empty array.");
  }
  const accepted = new Set();
  for (const kind of acceptedTargetKinds) {
    if (!TARGET_KIND_SET.has(kind)) throw new TypeError(`Unsupported accepted target kind: ${String(kind)}.`);
    accepted.add(kind);
  }
  let activeEvidence = null;

  return Object.freeze({
    activateRender(evidence) {
      activeEvidence = normalizeRenderEvidence(evidence);
      return activeEvidence;
    },
    invalidateRender() {
      activeEvidence = null;
    },
    getActiveRenderEvidence() {
      return activeEvidence;
    },
    resolveHit(rawHit) {
      let hit;
      try {
        hit = normalizeRenderedEventHit(rawHit);
      } catch {
        return abstain("INVALID_HIT_EVIDENCE");
      }
      if (activeEvidence === null) return abstain("NO_ACTIVE_RENDER");
      if (hit.renderEpoch !== activeEvidence.renderEpoch) {
        return abstain("STALE_RENDER_EPOCH", { observedRenderEpoch: hit.renderEpoch });
      }
      if (!sameSourceId(hit.sourceId, activeEvidence.sourceId)) {
        return abstain("SOURCE_ID_MISMATCH");
      }
      if (hit.kind === "MISS") {
        return abstain("RENDERER_MISS", { missReason: hit.reason });
      }
      if (!accepted.has(hit.target.kind)) {
        return abstain("TARGET_KIND_UNSUPPORTED", { targetKind: hit.target.kind });
      }
      let semanticAddress;
      try {
        semanticAddress = resolveCanonical(hit.target, activeEvidence);
      } catch {
        return abstain("RESOLVER_REJECTED");
      }
      if (semanticAddress === null || semanticAddress === undefined) {
        return abstain("TARGET_UNRESOLVED", { targetKind: hit.target.kind });
      }
      return Object.freeze({
        kind: "RESOLVED",
        target: hit.target,
        semanticAddress,
        evidence: activeEvidence,
      });
    },
  });
}
