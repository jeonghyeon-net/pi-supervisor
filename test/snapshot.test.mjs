import test from "node:test";
import assert from "node:assert/strict";
import { createJiti } from "@mariozechner/jiti";

const jiti = createJiti(import.meta.url);
const { buildSnapshotFromBranch } = await jiti.import("../src/snapshot.ts");

test("buildSnapshotFromBranch includes tool calls and tool results", () => {
  const snapshot = buildSnapshotFromBranch([
    {
      type: "message",
      message: {
        role: "user",
        content: "Check the PR state.",
      },
    },
    {
      type: "message",
      message: {
        role: "assistant",
        content: [
          {
            type: "toolCall",
            id: "call_shell",
            name: "bash",
            arguments: {
              command: "git status -sb && git remote -v && gh pr view --json number,url",
            },
          },
        ],
        stopReason: "toolUse",
      },
    },
    {
      type: "message",
      message: {
        role: "toolResult",
        toolCallId: "call_shell",
        toolName: "bash",
        content: [
          {
            type: "text",
            text: "## main...origin/main\norigin\thttps://github.com/example/repo.git (fetch)\n{\"number\":2854,\"url\":\"https://github.com/example/repo/pull/2854\"}",
          },
        ],
        isError: false,
      },
    },
  ], 10);

  const transcript = snapshot.map((m) => `${m.role}: ${m.content}`).join("\n");

  assert.equal(snapshot.length, 3);
  assert.match(transcript, /TOOL CALL: bash id=call_shell/);
  assert.match(transcript, /git status -sb/);
  assert.match(transcript, /TOOL RESULT: bash OK id=call_shell/);
  assert.match(transcript, /## main\.\.\.origin\/main/);
  assert.match(transcript, /2854/);
});

test("buildSnapshotFromBranch includes assistant runtime errors", () => {
  const snapshot = buildSnapshotFromBranch([
    {
      type: "message",
      message: {
        role: "assistant",
        content: [],
        stopReason: "error",
        errorMessage: "No tool call found for function call output with call_id call_123.",
      },
    },
  ], 10);

  assert.deepEqual(snapshot, [
    {
      role: "assistant",
      content: "ASSISTANT ERROR: No tool call found for function call output with call_id call_123.",
    },
  ]);
});

test("buildSnapshotFromBranch includes user bash output and respects the limit", () => {
  const snapshot = buildSnapshotFromBranch([
    {
      type: "message",
      message: {
        role: "user",
        content: "First message",
      },
    },
    {
      type: "message",
      message: {
        role: "bashExecution",
        command: "pwd",
        output: "/tmp/project",
        exitCode: 0,
        cancelled: false,
        truncated: false,
      },
    },
  ], 1);

  assert.deepEqual(snapshot, [
    {
      role: "tool",
      content: "USER BASH: pwd\nexitCode: 0\n/tmp/project",
    },
  ]);
});

test("buildSnapshotFromBranch includes failed tool results", () => {
  const snapshot = buildSnapshotFromBranch([
    {
      type: "message",
      message: {
        role: "toolResult",
        toolCallId: "call_bad",
        toolName: "bash",
        content: [{ type: "text", text: "Command failed" }],
        details: { exitCode: 1 },
        isError: true,
      },
    },
  ], 10);

  assert.equal(snapshot[0].role, "tool");
  assert.match(snapshot[0].content, /TOOL RESULT: bash ERROR id=call_bad/);
  assert.match(snapshot[0].content, /Command failed/);
  assert.match(snapshot[0].content, /"exitCode":1/);
});

test("buildSnapshotFromBranch skips excluded user bash executions", () => {
  const snapshot = buildSnapshotFromBranch([
    {
      type: "message",
      message: {
        role: "bashExecution",
        command: "secret command",
        output: "hidden",
        excludeFromContext: true,
      },
    },
  ], 10);

  assert.deepEqual(snapshot, []);
});

test("buildSnapshotFromBranch includes assistant aborts", () => {
  const snapshot = buildSnapshotFromBranch([
    {
      type: "message",
      message: {
        role: "assistant",
        content: [{ type: "text", text: "partial" }],
        stopReason: "aborted",
        errorMessage: "Operation aborted",
      },
    },
  ], 10);

  assert.equal(snapshot[0].role, "assistant");
  assert.match(snapshot[0].content, /partial/);
  assert.match(snapshot[0].content, /ASSISTANT ABORTED: Operation aborted/);
});
