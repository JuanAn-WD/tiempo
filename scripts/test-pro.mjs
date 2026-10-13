/**
 * Runs the Pro entitlement tests in plain Node.
 * The purchase rules are pure TypeScript; this transpiles them the same way
 * as scripts/check-i18n-keys.mjs so the native store module is not required.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = new Map();

function loadTs(rel) {
  const abs = path.join(root, rel);
  if (cache.has(abs)) return cache.get(abs).exports;
  const source = fs.readFileSync(abs, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      strict: false,
    },
    fileName: abs,
  }).outputText;
  const mod = { exports: {} };
  cache.set(abs, mod);
  const localRequire = (spec) => {
    if (spec.startsWith('.')) {
      const resolved = path.resolve(path.dirname(abs), spec);
      const file = resolved.endsWith('.ts') ? resolved : `${resolved}.ts`;
      return loadTs(path.relative(root, file));
    }
    if (spec.startsWith('@/')) {
      return loadTs(`src/${spec.slice(2)}.ts`);
    }
    return require(spec);
  };
  const runner = new Function('exports', 'require', 'module', output);
  runner(mod.exports, localRequire, mod);
  return mod.exports;
}

const { testPurchases } = loadTs('src/lib/purchases.test.ts');
testPurchases();
console.log('pro entitlement tests ok');
