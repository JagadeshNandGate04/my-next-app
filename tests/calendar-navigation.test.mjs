import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Module from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const filename = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../app/compensatory-days/calendarNavigation.ts");
const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const loaded = new Module(filename);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(compiled, filename);
const { adjacentMonth } = loaded.exports;

test("calendar arrows navigate forward and backward across year boundaries", () => {
  assert.deepEqual(adjacentMonth(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(adjacentMonth(2027, 0, -1), { year: 2026, month: 11 });
  assert.deepEqual(adjacentMonth(2026, 4, 1), { year: 2026, month: 5 });
});
