import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { clamp, phase, animationStep, circuitState, statusFor, partInfo } from './model.js';

const $ = id => document.getElementById(id);
const state = { mode: 'explore', progress: 0, direction: 0, selected: null, switchClosed: false };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const viewport = $('viewport');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
} catch (error) {
  $('loading').textContent = '3D表示を開始できませんでした。WebGLに対応したブラウザーで開き直してください。';
  $('loading').classList.add('error');
  for (const id of ['play', 'assemble', 'progress', 'circuit-tab', 'next']) $(id).disabled = true;
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0xedf1e9, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
viewport.prepend(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(33, 1, .1, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = .09;
controls.enablePan = false;
controls.minDistance = 5;
controls.maxDistance = 42;
controls.minPolarAngle = .18;
controls.maxPolarAngle = Math.PI * .86;
scene.add(new THREE.HemisphereLight(0xffffff, 0xb4c2a5, 3));
const key = new THREE.DirectionalLight(0xfff7e5, 4.5);
key.position.set(-5, 10, 8); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -10; key.shadow.camera.right = 10;
key.shadow.camera.top = 6; key.shadow.camera.bottom = -6;
key.shadow.normalBias = .03; key.shadow.bias = -.0002;
scene.add(key);
const fill = new THREE.DirectionalLight(0xe0edff, 2.7); fill.position.set(6, 3, -6); scene.add(fill);
const front = new THREE.DirectionalLight(0xffffff, 1); front.position.set(-9, 1, 3); scene.add(front);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.ShadowMaterial({ color:0x304530, opacity:.1 }));
floor.rotation.x = -Math.PI/2; floor.position.y = -1.75; floor.receiveShadow = true; scene.add(floor);
// A hand-built product model. No external model, texture, or runtime network request.
const materials = {
  shell: new THREE.MeshStandardMaterial({color:0x24483c,metalness:.58,roughness:.32}),
  dark: new THREE.MeshStandardMaterial({color:0x18372c,metalness:.35,roughness:.5}),
  silver: new THREE.MeshStandardMaterial({color:0xbac7c7,metalness:.82,roughness:.28}),
  copper: new THREE.MeshStandardMaterial({color:0xd49951,metalness:.56,roughness:.31}),
  black: new THREE.MeshStandardMaterial({color:0x26312c,metalness:.12,roughness:.6}),
  pcb: new THREE.MeshStandardMaterial({color:0x327957,metalness:.18,roughness:.5}),
  white: new THREE.MeshStandardMaterial({color:0xeeede0,roughness:.46}),
  chip: new THREE.MeshStandardMaterial({color:0xeadb8a,emissive:0xffda67,emissiveIntensity:0,roughness:.3}),
  glass: new THREE.MeshPhysicalMaterial({color:0xc9e5dd,metalness:.12,roughness:.04,transparent:true,opacity:.2,side:THREE.DoubleSide,depthWrite:false}),
  wire: new THREE.MeshStandardMaterial({color:0x51715c,roughness:.65}),
};
const objects = [], selectable = [], labels = [];
function mesh(geometry, material, parent, pos=[0,0,0]) {
  const m = new THREE.Mesh(geometry,material); m.position.set(...pos); m.castShadow = !material.transparent; m.receiveShadow = true; parent.add(m); return m;
}
function cylinder(parent, radius, length, material, x=0, radius2=radius, open=false) {
  const m=mesh(new THREE.CylinderGeometry(radius,radius2,length,64,1,open),material,parent,[x,0,0]);m.rotation.z=Math.PI/2;return m;
}
function ring(parent,radius,tube,x,material=materials.silver) {
  const m=mesh(new THREE.TorusGeometry(radius,tube,12,80),material,parent,[x,0,0]);m.rotation.y=Math.PI/2;return m;
}
function box(parent,size,mat,pos) {return mesh(new THREE.BoxGeometry(...size),mat,parent,pos);}
function tube(parent,points,radius,mat=materials.silver) {
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  return mesh(new THREE.TubeGeometry(curve,Math.max(24,points.length*8),radius,10,false),mat,parent);
}
function part(id,role,home,away,start,end) {
  const group=new THREE.Group();scene.add(group);
  const entry={id,role,group,home:new THREE.Vector3(...home),away:new THREE.Vector3(...away),start,end};objects.push(entry);return entry;
}
function label(entry,text,offset=[0,1.1,0],role=false) {
  const el=document.createElement('div');el.className='model-label'+(role?' role-label':'');el.textContent=text;$('labels').append(el);
  labels.push({entry,el,offset:new THREE.Vector3(...offset),role});
}
function textTexture(text,color='#e5d6a7',bg=null,width=512,height=128) {
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d'); if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);}
  ctx.font='bold 64px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,width/2,height/2);
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function decal(parent,text,size,pos,color) {
  const mat=new THREE.MeshBasicMaterial({map:textTexture(text,color),transparent:true,depthWrite:false});
  return mesh(new THREE.PlaneGeometry(...size),mat,parent,pos);
}

const body=part('body',null,[.42,0,0],[.6,-.9,-1.7],.18,.66);
cylinder(body.group,.63,4.95,materials.shell,0,.63,true);
cylinder(body.group,.59,4.95,materials.dark,0,.59,true).material.side=THREE.DoubleSide;
ring(body.group,.616,.043,-2.46,materials.dark);ring(body.group,.616,.043,2.46,materials.dark);
for(let i=0;i<12;i++)ring(body.group,.636,.018,-.65+i*.23,materials.dark);
const logo=decal(body.group,'ENERGY',[1.1,.28],[-1.3,.09,.632],'#d5d5ad');logo.rotation.z=0;
const head=part('reflector',null,[-2.5,0,0],[-4.65,.1,0],.08,.46);
cylinder(head.group,.96,.75,materials.shell,-.02,.65,true);
const reflectorMat=materials.silver.clone();reflectorMat.side=THREE.DoubleSide;
cylinder(head.group,.9,.67,reflectorMat,-.06,.22,true);
ring(head.group,.94,.065,-.4,materials.shell);ring(head.group,.67,.06,.38,materials.dark);
for(let i=0;i<4;i++)ring(head.group,.7+i*.065,.025,.24-i*.13,materials.dark);
label(head,'反射板',[0,1.1,0]);
const lens=part('lens',null,[-3,0,0],[-6.15,.12,0],0,.35);
cylinder(lens.group,.9,.045,materials.glass);ring(lens.group,.92,.045,0,materials.silver);
label(lens,'レンズ',[0,1.1,0]);
const led=part('led','led',[-2.08,0,0],[-2.7,.25,0],.3,.78);
cylinder(led.group,.53,.09,materials.pcb);
ring(led.group,.48,.014,-.055,materials.copper);
const ledBase=box(led.group,[.12,.32,.32],materials.white,[-.09,0,0]);
const ledChip=box(led.group,[.04,.21,.21],materials.chip,[-.171,0,0]);
// The resistor and LED are mounted on the same board and form one series load.
const resistorMat=new THREE.MeshStandardMaterial({color:0xd6bb82,roughness:.65});
const resistor=mesh(new THREE.CylinderGeometry(.055,.055,.27,18),resistorMat,led.group,[-.11,.29,0]);resistor.rotation.x=Math.PI/2;
for(const z of [-.065,0,.065]){const b=mesh(new THREE.TorusGeometry(.056,.009,6,16),materials.dark,led.group,[-.11,.29,z]);}
tube(led.group,[[-.06,.4,0],[-.11,.4,-.22],[-.11,.29,-.22],[-.11,.29,-.135]],.012,materials.copper);
tube(led.group,[[-.11,.29,.135],[-.11,.29,.24],[-.11,0,.24],[-.11,0,.16]],.012,materials.copper);
tube(led.group,[[-.11,0,-.16],[-.06,-.35,-.16],[-.06,-.42,0]],.012,materials.copper);
label(led,'LED基板',[0,1.2,0],true);

function battery(id,home,away) {
  const b=part(id,'battery',home,away,.34,.88);
  cylinder(b.group,.39,1.96,materials.copper);
  cylinder(b.group,.395,.54,materials.black,.69);
  cylinder(b.group,.37,.035,materials.silver,-1);
  cylinder(b.group,.16,.1,materials.silver,-1.065);
  cylinder(b.group,.37,.035,materials.silver,1);
  const name=decal(b.group,'1.5 V',[1.1,.27],[-.12,.02,.397],'#fff3d6');
  decal(b.group,'＋',[.27,.27],[-.75,.02,.402],'#fff3d6');
  decal(b.group,'−',[.27,.27],[.72,.02,.402],'#eef3e8');
  return b;
}
const battery1=battery('battery1',[-.85,0,0],[0,.24,.15]);
const battery2=battery('battery2',[1.22,0,0],[2.55,.24,.15]);
label(battery1,'乾電池',[.5,1,0],true);
const tail=part('tail',null,[3.08,0,0],[6.05,.1,0],0,.37);
cylinder(tail.group,.66,.39,materials.shell);
for(let i=0;i<3;i++)ring(tail.group,.66,.022,-.12+i*.11,materials.dark);
cylinder(tail.group,.52,.04,materials.dark,.22);
label(tail,'後ろのふた',[0,.9,0]);
const spring=part('spring',null,[2.68,0,0],[4.65,.1,0],.07,.45);
const coil=[];for(let i=0;i<=180;i++){const t=i/180;coil.push([-.3+t*.6,Math.cos(t*Math.PI*10)*(.29-t*.06),Math.sin(t*Math.PI*10)*(.29-t*.06)]);}tube(spring.group,coil,.025,materials.silver);
const sw=part('switch','switch',[-.8,.67,0],[.4,2,0],.43,1);
box(sw.group,[.8,.14,.4],materials.black,[0,0,0]);
const switchLever=box(sw.group,[.36,.13,.3],materials.shell,[-.13,.13,0]);
for(let i=0;i<3;i++)box(sw.group,[.024,.015,.25],materials.silver,[-.21+i*.075,.2,0]);
box(sw.group,[.11,.08,.2],materials.copper,[-.4,-.08,0]);box(sw.group,[.11,.08,.2],materials.copper,[.4,-.08,0]);
label(sw,'スイッチ',[0,.7,0],true);
for(const o of objects)if(o.role)o.group.traverse(m=>{if(m.isMesh){m.userData.part=o.role;selectable.push(m);}});

// Comparison: only the electrical parts remain, with one closed-loop connection.
const circuit=new THREE.Group();scene.add(circuit);circuit.visible=false;
const wireY=.25;
function wire(points) {return tube(circuit,points.map(([x,z,y=wireY])=>[x,y,z]),.033,materials.wire);}
wire([[-2.6,-1.384,.37],[-2.6,-1.86],[-2.45,-1.95],[-.45,-1.95]]);
wire([[.45,-1.95],[2.45,-1.95],[2.6,-1.83],[2.6,-.42]]);
wire([[2.6,.42],[2.6,1.83],[2.45,1.95],[-2.45,1.95],[-2.6,1.83],[-2.6,1.32,.37]]);
// Connect the two cells, positive of the rear cell to negative of the front cell.
wire([[-2.6,-.02,.37],[-2.6,.02,.37]]);
for(const [x,z] of [[-2.6,-1.35],[-2.6,1.35],[-.45,-1.95],[.45,-1.95],[2.6,-.42],[2.6,.42]]){
  const plug=mesh(new THREE.SphereGeometry(.065,16,12),materials.copper,circuit,[x,wireY,z]);
}
const lightGlow=mesh(new THREE.SphereGeometry(.17,24,16),new THREE.MeshBasicMaterial({color:0xffec9e,transparent:true,opacity:0}),led.group,[-.2,0,0]);
const glowCanvas=document.createElement('canvas');glowCanvas.width=128;glowCanvas.height=128;
const glowCtx=glowCanvas.getContext('2d');const grad=glowCtx.createRadialGradient(64,64,0,64,64,64);grad.addColorStop(0,'rgba(255,234,144,.8)');grad.addColorStop(.25,'rgba(255,225,121,.35)');grad.addColorStop(1,'rgba(255,225,121,0)');glowCtx.fillStyle=grad;glowCtx.fillRect(0,0,128,128);
const glowSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(glowCanvas),transparent:true,depthWrite:false,opacity:0}));glowSprite.position.set(-.23,0,0);glowSprite.scale.set(1.6,1.6,1.6);led.group.add(glowSprite);
const ambientGuide=new THREE.Group();scene.add(ambientGuide);
const guideMat=new THREE.LineDashedMaterial({color:0xb7c4ad,dashSize:.12,gapSize:.12,transparent:true,opacity:.4});
const axisLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-6.7,0,0),new THREE.Vector3(6.7,0,0)]),guideMat);axisLine.computeLineDistances();ambientGuide.add(axisLine);

