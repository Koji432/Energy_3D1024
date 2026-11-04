import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';
import {phase} from '../dist/model.js';

const threeURL=new URL('../dist/vendor/three.module.js',import.meta.url).href;
const helperSource=(await readFile(new URL('../dist/models/exploded-wiring.js',import.meta.url),'utf8')).replace("from 'three'",`from '${threeURL}'`);
const helperURL=`data:text/javascript;base64,${Buffer.from(helperSource).toString('base64')}`;
const cleanerSource=(await readFile(new URL('../dist/models/cleaner.js',import.meta.url),'utf8'))
  .replace("from 'three'",`from '${threeURL}'`)
  .replace("from './exploded-wiring.js'",`from '${helperURL}'`);
const {createCleaner}=await import(`data:text/javascript;base64,${Buffer.from(cleanerSource).toString('base64')}`);
function move(model,progress) {
  for(const part of model.parts)part.group.position.lerpVectors(part.home,part.away,phase(progress,part.start,part.end));
  model.updateConnections(progress);
}
function traceCircuit(connections,start,end) {
  const graph=new Map(connections.terminals.map(t=>[t.id,[]]));
  function join(a,b){graph.get(a).push(b);graph.get(b).push(a);}
  for(const lead of connections.leads)join(lead.from,lead.to);
  for(const component of connections.components)if(component.kind!=='ac-source')join(...component.terminals);
  const path=[start];let previous=null;
  while(path.at(-1)!==end&&path.length<=graph.size) {
    const current=path.at(-1),next=graph.get(current).filter(id=>id!==previous);
    assert.equal(next.length,1,`Missing connection or unintended branch at ${current}`);
    previous=current;path.push(next[0]);
  }
  assert.equal(path.at(-1),end,'The circuit never returns to its AC cord');
  return path;
}

test('cleaner uses two AC conductors and a complete switched motor path with no mechanical nodes',()=>{
  const model=createCleaner(),connections=model.connections;
  assert.equal(typeof model.updateConnections,'function');
  assert.equal(connections.components.find(c=>c.id==='source').kind,'ac-source');
  assert.deepEqual(traceCircuit(connections,'supply-a','supply-b'),[
    'supply-a','switch-input','switch-output','motor-input','motor-return','supply-b',
  ]);
  assert.deepEqual(connections.components.map(c=>c.id).sort(),['motor','source','switch']);
  assert.ok(connections.terminals.every(t=>t.polarity===undefined),'AC conductors must not be given battery polarity');
  assert.equal(connections.leads.length,3);
  assert.equal(connections.leads.find(l=>l.id==='motor-return').color,'return');
  assert.ok(connections.leads.filter(l=>l.id!=='motor-return').every(l=>l.color==='supply'));
  for(const terminal of connections.terminals) {
    const part=model.parts.find(p=>p.id===terminal.partId);
    assert.equal(part?.role,terminal.role);
    assert.ok(['source','switch','motor'].includes(terminal.node));
    assert.equal(terminal.anchor.parent,part.group);
  }
});

test('every cleaner terminal is on a real metal contact instead of a free hanging wire stub',()=>{
  const model=createCleaner();model.root.updateWorldMatrix(true,true);
  for(const terminal of model.connections.terminals) {
    const point=terminal.anchor.getWorldPosition(new THREE.Vector3()),part=model.parts.find(p=>p.id===terminal.partId);
    let touchesMetal=false;
    part.group.traverse(object=>{
      if(!object.isMesh||object.userData.excludeFromFrame||!(object.material?.metalness>=.5))return;
      if(new THREE.Box3().setFromObject(object).expandByScalar(1e-6).containsPoint(point))touchesMetal=true;
    });
    assert.ok(touchesMetal,`${terminal.id} is not attached to a conductive contact`);
  }
});

test('cleaner leads stay connected while parts separate and reassemble under a model transform',()=>{
  const model=createCleaner();
  model.root.position.set(1.7,-.4,2.3);model.root.rotation.set(.15,-.25,.1);
  const terminals=new Map(model.connections.terminals.map(t=>[t.id,t]));
  for(const progress of [0,.12,.13,.25,.5,.8,1,.45,0]) {
    move(model,progress);
    const visible=progress>.12;
    assert.equal(model.connections.root.visible,visible);
    for(const terminal of terminals.values())assert.equal(terminal.anchor.visible,visible);
    for(const lead of model.connections.leads) {
      for(const [endpoint,id]of [['start',lead.from],['end',lead.to]]) {
        const expected=terminals.get(id).anchor.getWorldPosition(new THREE.Vector3());model.root.worldToLocal(expected);
        assert.ok(lead[endpoint].distanceTo(expected)<1e-8,`${lead.id} loses ${endpoint} at ${progress}`);
        assert.ok(lead.curve.getPoint(endpoint==='start'?0:1).distanceTo(expected)<1e-8);
      }
      assert.ok(lead.mesh.geometry.attributes.position.array.every(Number.isFinite));
      assert.equal(lead.mesh.material.opacity>0,visible);
      assert.equal(lead.mesh.userData.excludeFromFrame,true);
      assert.equal(lead.mesh.castShadow,false);assert.equal(lead.mesh.receiveShadow,false);
      const intersections=[];lead.mesh.raycast(new THREE.Raycaster(),intersections);assert.equal(intersections.length,0);
    }
  }
});

