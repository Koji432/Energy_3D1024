import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFile, cp, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildSite } from '../scripts/build.mjs';

const actualSource = fileURLToPath(new URL('../dist/', import.meta.url));

async function filesIn(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await filesIn(path.join(directory, entry.name), relative + '/'));
    else files.push(relative);
  }
  return files.sort();
}

async function snapshot(directory) {
  return Promise.all((await filesIn(directory)).map(async file => [
    file,
    createHash('sha256').update(await readFile(path.join(directory, file))).digest('hex'),
  ]));
}

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'energy-site-build-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const sourceDir = path.join(directory, 'source');
  await cp(actualSource, sourceDir, { recursive: true });
  return { directory, sourceDir };
}

async function entrypoints(outputDir) {
  const html = await readFile(path.join(outputDir, 'index.html'), 'utf8');
  const map = JSON.parse(html.match(/<script\b[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/)[1]);
  return {
    app: html.match(/<script\b[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/)[1],
    css: html.match(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/)[1],
    three: map.imports.three,
    map,
  };
}

test('building preserves sources and produces the same release for the same files', async t => {
  const { directory, sourceDir } = await fixture(t);
  const before = await snapshot(sourceDir);
  const first = await buildSite({ sourceDir, outputDir: path.join(directory, 'first') });
  const second = await buildSite({ sourceDir, outputDir: path.join(directory, 'second') });
  assert.equal(first.version, second.version);
  assert.deepEqual(await snapshot(first.outputDir), await snapshot(second.outputDir));
  assert.deepEqual(await snapshot(sourceDir), before);
  assert.deepEqual(JSON.parse(await readFile(path.join(first.outputDir, 'version.json'), 'utf8')), { version: first.version });
});

test('a leaf model change versions the app, CSS, and Three entrypoints together while retaining their paths', async t => {
  const { directory, sourceDir } = await fixture(t);
  const first = await buildSite({ sourceDir, outputDir: path.join(directory, 'first') });
  const before = await entrypoints(first.outputDir);
  await appendFile(path.join(sourceDir, 'models', 'vacuum.js'), '\n// Updated vacuum model.\n');
  const second = await buildSite({ sourceDir, outputDir: path.join(directory, 'second') });
  const after = await entrypoints(second.outputDir);
  assert.notEqual(first.version, second.version);
  for (const key of ['app', 'css', 'three']) {
    assert.notEqual(before[key], after[key], key);
    const oldUrl = new URL(before[key], 'https://example.test/Energy_3D1024/');
    const newUrl = new URL(after[key], 'https://example.test/Energy_3D1024/');
    assert.deepEqual(oldUrl.searchParams.getAll('v'), [first.version], key);
    assert.deepEqual(newUrl.searchParams.getAll('v'), [second.version], key);
    assert.equal(oldUrl.pathname, newUrl.pathname, key);
  }
  assert.match(await readFile(path.join(second.outputDir, 'models', 'vacuum.js'), 'utf8'), /Updated vacuum model/);
  // Previously cached HTML and module URLs still point to available file paths.
  for (const file of await filesIn(sourceDir)) await readFile(path.join(second.outputDir, file));
});

test('the entire actual module graph and stylesheet use the same version with existing legacy paths', async t => {
  const { directory, sourceDir } = await fixture(t);
  const { version, outputDir } = await buildSite({ sourceDir, outputDir: path.join(directory, 'site') });
  const { app, css, map } = await entrypoints(outputDir);
  const documentUrl = pathToFileURL(path.join(outputDir, 'index.html'));
  const visited = new Set();
  const pending = [new URL(app, documentUrl)];
  const cssUrl = new URL(css, documentUrl);
  assert.deepEqual(cssUrl.searchParams.getAll('v'), [version]);
  await readFile(fileURLToPath(cssUrl));

  while (pending.length) {
    const moduleUrl = pending.pop();
    if (visited.has(moduleUrl.href)) continue;
    visited.add(moduleUrl.href);
    const modulePath = fileURLToPath(moduleUrl);
    assert.ok(modulePath.startsWith(outputDir + path.sep), `Module outside site: ${modulePath}`);
    assert.deepEqual(moduleUrl.searchParams.getAll('v'), [version], `Wrong module version: ${moduleUrl}`);
    const code = await readFile(modulePath, 'utf8');
    // All current application and vendored imports are static declarations.
    const imports = code.matchAll(/^\s*(?:import|export)\s+(?:[\w*{},\s]+\s+from\s*)?['"]([^'"]+)['"]/gm);
    for (const [, specifier] of imports) {
      let target;
      if (specifier.startsWith('./') || specifier.startsWith('../')) target = new URL(specifier, moduleUrl);
      else {
        assert.ok(Object.hasOwn(map.imports, specifier), `Unmapped module: ${specifier}`);
        target = new URL(map.imports[specifier], documentUrl);
      }
      pending.push(target);
    }
  }

  const sourceFiles = await filesIn(sourceDir);
  const expected = sourceFiles.filter(file => file.endsWith('.js')).map(file => {
    const url = pathToFileURL(path.join(outputDir, file));
    url.searchParams.set('v', version);
    return url.href;
  });
  assert.deepEqual([...visited].sort(), expected.sort());
  assert.ok(fileURLToPath(cssUrl).startsWith(outputDir + path.sep));
  for (const file of sourceFiles) await readFile(path.join(outputDir, file));
});
