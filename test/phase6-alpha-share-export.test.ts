import assert from "node:assert/strict";
import test from "node:test";
import {
  canShareDiagnosticLogFile,
  DIAGNOSTIC_LOG_FILENAME,
  shareDiagnosticLogText,
  type DiagnosticShareNavigator,
} from "../src/diagnostics/share-export";

test("diagnostic .txt share invokes navigator.share synchronously with only one real text file", async () => {
  let shareCalled = false;
  let captured: ShareData | undefined;
  const navigatorLike: DiagnosticShareNavigator = {
    canShare(data) {
      assert.ok(data?.files?.length === 1);
      return true;
    },
    share(data) {
      shareCalled = true;
      captured = data;
      return Promise.resolve();
    },
  };

  const pending = shareDiagnosticLogText("line-one\nline-two", navigatorLike);
  assert.equal(shareCalled, true, "navigator.share must execute before any async boundary loses user activation");
  await pending;

  assert.deepEqual(Object.keys(captured ?? {}), ["files"]);
  const file = captured?.files?.[0];
  assert.ok(file instanceof File);
  assert.equal(file.name, DIAGNOSTIC_LOG_FILENAME);
  assert.equal(file.type, "text/plain");
  assert.equal(await file.text(), "line-one\nline-two");
});

test("diagnostic .txt share capability honors canShare and does not call share when file sharing is rejected", async () => {
  let calls = 0;
  const navigatorLike: DiagnosticShareNavigator = {
    canShare: () => false,
    share: async () => { calls++; },
  };
  assert.equal(canShareDiagnosticLogFile(navigatorLike), false);
  await assert.rejects(() => shareDiagnosticLogText("diagnostics", navigatorLike), /cannot share/i);
  assert.equal(calls, 0);
});

test("diagnostic .txt share reports unavailable when navigator.share is absent", async () => {
  assert.equal(canShareDiagnosticLogFile({}), false);
  await assert.rejects(() => shareDiagnosticLogText("diagnostics", {}), /unavailable/i);
});