test('cleaner red feed and blue return do not touch each other or an unrelated contact',()=>{
  const model=createCleaner();
  for(const progress of [.13,.35,.6,1]) {
    move(model,progress);
    const samples=new Map(model.connections.leads.map(l=>[l.id,l.curve.getPoints(220)]));
    for(const lead of model.connections.leads)for(const terminal of model.connections.terminals) {
      if([lead.from,lead.to].includes(terminal.id))continue;
      for(const point of samples.get(lead.id))assert.ok(point.distanceTo(terminal.point)>.13,`${lead.id} touches ${terminal.id} at ${progress}`);
    }
    const returnPoints=samples.get('motor-return');
    for(const lead of model.connections.leads.filter(l=>l.color==='supply'))for(const a of samples.get(lead.id))for(const b of returnPoints) {
      assert.ok(a.distanceTo(b)>.136,`${lead.id} shorts to the return conductor at ${progress}`);
    }
  }
});

test('cleaner pushbutton depresses inward, stays clickable, and returns after switching off',()=>{
  const model=createCleaner(),button=model.root.getObjectByName('cleaner-power-button');
  assert.ok(button,'Missing physical pushbutton');
  const offPosition=button.position.clone(),offRotation=button.rotation.clone();
  for(const powered of [false,true,false]) {
    model.setPowered(powered);model.root.updateWorldMatrix(true,true);
    assert.equal(button.position.x,offPosition.x);assert.equal(button.position.y,offPosition.y);
    assert.deepEqual(button.rotation.toArray(),offRotation.toArray(),'The control must press, not rock');
    if(powered)assert.ok(button.position.z<offPosition.z-.04,'The front button never depresses into its bezel');
    else assert.equal(button.position.z,offPosition.z);
    const target=model.root.getObjectByName('cleaner-power-hit-area').getWorldPosition(new THREE.Vector3());
    const direction=model.viewDirection.clone().normalize(),ray=new THREE.Raycaster();
    ray.set(target.clone().addScaledVector(direction,40),direction.negate());
    assert.equal(ray.intersectObject(model.root,true)[0]?.object.userData.part,'switch','The assembled housing obscures the button');
    assert.equal(model.connections.root.visible,false,'Assembled wires must remain hidden when pressing the button');
  }
});

test('cleaner motor contacts feed its fixed winding through the same moving motor assembly',()=>{
  const model=createCleaner(),motor=model.parts.find(part=>part.id==='motor').group;
  const winding=model.root.getObjectByName('cleaner-motor-winding');
  assert.equal(winding?.parent,motor,'The visible winding must belong to the wired motor, not to another decorative part');
  assert.ok(winding.material.metalness>=.5);
  model.root.position.set(.8,-.6,1.3);model.root.rotation.set(.1,-.2,.15);
  const curve=winding.geometry.parameters.path;
  for(const progress of [0,.3,.6,1,.4,0]) {
    move(model,progress);model.root.updateWorldMatrix(true,true);
    for(const [end,id]of [[0,'motor-input'],[1,'motor-return']]) {
      const contact=model.connections.terminals.find(terminal=>terminal.id===id).anchor.getWorldPosition(new THREE.Vector3());
      const coilEnd=curve.getPoint(end).applyMatrix4(winding.matrixWorld);
      assert.ok(contact.distanceTo(coilEnd)<1e-8,`${id} disconnects from the winding at ${progress}`);
    }
  }
});

