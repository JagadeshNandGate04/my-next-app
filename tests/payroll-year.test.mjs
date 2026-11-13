import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Module from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { configureStore } from "@reduxjs/toolkit";

process.env.NEXT_PUBLIC_API_URL = "http://example.test";
const filename = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../app/store/payroll/payrollSlice.tsx");
const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const loaded = new Module(filename);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(compiled, filename);
const { default: reducer, fetchPayrollRuns, fetchPayrollRunDetails, createPayrollRun } = loaded.exports;
const makeStore = () => configureStore({ reducer: { payroll: reducer, auth: (state = { token: "admin-token" }) => state } });
const run = { id: 1, month: 10, year: 2026, status: "DRAFT", created_at: "2026-10-01" };
const details = { payroll_run: run, employee_count: 1, payroll_items: [{ id: 10, payroll_run_id: 1, name: "Test" }] };

test("switching years clears old payroll details even when the new year is empty", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => {
    if (url.endsWith("/runs/1")) return Response.json({ success: true, data: details });
    const year = Number(new URL(url).searchParams.get("year"));
    return Response.json({ success: true, data: { year, payroll_runs: year === 2026 ? [run] : [] } });
  });
  const store = makeStore();
  await store.dispatch(fetchPayrollRuns(2026));
  await store.dispatch(fetchPayrollRunDetails(1));
  assert.equal(store.getState().payroll.items.length, 1);
  await store.dispatch(fetchPayrollRuns(2021));
  assert.equal(store.getState().payroll.runsYear, 2021);
  assert.deepEqual(store.getState().payroll.runs, []);
  assert.deepEqual(store.getState().payroll.items, []);
  assert.equal(store.getState().payroll.activeRun, null);
});

test("late list and detail responses cannot restore a previous year", async (t) => {
  let resolveList;
  let resolveDetails;
  t.mock.method(globalThis, "fetch", (url) => {
    if (url.endsWith("/runs/1")) return new Promise((resolve) => { resolveDetails = resolve; });
    if (url.includes("year=2026")) return new Promise((resolve) => { resolveList = resolve; });
    return Promise.resolve(Response.json({ success: true, data: { year: 2021, payroll_runs: [] } }));
  });
  const store = makeStore();
  const oldList = store.dispatch(fetchPayrollRuns(2026));
  const oldDetails = store.dispatch(fetchPayrollRunDetails(1));
  await store.dispatch(fetchPayrollRuns(2021));
  resolveDetails(Response.json({ success: true, data: details }));
  resolveList(Response.json({ success: true, data: { year: 2026, payroll_runs: [run] } }));
  await Promise.all([oldList, oldDetails]);
  assert.equal(store.getState().payroll.runsYear, 2021);
  assert.deepEqual(store.getState().payroll.runs, []);
  assert.deepEqual(store.getState().payroll.items, []);
  assert.equal(store.getState().payroll.activeRun, null);
});

test("late details for an earlier run do not overwrite the selected run", async (t) => {
  let resolveFirst;
  t.mock.method(globalThis, "fetch", (url) => {
    if (url.endsWith("/runs/1")) return new Promise((resolve) => { resolveFirst = resolve; });
    return Promise.resolve(Response.json({ success: true, data: { payroll_run: { ...run, id: 2 }, employee_count: 0, payroll_items: [] } }));
  });
  const store = makeStore();
  const first = store.dispatch(fetchPayrollRunDetails(1));
  await store.dispatch(fetchPayrollRunDetails(2));
  resolveFirst(Response.json({ success: true, data: details }));
  await first;
  assert.equal(store.getState().payroll.activeRun.id, 2);
  assert.deepEqual(store.getState().payroll.items, []);
});

test("overlapping list and detail requests retain loading and errors independently", async (t) => {
  let resolveDetails;
  t.mock.method(globalThis, "fetch", (url) => {
    if (url.endsWith("/runs/1")) return new Promise((resolve) => { resolveDetails = resolve; });
    return Promise.resolve(Response.json({ success: false, message: "List unavailable" }, { status: 500 }));
  });
  const store = makeStore();
  const failedList = store.dispatch(fetchPayrollRuns(2026));
  const pending = store.dispatch(fetchPayrollRunDetails(1));
  await assert.rejects(failedList, /List unavailable/);
  assert.equal(store.getState().payroll.detailsLoading, true);
  resolveDetails(Response.json({ success: true, data: details }));
  await pending;
  assert.equal(store.getState().payroll.error, "List unavailable");
  assert.equal(store.getState().payroll.detailsLoading, false);
});

test("creating a run invalidates older list and details requests", async (t) => {
  let resolveList;
  let resolveDetails;
  t.mock.method(globalThis, "fetch", (url, options) => {
    if (options?.method === "POST") {
      return Promise.resolve(Response.json({ success: true, message: "Created", data: details }));
    }
    if (url.endsWith("/runs/1")) return new Promise((resolve) => { resolveDetails = resolve; });
    return new Promise((resolve) => { resolveList = resolve; });
  });
  const store = makeStore();
  const pending = store.dispatch(fetchPayrollRuns(2026));
  const pendingDetails = store.dispatch(fetchPayrollRunDetails(1));
  await store.dispatch(createPayrollRun({ year: 2026, month: 10 }));
  resolveList(Response.json({ success: true, data: { year: 2026, payroll_runs: [] } }));
  resolveDetails(Response.json({ success: true, data: { ...details, payroll_items: [] } }));
  await Promise.all([pending, pendingDetails]);
  assert.equal(store.getState().payroll.runsYear, 2026);
  assert.equal(store.getState().payroll.runs[0].id, 1);
  assert.equal(store.getState().payroll.items.length, 1);
});
