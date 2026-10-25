import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,transition,animationStep,devices} from '../dist/model.js';
test('disassemble animates, back reverses, refresh opens a powered-off circuit',()=>{
 let s=transition(initialState(),{type:'DISASSEMBLE'});assert.equal(s.view,'model');assert.equal(s.direction,1);
 s={...s,progress:.64};s=transition(s,{type:'BACK'});assert.equal(s.direction,-1);
 s=transition(s,{type:'REFRESH'});assert.equal(s.view,'circuit');assert.equal(s.direction,0);assert.equal(s.power,false);
});
test('all model tabs reset animation and power without carrying mismatched selections',()=>{
 for(const device of Object.keys(devices)){const s=transition({...initialState(),view:'circuit',power:true,selected:'led',progress:.76,direction:1},{type:'DEVICE',device});assert.equal(s.device,device);assert.equal(s.view,'model');assert.equal(s.progress,0);assert.equal(s.direction,0);assert.equal(s.power,false);assert.equal(s.selected,null);}
});
test('power can only run a connected component circuit',()=>{
 assert.equal(transition(initialState(),{type:'POWER'}).power,false);
 const s=transition(transition(initialState(),{type:'REFRESH'}),{type:'POWER'});assert.equal(s.power,true);assert.equal(transition(s,{type:'DISASSEMBLE'}).power,false);assert.equal(transition(s,{type:'BACK'}).power,false);
});
test('animation settles at both endpoints across frame rates and mid-animation reversals',()=>{
 for(const fps of [20,30,60,120]){let p=0,d=1;for(let i=0;i<fps*4;i++){const n=animationStep(p,d,1/fps);p=n.value;d=n.direction;}assert.equal(p,1);assert.equal(d,0);d=-1;for(let i=0;i<fps*4;i++){const n=animationStep(p,d,1/fps);p=n.value;d=n.direction;}assert.equal(p,0);assert.equal(d,0);}
});
test('parts from other devices cannot become selected',()=>assert.equal(transition({...initialState(),device:'fan'},{type:'SELECT',role:'led'}).selected,null));

test('disassemble after circuit view always replays the full animation',()=>{
 const s=transition({...initialState(),view:'circuit',progress:1,power:true},{type:'DISASSEMBLE'});assert.equal(s.progress,0);assert.equal(s.direction,1);assert.equal(s.power,false);
});
