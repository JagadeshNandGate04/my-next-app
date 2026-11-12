import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Module from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { unwrapResult } from "@reduxjs/toolkit";

process.env.NEXT_PUBLIC_API_URL = "http://example.test";
const filename = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../app/store/notifications/notification.tsx");
const source = readFileSync(filename, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const loaded = new Module(filename);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(compiled, filename);
const { sendAdminAnnouncement } = loaded.exports;

async function send(token = "admin-token") {
  const action = await sendAdminAnnouncement({
    title: "Important update",
    message: "Complete the task today.",
  })(() => {}, () => ({ auth: { token } }), undefined);
  return unwrapResult(action);
}

test("sends the announcement with the admin token and returns the recipient count", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ success: true, message: "Announcement sent", data: { recipient_count: 16 } })
  );
  assert.equal(await send(), 16);
  assert.equal(fetch.mock.callCount(), 1);
  const [url, options] = fetch.mock.calls[0].arguments;
  assert.equal(url, "http://example.test/api/v1/notifications/admin/announcements");
  assert.equal(options.method, "POST");
  assert.equal(options.headers.Authorization, "Bearer admin-token");
  assert.equal(options.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(options.body), {
    title: "Important update",
    message: "Complete the task today.",
  });
});

test("rejects a missing token without making a request", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  await assert.rejects(send(null), { message: "Authentication token not found. Please log in again." });
  assert.equal(fetch.mock.callCount(), 0);
});

test("surfaces API errors", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ success: false, message: "token is required" }, { status: 400 })
  );
  await assert.rejects(send(), { message: "token is required" });
});

test("rejects invalid recipient counts without claiming failure to send", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ success: true, data: { recipient_count: -1 } })
  );
  await assert.rejects(send(), { message: "The server returned an invalid recipient count. The announcement may have been sent; check before retrying." });
});
