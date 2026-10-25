import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,transition,animationStep,devices} from '../dist/model.js';
test('the five devices keep the requested order',()=>assert.deepEqual(Object.keys(devices),['flashlight','fan','cleaner','controller','drone']));
test('view icon toggles circuit and product, clearing live circuit state',()=>{
 const a=transition({...initialState(),progress:1},{type:'TOGGLE_VIEW'});assert.equal(a.view,'circuit');assert.equal(a.power,false);
 const b=transition(transition(a,{type:'POWER'}),{type:'TOGGLE_VIEW'});assert.equal(b.view,'model');assert.equal(b.progress,0);assert.equal(b.power,false);assert.equal(b.selected,null);
});
test('disassemble animates and back reverses',()=>{
 let s=transition(initialState(),{type:'DISASSEMBLE'});assert.equal(s.direction,1);
 s=transition({...s,progress:.64},{type:'BACK'});assert.equal(s.direction,-1);assert.equal(s.power,false);
});
test('all model tabs reset animation and power without carrying mismatched selections',()=>{
 for(const device of Object.keys(devices)){const s=transition({...initialState(),view:'circuit',power:true,selected:'led',progress:.76,direction:1},{type:'DEVICE',device});assert.equal(s.device,device);assert.equal(s.view,'model');assert.equal(s.progress,0);assert.equal(s.direction,0);assert.equal(s.power,false);assert.equal(s.selected,null);}
});
test('direct switch activation changes state once per activation and only in the circuit',()=>{
 assert.equal(transition(initialState(),{type:'POWER'}).power,false);
 const circuit=transition(initialState(),{type:'TOGGLE_VIEW'}),on=transition(circuit,{type:'POWER'}),off=transition(on,{type:'POWER'});
 assert.equal(on.power,true);assert.equal(on.selected,'switch');assert.equal(off.power,false);assert.equal(transition(on,{type:'DISASSEMBLE'}).power,false);
});
test('animation settles at both endpoints at differing frame rates',()=>{
 for(const fps of [20,30,60,120]){let p=0,d=1;for(let i=0;i<fps*4;i++){const n=animationStep(p,d,1/fps);p=n.value;d=n.direction;}assert.equal(p,1);assert.equal(d,0);d=-1;for(let i=0;i<fps*4;i++){const n=animationStep(p,d,1/fps);p=n.value;d=n.direction;}assert.equal(p,0);assert.equal(d,0);}
});
test('parts from other devices cannot become selected',()=>assert.equal(transition({...initialState(),device:'cleaner'},{type:'SELECT',role:'led'}).selected,null));
test('disassemble after circuit view replays the full animation',()=>{
 const s=transition({...initialState(),view:'circuit',progress:1,power:true},{type:'DISASSEMBLE'});assert.equal(s.progress,0);assert.equal(s.direction,1);assert.equal(s.power,false);
});
