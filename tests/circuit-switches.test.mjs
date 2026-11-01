import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';

const threeURL=new URL('../dist/vendor/three.module.js',import.meta.url).href;
const source=(await readFile(new URL('../dist/circuits.js',import.meta.url),'utf8')).replace("from 'three'",`from '${threeURL}'`);
const {createCircuit}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

for(const id of ['flashlight','cleaner'])test(`${id}: the component circuit has a reachable push button that depresses and resets`,()=>{
 const circuit=createCircuit(id),button=circuit.root.getObjectByName(`${id}-circuit-push-button`);
 assert.ok(button?.userData.powerControl);
 const rest=button.position.clone();
 for(const powered of [true,false,true,false]){
  circuit.setPowered(powered);circuit.root.updateMatrixWorld(true);
  assert.equal(button.position.x,rest.x);assert.equal(button.position.z,rest.z);
  if(powered)assert.ok(button.position.y<rest.y);else assert.equal(button.position.y,rest.y);
  const center=button.getWorldPosition(new THREE.Vector3());
  const ray=new THREE.Raycaster(center.clone().add(new THREE.Vector3(0,10,0)),new THREE.Vector3(0,-1,0));
  assert.equal(ray.intersectObject(circuit.root,true)[0]?.object.userData.part,'switch');
 }
});

test('other component circuits keep their switch travel and reset when deactivated',()=>{
 for(const id of ['fan','vacuum','controller','drone','roadster']){
  const circuit=createCircuit(id),group=circuit.parts.find(part=>part.role==='switch').group;
  const positions=()=>group.children.map(object=>object.position.toArray());
  const rest=positions();circuit.setPowered(true);assert.notDeepEqual(positions(),rest,id);
  circuit.setPowered(false);assert.deepEqual(positions(),rest,id);
 }
});
