import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { devices } from '../dist/model.js';

const threeUrl = new URL('../dist/vendor/three.module.js', import.meta.url).href;
async function loadThreeModule(relativePath) {
  const source = (await readFile(new URL(relativePath, import.meta.url), 'utf8'))
    .replace("from 'three'", `from '${threeUrl}'`);
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}

test('Roadster circuit separates electrically driven parts from the compressed gas route', async () => {
  const { createCircuit, diagramMarkup } = await loadThreeModule('../dist/circuits.js');
  const { createRoadster } = await loadThreeModule('../dist/models/roadster.js');
  const circuit = createCircuit('roadster');
  const expectedRoles = [...devices.roadster.roles].sort();
  assert.deepEqual(createRoadster().parts.map(part => part.role).filter(Boolean).sort(), expectedRoles, 'The product must expose the same parts as its circuit');
  assert.deepEqual(circuit.parts.map(part => part.role).sort(), expectedRoles);
  assert.deepEqual([...circuit.root.userData.electricalRoles].sort(), ['source', 'switch', 'controller', 'motor', 'fan', 'actuator', 'valve'].sort());
  assert.deepEqual([...circuit.root.userData.gasRoles].sort(), ['tank', 'valve', 'thruster'].sort());
  assert.ok(!circuit.root.userData.electricalRoles.includes('tank'), 'A gas tank is not an electrical load');
  assert.ok(!circuit.root.userData.electricalRoles.includes('thruster'), 'The cold-gas nozzle is not an electrical load');

  const gasPipes = [], electricalWires = [];
  circuit.root.traverse(object => {
    if (object.userData.medium === 'gas') gasPipes.push(object);
    if (object.userData.medium === 'electric') electricalWires.push(object);
  });
  assert.ok(gasPipes.length > 0, 'The component circuit has no gas route');
  assert.ok(electricalWires.length > 0, 'The component circuit has no electrical route');
  assert.ok(gasPipes.every(pipe => !electricalWires.includes(pipe)), 'Gas pipes must remain distinct from electrical wires');

  const svg = diagramMarkup('roadster');
  const diagramRoles = [...svg.matchAll(/data-part=["']([^"']+)["']/g)].map(match => match[1]);
  assert.deepEqual(diagramRoles.sort(), expectedRoles, 'The diagram and component circuit must expose the same parts');
  const pathClasses = [...svg.matchAll(/<path\b[^>]*class=["']([^"']+)["']/g)].map(match => match[1].split(/\s+/));
  const gasPaths = pathClasses.filter(classes => classes.includes('gas-path'));
  assert.ok(gasPaths.length > 0, 'The schematic has no separate gas route');
  assert.ok(pathClasses.some(classes => classes.includes('wire')), 'The schematic has no electrical wires');
  assert.ok(gasPaths.every(classes => !classes.includes('wire')), 'Gas routes must not be styled or operated as electrical wires');
});

test('Roadster component circuit opens its valve and moves its actuator, then resets when switched off', async () => {
  const { createCircuit } = await loadThreeModule('../dist/circuits.js');
  const circuit = createCircuit('roadster');
  const pose = group => {
    const values = [];
    group.traverse(object => values.push(...object.position.toArray(), ...object.quaternion.toArray()));
    return values;
  };
  const valve = circuit.parts.find(part => part.role === 'valve').group;
  const actuator = circuit.parts.find(part => part.role === 'actuator').group;
  const flow = circuit.root.getObjectByName('gas-flow');
  assert.ok(flow, 'The component circuit must show gas flow');
  const valveOff = pose(valve), actuatorOff = pose(actuator);
  assert.equal(flow.visible, false);
  circuit.setPowered(true);
  assert.notDeepEqual(pose(valve), valveOff);
  assert.notDeepEqual(pose(actuator), actuatorOff);
  assert.equal(flow.visible, true);
  circuit.setPowered(false);
  assert.deepEqual(pose(valve), valveOff);
  assert.deepEqual(pose(actuator), actuatorOff);
  assert.equal(flow.visible, false);
});
