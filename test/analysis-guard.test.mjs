import test from "node:test";
import assert from "node:assert/strict";
import { createJiti } from "@mariozechner/jiti";

const jiti = createJiti(import.meta.url);
const { createAnalysisToken, getCurrentAnalysisState } = await jiti.import("../src/analysis-guard.ts");

function state(overrides = {}) {
  return {
    active: true,
    outcome: "ship the fix",
    provider: "anthropic",
    modelId: "claude-haiku",
    sensitivity: "medium",
    interventions: [],
    startedAt: 123,
    turnCount: 1,
    ...overrides,
  };
}

test("analysis token stays immutable when the live state object mutates", () => {
  const live = state();
  const token = createAnalysisToken(live);

  live.turnCount = 2;

  assert.equal(token.turnCount, 1);
  assert.equal(token.provider, "anthropic");
  assert.equal(token.modelId, "claude-haiku");
  assert.equal(getCurrentAnalysisState(live, token), null);
});

test("getCurrentAnalysisState accepts only the same active run, turn, sensitivity, and model", () => {
  const live = state();
  const token = createAnalysisToken(live);

  assert.equal(getCurrentAnalysisState(live, token), live);
  assert.equal(getCurrentAnalysisState(null, token), null);
  assert.equal(getCurrentAnalysisState(state({ active: false }), token), null);
  assert.equal(getCurrentAnalysisState(state({ startedAt: 456 }), token), null);
  assert.equal(getCurrentAnalysisState(state({ turnCount: 2 }), token), null);
  assert.equal(getCurrentAnalysisState(state({ sensitivity: "high" }), token), null);
  assert.equal(getCurrentAnalysisState(state({ provider: "openai" }), token), null);
  assert.equal(getCurrentAnalysisState(state({ modelId: "gpt-5" }), token), null);
});
