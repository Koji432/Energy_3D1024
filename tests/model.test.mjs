import test from 'node:test';
import assert from 'node:assert/strict';
import {animationStep,circuitState,phase,statusFor} from '../dist/model.js';
test('disassembly reaches and stops at its endpoint across varying frame rates',()=>{
  for(const fps of [20,30,60,120]){let p=0,d=1;for(let i=0;i<fps*7;i++){const s=animationStep(p,d,1/fps);p=s.value;d=s.direction;}assert.equal(p,1);assert.equal(d,0);}
});
test('reassembly reverses from any scrubbed position and stops at zero',()=>{
  for(const start of [.1,.43,.9,1]){let p=start,d=-1;for(let i=0;i<500;i++){const s=animationStep(p,d,1/60);p=s.value;d=s.direction;}assert.equal(p,0);assert.equal(d,0);}
});
test('paused animation remains still',()=>assert.deepEqual(animationStep(.45,0,1),{value:.45,direction:0}));
test('disconnected exploded flashlight cannot light even if comparison switch was left on',()=>{
  assert.equal(circuitState('explore',true).lit,false);
  assert.equal(circuitState('circuit',false).lit,false);
  assert.equal(circuitState('circuit',true).lit,true);
});
test('components stay seated before their stage and settle exactly at the end',()=>{
  assert.equal(phase(.1,.3,.7),0);assert.equal(phase(.8,.3,.7),1);assert.equal(statusFor(0),'組み立てた状態');assert.equal(statusFor(1),'分解した状態');
});
