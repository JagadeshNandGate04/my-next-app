import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Module from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { configureStore } from "@reduxjs/toolkit";

process.env.NEXT_PUBLIC_API_URL = "http://example.test";
const filename = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../app/store/settings/settingsSlice.tsx");
const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const loaded = new Module(filename);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(compiled, filename);
const { default: reducer, fetchDesignations, createDesignation } = loaded.exports;

const designation = { id: "11", name: "Junior Developer", created_at: "2026-11-13T10:46:52.614Z", updated_at: "2026-11-13T10:46:52.614Z" };
const makeStore = (token = "admin-token") =>
  configureStore({ reducer: { settings: reducer, auth: (state = { token }) => state } });

test("fetches designations with the admin token and no body", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ success: true, data: { designations: [designation] } }));
  const store = makeStore();
  await store.dispatch(fetchDesignations());
  const [url, options] = fetch.mock.calls[0].arguments;
  assert.equal(url, "http://example.test/api/v1/settings/getDesignations");
  assert.equal(options.method, "GET");
  assert.equal(options.headers.Authorization, "Bearer admin-token");
  assert.equal(options.body, undefined);
  assert.deepEqual(store.getState().settings.designations, [designation]);
});

test("creates a trimmed designation and refreshes the list", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async (_url, options) =>
    options.method === "POST"
      ? Response.json({ success: true, data: { designation, audit_id: "252" } })
      : Response.json({ success: true, data: { designations: [designation] } }));
  const store = makeStore();
  const created = await store.dispatch(createDesignation("  Junior Developer  "));
  const [url, options] = fetch.mock.calls[0].arguments;
  assert.equal(url, "http://example.test/api/v1/settings/createDesignation");
  assert.equal(options.headers.Authorization, "Bearer admin-token");
  assert.deepEqual(JSON.parse(options.body), { name: "Junior Developer" });
  assert.deepEqual(created, designation);
  assert.deepEqual(store.getState().settings.designations, [designation]);
  assert.equal(fetch.mock.callCount(), 2);
});

test("surfaces authentication, validation and server errors", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ success: false, message: "Designation already exists" }, { status: 400 }));
  const unauthenticated = makeStore(null);
  await unauthenticated.dispatch(fetchDesignations());
  assert.match(unauthenticated.getState().settings.designationLoadError, /Authentication token/);
  const store = makeStore();
  await assert.rejects(store.dispatch(createDesignation("  ")), /Enter a designation name/);
  assert.equal(fetch.mock.callCount(), 0);
  await assert.rejects(store.dispatch(createDesignation("Junior Developer")), /Designation already exists/);
  assert.equal(store.getState().settings.designationCreateError, "Designation already exists");
});

test("rejects malformed responses and ignores stale list requests", async (t) => {
  let resolveFirst;
  const fetch = t.mock.method(globalThis, "fetch", () => new Promise((resolve) => { resolveFirst = resolve; }));
  const store = makeStore();
  const first = store.dispatch(fetchDesignations());
  fetch.mock.mockImplementation(async () => Response.json({ success: true, data: { designations: [designation] } }));
  await store.dispatch(fetchDesignations());
  resolveFirst(Response.json({ success: true, data: { designations: [] } }));
  await first;
  assert.deepEqual(store.getState().settings.designations, [designation]);
  fetch.mock.mockImplementation(async () => Response.json({ success: true, data: {} }));
  await store.dispatch(fetchDesignations());
  assert.match(store.getState().settings.designationLoadError, /invalid designation list/);
  await assert.rejects(store.dispatch(createDesignation("Junior Developer")), /may have been created/);
});

test("an older list response cannot overwrite a newly created designation", async (t) => {
  let resolveFirst;
  t.mock.method(globalThis, "fetch", (url, options) => {
    if (options.method === "POST") return Promise.resolve(Response.json({ success: true, data: { designation } }));
    if (!resolveFirst) return new Promise((resolve) => { resolveFirst = resolve; });
    return Promise.resolve(Response.json({ success: true, data: { designations: [designation] } }));
  });
  const store = makeStore();
  const first = store.dispatch(fetchDesignations());
  await store.dispatch(createDesignation("Junior Developer"));
  resolveFirst(Response.json({ success: true, data: { designations: [] } }));
  await first;
  assert.deepEqual(store.getState().settings.designations, [designation]);
});
