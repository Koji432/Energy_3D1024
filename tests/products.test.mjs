import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';
const threeURL=new URL('../dist/vendor/three.module.js',import.meta.url).href;
async function loadFactory(id,name){const source=(await readFile(new URL(`../dist/models/${id}.js`,import.meta.url),'utf8')).replace("from 'three'",`from '${threeURL}'`);const module=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);return module[name]();}
function snapshot(root){const out=[];root.traverse(o=>{out.push(...o.position.toArray(),...o.quaternion.toArray(),o.visible?1:0,o.material?.emissiveIntensity??0,o.intensity??0);});return out;}
for(const [id,name]of [['flashlight','createFlashlight'],['fan','createFan'],['cleaner','createCleaner'],['vacuum','createVacuum'],['controller','createController'],['drone','createDrone']]){
 test(`${id}: exposed switch receives clicks, power acts, off stops motion`,async()=>{
  const model=await loadFactory(id,name);model.root.updateMatrixWorld(true);
  const direction=(model.viewDirection||new THREE.Vector3(...(id==='fan'?[.22,.12,1]:id==='drone'?[.57,.7,.8]:[-.25,.3,1]))).clone().normalize();
  const targets=[];model.root.traverse(o=>{if(o.isMesh&&o.userData.part==='switch')targets.push(o);});
  assert.ok(targets.length,`${id} has no switch`);
  const ray=new THREE.Raycaster(),point=new THREE.Vector3();
  const canClick=targets.some(target=>{target.getWorldPosition(point);ray.set(point.clone().addScaledVector(direction,40),direction.clone().negate());return ray.intersectObject(model.root,true)[0]?.object.userData.part==='switch';});
  assert.ok(canClick,`${id} switch is hidden behind housing`);
  const before=snapshot(model.root);model.setPowered(true);assert.notDeepEqual(snapshot(model.root),before,`${id} has no powered indication`);
  if(model.animate){const start=snapshot(model.root);model.animate(.5,.016,true);assert.notDeepEqual(snapshot(model.root),start,`${id} has no operating motion`);}
  model.setPowered(false);const stopped=snapshot(model.root);model.animate?.(1,.016,false);assert.deepEqual(snapshot(model.root),stopped,`${id} continues moving after off`);
 });
}