function updateLayout() {
  const isCircuit=state.mode==='circuit';
  circuit.visible=isCircuit;ambientGuide.visible=!isCircuit&&state.progress>.12;
  for(const o of objects){
    o.group.scale.setScalar(1);o.group.rotation.set(0,0,0);
    o.group.visible=!isCircuit||!!o.role;
    if(!isCircuit){o.group.position.lerpVectors(o.home,o.away,phase(state.progress,o.start,o.end));
      if(o===tail)o.group.rotation.x=phase(state.progress,0,.3)*Math.PI*2;
      if(o===body)o.group.rotation.x=-phase(state.progress,.18,.66)*.3;
    }
  }
  if(isCircuit){
    battery1.group.position.set(-2.6,.37,-.67);battery2.group.position.set(-2.6,.37,.67);
    for(const b of [battery1,battery2]){b.group.scale.setScalar(.64);b.group.rotation.y=-Math.PI/2;}
    sw.group.position.set(0,.34,-1.95);sw.group.scale.setScalar(1.1);
    led.group.position.set(2.6,.18,0);led.group.rotation.z=-Math.PI/2;led.group.rotation.y=Math.PI/2;led.group.scale.setScalar(1.05);
  }
  const powered=circuitState(state.mode,state.switchClosed).lit;
  switchLever.position.x=state.switchClosed?.13:-.13;
  materials.chip.emissiveIntensity=powered?2.5:0;
  lightGlow.material.opacity=powered?.7:0;glowSprite.material.opacity=powered?.8:0;
}
let cameraTarget=null, manualView=false;
function resetCamera(animate=true){
  const w=viewport.clientWidth,h=viewport.clientHeight,aspect=w/h;
  if(state.mode==='circuit'){
    const distance=Math.max(10.5,3.75/(Math.tan(THREE.MathUtils.degToRad(16.5))*aspect)*1.15);
    cameraTarget={pos:new THREE.Vector3(.08,.84,.54).normalize().multiplyScalar(distance),target:new THREE.Vector3(0,0,0)};
  }else{
    const halfWidth=3.8+3.35*phase(state.progress,0,.8);
    const distance=Math.max(9+state.progress*5,halfWidth/(Math.tan(THREE.MathUtils.degToRad(16.5))*aspect)*1.24);
    cameraTarget={pos:new THREE.Vector3(-.24,.32,.85).normalize().multiplyScalar(distance),target:new THREE.Vector3(0,.2,0)};
  }
  if(!animate||reducedMotion){camera.position.copy(cameraTarget.pos);controls.target.copy(cameraTarget.target);cameraTarget=null;controls.update();}
}
let previousWidth=0;
new ResizeObserver(()=>{
  const w=viewport.clientWidth,h=viewport.clientHeight;
  if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);
  if(Math.abs(w-previousWidth)>40){resetCamera(false);previousWidth=w;}
}).observe(viewport);
controls.addEventListener('start',()=>{cameraTarget=null;manualView=true;});
$('reset-view').addEventListener('click',()=>{manualView=false;resetCamera();});

