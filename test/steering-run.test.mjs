import test from "node:test";
import assert from "node:assert/strict";
import { createJiti } from "@mariozechner/jiti";

const jiti = createJiti(import.meta.url);
const { AgentRunSteeringTracker } = await jiti.import("../src/steering-run.ts");

test("AgentRunSteeringTracker allows only one supervisor steer per agent run", () => {
  const tracker = new AgentRunSteeringTracker();

  assert.equal(tracker.hasSteered(), false);

  const firstRun = tracker.startRun();

  assert.equal(tracker.hasSteered(firstRun), false);
  assert.equal(tracker.tryMarkSteered(firstRun), true);
  assert.equal(tracker.hasSteered(firstRun), true);
  assert.equal(tracker.tryMarkSteered(firstRun), false);

  const secondRun = tracker.startRun();
  assert.equal(tracker.hasSteered(secondRun), false);
  assert.equal(tracker.tryMarkSteered(firstRun), false);
  assert.equal(tracker.tryMarkSteered(secondRun), true);
});
