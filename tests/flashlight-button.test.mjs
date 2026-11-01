import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';

const threeURL = new URL('../dist/vendor/three.module.js', import.meta.url).href;
const helperSource = (await readFile(new URL('../dist/models/exploded-wiring.js', import.meta.url), 'utf8')).replace("from 'three'", `from '${threeURL}'`);
const helperURL = `data:text/javascript;base64,${Buffer.from(helperSource).toString('base64')}`;
async function loadFlashlight() {
  const source = (await readFile(new URL('../dist/models/flashlight.js', import.meta.url), 'utf8'))
    .replace("from 'three'", `from '${threeURL}'`)
    .replace("from './exploded-wiring.js'", `from '${helperURL}'`);
  return (await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)).createFlashlight();
}

test('flashlight circular button presses straight down, latches with the light on, and returns when off', async () => {
  const model = await loadFlashlight();
  const button = model.root.getObjectByName('flashlight-power-button');
  assert.ok(button?.isMesh); assert.equal(button.geometry.type, 'CylinderGeometry');
  assert.ok(button.geometry.parameters.radiusTop >= .22);
  assert.equal(button.userData.part, 'switch'); assert.equal(button.userData.powerControl, true);
  const led = model.root.getObjectByName('flashlight-led-chip');
  const light = model.root.children.find(object => object.isPointLight);
  const offPosition = button.position.clone(), offQuaternion = button.quaternion.clone();
  const terminals = model.connections.terminals.filter(terminal => terminal.node === 'switch');
  const terminalPositions = terminals.map(terminal => terminal.anchor.position.toArray());
  assert.equal(led.material.emissiveIntensity, 0); assert.equal(light.intensity, 0);
  model.setPowered(true);
  assert.ok(offPosition.y - button.position.y > .04, 'The cap must visibly press down');
  assert.equal(button.position.x, offPosition.x); assert.equal(button.position.z, offPosition.z);
  assert.deepEqual(button.quaternion.toArray(), offQuaternion.toArray());
  assert.ok(led.material.emissiveIntensity > 1); assert.ok(light.intensity > 0);
  const onPosition = button.position.toArray(); model.setPowered(true); assert.deepEqual(button.position.toArray(), onPosition);
  model.setPowered(false);
  assert.deepEqual(button.position.toArray(), offPosition.toArray());
  assert.equal(led.material.emissiveIntensity, 0); assert.equal(light.intensity, 0);
  assert.deepEqual(terminals.map(terminal => terminal.anchor.position.toArray()), terminalPositions, 'Pressing the cap must not move its side wire contacts');
});

test('flashlight push button can be hit from the assembled view both raised and pressed', async () => {
  const model = await loadFlashlight();
  const button = model.root.getObjectByName('flashlight-power-button');
  const direction = new THREE.Vector3(-.25, .3, 1).normalize();
  for (const on of [false, true, false]) {
    model.setPowered(on); model.root.updateMatrixWorld(true);
    const target = button.getWorldPosition(new THREE.Vector3());
    const ray = new THREE.Raycaster(target.clone().addScaledVector(direction, 40), direction.clone().negate());
    const hit = ray.intersectObject(model.root, true)[0];
    assert.equal(hit?.object.userData.part, 'switch', `The ${on ? 'pressed' : 'raised'} button is hidden behind the body`);
  }
  assert.equal(typeof model.updateConnections, 'function');
});
