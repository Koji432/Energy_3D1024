import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';
const threeURL=new URL('../dist/vendor/three.module.js',import.meta.url).href;
async function loadFactory(id,name){const source=(await readFile(new URL(`../dist/models/${id}.js`,import.meta.url),'utf8')).replace("from 'three'",`from '${threeURL}'`);const module=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);return module[name]();}
function snapshot(root){const out=[];root.traverse(o=>{out.push(...o.position.toArray(),...o.quaternion.toArray(),o.visible?1:0,o.material?.emissiveIntensity??0,o.intensity??0);});return out;}
for(const [id,name]of [['flashlight','createFlashlight'],['fan','createFan'],['cleaner','createCleaner'],['vacuum','createVacuum'],['controller','createController'],['drone','createDrone'],['roadster','createRoadster']]){
 test(`${id}: exposed switch receives clicks, power acts, off stops motion`,async()=>{
  const model=await loadFactory(id,name);model.root.updateMatrixWorld(true);
  const direction=(model.viewDirection||new THREE.Vector3(...(id==='fan'?[.22,.12,1]:id==='drone'?[.57,.7,.8]:[-.25,.3,1]))).clone().normalize();
  const targets=[];model.root.traverse(o=>{if(o.isMesh&&o.userData.part==='switch')targets.push(o);});
  assert.ok(targets.length,`${id} has no switch`);
  const ray=new THREE.Raycaster(),point=new THREE.Vector3();
  const canClick=targets.some(target=>{target.getWorldPosition(point);ray.set(point.clone().addScaledVector(direction,40),direction.clone().negate());return ray.intersectObject(model.root,true)[0]?.object.userData.part==='switch';});
  assert.ok(canClick,`${id} switch is hidden behind housing`);
  const before=snapshot(model.root);model.setPowered(true);assert.notDeepEqual(snapshot(model.root),before,`${id} has no powered indication`);
  if(model.animate){const start=snapshot(model.root);let moved=false;for(let frame=0;frame<60;frame++){model.animate(frame/60,1/60,true);if(snapshot(model.root).some((value,index)=>value!==start[index]))moved=true;}assert.ok(moved,`${id} has no operating motion`);}
  model.setPowered(false);const stopped=snapshot(model.root);model.animate?.(1,.016,false);assert.deepEqual(snapshot(model.root),stopped,`${id} continues moving after off`);
 });
}
test('Roadster lifts once, lands, stays landed while on, and resets for another operation',async()=>{
 const model=await loadFactory('roadster','createRoadster');
 const homePosition=model.root.position.clone(),homeQuaternion=model.root.quaternion.clone();
 assert.ok(Number.isFinite(model.demonstrationDuration)&&model.demonstrationDuration>0,'Missing finite demonstration duration');
 const dt=1/60;
 for(let cycle=0;cycle<2;cycle++){
  model.setPowered(true);
  let maximumLift=0;
  for(let frame=0;frame<Math.ceil((model.demonstrationDuration+1)/dt);frame++){
   model.animate(frame*dt,dt,true);
   maximumLift=Math.max(maximumLift,model.root.position.y-homePosition.y);
   assert.ok(snapshot(model.root).every(Number.isFinite),'Nonfinite transform or light state during flight');
  }
  assert.ok(maximumLift>.05,'The product never lifts');
  assert.ok(model.root.position.distanceTo(homePosition)<1e-8,'The demonstration never lands');
  assert.ok(model.root.quaternion.angleTo(homeQuaternion)<1e-8,'The product remains tilted after landing');
  // Reapplying the powered state must not repeatedly restart a finite demo.
  model.setPowered(true);
  for(let frame=0;frame<120;frame++)model.animate(frame*dt,dt,true);
  assert.ok(model.root.position.distanceTo(homePosition)<1e-8,'The demonstration restarts while still powered');
  model.setPowered(false);
  assert.deepEqual(model.root.position.toArray(),homePosition.toArray());
  assert.deepEqual(model.root.quaternion.toArray(),homeQuaternion.toArray());
  const stopped=snapshot(model.root);model.animate(100,dt,false);assert.deepEqual(snapshot(model.root),stopped);
 }
 model.setPowered(true);
 let airborne=false;
 for(let frame=0;frame<Math.ceil(model.demonstrationDuration/dt);frame++){
  model.animate(frame*dt,dt,true);
  if(model.root.position.y-homePosition.y>.05){airborne=true;break;}
 }
 assert.ok(airborne,'The restarted product never lifts');
 model.setPowered(false);
 assert.deepEqual(model.root.position.toArray(),homePosition.toArray(),'Stopping in flight must reset position');
 assert.deepEqual(model.root.quaternion.toArray(),homeQuaternion.toArray(),'Stopping in flight must reset tilt');
 const interrupted=snapshot(model.root);model.animate(200,dt,false);assert.deepEqual(snapshot(model.root),interrupted);
});