const highlighted=new Map();
function selectPart(role){
  state.selected=state.selected===role?null:role;
  for(const [m,original]of highlighted){m.material.dispose();m.material=original;}highlighted.clear();
  for(const o of objects)if(o.role===state.selected)o.group.traverse(m=>{
    if(m.isMesh&&m.material.isMeshStandardMaterial&&m!==ledChip){const copy=m.material.clone();copy.emissive=new THREE.Color(0xc4932b);copy.emissiveIntensity=.26;highlighted.set(m,m.material);m.material=copy;}
  });
  document.querySelectorAll('[data-part]').forEach(el=>{
    const active=el.dataset.part===state.selected;el.classList.toggle('selected',active);
    if(el.tagName==='BUTTON')el.setAttribute('aria-pressed',String(active));
  });
  for(const l of labels)l.el.classList.toggle('selected',l.entry.role===state.selected);
  $('part-description').textContent=state.selected?partInfo[state.selected].description:'部品を選ぶと、対応する場所が光ります。';
  // Hidden parts become visible when their corresponding button is selected.
  if(state.mode==='explore'&&state.selected&&state.progress<.98){state.direction=1;syncControls();}
}
for(const el of document.querySelectorAll('[data-part]')){
  el.addEventListener('click',()=>selectPart(el.dataset.part));
  if(el.tagName!=='BUTTON')el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectPart(el.dataset.part);}});
}
const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();let pointerStart=null;
renderer.domElement.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY};});
renderer.domElement.addEventListener('pointerup',e=>{
  if(!pointerStart||Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>6)return;
  const rect=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(mouse,camera);
  // Raycast all visible geometry so opaque housing correctly hides its contents.
  const hit=raycaster.intersectObjects(objects.filter(o=>o.group.visible).map(o=>o.group),true)[0];
  if(hit?.object.userData.part)selectPart(hit.object.userData.part);
});

