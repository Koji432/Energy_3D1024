import test from 'node:test';
import assert from 'node:assert/strict';
import { mechanisms, mechanismForRole, mechanismMarkup } from '../dist/roadster-mechanisms.js';

const mechanismIds = ['drive', 'suction', 'wing', 'thrust'];
const roleMapping = { motor: 'drive', fan: 'suction', actuator: 'wing', valve: 'thrust', tank: 'thrust', thruster: 'thrust' };
const attribute = (tag, name) => tag.match(new RegExp(`(?:^|\\s)${name}=["']([^"']*)["']`))?.[1];

test('mechanisms provide four distinct topics with a title and two concise explanations', () => {
  assert.deepEqual(Object.keys(mechanisms).sort(), [...mechanismIds].sort());
  const titles = new Set();
  for (const id of mechanismIds) {
    const mechanism = mechanisms[id];
    assert.equal(mechanism.id, id);
    assert.ok(typeof mechanism.title === 'string' && mechanism.title.trim(), `${id} has no title`);
    assert.equal(mechanism.caption.length, 2, `${id} must explain its mechanism in two lines`);
    for (const line of mechanism.caption) assert.ok(typeof line === 'string' && line.trim(), `${id} has an empty explanation`);
    titles.add(mechanism.title);
  }
  assert.equal(titles.size, mechanismIds.length, 'Each mechanism needs a distinct topic');
});

test('selecting a mechanism part opens its matching topic and shared parts preserve the current topic', () => {
  for (const [role, expected] of Object.entries(roleMapping)) {
    for (const current of [...mechanismIds, 'unknown']) assert.equal(mechanismForRole(role, current), expected, `${role}, ${current}`);
  }
  for (const role of ['source', 'switch', 'controller', null, undefined, '', 'unknown', 'constructor', '__proto__']) {
    for (const current of mechanismIds) assert.equal(mechanismForRole(role, current), current, `${role}, ${current}`);
    assert.equal(mechanismForRole(role), 'drive');
    for (const current of [null, '', 'unknown', 'constructor', '__proto__']) assert.equal(mechanismForRole(role, current), 'drive', `${role}, invalid ${current}`);
  }
});

test('each cutaway is an accessible, nonempty, self-contained SVG', () => {
  const diagrams = new Set();
  for (const id of mechanismIds) {
    const markup = mechanismMarkup(id);
    assert.equal(typeof markup, 'string');
    assert.match(markup, /^\s*<svg\b[\s\S]*<\/svg>\s*$/, `${id} is not a standalone SVG`);
    const root = markup.match(/<svg\b[^>]*>/)[0];
    assert.equal(attribute(root, 'role'), 'img', `${id} must expose an image role`);
    const viewBox = attribute(root, 'viewBox')?.trim().split(/[\s,]+/).map(Number);
    assert.equal(viewBox?.length, 4, `${id} needs a scalable viewBox`);
    assert.ok(viewBox.every(Number.isFinite) && viewBox[2] > 0 && viewBox[3] > 0);
    const labelledBy = attribute(root, 'aria-labelledby')?.trim().split(/\s+/);
    assert.ok(labelledBy?.length, `${id} needs an accessible label`);
    const descriptions = [...markup.matchAll(/<(title|desc)\b([^>]*)>([\s\S]*?)<\/(?:title|desc)>/g)];
    assert.ok(descriptions.some(match => match[1] === 'title' && match[3].trim()), `${id} needs a title`);
    assert.ok(descriptions.some(match => match[1] === 'desc' && match[3].trim()), `${id} needs a description`);
    for (const referencedId of labelledBy) {
      assert.ok(descriptions.some(match => attribute(match[2], 'id') === referencedId && match[3].trim()), `${id} has an unresolved accessible label: ${referencedId}`);
    }
    assert.match(markup, /<(?:path|rect|circle|ellipse|polygon|polyline|line)\b/, `${id} has no drawing`);
    assert.doesNotMatch(markup, /<(?:image|foreignObject|script)\b/i, `${id} must render without embedded images or executable content`);
    for (const reference of markup.matchAll(/(?:href|src)=["']([^"']*)["']/g)) assert.ok(reference[1].startsWith('#'), `${id} depends on an external asset: ${reference[1]}`);
    assert.doesNotMatch(markup, /(?:url\(\s*["']?(?:https?:|data:|\/)|@import\b)/i, `${id} depends on an external stylesheet or image`);
    diagrams.add(markup);
  }
  assert.equal(diagrams.size, mechanismIds.length, 'The four topics must not reuse one placeholder drawing');
});

test('an unknown mechanism produces the drive diagram instead of an empty inspector', () => {
  const drive = mechanismMarkup('drive');
  for (const id of [undefined, null, '', 'unknown', 'constructor', '__proto__']) assert.equal(mechanismMarkup(id), drive, `Unknown mechanism ${id}`);
});
