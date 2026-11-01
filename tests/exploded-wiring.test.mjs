import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';
import {phase} from '../dist/model.js';

const threeURL = new URL('../dist/vendor/three.module.js', import.meta.url).href;
const helperSource = (await readFile(new URL('../dist/models/exploded-wiring.js', import.meta.url), 'utf8')).replace("from 'three'", `from '${threeURL}'`);
const helperURL = `data:text/javascript;base64,${Buffer.from(helperSource).toString('base64')}`;
async function load(id, factory) {
  const source = (await readFile(new URL(`../dist/models/${id}.js`, import.meta.url), 'utf8'))
    .replace("from 'three'", `from '${threeURL}'`)
    .replace("from './exploded-wiring.js'", `from '${helperURL}'`);
  return (await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`))[factory]();
}
function orderedCircuit(connections, start, end) {
  const graph = new Map(connections.terminals.map(terminal => [terminal.id, []]));
  function join(a, b) { graph.get(a).push(b); graph.get(b).push(a); }
  for (const lead of connections.leads) join(lead.from, lead.to);
  for (const component of connections.components) if (component.id !== 'source') join(...component.terminals);
  const route = [start];
  let previous = null;
  for (let i = 0; i < graph.size; i++) {
    const current = route.at(-1);
    if (current === end) return route;
    const next = graph.get(current).filter(id => id !== previous);
    assert.equal(next.length, 1, `A branch or missing connection occurs at ${current}`);
    previous = current; route.push(next[0]);
  }
  assert.fail('The electrical return path does not reach its source');
}

test('flashlight wiring places the resistor before LED anode and returns to battery negative without a bypass', async () => {
  const model = await load('flashlight', 'createFlashlight');
  const connections = model.connections;
  assert.deepEqual(orderedCircuit(connections, 'source-positive', 'source-negative'), [
    'source-positive', 'switch-input', 'switch-output', 'resistor-input', 'resistor-output', 'led-anode', 'led-cathode', 'source-negative',
  ]);
  assert.equal(connections.leads.length, 4);
  assert.equal(connections.leads.find(lead => lead.id === 'negative-return').color, 'return');
  assert.ok(connections.leads.filter(lead => lead.id !== 'negative-return').every(lead => lead.color === 'supply'));
  const positive = connections.terminals.find(terminal => terminal.id === 'source-positive');
  const negative = connections.terminals.find(terminal => terminal.id === 'source-negative');
  assert.equal(positive.polarity, 'positive'); assert.equal(negative.polarity, 'negative');
  assert.ok(positive.position.x < -1.4 && negative.position.x > 1.3, 'Battery contacts must match the raised positive cap and negative end');
  for (const id of ['resistor-input', 'resistor-output', 'led-anode', 'led-cathode']) {
    assert.equal(connections.terminals.find(terminal => terminal.id === id).partId, 'led');
  }
});

test('fan wiring uses two AC cord conductors and a complete switched motor circuit, without battery polarity', async () => {
  const model = await load('fan', 'createFan');
  assert.deepEqual(orderedCircuit(model.connections, 'supply-a', 'supply-b'), [
    'supply-a', 'switch-input', 'switch-output', 'motor-input', 'motor-return', 'supply-b',
  ]);
  assert.equal(model.connections.components.find(component => component.id === 'source').kind, 'ac-source');
  assert.ok(model.connections.terminals.every(terminal => terminal.polarity === undefined));
  assert.equal(model.connections.leads.find(lead => lead.id === 'motor-return').color, 'return');
});

for (const [id, factory] of [['flashlight', 'createFlashlight'], ['fan', 'createFan']]) {
  test(`${id}: cables stay on moving electrical terminals, reveal on decomposition, and do not intercept the product`, async () => {
    const model = await load(id, factory);
    model.root.position.set(1.7, -.4, 2.3); model.root.rotation.set(.15, -.25, .1);
    const terminals = new Map(model.connections.terminals.map(terminal => [terminal.id, terminal]));
    for (const terminal of terminals.values()) {
      const component = model.parts.find(part => part.id === terminal.partId);
      assert.ok(component?.role, `An electrical cable is attached to a cover or other decorative part: ${terminal.partId}`);
      assert.equal(terminal.anchor.parent, component.group);
      assert.equal(terminal.contact.userData.excludeFromFrame, true);
      assert.equal(terminal.contact.castShadow, false);
    }
    for (const progress of [0, .12, .21, .5, 1, .34, 0]) {
      for (const part of model.parts) part.group.position.lerpVectors(part.home, part.away, phase(progress, part.start, part.end));
      model.updateConnections(progress);
      const visible = progress > .12;
      assert.equal(model.connections.root.visible, visible);
      for (const terminal of terminals.values()) assert.equal(terminal.anchor.visible, visible);
      for (const lead of model.connections.leads) {
        for (const [endpoint, terminalID] of [['start', lead.from], ['end', lead.to]]) {
          const expected = terminals.get(terminalID).anchor.getWorldPosition(new THREE.Vector3()); model.root.worldToLocal(expected);
          assert.ok(lead[endpoint].distanceTo(expected) < 1e-8, `${lead.id} disconnected at ${progress}`);
          assert.ok(lead.curve.getPoint(endpoint === 'start' ? 0 : 1).distanceTo(expected) < 1e-8);
        }
        assert.ok(lead.mesh.geometry.attributes.position.array.every(Number.isFinite));
        assert.equal(lead.mesh.userData.excludeFromFrame, true);
        assert.equal(lead.mesh.castShadow, false); assert.equal(lead.mesh.receiveShadow, false);
        assert.equal(lead.mesh.material.opacity > 0, visible);
        const intersections = []; lead.mesh.raycast(new THREE.Raycaster(), intersections); assert.equal(intersections.length, 0);
      }
    }
  });
}
