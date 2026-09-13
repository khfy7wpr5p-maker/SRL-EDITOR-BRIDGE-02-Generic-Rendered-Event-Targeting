# Conformance gates

An implementation conforms to Bridge-02 V1 only if all gates below pass.

## Contract

- NOTE and REST use one discriminated target contract.
- Unknown fields fail closed.
- Identifiers and indices are bounded.
- Renderer target objects carry no canonical `SemanticAddress`.

## Evidence

- Every successful replacement render has a distinct `renderEpoch`.
- Previous evidence becomes unusable after invalidation/replacement.
- `sourceId`, when used, must match exactly.
- malformed hit payloads abstain rather than select.

## Ownership

- rendered rests have explicit REST ownership;
- nested conflicting owners are ambiguous;
- unmapped elements do not guess a neighbour;
- duplicate target-to-semantic mappings are rejected.

## Editor boundary

- canonical resolution occurs outside the renderer;
- mutation remains in Editor Core / EditorSessionV4;
- DOM coordinates, SVG ids, pitch and distance never become authoring authority.

## Mobile acceptance

A physical-device PASS requires a real iPhone Safari run after automated regression is green. Headless/WebKit automation is necessary but not sufficient for physical acceptance.
