import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';
import {phase} from '../dist/model.js';

const threeURL = new URL('../dist/vendor/three.module.js', import.meta.url).href;
const helperSource = (await readFile(new URL('../dist/models/exploded-wiring.js', import.meta.url), 'utf8')).replace("from 'three'", `from '${threeURL}'`);
const helperURL = `data:text/javascript;base64,${Buffer.from(helperSource).toString('base64')}`;
const source = (await readFile(new URL('../dist/models/vacuum.js', import.meta.url), 'utf8'))
  .replace("from 'three'", `from '${threeURL}'`)
  .replace("from './exploded-wiring.js'", `from '${helperURL}'`);
const {createVacuum} = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

function separate(model, progress) {
  for (const part of model.parts) part.group.position.lerpVectors(part.home, part.away, phase(progress, part.start, part.end));
  model.updateConnections(progress);
}

function powerPaths(connections, omittedComponent) {
  const graph = new Map(connections.terminals.map(terminal => [terminal.id, []]));
  function join(a, b) { graph.get(a).push(b); graph.get(b).push(a); }
  for (const lead of connections.leads) join(lead.from, lead.to);
  for (const component of connections.components) if (component.id !== 'source' && component.id !== omittedComponent) join(...component.terminals);
  const paths = [];
  function visit(path) {
    const current = path.at(-1);
    if (current === 'source-negative') { paths.push(path); return; }
    for (const next of graph.get(current)) if (!path.includes(next)) visit([...path, next]);
  }
  visit(['source-positive']);
  return paths;
}

test('vacuum power reaches three parallel motors through the switch and controller without a bypass', () => {
  const {connections} = createVacuum();
  assert.deepEqual(connections.components.map(component => component.id).sort(), ['source', 'switch', 'controller', 'motor1', 'motor2', 'motor3'].sort());
  assert.equal(connections.components.find(component => component.id === 'source').kind, 'battery');
  assert.equal(connections.leads.length, 8);
  const expected = ['motor1', 'motor2', 'motor3'].map(id => [
    'source-positive', 'switch-input', 'switch-output', 'controller-input', 'controller-output', `${id}-input`, `${id}-return`, 'source-negative',
  ]);
  assert.deepEqual(powerPaths(connections).sort(), expected.sort());
  for (const id of ['switch', 'controller']) assert.deepEqual(powerPaths(connections, id), [], `${id} must not have an electrical bypass`);
  for (const id of ['motor1', 'motor2', 'motor3']) assert.equal(powerPaths(connections, id).length, 2, 'Each motor must have an independent parallel branch');
  assert.equal(connections.terminals.find(terminal => terminal.id === 'source-positive').polarity, 'positive');
  assert.equal(connections.terminals.find(terminal => terminal.id === 'source-negative').polarity, 'negative');
  assert.ok(connections.leads.filter(lead => lead.id.endsWith('-return')).every(lead => lead.color === 'return'));
  assert.ok(connections.leads.filter(lead => !lead.id.endsWith('-return')).every(lead => lead.color === 'supply'));
});

test('vacuum terminals belong to electrical components and touch real conductive contacts', () => {
  const model = createVacuum(); model.root.updateWorldMatrix(true, true);
  for (const terminal of model.connections.terminals) {
    const part = model.parts.find(item => item.id === terminal.partId);
    assert.equal(part?.role, terminal.role, 'A wire must not attach to a cover, brush, or dust tray');
    assert.equal(terminal.anchor.parent, part.group);
    const point = terminal.anchor.getWorldPosition(new THREE.Vector3());
    let touchesMetal = false;
    part.group.traverse(object => {
      if (!object.isMesh || object.userData.excludeFromFrame || !(object.material?.metalness >= .5)) return;
      if (new THREE.Box3().setFromObject(object).expandByScalar(1e-6).containsPoint(point)) touchesMetal = true;
    });
    assert.ok(touchesMetal, `${terminal.id} has no physical conductive contact`);
  }
});