test('cleaner electrically driven rotor, shaft and suction impeller are physically joined on one axis',()=>{
  const model=createCleaner(),motor=model.parts.find(part=>part.id==='motor').group;
  const train=model.root.getObjectByName('cleaner-motor-drive-train');
  const rotor=model.root.getObjectByName('cleaner-motor-rotor');
  const shaft=model.root.getObjectByName('cleaner-motor-shaft');
  const hub=model.root.getObjectByName('cleaner-blower-hub');
  assert.equal(train?.parent,motor);assert.deepEqual(model.rotors,[train]);
  for(const component of [rotor,shaft,hub])assert.equal(component?.parent,train);
  assert.equal(rotor.position.x,shaft.position.x);assert.equal(rotor.position.z,shaft.position.z);
  assert.equal(hub.position.x,shaft.position.x);assert.equal(hub.position.z,shaft.position.z);
  for(const progress of [0,.5,1]) {
    move(model,progress);model.root.updateWorldMatrix(true,true);
    const shaftBox=new THREE.Box3().setFromObject(shaft);
    assert.ok(shaftBox.intersectsBox(new THREE.Box3().setFromObject(rotor)),'The shaft floats above its driving rotor');
    assert.ok(shaftBox.intersectsBox(new THREE.Box3().setFromObject(hub)),'The impeller is disconnected from its shaft');
  }
  move(model,0);model.root.updateWorldMatrix(true,true);
  const before=rotor.getWorldQuaternion(new THREE.Quaternion());
  model.setPowered(true);for(let frame=0;frame<20;frame++)model.animate(frame/60,1/60,true);
  model.root.updateWorldMatrix(true,true);
  const after=rotor.getWorldQuaternion(new THREE.Quaternion());
  assert.ok(before.angleTo(after)>.1,'Electrical power never reaches the driving rotor');
  assert.ok(after.angleTo(hub.getWorldQuaternion(new THREE.Quaternion()))<1e-8,'The motor and impeller do not share their rotation');
});

test('cleaner passive brushes stay still, and the motor cannot rotate after electrical power is switched off',()=>{
  const model=createCleaner(),brushes=model.parts.find(part=>part.id==='brushes').group;
  const train=model.root.getObjectByName('cleaner-motor-drive-train');
  const winding=model.root.getObjectByName('cleaner-motor-winding');
  const rotations=group=>{const result=[];group.traverse(object=>result.push(...object.quaternion.toArray()));return result;};
  const brushRotations=rotations(brushes),fixedWindingRotation=winding.quaternion.toArray();
  const passive=[];brushes.traverse(object=>{if(object.userData.passive)passive.push(object);});
  assert.equal(passive.length,2);assert.ok(passive.every(object=>!model.rotors.includes(object)));
  model.setPowered(true);for(let frame=0;frame<60;frame++)model.animate(frame/60,1/60,true);
  assert.deepEqual(rotations(brushes),brushRotations,'Unconnected brushes must not appear electrically driven');
  assert.deepEqual(winding.quaternion.toArray(),fixedWindingRotation,'The fixed electrical winding must not spin with the shaft');
  model.setPowered(false);const stopped=train.quaternion.toArray();
  for(let frame=0;frame<10;frame++)model.animate(2+frame/60,1/60,true);
  assert.deepEqual(train.quaternion.toArray(),stopped,'A true animation flag must not bypass the actual power state');
  model.setPowered(true);model.animate(3,.1,false);
  assert.deepEqual(train.quaternion.toArray(),stopped,'A disabled animation frame must not advance the shaft');
});

test('all cleaner impeller vanes join their rotating hub through a backplate clear of the fixed casing',()=>{
  const model=createCleaner(),train=model.root.getObjectByName('cleaner-motor-drive-train');
  const backplate=model.root.getObjectByName('cleaner-impeller-backplate');
  const hub=model.root.getObjectByName('cleaner-blower-hub');
  const casing=model.root.getObjectByName('cleaner-fixed-blower-plate');
  assert.equal(backplate?.parent,train);
  model.root.updateWorldMatrix(true,true);
  const plateBox=new THREE.Box3().setFromObject(backplate);
  assert.ok(plateBox.intersectsBox(new THREE.Box3().setFromObject(hub)),'The support disk floats away from its hub');
  assert.ok(plateBox.min.y>new THREE.Box3().setFromObject(casing).max.y,'The rotating support disk intersects the fixed casing');
  assert.ok(new THREE.Box3().setFromObject(hub).min.y>new THREE.Box3().setFromObject(casing).max.y,'The hub rubs against the fixed casing');
  const vanes=train.children.filter(object=>object.name.startsWith('cleaner-impeller-vane-'));
  assert.equal(vanes.length,9);
  for(const vane of vanes){
    assert.equal(vane.parent,train);
    assert.ok(plateBox.intersectsBox(new THREE.Box3().setFromObject(vane)),`${vane.name} floats above its support`);
    const vertices=vane.geometry.attributes.position,point=new THREE.Vector3();
    for(let i=0;i<vertices.count;i++){
      point.fromBufferAttribute(vertices,i).applyMatrix4(vane.matrixWorld);train.worldToLocal(point);
      assert.ok(Math.hypot(point.x,point.z)<backplate.geometry.parameters.radiusTop,'A vane extends beyond its support disk');
    }
  }
});
