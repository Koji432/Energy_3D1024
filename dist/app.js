import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {phase,animationStep,initialState,transition,devices,partNames,canOperate} from './model.js';
import {createFlashlight} from './models/flashlight.js';
import {createFan} from './models/fan.js';
import {createCleaner} from './models/cleaner.js';
import {createController} from './models/controller.js';
import {createVacuum} from './models/vacuum.js';
import {circuitIcon,productIcon,deviceIcons,disassembleIcon,assembleIcon} from './icons.js';
import {createDrone} from './models/drone.js';
import {createRoadster} from './models/roadster.js';
import {createCircuit,diagramMarkup} from './circuits.js';
const $=id=>document.getElementById(id);
for(const b of document.querySelectorAll('[data-device]'))b.innerHTML=deviceIcons[b.dataset.device];
$('disassemble').innerHTML=disassembleIcon;$('view-toggle').innerHTML=circuitIcon;
let state=initialState(),manualView=false,highlighted=new Map();
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const viewport=$('viewport'),scene=new THREE.Scene();
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}
catch(error){$('loading').textContent='3D表示を開始できませんでした。';document.querySelectorAll('button').forEach(b=>b.disabled=true);throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xf3f5f7,1);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
viewport.prepend(renderer.domElement);
const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,200);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.1;controls.enablePan=false;controls.minZoom=.45;controls.maxZoom=4;controls.maxPolarAngle=Math.PI*.9;
scene.add(new THREE.HemisphereLight(0xffffff,0xa1b0c4,2.6));
const key=new THREE.DirectionalLight(0xfff8ed,3.2);key.position.set(-6,12,10);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-15,right:15,top:15,bottom:-15});key.shadow.normalBias=.04;scene.add(key);
const fill=new THREE.DirectionalLight(0xd5e7ff,2);fill.position.set(7,4,-7);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(150,150),new THREE.ShadowMaterial({color:0x1d314b,opacity:.12}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const constructors={flashlight:createFlashlight,fan:createFan,cleaner:createCleaner,vacuum:createVacuum,controller:createController,drone:createDrone,roadster:createRoadster},models={},circuits={};
function ensureModel(id){if(!models[id]){models[id]=constructors[id]();for(const p of models[id].parts)p.group.traverse(o=>{if(o.isMesh&&!o.userData.part)o.userData.part=o.userData.role||p.role;});scene.add(models[id].root);}return models[id];}
function ensureCircuit(id){if(!circuits[id]){circuits[id]=createCircuit(id);scene.add(circuits[id].root);}return circuits[id];}
function activeModel(){return state.view==='circuit'?ensureCircuit(state.device):ensureModel(state.device);}
function showActive(){
 for(const m of Object.values(models))m.root.visible=false;
 for(const m of Object.values(circuits))m.root.visible=false;
 const active=activeModel();active.root.visible=true;
 floor.position.y=state.view==='circuit'?-.65:active.floorY??(state.device==='fan'?-4.3:state.device==='drone'?-1.55:-1.8);
 if(state.view==='model')for(const p of active.parts)p.group.position.lerpVectors(p.home,p.away,phase(state.progress,p.start,p.end));
 scene.updateMatrixWorld(true);
}
const bounds=new THREE.Box3(),center=new THREE.Vector3(),right=new THREE.Vector3(),up=new THREE.Vector3();
function frameModel(){
 if(manualView)return;
 const active=activeModel();scene.updateMatrixWorld(true);bounds.setFromObject(active.root);bounds.getCenter(center);
 const direction=state.view==='circuit'?new THREE.Vector3(.03,.86,.51):active.viewDirection?active.viewDirection.clone():state.device==='fan'?new THREE.Vector3(.22,.12,1):state.device==='drone'?new THREE.Vector3(.57,.7,.8):new THREE.Vector3(-.25,.3,1);
 direction.normalize();right.crossVectors(new THREE.Vector3(0,1,0),direction).normalize();up.crossVectors(direction,right).normalize();
 let minW=Infinity,maxW=-Infinity,minH=Infinity,maxH=-Infinity;
 const corner=new THREE.Vector3();
 active.root.traverse(o=>{
  if(!o.isMesh||o.userData.excludeFromFrame||!o.visible)return;
  if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
  const box=o.geometry.boundingBox;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
   corner.set(x,y,z).applyMatrix4(o.matrixWorld);
   const w=corner.dot(right),h=corner.dot(up);minW=Math.min(minW,w);maxW=Math.max(maxW,w);minH=Math.min(minH,h);maxH=Math.max(maxH,h);
  }
 });
 center.addScaledVector(right,(minW+maxW)/2-center.dot(right));
 center.addScaledVector(up,(minH+maxH)/2-center.dot(up));
 const motionMargin=state.view==='model'&&state.progress===0?(active.motionHeight||0):0;
 center.addScaledVector(up,motionMargin/2);
 const halfW=(maxW-minW)/2,halfH=(maxH-minH)/2+motionMargin/2;
 const aspect=viewport.clientWidth/Math.max(1,viewport.clientHeight);
 const padding=state.view==='circuit'?1.29:state.progress>.1?1.23:1.17;
 const half=Math.max(halfH,halfW/aspect)*padding;
 camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.zoom=1;
 camera.position.copy(center).addScaledVector(direction,35);controls.target.copy(center);camera.up.set(0,1,0);camera.lookAt(center);camera.updateProjectionMatrix();controls.update();
}
let lastWidth=0,lastHeight=0;
new ResizeObserver(()=>{
 const w=viewport.clientWidth,h=viewport.clientHeight;if(!w||!h)return;
 renderer.setSize(w,h);if(Math.abs(w-lastWidth)>1||Math.abs(h-lastHeight)>1){manualView=false;frameModel();lastWidth=w;lastHeight=h;}
}).observe(viewport);
controls.addEventListener('start',()=>{manualView=true;});
$('view-reset').addEventListener('click',()=>{manualView=false;frameModel();});
let labelEntries=[];
function rebuildLabels(){
 $('labels').replaceChildren();labelEntries=[];const lines=document.createElementNS('http://www.w3.org/2000/svg','svg');lines.classList.add('label-lines');$('labels').append(lines);
 for(const p of activeModel().parts){
  if(!p.label||!p.role)continue;
  const el=document.createElement('span');el.className='part-label';el.textContent=/^motor[1-4]$/.test(p.role)?(state.view==='circuit'?'M'+p.role.slice(5):partNames[p.role]):p.label;$('labels').append(el);const line=document.createElementNS('http://www.w3.org/2000/svg','path');lines.append(line);labelEntries.push({part:p,el,line});
 }
}
function clearHighlights(){for(const [m,original]of highlighted){m.material.dispose();m.material=original;}highlighted.clear();}
function updateSelection(){
 clearHighlights();
 for(const el of document.querySelectorAll('[data-part]')){
  const selected=el.dataset.part===state.selected;el.classList.toggle('selected',selected);if(el.tagName==='BUTTON')el.setAttribute('aria-pressed',String(selected));
 }
 for(const {part,el}of labelEntries)el.classList.toggle('selected',!!state.selected&&part.role===state.selected);
 if(!state.selected||(state.view==='model'&&canOperate(state)))return;
 activeModel().root.traverse(o=>{if(o.isMesh&&o.userData.part===state.selected&&o.material?.isMeshStandardMaterial){const original=o.material,material=original.clone();material.emissive=new THREE.Color(0xb87400);material.emissiveIntensity=.35;highlighted.set(o,original);o.material=material;}});
}
function updatePower(){
 const powered=canOperate(state)&&state.power;
 clearHighlights();
 for(const [id,model]of Object.entries(models))model.setPowered?.(powered&&state.view==='model'&&id===state.device);
 for(const [id,circuit]of Object.entries(circuits))circuit.setPowered?.(powered&&state.view==='circuit'&&id===state.device);
 $('app').dataset.power=powered?'on':'off';
 document.body.classList.toggle('powered',powered);
 document.querySelectorAll('[data-part="switch"][role="switch"]').forEach(el=>el.setAttribute('aria-checked',String(powered)));
 document.querySelectorAll('.switch-arm').forEach(el=>el.setAttribute('d',powered?el.dataset.closed:el.dataset.open));
 if(state.view!=='circuit')return;
 const c=ensureCircuit(state.device);
 clearHighlights();
 for(const m of c.ledMeshes||[]){if(m.material?.emissive){m.material.emissive.setHex(0xffd249);m.material.emissiveIntensity=powered?2:0;}}
 c.root.traverse(o=>{if(o.userData.lever){if(o.userData.offX===undefined)o.userData.offX=o.position.x;o.position.x=o.userData.offX+(powered?.24:0);}});
 updateSelection();
}
const partColors={source:'#dc9735',switch:'#47799c',resistor:'#bb6546',led:'#cfad23',motor:'#647f94',controller:'#379566',fan:'#647f94',actuator:'#647f94',valve:'#b67c27',tank:'#b67c27',thruster:'#b67c27'};
function buildDiagram(){
 $('schematic').innerHTML=diagramMarkup(state.device);
 $('schematic').setAttribute('viewBox',state.device==='roadster'?'0 0 640 650':'0 0 640 560');
 $('part-buttons').replaceChildren();
 for(const role of devices[state.device].roles){if(role==='switch')continue;const b=document.createElement('button');b.className='part-button';b.dataset.part=role;b.textContent=devices[state.device].partNames?.[role]||partNames[role];b.setAttribute('aria-pressed','false');b.style.setProperty('--part-color',partColors[role]||'#647f94');$('part-buttons').append(b);}
}
function syncUI(){
 document.body.classList.toggle('circuit-view',state.view==='circuit');document.body.classList.toggle('drone-view',state.device==='drone');document.body.classList.toggle('roadster-view',state.device==='roadster');
 $('model-title').textContent=state.device==='roadster'?'部品と機構':'部品の回路';$('diagram-panel').querySelector('h2').textContent=state.device==='roadster'?'回路・機構図':'回路図';
 $('view-toggle').innerHTML=state.view==='circuit'?productIcon:circuitIcon;
 $('view-toggle').setAttribute('aria-label',state.view==='circuit'?'電気製品を表示':'電気回路を表示');$('view-toggle').setAttribute('aria-pressed',String(state.view==='circuit'));
 $('diagram-panel').hidden=state.view!=='circuit';$('model-title').hidden=state.view!=='circuit';$('part-buttons').hidden=state.view!=='circuit';
 const assembling=state.view==='model'&&(state.direction>0||(state.direction===0&&state.progress>0));
 $('disassemble').innerHTML=assembling?assembleIcon:disassembleIcon;$('disassemble').setAttribute('aria-label',assembling?'組み立て':'分解');
 $('app').dataset.device=state.device;$('app').dataset.view=state.view;
 for(const b of document.querySelectorAll('[data-device]')){const active=b.dataset.device===state.device;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}
 viewport.setAttribute('aria-label',`${devices[state.device].name}の${state.view==='circuit'?'部品の回路':'3Dモデル'}`);
 $('schematic').setAttribute('aria-label',`${devices[state.device].name}の回路図`);
}
function act(action){
 const before=state;state=transition(state,action);
 if(action.type==='SELECT'){updateSelection();renderer.render(scene,camera);return;}
 if(action.type==='POWER'){updatePower();renderer.render(scene,camera);$('announcement').textContent=state.power?'オン':'オフ';return;}
 clearHighlights();manualView=false;showActive();
 if(action.type==='DEVICE'||before.view!==state.view){rebuildLabels();if(state.view==='circuit')buildDiagram();}
 syncUI();updatePower();updateSelection();frameModel();renderer.render(scene,camera);
 $('announcement').textContent=action.type==='TOGGLE_VIEW'?(state.view==='circuit'?'部品の回路と回路図':'製品'):action.type==='DISASSEMBLE'?'分解':action.type==='ASSEMBLE'?'組み立て':devices[state.device].name;
}
for(const b of document.querySelectorAll('[data-device]'))b.addEventListener('click',()=>act({type:'DEVICE',device:b.dataset.device}));
$('disassemble').addEventListener('click',()=>act({type:state.view==='model'&&(state.direction>0||(state.direction===0&&state.progress>0))?'ASSEMBLE':'DISASSEMBLE'}));$('view-toggle').addEventListener('click',()=>act({type:'TOGGLE_VIEW'}));
function activatePart(role){if(role==='switch'&&canOperate(state))act({type:'POWER'});else if(state.view==='circuit'||state.progress>0)act({type:'SELECT',role});}
document.addEventListener('click',e=>{const el=e.target.closest('[data-part]');if(el)activatePart(el.dataset.part);});
$('schematic').addEventListener('keydown',e=>{const el=e.target.closest('[data-part]');if(el&&(e.key==='Enter'||e.key===' ')){e.preventDefault();if(!e.repeat)activatePart(el.dataset.part);}});
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
function hitAt(x,y){const rect=renderer.domElement.getBoundingClientRect();pointer.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObject(activeModel().root,true)[0];}
renderer.domElement.addEventListener('pointerdown',e=>{down=e.button===0&&e.isPrimary!==false?{x:e.clientX,y:e.clientY}:null;});
renderer.domElement.addEventListener('pointercancel',()=>{down=null;});
renderer.domElement.addEventListener('pointerup',e=>{
 const start=down;down=null;if(!start||Math.hypot(e.clientX-start.x,e.clientY-start.y)>6)return;
 const hit=hitAt(e.clientX,e.clientY);if(hit?.object.userData.part)activatePart(hit.object.userData.part);
});
renderer.domElement.addEventListener('pointermove',e=>{if(down)return;const hit=hitAt(e.clientX,e.clientY);renderer.domElement.style.cursor=canOperate(state)&&hit?.object.userData.part==='switch'?'pointer':'grab';});
viewport.addEventListener('keydown',e=>{
 if(canOperate(state)&&(e.key==='Enter'||e.key===' ')){e.preventDefault();if(!e.repeat)act({type:'POWER'});return;}
 if(e.key==='0'){manualView=false;frameModel();return;}
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(e.key))return;e.preventDefault();manualView=true;
 if(e.key==='+'||e.key==='-'){camera.zoom=THREE.MathUtils.clamp(camera.zoom*(e.key==='+'?1.12:.88),.45,4);camera.updateProjectionMatrix();return;}
 const s=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));if(e.key==='ArrowLeft')s.theta-=.13;if(e.key==='ArrowRight')s.theta+=.13;if(e.key==='ArrowUp')s.phi-=.1;if(e.key==='ArrowDown')s.phi+=.1;s.phi=THREE.MathUtils.clamp(s.phi,.1,Math.PI*.9);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));controls.update();
});
const projected=new THREE.Vector3(),labelPoint=new THREE.Vector3(),partBox=new THREE.Box3();
let last=performance.now();
function render(now){
 const elapsed=(now-last)/1000,dt=Math.min(elapsed,.05);last=now;
 if(state.direction&&state.view==='model'){
  const next=animationStep(state.progress,state.direction,elapsed,reducedMotion?.01:3.4);state.progress=next.value;state.direction=next.direction;showActive();frameModel();
  if(!state.direction){syncUI();updateSelection();$('announcement').textContent=state.progress===1?'分解完了':'戻りました';}
 }
 if(state.power&&canOperate(state)&&!reducedMotion){const model=activeModel();if(model.animate)model.animate(now/1000,dt,true);else for(const rotor of model.rotors||[])rotor.rotation[rotor.userData.axis||'y']+=dt*15;}
 controls.update();scene.updateMatrixWorld(true);
 const occupied=[];
 for(const {part,el,line}of labelEntries){
  const show=state.view==='circuit'||state.progress>.72;el.style.opacity=show?'1':'0';line.style.opacity=show?'1':'0';if(!show)continue;
  if(part.labelOffset){labelPoint.copy(part.group.position).add(part.labelOffset);}else{partBox.setFromObject(part.group);partBox.getCenter(labelPoint);labelPoint.y=partBox.max.y+.35;}
  projected.copy(labelPoint).project(camera);
  const x=(projected.x*.5+.5)*viewport.clientWidth,y=(-projected.y*.5+.5)*viewport.clientHeight;
  partBox.setFromObject(part.group);let objectTop=Infinity;
  for(const bx of [partBox.min.x,partBox.max.x])for(const by of [partBox.min.y,partBox.max.y])for(const bz of [partBox.min.z,partBox.max.z]){projected.set(bx,by,bz).project(camera);objectTop=Math.min(objectTop,(-projected.y*.5+.5)*viewport.clientHeight);}
  const w=el.offsetWidth,h=el.offsetHeight,minY=state.view==='circuit'?84:36;
  const desiredX=THREE.MathUtils.clamp(x,w/2+10,viewport.clientWidth-w/2-10),desiredY=Math.max(minY+h,Math.min(y,objectTop-12));
  let placed=null;
  for(const [dx,dy]of [[0,0],[0,-h-12],[-w*.7,0],[w*.7,0],[0,-h*2-24],[-w*.7,-h-12],[w*.7,-h-12],[0,h+15]]){
   const cx=THREE.MathUtils.clamp(desiredX+dx,w/2+10,viewport.clientWidth-w/2-10),bottom=Math.max(minY+h,desiredY+dy);
   const rect={left:cx-w/2,right:cx+w/2,top:bottom-h,bottom};
   if(bottom>viewport.clientHeight-20)continue;
   if(!occupied.some(r=>rect.left<r.right+9&&rect.right>r.left-9&&rect.top<r.bottom+9&&rect.bottom>r.top-9)){placed={cx,bottom,...rect};break;}
  }
  placed||={cx:desiredX,bottom:desiredY,left:desiredX-w/2,right:desiredX+w/2,top:desiredY-h};occupied.push(placed);
  el.style.left=`${placed.cx}px`;el.style.top=`${placed.bottom}px`;
  part.group.getWorldPosition(projected);projected.project(camera);
  const anchorX=(projected.x*.5+.5)*viewport.clientWidth,anchorY=(-projected.y*.5+.5)*viewport.clientHeight;
  line.setAttribute('d',`M${placed.cx} ${placed.bottom}L${anchorX} ${anchorY}`);
 }
 renderer.render(scene,camera);requestAnimationFrame(render);
}
showActive();rebuildLabels();syncUI();updatePower();frameModel();$('loading').remove();requestAnimationFrame(render);
window.circuitLab={getState:()=>({...state}),getPartPositions:()=>activeModel().parts.map(p=>({id:p.id,role:p.role,position:p.group.position.toArray()}))};
