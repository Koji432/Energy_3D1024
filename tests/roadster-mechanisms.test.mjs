import test from 'node:test';
import assert from 'node:assert/strict';
import {mechanisms,mechanismIcons,driveKinematics,mechanismForRole,mechanismMarkup} from '../dist/roadster-mechanisms.js';

const ids=['drive','suction','wing','thrust'];
const attribute=(tag,name)=>tag.match(new RegExp(`(?:^|\\s)${name}=["']([^"']*)["']`))?.[1];
const target=(svg,id)=>[...svg.matchAll(/<(?:g|path)\b[^>]*\bdata-motion="([^"]+)"[^>]*>/g)].find(m=>m[1]===id)?.[0];
const rotations={
  drive:['drive-field','drive-motor','drive-sun','drive-carrier','drive-planet-0','drive-planet-1','drive-planet-2','drive-wheel'],
  suction:['suction-fan-0','suction-fan-1','suction-fan-2','suction-fan-3'],
  wing:['wing-motor','link','wing'],
  thrust:['thrust-motor'],
};
function assertNoVisibleText(svg,label) {
  assert.doesNotMatch(svg,/<(?:text|tspan|foreignObject)\b/i,`${label} contains visible text`);
  const visible=svg.replace(/<(title|desc)\b[^>]*>[\s\S]*?<\/\1>/g,'').replace(/<[^>]+>/g,'').trim();
  assert.equal(visible,'',`${label} has a visible text node`);
}
function assertLocalResources(svg,label) {
  assert.doesNotMatch(svg,/<(?:image|script|animate|animateTransform|set)\b/i,`${label} must use local vector drawing and host-controlled motion`);
  for(const ref of svg.matchAll(/(?:href|src)=["']([^"']*)["']/g)) assert.ok(ref[1].startsWith('#'),`${label} uses an external resource`);
  assert.doesNotMatch(svg,/url\(\s*["']?(?:https?:|data:|\/)|@import\b/i);
  const declared=new Set([...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  for(const ref of svg.matchAll(/url\(#([^)]+)\)/g)) assert.ok(declared.has(ref[1]),`${label} references missing ${ref[1]}`);
}

test('four icon-only mechanism topics keep explanations in inaccessible-to-layout metadata',()=>{
  assert.deepEqual(Object.keys(mechanisms).sort(),[...ids].sort());
  assert.deepEqual(Object.keys(mechanismIcons).sort(),[...ids].sort());
  const titles=new Set();
  for(const id of ids) {
    const item=mechanisms[id];
    assert.equal(item.id,id);
    assert.ok(item.title?.trim());
    assert.match(item.description,/模式図/);
    assert.equal(item.caption,undefined,'Caption metadata can reintroduce visible explanation text');
    assert.equal(item.flow,undefined,'Flow metadata can reintroduce a visible text list');
    titles.add(item.title);
    const icon=mechanismIcons[id];
    assert.match(icon,/^<svg\b[\s\S]*<\/svg>$/);
    assert.match(icon,/aria-hidden="true"/);
    assertNoVisibleText(icon,`${id} tab icon`);
    assertLocalResources(icon,`${id} tab icon`);
  }
  assert.equal(titles.size,4);
});

test('mechanism selection maps dedicated parts and safely preserves shared-part context',()=>{
  const mapping={motor:'drive',fan:'suction',actuator:'wing',valve:'thrust',tank:'thrust',thruster:'thrust'};
  for(const [role,expected] of Object.entries(mapping)) for(const current of [...ids,'unknown']) assert.equal(mechanismForRole(role,current),expected);
  for(const role of ['source','switch','controller',null,undefined,'','unknown','constructor','__proto__']) {
    for(const current of ids) assert.equal(mechanismForRole(role,current),current);
    for(const current of [undefined,null,'','unknown','constructor','__proto__']) assert.equal(mechanismForRole(role,current),'drive');
  }
});

test('each scene has no visible text and remains a self-contained accessible SVG',()=>{
  const scenes=new Set();
  for(const id of ids) {
    const svg=mechanismMarkup(id),root=svg.match(/^<svg\b[^>]*>/)?.[0];
    assert.ok(root,`${id} lacks a root SVG`);
    assert.equal(attribute(root,'role'),'img');
    assert.equal(attribute(root,'viewBox'),'0 0 1000 360');
    assert.equal(attribute(root,'aria-label'),`${mechanisms[id].title}の機構`);
    assert.equal(attribute(root,'aria-labelledby'),undefined);
    const descriptions=attribute(root,'aria-describedby')?.split(/\s+/);
    assert.equal(descriptions?.length,1);
    for(const ref of descriptions) assert.match(svg,new RegExp(`<desc id="${ref}">[^<]+<\\/desc>`));
    assert.doesNotMatch(svg,/<title\b/i,'SVG titles can create visible native hover tooltips');
    assertNoVisibleText(svg,id);
    assertLocalResources(svg,id);
    assert.match(svg,/<(?:path|rect|circle|ellipse)\b/);
    const targets=[...svg.matchAll(/\bdata-motion="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(new Set(targets).size,targets.length,`${id} has duplicate motion targets`);
    for(const name of rotations[id]) {
      const tag=target(svg,name);
      assert.ok(tag,`${id} lacks ${name}`);
      for(const attr of ['data-cx','data-cy']) assert.ok(Number.isFinite(Number(attribute(tag,attr))),`${name} lacks a finite pivot`);
    }
    assert.doesNotMatch(svg,/class="mechanism-(?:spin|counter-spin|spin-slow|slide)"/,'Host-controlled transforms must not also have an independent CSS motion');
    scenes.add(svg);
  }
  assert.equal(scenes.size,4);
});

test('fixed-ring reduction has coherent pitch radii and relative planetary motion',()=>{
  const k=driveKinematics;
  assert.equal(k.ringTeeth,k.sunTeeth+2*k.planetTeeth);
  assert.equal(k.ringRadius,k.sunRadius+2*k.planetRadius);
  assert.equal(k.sunRadius/k.sunTeeth,k.planetRadius/k.planetTeeth);
  assert.equal(k.sunRadius/k.sunTeeth,k.ringRadius/k.ringTeeth);
  assert.equal(k.orbitRadius,k.sunRadius+k.planetRadius);
  assert.equal(k.carrierRatio,k.sunTeeth/(k.sunTeeth+k.ringTeeth));
  assert.ok(Math.abs(k.planetRelativeRatio+k.sunTeeth/k.planetTeeth*(1-k.carrierRatio))<1e-12);
  for(const center of k.planetCenters) assert.ok(Math.abs(Math.hypot(center.x-k.gearCenter.x,center.y-k.gearCenter.y)-k.orbitRadius)<1e-10);
  const svg=mechanismMarkup('drive');
  assert.match(svg,/data-fixed="stator"/);
  assert.match(svg,/data-fixed="ring"/);
  for(const stage of ['battery','inverter','motor','reduction']) assert.match(svg,new RegExp(`data-stage="${stage}"`));
  assert.ok(target(svg,'drive-electric'));
  assert.ok(target(svg,'drive-road'));
  assert.equal([...svg.matchAll(/class="mechanism-coil-phase"/g)].length,6);
  assert.match(mechanisms.drive.description,/かご形/);
  assert.match(mechanisms.drive.description,/個別車両.*再現していない/);
});

test('suction presses only the chassis down while the wheels remain on fixed ground',()=>{
  const svg=mechanismMarkup('suction');
  assert.equal(Number(attribute(target(svg,'suction-body'),'data-travel')),8);
  assert.match(svg,/data-fixed="wheels"/);
  for(const name of ['suction-air','suction-pressure','suction-force']) assert.ok(target(svg,name));
  assert.equal([...svg.matchAll(/data-motion="suction-fan-[0-3]"/g)].length,4);
  assert.match(svg,/class="mechanism-airflow mechanism-side-inlet"/);
  assert.match(mechanisms.suction.description,/浮上ではない/);
});

test('wing conversion retains connected slider-crank geometry for the host pose helper',()=>{
  const svg=mechanismMarkup('wing');
  for(const name of ['wing-motor','wing-thread','rod','link','wing']) assert.ok(target(svg,name));
  const rod=target(svg,'rod'),link=target(svg,'link'),pivot=target(svg,'wing');
  assert.equal(Number(attribute(rod,'data-reference-y')),213);
  assert.equal(Number(attribute(link,'data-length')),70);
  const rodX=Number(attribute(rod,'data-reference-x'));
  assert.ok(Math.abs(Math.hypot(790-rodX,183-213)-70)<1e-10);
  assert.equal(Number(attribute(pivot,'data-cx')),846);
  assert.equal(Number(attribute(pivot,'data-cy')),213);
  assert.match(mechanisms.wing.description,/一般的な連結機構/);
});

test('gas valve, gas flow and vehicle lift have independent sequencing hooks',()=>{
  const svg=mechanismMarkup('thrust');
  for(const name of ['thrust-electric','thrust-motor','thrust-valve','thrust-gas','thrust-body','thrust-force']) assert.ok(target(svg,name));
  assert.equal(Number(attribute(target(svg,'thrust-valve'),'data-travel')),-38);
  assert.equal(Number(attribute(target(svg,'thrust-body'),'data-travel')),-34);
  assert.equal(attribute(target(svg,'thrust-gas'),'data-phase'),'gas');
  assert.match(svg,/data-fixed="vehicle-wheels"/);
  assert.match(mechanisms.thrust.description,/弁を閉じると噴射は止まる/);
});

test('unknown ids consistently fall back to a complete drive scene',()=>{
  for(const id of [undefined,null,'','unknown','constructor','__proto__']) assert.equal(mechanismMarkup(id),mechanismMarkup('drive'));
});