test('vacuum wires follow separating parts in moving root coordinates and hide when assembled', () => {
  const model = createVacuum(), terminals = new Map(model.connections.terminals.map(terminal => [terminal.id, terminal]));
  let index = 0;
  for (const progress of [0, .12, .13, .27, .5, .78, 1, .42, 0]) {
    model.root.position.set(Math.sin(index) * .52, -.3, Math.sin(index * .7) * .3);
    model.root.rotation.set(.13, index++ * .17, -.08);
    model.root.scale.set(1.1, .9, 1.05);
    separate(model, progress);
    const visible = progress > .12;
    assert.equal(model.connections.root.visible, visible);
    for (const terminal of terminals.values()) assert.equal(terminal.anchor.visible, visible);
    for (const lead of model.connections.leads) {
      for (const [endpoint, id] of [['start', lead.from], ['end', lead.to]]) {
        const expected = terminals.get(id).anchor.getWorldPosition(new THREE.Vector3()); model.root.worldToLocal(expected);
        assert.ok(lead[endpoint].distanceTo(expected) < 1e-8, `${lead.id} detaches at ${progress}`);
        assert.ok(lead.curve.getPoint(endpoint === 'start' ? 0 : 1).distanceTo(expected) < 1e-8);
      }
      assert.ok(lead.mesh.geometry.attributes.position.array.every(Number.isFinite));
      assert.equal(lead.mesh.material.opacity > 0, visible);
      assert.equal(lead.mesh.userData.excludeFromFrame, true);
      assert.equal(lead.mesh.castShadow, false); assert.equal(lead.mesh.receiveShadow, false);
      const intersections = []; lead.mesh.raycast(new THREE.Raycaster(), intersections); assert.deepEqual(intersections, []);
    }
  }
});

test('vacuum conductors stay clear of unrelated terminals and do not short separate circuit edges', () => {
  const model = createVacuum();
  for (const progress of [.13, .2, .27, .35, .43, .5, .6, .7, .82, .9, 1]) {
    separate(model, progress);
    const samples = new Map(model.connections.leads.map(lead => [lead.id, lead.curve.getPoints(240)]));
    for (const lead of model.connections.leads) for (const terminal of model.connections.terminals) {
      if ([lead.from, lead.to].includes(terminal.id)) continue;
      const clearance = lead.mesh.geometry.parameters.radius + terminal.contact.geometry.parameters.radius;
      for (const point of samples.get(lead.id)) assert.ok(point.distanceTo(terminal.point) > clearance, `${lead.id} touches ${terminal.id} at ${progress}`);
    }
    const leads = model.connections.leads;
    for (let i = 0; i < leads.length; i++) for (let j = i + 1; j < leads.length; j++) {
      const a = leads[i], b = leads[j];
      // Shared output/return junctions are intentional parallel circuit nodes.
      if ([a.from, a.to].some(id => [b.from, b.to].includes(id))) continue;
      const clearance = a.mesh.geometry.parameters.radius + b.mesh.geometry.parameters.radius;
      for (const pointA of samples.get(a.id)) for (const pointB of samples.get(b.id)) {
        assert.ok(pointA.distanceTo(pointB) > clearance, `${a.id} shorts to ${b.id} at ${progress}`);
      }
    }
  }
});

test('vacuum only animates its connected wheel and suction motors while assembled wires stay hidden', () => {
  const model = createVacuum();
  const driven = ['motor1-wheel-rotor', 'motor2-wheel-rotor', 'vacuum-suction-rotor'].map(name => model.root.getObjectByName(name));
  assert.ok(driven.every(Boolean));
  const initialRotations = driven.map(object => object.quaternion.clone());
  const brush = model.parts.find(part => part.id === 'brush').group;
  const brushPose = () => {
    const values = [];
    brush.traverse(object => values.push(...object.position.toArray(), ...object.quaternion.toArray()));
    return values;
  };
  const initialBrush = brushPose();
  model.setPowered(true); model.animate(.5, .05, true); model.updateConnections(0);
  driven.forEach((object, index) => assert.ok(object.quaternion.angleTo(initialRotations[index]) > .01, 'A connected motor does not turn'));
  assert.deepEqual(brushPose(), initialBrush, 'A brush without a motor or mechanical transmission must not turn by itself');
  assert.equal(model.connections.root.visible, false);
  assert.ok(model.connections.terminals.every(terminal => !terminal.anchor.visible));
  model.setPowered(false);
  const stoppedRotations = driven.map(object => object.quaternion.toArray());
  model.animate(1, .05, false);
  assert.deepEqual(driven.map(object => object.quaternion.toArray()), stoppedRotations);
  assert.deepEqual(model.root.position.toArray(), [0, 0, 0]);
});
