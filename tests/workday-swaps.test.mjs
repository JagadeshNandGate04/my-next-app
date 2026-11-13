import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Module from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { configureStore } from "@reduxjs/toolkit";

process.env.NEXT_PUBLIC_API_URL = "http://example.test";
const filename = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../app/store/settings/workdaySwapSlice.ts");
const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const loaded = new Module(filename);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(compiled, filename);
const { default: reducer, fetchWorkdaySwaps, createWorkdaySwap, deleteWorkdaySwap } = loaded.exports;

const swap = {
  id: "6",
  holiday_date: "2027-10-18",
  replacement_date: "2027-10-23",
  reason: "Pooja holidays compensation",
  employees: [{ id: "10", emp_code: "EMP006", name: "Test Employee" }],
};
const payload = {
  holiday_date: swap.holiday_date,
  replacement_date: swap.replacement_date,
  user_ids: [10],
  reason: swap.reason,
};
const makeStore = (token = "admin-token") =>
  configureStore({ reducer: { workdaySwaps: reducer, auth: (state = { token }) => state } });

test("fetches the requested year with admin authentication", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ success: true, data: { year: 2027, workday_swaps: [swap] } }));
  const store = makeStore();
  await store.dispatch(fetchWorkdaySwaps(2027)).unwrap();
  const [url, options] = fetch.mock.calls[0].arguments;
  assert.equal(url, "http://example.test/api/v1/settings/getWorkdaySwaps?year=2027");
  assert.equal(options.method, "GET");
  assert.equal(options.headers.Authorization, "Bearer admin-token");
  assert.deepEqual(store.getState().workdaySwaps.swaps, [swap]);
});

test("creates a swap with the required payload and deletes by string ID", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ success: true, data: { workday_swap: swap, audit_id: "248" } }));
  const store = makeStore();
  await store.dispatch(createWorkdaySwap(payload)).unwrap();
  let [url, options] = fetch.mock.calls[0].arguments;
  assert.equal(url, "http://example.test/api/v1/settings/createWorkdaySwap");
  assert.equal(options.method, "POST");
  assert.equal(options.headers.Authorization, "Bearer admin-token");
  assert.deepEqual(JSON.parse(options.body), payload);
  await store.dispatch(deleteWorkdaySwap("6")).unwrap();
  [url, options] = fetch.mock.calls[1].arguments;
  assert.equal(url, "http://example.test/api/v1/settings/deleteWorkdaySwap/6");
  assert.equal(options.method, "DELETE");
  assert.equal(options.body, undefined);
});

test("reports missing authentication and server errors", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ success: false, message: "token is required" }, { status: 400 }));
  await assert.rejects(makeStore(null).dispatch(fetchWorkdaySwaps(2027)).unwrap(), { message: "Authentication token not found. Please log in again." });
  assert.equal(fetch.mock.callCount(), 0);
  await assert.rejects(makeStore().dispatch(createWorkdaySwap(payload)).unwrap(), { message: "token is required" });
});

test("rejects malformed success responses and unsafe employee IDs", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ success: true, data: {} }));
  const store = makeStore();
  await assert.rejects(store.dispatch(fetchWorkdaySwaps(2027)).unwrap(), { message: "The server returned an invalid workday swap list." });
  await assert.rejects(store.dispatch(createWorkdaySwap(payload)).unwrap(), { message: "The swap may have been created, but the server response was invalid. Refresh the list before retrying." });
  await assert.rejects(store.dispatch(deleteWorkdaySwap("6")).unwrap(), { message: "The swap may have been deleted, but the server response was invalid. Refresh the list before retrying." });
  const count = fetch.mock.callCount();
  await assert.rejects(store.dispatch(createWorkdaySwap({ ...payload, user_ids: [Number.MAX_SAFE_INTEGER + 1] })).unwrap(), { message: "A selected employee has an invalid or unsupported ID. Refresh the employee list and try again." });
  assert.equal(fetch.mock.callCount(), count);
});

test("sends string employee IDs as numbers without losing precision", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ success: true, data: { workday_swap: swap } }));
  const store = makeStore();
  await store.dispatch(createWorkdaySwap({ ...payload, user_ids: ["10", "15"] })).unwrap();
  assert.deepEqual(JSON.parse(fetch.mock.calls[0].arguments[1].body).user_ids, [10, 15]);
  for (const id of ["", "0", "1.5", " 10", "9007199254740993"]) {
    await assert.rejects(store.dispatch(createWorkdaySwap({ ...payload, user_ids: [id] })).unwrap());
  }
  assert.equal(fetch.mock.callCount(), 1);
});

test("ignores an older year response when a newer request completes", async (t) => {
  let resolveFirst;
  t.mock.method(globalThis, "fetch", (url) => {
    if (url.endsWith("2026")) {
      return new Promise((resolve) => { resolveFirst = resolve; });
    }
    return Promise.resolve(Response.json({ success: true, data: { year: 2027, workday_swaps: [swap] } }));
  });
  const store = makeStore();
  const first = store.dispatch(fetchWorkdaySwaps(2026));
  await store.dispatch(fetchWorkdaySwaps(2027)).unwrap();
  resolveFirst(Response.json({ success: true, data: { year: 2026, workday_swaps: [] } }));
  await first;
  assert.equal(store.getState().workdaySwaps.year, 2027);
  assert.deepEqual(store.getState().workdaySwaps.swaps, [swap]);
});
