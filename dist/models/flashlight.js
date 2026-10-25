import * as THREE from 'three';
export function createFlashlight(){
 const root=new THREE.Group(),parts=[];
 const mat={shell:new THREE.MeshStandardMaterial({color:0x255c70,metalness:.55,roughness:.3}),dark:new THREE.MeshStandardMaterial({color:0x153441,roughness:.48}),silver:new THREE.MeshStandardMaterial({color:0xb9c7cf,metalness:.82,roughness:.24}),gold:new THREE.MeshStandardMaterial({color:0xd99b42,metalness:.45,roughness:.34}),black:new THREE.MeshStandardMaterial({color:0x263243,roughness:.5}),pcb:new THREE.MeshStandardMaterial({color:0x1e8a64,roughness:.42}),white:new THREE.MeshStandardMaterial({color:0xf1f1df,roughness:.4}),led:new THREE.MeshStandardMaterial({color:0xf5ce54,roughness:.3}),glass:new THREE.MeshPhysicalMaterial({color:0xbadcf2,transparent:true,opacity:.23,roughness:.05,side:THREE.DoubleSide,depthWrite:false})};
 function mesh(g,m,p,pos=[0,0,0]){const o=new THREE.Mesh(g,m);o.position.set(...pos);o.castShadow=!m.transparent;o.receiveShadow=true;p.add(o);return o;}
 function cyl(p,r,len,m,x=0,r2=r,open=false){const o=mesh(new THREE.CylinderGeometry(r,r2,len,64,1,open),m,p,[x,0,0]);o.rotation.z=Math.PI/2;return o;}
 function ring(p,r,t,x,m){const o=mesh(new THREE.TorusGeometry(r,t,10,64),m,p,[x,0,0]);o.rotation.y=Math.PI/2;return o;}
 function part(id,role,home,away,start,end,label,offset){const group=new THREE.Group();group.position.set(...home);root.add(group);const o={id,role,group,home:new THREE.Vector3(...home),away:new THREE.Vector3(...away),start,end,label,labelOffset:new THREE.Vector3(...(offset||[0,1.15,0]))};parts.push(o);return o;}
 const shell=part('shell',null,[.3,0,0],[.6,-1.35,-1.25],.2,.76,'本体',[0,-.8,0]);
 cyl(shell.group,.65,4.3,mat.shell,0,.65,true);const inside=cyl(shell.group,.6,4.3,mat.dark,0,.6,true);inside.material=mat.dark.clone();inside.material.side=THREE.DoubleSide;
 for(let i=0;i<10;i++)ring(shell.group,.654,.022,-.35+i*.2,mat.dark);
 ring(shell.group,.647,.045,-2.1,mat.silver);ring(shell.group,.647,.045,2.1,mat.dark);
 const head=part('head',null,[-2.15,0,0],[-4.65,.1,0],.05,.43,'反射板');
 cyl(head.group,1.03,.86,mat.shell,-.05,.68,true);const reflect=mat.silver.clone();reflect.side=THREE.DoubleSide;cyl(head.group,.96,.75,reflect,-.1,.18,true);
 ring(head.group,1.01,.065,-.48,mat.dark);ring(head.group,.69,.05,.38,mat.dark);
 for(let i=0;i<4;i++)ring(head.group,.71+i*.07,.023,.3-i*.15,mat.dark);
 const lens=part('lens',null,[-2.75,0,0],[-6.25,.1,0],0,.34,'レンズ');cyl(lens.group,.96,.04,mat.glass);ring(lens.group,.98,.04,0,mat.silver);
 const led=part('led','led',[-1.78,0,0],[-2.75,.2,0],.33,.8,'LED',[0,1.3,0]);
 cyl(led.group,.52,.09,mat.pcb);ring(led.group,.46,.015,-.055,mat.gold);
 mesh(new THREE.BoxGeometry(.14,.35,.35),mat.white,led.group,[-.1,-.08,0]);mesh(new THREE.BoxGeometry(.045,.23,.23),mat.led,led.group,[-.195,-.08,0]);
 const resistor=mesh(new THREE.CylinderGeometry(.07,.07,.34,20),mat.gold,led.group,[-.13,.3,0]);resistor.rotation.x=Math.PI/2;resistor.userData.part='resistor';
 for(const z of [-.08,.04,.09]){const band=ring(led.group,.072,.012,0,mat.black);band.position.set(-.13,.3,z);band.rotation.y=0;band.userData.part='resistor';}
 const source=part('source','source',[.25,0,0],[.05,.28,.1],.35,.92,'乾電池',[0,1,0]);
 cyl(source.group,.44,2.65,mat.gold);cyl(source.group,.445,.55,mat.black,1.04);cyl(source.group,.42,.035,mat.silver,-1.34);cyl(source.group,.17,.14,mat.silver,-1.405);cyl(source.group,.42,.035,mat.silver,1.34);
 // Bold polarity marks sit on the visible face of the battery.
 const plus=mesh(new THREE.BoxGeometry(.22,.045,.025),mat.white,source.group,[-.88,.08,.435]);mesh(new THREE.BoxGeometry(.045,.22,.025),mat.white,source.group,[-.88,.08,.435]);mesh(new THREE.BoxGeometry(.2,.045,.025),mat.white,source.group,[.98,.08,.445]);
 const cap=part('cap',null,[2.58,0,0],[5.9,.1,0],0,.36,'ふた');cyl(cap.group,.69,.4,mat.shell);for(let i=0;i<3;i++)ring(cap.group,.69,.02,-.12+i*.11,mat.dark);cyl(cap.group,.54,.04,mat.dark,.22);
 const spring=part('spring',null,[2.08,0,0],[4.2,.1,0],.08,.47,'ばね',[0,.9,0]);const pts=[];for(let i=0;i<=160;i++){const t=i/160;pts.push(new THREE.Vector3(-.3+t*.6,Math.cos(t*Math.PI*10)*.27,Math.sin(t*Math.PI*10)*.27));}mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),160,.026,8,false),mat.silver,spring.group);
 const sw=part('switch','switch',[-.8,.7,0],[1.6,2.15,0],.45,1,'スイッチ',[0,.75,0]);mesh(new THREE.BoxGeometry(.85,.16,.43),mat.black,sw.group);mesh(new THREE.BoxGeometry(.4,.16,.32),mat.shell,sw.group,[-.12,.15,0]);for(let i=0;i<3;i++)mesh(new THREE.BoxGeometry(.025,.02,.27),mat.silver,sw.group,[-.2+i*.08,.24,0]);
 for(const p of parts)if(p.role)p.group.traverse(o=>{if(o.isMesh&&!o.userData.part)o.userData.part=p.role;});
 return {root,parts,rotors:[],focus:new THREE.Vector3(0,0,0)};
}