function syncControls(){
  const p=Math.round(state.progress*100);
  $('progress').value=state.progress*100;$('progress').style.setProperty('--progress',`${p}%`);
  $('progress').setAttribute('aria-valuetext',`${p}%、${statusFor(state.progress)}`);
  $('progress-label').textContent=`${p}%`;
  $('view-badge').innerHTML=`<i></i> ${state.mode==='circuit'?'回路としてつないだ状態':statusFor(state.progress)}`;
  $('play-icon').textContent=state.direction?'Ⅱ':'▶';
  $('play-text').textContent=state.direction?'一時停止':state.progress>=.999?'もう一度分解する':state.progress>0?'分解を続ける':'分解してみる';
}
$('play').addEventListener('click',()=>{
  if(state.direction)state.direction=0;
  else {if(state.progress>=.999)state.progress=0;state.direction=1;}
  syncControls();
});
$('assemble').addEventListener('click',()=>{
  state.direction=-1;
  if(reducedMotion){state.progress=0;state.direction=0;updateLayout();}
  syncControls();
});
$('progress').addEventListener('input',e=>{state.direction=0;state.progress=Number(e.target.value)/100;syncControls();updateLayout();if(!manualView)resetCamera(false);});
function setMode(mode){
  if(state.mode===mode)return;
  state.mode=mode;state.direction=0;manualView=false;
  document.body.classList.toggle('circuit-mode',mode==='circuit');
  $('diagram-panel').hidden=mode!=='circuit';$('motion-controls').hidden=mode==='circuit';
  $('explore-tab').classList.toggle('active',mode==='explore');$('explore-tab').setAttribute('aria-pressed',String(mode==='explore'));
  $('circuit-tab').classList.toggle('active',mode==='circuit');$('circuit-tab').setAttribute('aria-pressed',String(mode==='circuit'));
  $('eyebrow').textContent=mode==='circuit'?'02 / 回路図とくらべる':'01 / 懐中電灯を分解';
  $('heading').textContent=mode==='circuit'?'同じ部品を、同じつながりで。':'光るしくみを、ひらいてみよう。';
  $('subtitle').textContent=mode==='circuit'?'部品か記号を選ぶと、左右の対応する場所が光ります。':'懐中電灯を分解して、中の部品を見てみましょう。';
  $('next').innerHTML=mode==='circuit'?'懐中電灯にもどる <span aria-hidden="true">↗</span>':'回路図とくらべる <span aria-hidden="true">↗</span>';
  $('scene-title').textContent=mode==='circuit'?'取り出した部品の回路':'懐中電灯';
  $('model-note').textContent=mode==='circuit'?'つながりが見えるよう、部品の位置を変えて導線でつないでいます。':'しくみを見やすくした学習用モデルです。';
  viewport.setAttribute('aria-label',mode==='circuit'?'乾電池・スイッチ・LED基板を導線でつないだ3D回路。右の回路図と対応しています。':'懐中電灯の3Dモデル。下の操作ボタンで分解できます。');
  syncControls();updateLayout();resetCamera(false);
  $('announcement').textContent=mode==='circuit'?'部品の回路と回路図を表示しました。':'懐中電灯を表示しました。';
}
$('explore-tab').addEventListener('click',()=>setMode('explore'));
$('circuit-tab').addEventListener('click',()=>setMode('circuit'));
$('next').addEventListener('click',()=>setMode(state.mode==='explore'?'circuit':'explore'));
$('power').addEventListener('click',()=>{
  state.switchClosed=!state.switchClosed;
  $('power').setAttribute('aria-checked',String(state.switchClosed));$('power').firstElementChild.textContent=state.switchClosed?'ON':'OFF';
  document.body.classList.toggle('powered',state.switchClosed);
  $('lamp-status').innerHTML=`<i></i> LED ${state.switchClosed?'点灯':'消灯'}`;
  $('switch-arm').setAttribute('d',state.switchClosed?'M178 83L228 83':'M178 81L225 58');
  updateLayout();$('announcement').textContent=state.switchClosed?'スイッチが閉じ、LEDが点灯しました。':'スイッチが開き、LEDが消灯しました。';
});
// Keyboard view controls complement touch and mouse navigation.
viewport.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','0'].includes(e.key))return;
  e.preventDefault();cameraTarget=null;manualView=true;
  if(e.key==='0'){resetCamera();return;}
  const offset=camera.position.clone().sub(controls.target);const spherical=new THREE.Spherical().setFromVector3(offset);
  if(e.key==='ArrowLeft')spherical.theta-=.12;if(e.key==='ArrowRight')spherical.theta+=.12;
  if(e.key==='ArrowUp')spherical.phi-=.1;if(e.key==='ArrowDown')spherical.phi+=.1;
  if(e.key==='+')spherical.radius*=.9;if(e.key==='-')spherical.radius*=1.1;
  spherical.phi=clamp(spherical.phi,controls.minPolarAngle,controls.maxPolarAngle);spherical.radius=clamp(spherical.radius,controls.minDistance,controls.maxDistance);
  camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));controls.update();
});
let last=performance.now();const projected=new THREE.Vector3();
function render(now){
  const dt=Math.min((now-last)/1000,.05);last=now;
  if(state.direction&&state.mode==='explore'){
    const next=animationStep(state.progress,state.direction,dt,reducedMotion?.01:6);state.progress=next.value;state.direction=next.direction;
    updateLayout();syncControls();if(!manualView)resetCamera(false);
    if(!state.direction)$('announcement').textContent=state.progress===1?'分解しました。乾電池・スイッチ・LED基板が見えます。':'組み立てました。';
  }
  if(cameraTarget){camera.position.lerp(cameraTarget.pos,.09);controls.target.lerp(cameraTarget.target,.09);if(camera.position.distanceTo(cameraTarget.pos)<.02)cameraTarget=null;}
  controls.update();
  for(const l of labels){
    const show=state.mode==='circuit'?l.role:state.progress>.64;
    l.el.style.opacity=show?'1':'0';
    if(!show)continue;
    projected.copy(l.entry.group.position).add(l.offset);
    if(state.mode==='circuit'){
      if(l.entry===battery1)projected.set(-2.6,1.1,0);
      if(l.entry===led)projected.set(2.6,1.05,0);
      if(l.entry===sw)projected.set(0,1,-1.95);
    }
    projected.project(camera);
    l.el.style.left=`${(projected.x*.5+.5)*viewport.clientWidth}px`;l.el.style.top=`${(-projected.y*.5+.5)*viewport.clientHeight}px`;
    if(projected.z>1||projected.z<-1)l.el.style.opacity='0';
  }
  renderer.render(scene,camera);requestAnimationFrame(render);
}
updateLayout();syncControls();resetCamera(false);$('loading').remove();requestAnimationFrame(render);
// Small read-only diagnostic surface for regression checks and classroom support.
window.circuitLab = { getState:()=>({...state,lit:circuitState(state.mode,state.switchClosed).lit}), getPartPositions:()=>objects.map(o=>({id:o.id,visible:o.group.visible,position:o.group.position.toArray()})) };
