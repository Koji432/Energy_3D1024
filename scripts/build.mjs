import { createHash } from 'node:crypto';
import { cp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));

async function sourceFiles(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await sourceFiles(path.join(directory, entry.name), relative + '/'));
    else if (entry.isFile()) files.push(relative);
    else throw new Error(`Unsupported source entry: ${relative}`);
  }
  return files.sort();
}

function versionUrl(target, version) {
  const url = new URL(target, 'https://build.invalid/');
  url.searchParams.set('v', version);
  return target.split(/[?#]/)[0] + url.search + url.hash;
}

// Version every edge of the module graph, not just the entry script. Keep file
// paths available so a previously cached document never points to removed assets.
export async function buildSite({ sourceDir = path.join(repoRoot, 'dist'), outputDir = path.join(repoRoot, 'site') } = {}) {
  sourceDir = path.resolve(sourceDir);
  outputDir = path.resolve(outputDir);
  if (sourceDir === outputDir || sourceDir.startsWith(outputDir + path.sep) || outputDir.startsWith(sourceDir + path.sep)) {
    throw new Error('Source and output directories must be separate.');
  }
  const files = await sourceFiles(sourceDir);
  const hash = createHash('sha256');
  for (const file of files) hash.update(file).update('\0').update(await readFile(path.join(sourceDir, file))).update('\0');
  const version = hash.digest('hex').slice(0, 16);
  const html = await readFile(path.join(sourceDir, 'index.html'), 'utf8');
  const importMapPattern = /(<script\b[^>]*type=["']importmap["'][^>]*>)([\s\S]*?)(<\/script>)/;
  if (!importMapPattern.test(html)) throw new Error('Missing import map.');
  const builtHtml = html
    .replace(/((?:src|href)=["'])(\.\.?\/[^"']+)(["'])/g, (_, attribute, target, quote) => attribute + versionUrl(target, version) + quote)
    .replace(importMapPattern, (_, open, content, close) => {
      const map = JSON.parse(content);
      for (const [name, target] of Object.entries(map.imports)) {
        if (target.startsWith('./') || target.startsWith('../')) map.imports[name] = versionUrl(target, version);
      }
      return open + JSON.stringify(map) + close;
    })
    .replace('</head>', ` <meta name="build-version" content="${version}">\n</head>`);

  await rm(outputDir, { recursive: true, force: true });
  await cp(sourceDir, outputDir, { recursive: true });
  for (const file of files) {
    if (!file.endsWith('.js')) continue;
    const code = await readFile(path.join(sourceDir, file), 'utf8');
    const versioned = code.replace(/(\bfrom\s*|\bimport\s*(?:\(\s*)?)(["'])(\.\.?\/[^"']+)\2/g,
      (_, declaration, quote, target) => declaration + quote + versionUrl(target, version) + quote);
    await writeFile(path.join(outputDir, file), versioned);
  }
  await writeFile(path.join(outputDir, 'index.html'), builtHtml);
  await writeFile(path.join(outputDir, 'version.json'), JSON.stringify({ version }) + '\n');
  return { version, outputDir };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { version } = await buildSite();
  console.log(`Built site with asset version ${version}`);
}
