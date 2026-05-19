// jsx-loader.mjs — Node ESM loader for .jsx files via sucrase
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { transform } = require('sucrase');

export function resolve(specifier, context, nextResolve) {
  return nextResolve(specifier, context);
}

export function load(url, context, nextLoad) {
  if (url.endsWith('.jsx')) {
    const filePath = fileURLToPath(url);
    const source = readFileSync(filePath, 'utf8');
    const { code } = transform(source, {
      transforms: ['jsx'],
      jsxRuntime: 'automatic',
      production: false,
    });
    return { format: 'module', source: code, shortCircuit: true };
  }
  return nextLoad(url, context);
}
