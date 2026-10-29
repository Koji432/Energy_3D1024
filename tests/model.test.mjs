import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,transition,animationStep,devices,partNames,canOperate} from '../dist/model.js';
test('the seven devices keep the requested order',()=>assert.deepEqual(Object.keys(devices),['flashlight','fan','cleaner','vacuum','controller','drone','roadster']));
test('view icon toggles circuit and product, clearing live circuit state',()=>{
 const a=transition({...initialState(),progress:1},{type:'TOGGLE_VIEW'});assert.equal(a.view,'circuit');assert.equal(a.power,false);
 const b=transition(transition(a,{type:'POWER'}),{type:'TOGGLE_VIEW'});assert.equal(b.view,'model');assert.equal(b.progress,0);assert.equal(b.power,false);assert.equal(b.selected,null);
});
test('disassemble and assemble use reversible animation',()=>{
 let s=transition(initialState(),{type:'DISASSEMBLE'});assert.equal(s.direction,1);
 s=transition({...s,progress:.64},{type:'ASSEMBLE'});assert.equal(s.direction,-1);assert.equal(s.power,false);
});
test('all model tabs reset animation and power without carrying mismatched selections',()=>{
 for(const device of Object.keys(devices)){const s=transition({...initialState(),view:'circuit',power:true,selected:'led',progress:.76,direction:1},{type:'DEVICE',device});assert.equal(s.device,device);assert.equal(s.view,'model');assert.equal(s.progress,0);assert.equal(s.direction,0);assert.equal(s.power,false);assert.equal(s.selected,null);}
});
test('assembled product and connected circuit switches operate, exploded products stay off',()=>{
 for(const device of Object.keys(devices)){
  const assembled={...initialState(),device};const on=transition(assembled,{type:'POWER'});assert.equal(on.power,true);assert.equal(transition(on,{type:'POWER'}).power,false);
  const opened=transition(on,{type:'DISASSEMBLE'});assert.equal(opened.power,false);assert.equal(canOperate(opened),false);assert.equal(transition(opened,{type:'POWER'}).power,false);
  for(const progress of [.01,.4,1])assert.equal(transition({...assembled,progress},{type:'POWER'}).power,false);
  const circuit=transition({...assembled,progress:1},{type:'TOGGLE_VIEW'});assert.equal(transition(circuit,{type:'POWER'}).power,true);
 }
});
test('animation settles at both endpoints at differing frame rates',()=>{
 for(const fps of [20,30,60,120]){let p=0,d=1;for(let i=0;i<fps*4;i++){const n=animationStep(p,d,1/fps);p=n.value;d=n.direction;}assert.equal(p,1);assert.equal(d,0);d=-1;for(let i=0;i<fps*4;i++){const n=animationStep(p,d,1/fps);p=n.value;d=n.direction;}assert.equal(p,0);assert.equal(d,0);}
});
test('parts from other devices cannot become selected',()=>assert.equal(transition({...initialState(),device:'cleaner'},{type:'SELECT',role:'led'}).selected,null));
test('disassemble after circuit view replays the full animation',()=>{
 const s=transition({...initialState(),view:'circuit',progress:1,power:true},{type:'DISASSEMBLE'});assert.equal(s.progress,0);assert.equal(s.direction,1);assert.equal(s.power,false);
});
test('Roadster electrical and gas parts select independently and clear when changing context',()=>{
 const roles=['source','switch','controller','motor','fan','actuator','valve','tank','thruster'];
 assert.deepEqual(devices.roadster.roles,roles);
 for(const role of roles){
  assert.ok(partNames[role],`Missing label for ${role}`);
  const circuit={...initialState(),device:'roadster',view:'circuit',power:true};
  const selected=transition(circuit,{type:'SELECT',role});
  assert.equal(selected.selected,role);
  assert.equal(transition(selected,{type:'SELECT',role}).selected,null);
  for(const action of [{type:'TOGGLE_VIEW'},{type:'DEVICE',device:'flashlight'},{type:'ASSEMBLE'}]){
   const reset=transition(selected,action);
   assert.equal(reset.selected,null,`${role} remains selected after ${action.type}`);
   assert.equal(reset.power,false,`${role} remains powered after ${action.type}`);
  }
 }
 for(const role of ['controller','fan','actuator','valve','tank','thruster']){
  const cleaner={...initialState(),device:'cleaner'};
  assert.equal(transition(cleaner,{type:'SELECT',role}).selected,null,`Unrelated ${role} selected in cleaner`);
 }
});
