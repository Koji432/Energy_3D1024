import * as THREE from 'three';

// Simplified Rocket mechanism layout within the latest pearl-white wedge body.
// Rear extraction fans create downforce; the separate cold-gas nozzles lift it.
export function createRoadster() {
  const root = new THREE.Group(), parts = [], wheels = [], fans = [], jets = [], plungers = [];
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const standard = (color, roughness = .45, metalness = .15) => new THREE.MeshStandardMaterial({color, roughness, metalness});
  const m = {
    pearl: new THREE.MeshPhysicalMaterial({color: 0xf3f2e9, roughness: .27, metalness: .23, clearcoat: .8, clearcoatRoughness: .23, flatShading: true}),
    black: standard(0x171c20, .5, .25), carbon: standard(0x252a2d, .58, .3), rubber: standard(0x151719, .9, .02),
    steel: standard(0x99a8b1, .27, .88), darkSteel: standard(0x424b52, .28, .85), gold: standard(0xb79661, .32, .76),
    green: standard(0x17735a, .65, .12), trace: standard(0x8fc28b, .6, .23), orange: standard(0xdd7132, .48, .25),
    battery: standard(0x3d4b56, .48, .45), white: standard(0xe0e7e9, .3, .1),
    glass: new THREE.MeshPhysicalMaterial({color: 0xb58c57, roughness: .15, metalness: .43, transparent: true, opacity: .87, transmission: .12, clearcoat: 1, side: THREE.DoubleSide, flatShading: true}),
    head: new THREE.MeshStandardMaterial({color: 0x9cafb8, emissive: 0xdff8ff, emissiveIntensity: 0, roughness: .22}),
    tail: new THREE.MeshStandardMaterial({color: 0x8f2527, emissive: 0xff171c, emissiveIntensity: .08, roughness: .25}),
    indicator: new THREE.MeshStandardMaterial({color: 0x5e7568, emissive: 0x28dd83, emissiveIntensity: 0, roughness: .35}),
  };
  function mesh(geometry, material, group, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z); object.castShadow = true; object.receiveShadow = true; group.add(object);
    return object;
  }
  function box(group, x, y, z, material, px = 0, py = 0, pz = 0) { return mesh(new THREE.BoxGeometry(x, y, z), material, group, px, py, pz); }
  function cylinder(group, r, h, material, x = 0, y = 0, z = 0, r2 = r) { return mesh(new THREE.CylinderGeometry(r, r2, h, 40), material, group, x, y, z); }
  function ring(group, r, tube, material, x = 0, y = 0, z = 0) { return mesh(new THREE.TorusGeometry(r, tube, 8, 48), material, group, x, y, z); }
  function tube(group, points, material, radius = .025) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => V(...p)));
    return mesh(new THREE.TubeGeometry(curve, 24, radius, 7, false), material, group);
  }
  function part(id, role, label, home, away, start = .2, end = .82, offset = [0, .5, 0]) {
    const group = new THREE.Group();
    const p = {id, role, label, group, home: V(...home), away: V(...away), start, end, labelOffset: V(...offset)};
    group.position.copy(p.home); root.add(group); parts.push(p); return group;
  }
  // Eight-sided sections keep the characteristic taut, faceted body surfaces.
  function loft(group, sections, material) {
    const vertices = [], indices = [];
    for (const [x, width, top, bottom] of sections) {
      const bevel = Math.min(.16, (top - bottom) * .25);
      for (const [z, y] of [[-.82 * width, top], [.82 * width, top], [width, top - bevel], [width, bottom + bevel], [.82 * width, bottom], [-.82 * width, bottom], [-width, bottom + bevel], [-width, top - bevel]]) vertices.push(x, y, z);
    }
    for (let s = 0; s < sections.length - 1; s++) for (let i = 0; i < 8; i++) {
      const a = s * 8 + i, b = s * 8 + (i + 1) % 8, c = a + 8, d = b + 8;
      indices.push(a, b, c, b, d, c);
    }
    for (let i = 1; i < 7; i++) {
      indices.push(0, i + 1, i);
      const base = (sections.length - 1) * 8; indices.push(base, base + i, base + i + 1);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    return mesh(geometry, material, group);
  }
  function sidePanel(group, z) {
    const s = new THREE.Shape();
    s.moveTo(-4.68, .05); s.lineTo(-3.98, .47); s.lineTo(-2.23, .66); s.lineTo(-1.46, .73);
    s.lineTo(1.35, .72); s.lineTo(3.7, .62); s.lineTo(4.45, .36); s.lineTo(4.4, -.39);
    s.lineTo(3.7, -.43); s.quadraticCurveTo(3.7, .62, 2.8, .62); s.quadraticCurveTo(1.9, .62, 1.9, -.43);
    s.lineTo(-1.9, -.43); s.quadraticCurveTo(-1.9, .62, -2.8, .62); s.quadraticCurveTo(-3.7, .62, -3.7, -.43);
    s.lineTo(-4.52, -.37); s.closePath();
    const geometry = new THREE.ExtrudeGeometry(s, {depth: .11, bevelEnabled: true, bevelSize: .035, bevelThickness: .035, bevelSegments: 2, curveSegments: 18});
    geometry.translate(0, 0, -.055);
    return mesh(geometry, m.pearl, group, 0, 0, z);
  }
  const body = part('body', null, 'ボディー', [0, 0, 0], [-4.5, 2.65, -2.15], 0, .52);
  loft(body, [[-4.8, .91, .06, -.34], [-4.1, 1.42, .47, -.44], [-2.9, 1.47, .64, -.48], [-1.5, 1.47, .71, -.48], [1.4, 1.47, .7, -.46], [3.3, 1.48, .65, -.4], [4.48, 1.31, .37, -.31]], m.pearl);
  sidePanel(body, -1.64); sidePanel(body, 1.64);
  // Long narrow lamps and black aero surfaces remain visually uncluttered.
  for (const side of [-1, 1]) {
    const head = box(body, .072, .047, .88, m.head, -4.385, .316, side * .85); head.rotation.z = -.19;
    const surround = box(body, .09, .105, .99, m.black, -4.35, .301, side * .85); surround.position.x += .03;
    box(body, 1.19, .035, .028, m.black, -3.4, .607, side * 1.13);
    tube(body, [[-1.54, .75, side * 1.19], [-1.4, .16, side * 1.65], [1.28, .12, side * 1.65], [1.74, .65, side * 1.4]], m.darkSteel, .014);
    box(body, .35, .028, .055, m.black, .72, .55, side * 1.68);
  }
  box(body, .22, .16, 2.71, m.black, 4.33, .35, 0);
  box(body, .075, .055, 2.61, m.tail, 4.43, .39, 0);
  box(body, .24, .23, 2.6, m.black, 4.31, -.31, 0);
  for (let i = 0; i < 7; i++) box(body, .72, .2, .034, m.carbon, 4.03, -.46, -.99 + i * .33);
  const splitter = new THREE.Group(); splitter.position.set(-4.33, -.43, 0); body.add(splitter);
  box(splitter, .87, .064, 3.0, m.carbon);
  const skirts = [];
  for (const side of [-1, 1]) {
    const skirt = new THREE.Group(); skirt.position.set(0, -.46, side * 1.65); body.add(skirt);
    box(skirt, 4.08, .12, .17, m.carbon); skirt.userData.side = side; skirts.push(skirt);
    const mirror = box(body, .36, .1, .19, m.black, -.73, .9, side * 1.47); mirror.rotation.y = side * .15;
  }

  const canopy = part('canopy', null, 'キャノピー', [0, 0, 0], [-1.7, 4.2, .7], .02, .58);
  loft(canopy, [[-1.68, 1.16, .76, .67], [-.53, .99, 1.49, .69], [.99, 1.02, 1.46, .69], [2.18, 1.2, .79, .68]], m.glass);
  for (const side of [-1, 1]) {
    tube(canopy, [[-1.67, .74, side * 1.16], [-.53, 1.5, side * .82], [.99, 1.48, side * .84], [2.18, .77, side * 1.2]], m.black, .026);
  }
  const chassis = part('chassis', null, 'シャーシ', [0, 0, 0], [0, -.25, 0], .13, .66);
  box(chassis, 7.55, .17, 2.62, m.carbon, 0, -.51, 0);
  box(chassis, 2.25, .17, 2.18, m.black, -.15, .66, 0);
  // A single driver station leaves the other cockpit volume to the gas system.
  const seat = box(chassis, .88, .64, .62, m.black, .35, .54, .5); seat.rotation.z = .23;
  box(chassis, .86, .15, .66, m.black, -.03, .27, .5);
  const steering = ring(chassis, .22, .032, m.darkSteel, -.87, .86, .5); steering.rotation.y = Math.PI / 2; steering.rotation.z = -.2;
  box(chassis, .11, .06, .29, m.black, -.87, .86, .5);
  for (const axle of [-2.8, 2.8]) for (const side of [-1, 1]) {
    const wheel = new THREE.Group(); wheel.position.set(axle, -.34, side * 1.84); chassis.add(wheel); wheels.push(wheel);
    const tire = cylinder(wheel, .84, .33, m.rubber); tire.rotation.x = Math.PI / 2;
    for (const z of [-.11, .11]) ring(wheel, .782, .062, m.rubber, 0, 0, z);
    const faceZ = side * .184;
    const brake = cylinder(wheel, .57, .026, m.darkSteel, 0, 0, faceZ); brake.rotation.x = Math.PI / 2;
    ring(wheel, .7, .035, m.black, 0, 0, faceZ + side * .034);
    for (let i = 0; i < 12; i++) for (const split of [-.035, .035]) {
      const angle = i * Math.PI / 6 + split;
      const spoke = box(wheel, .025, .55, .032, m.darkSteel, Math.sin(angle) * .39, Math.cos(angle) * .39, faceZ + side * .046);
      spoke.rotation.z = -angle;
    }
    const hub = cylinder(wheel, .125, .09, m.black, 0, 0, faceZ + side * .05); hub.rotation.x = Math.PI / 2;
    box(wheel, .16, .32, .05, m.gold, .45, .03, faceZ + side * .015);
  }

  const battery = part('battery', 'source', '電源', [-.65, -.28, 0], [-2.2, 1.75, 2.6], .2, .79, [0, .65, .1]);
  box(battery, 3.27, .27, 2.32, m.battery); box(battery, 3.02, .034, 2.08, m.darkSteel, 0, .16, 0);
  for (let i = 0; i < 9; i++) box(battery, .025, .025, 1.87, m.steel, -1.23 + i * .3, .19, 0);
  for (const z of [-.83, .83]) box(battery, 2.84, .055, .07, m.gold, 0, .205, z);

  const control = part('control-board', 'controller', '制御基板', [-.55, .23, .35], [-.15, 3.05, 2.4], .23, .8, [0, .62, 0]);
  box(control, 1.12, .075, .86, m.green); box(control, .38, .11, .36, m.black, -.08, .085, 0);
  for (let i = 0; i < 6; i++) {
    box(control, .038, .022, .5, m.trace, -.44 + i * .17, .048, 0);
    box(control, .093, .045, .075, m.steel, -.44 + i * .17, .075, -.32);
  }
  for (const x of [-.48, .48]) for (const z of [-.35, .35]) cylinder(control, .036, .12, m.gold, x, .025, z);

  const drive = part('drive-unit', 'motor', '走行モーター', [2.35, -.11, 0], [2.6, 1.7, 2.6], .27, .84, [.15, .65, .2]);
  const motor = cylinder(drive, .38, 1.18, m.steel); motor.rotation.x = Math.PI / 2;
  for (const z of [-.61, .61]) { const cap = cylinder(drive, .39, .07, m.darkSteel, 0, 0, z); cap.rotation.x = Math.PI / 2; }
  box(drive, .86, .49, .6, m.darkSteel, .54, -.05, 0);
  const shaft = cylinder(drive, .075, 3.15, m.steel, .44, 0, 0); shaft.rotation.x = Math.PI / 2;
  tube(drive, [[-.1, .31, .47], [-.35, .43, .5], [-.95, .41, .5]], m.orange, .045);

  const fanModule = part('suction-fans', 'fan', '吸引ファン', [4.08, .02, 0], [4.3, 3.05, -.2], .25, .85, [0, .9, 0]);
  for (const y of [-.18, .27]) for (const z of [-.55, .55]) {
    const housing = new THREE.Group(); housing.position.set(0, y, z); housing.rotation.z = -Math.PI / 2; fanModule.add(housing);
    const shroud = ring(housing, .23, .045, m.darkSteel); shroud.rotation.x = Math.PI / 2;
    const back = cylinder(housing, .2, .045, m.black, 0, -.07, 0);
    const spin = new THREE.Group(); spin.position.y = .035; housing.add(spin); fans.push(spin);
    cylinder(spin, .055, .07, m.steel);
    for (let i = 0; i < 7; i++) {
      const blade = box(spin, .072, .027, .145, m.carbon, Math.sin(i * Math.PI * 2 / 7) * .12, 0, Math.cos(i * Math.PI * 2 / 7) * .12);
      blade.rotation.y = i * Math.PI * 2 / 7 + .45;
    }
    back.name = 'downforce-fan-housing';
  }
  // Floor inlet ducts connect the rear extraction unit to the sealed underfloor.
  box(fanModule, 1.0, .1, 1.7, m.carbon, -.4, -.49, 0);
  for (let i = 0; i < 7; i++) box(fanModule, .6, .055, .035, m.darkSteel, -.46, -.56, -.64 + i * .21);

  const aero = part('wing-actuator', 'actuator', '翼の駆動部', [3.55, .62, 0], [4.3, 2.15, -3.0], .19, .78, [0, .9, 0]);
  box(aero, .58, .17, 2.35, m.carbon, 0, -.12, 0);
  const movingWing = new THREE.Group(); aero.add(movingWing);
  box(movingWing, .67, .065, 3.04, m.black, 0, .04, 0);
  for (const side of [-1, 1]) {
    box(movingWing, .62, .18, .035, m.carbon, .03, .11, side * 1.52);
    cylinder(aero, .065, .25, m.darkSteel, 0, -.09, side * 1.05);
    cylinder(movingWing, .038, .45, m.steel, 0, -.16, side * 1.05);
  }

  const tanks = part('gas-vessels', 'tank', 'ガスタンク', [.62, .28, -.38], [4.0, 4.1, -2.0], .23, .85, [0, .65, -.15]);
  for (const z of [-.38, .38]) {
    const tank = cylinder(tanks, .305, 2.04, m.carbon, 0, 0, z); tank.rotation.z = Math.PI / 2;
    for (const x of [-1.02, 1.02]) {
      const end = mesh(new THREE.SphereGeometry(.305, 24, 14), m.carbon, tanks, x, 0, z); end.scale.x = .58;
      const port = cylinder(tanks, .065, .2, m.gold, x + Math.sign(x) * .19, 0, z); port.rotation.z = Math.PI / 2;
    }
    for (const x of [-.76, .76]) { const strap = ring(tanks, .313, .03, m.steel, x, 0, z); strap.rotation.y = Math.PI / 2; }
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      box(tanks, 1.83, .013, .018, m.darkSteel, 0, Math.sin(angle) * .305, z + Math.cos(angle) * .305);
    }
  }

  const valves = part('electric-valves', 'valve', '電動バルブ', [1.91, .25, 0], [4.0, 2.9, 2.5], .27, .85, [.1, .75, .1]);
  for (const x of [-.28, .28]) for (const z of [-.35, .35]) {
    box(valves, .32, .2, .25, m.gold, x, 0, z);
    cylinder(valves, .095, .23, m.black, x, .19, z);
    const plunger = cylinder(valves, .045, .09, m.steel, x, .345, z); plungers.push({mesh: plunger, homeY: .345});
    tube(valves, [[x, -.02, z], [x + .2, -.02, z + Math.sign(z) * .18], [x + .38, -.08, z + Math.sign(z) * .18]], m.steel, .027);
  }

  const thrusters = part('cold-gas-nozzles', 'thruster', 'ノズル', [0, 0, 0], [-.9, .05, 3.4], .25, .87, [0, .75, -.1]);
  for (const x of [-2.05, 2.05]) for (const z of [-1.14, 1.14]) {
    cylinder(thrusters, .17, .18, m.steel, x, -.47, z, .205);
    cylinder(thrusters, .11, .01, m.black, x, -.565, z);
    const rim = ring(thrusters, .153, .024, m.darkSteel, x, -.574, z); rim.rotation.x = Math.PI / 2;
    tube(thrusters, [[x, -.32, z], [x * .83, -.29, z * .8], [x * .55, -.28, z * .8]], m.steel, .03);
    const jet = new THREE.Group(); jet.position.set(x, -.59, z); thrusters.add(jet); jet.visible = false;
    const gasMaterial = new THREE.MeshBasicMaterial({color: 0xc5f3ff, transparent: true, opacity: .12, depthWrite: false, side: THREE.DoubleSide});
    const plume = mesh(new THREE.CylinderGeometry(.105, .4, .95, 24, 1, true), gasMaterial, jet, 0, -.48, 0);
    const puffs = [];
    for (let i = 0; i < 5; i++) {
      const puff = mesh(new THREE.SphereGeometry(.2, 12, 8), new THREE.MeshBasicMaterial({color: i % 2 ? 0xecfbff : 0xa8e9ff, transparent: true, opacity: .16, depthWrite: false}), jet);
      puff.scale.set(1, .3, 1); puffs.push(puff);
    }
    jet.traverse(object => { if (object.isMesh) { object.userData.excludeFromFrame = true; object.raycast = () => {}; object.castShadow = false; } });
    jets.push({group: jet, plume, puffs});
  }
  for (const z of [-1.03, 1.03]) {
    const nozzle = cylinder(thrusters, .12, .2, m.darkSteel, 4.37, -.12, z, .16); nozzle.rotation.z = Math.PI / 2;
    const opening = cylinder(thrusters, .093, .015, m.black, 4.481, -.12, z); opening.rotation.z = Math.PI / 2;
  }

  // Generic model control sits above the hood, outside the tinted canopy.
  const power = part('power-switch', 'switch', 'スイッチ', [-2.07, .772, .82], [-4.0, 3.55, 1.45], .2, .8, [0, .5, .15]);
  cylinder(power, .2, .04, m.darkSteel);
  const ringMesh = cylinder(power, .169, .045, m.indicator, 0, .026, 0); ringMesh.name = 'roadster-power-ring';
  const powerCap = new THREE.Group(); power.add(powerCap);
  const button = cylinder(powerCap, .134, .045, m.black, 0, .05, 0); button.name = 'roadster-power-button'; button.userData.powerControl = true;
  const arc = [];
  for (let i = 0; i <= 24; i++) { const a = Math.PI * .23 + i * Math.PI * 1.54 / 24; arc.push([Math.sin(a) * .067, .077, Math.cos(a) * .067]); }
  tube(powerCap, arc, m.white, .008); tube(powerCap, [[0, .077, .084], [0, .077, .014]], m.white, .008);
  const hitMaterial = new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false, colorWrite: false});
  const controlHitArea = mesh(new THREE.BoxGeometry(1, .15, 1), hitMaterial, power, 0, .09, 0);
  controlHitArea.name = 'roadster-power-hit-area';
  controlHitArea.userData.powerControl = true;
  controlHitArea.userData.excludeFromFrame = true;
  controlHitArea.castShadow = controlHitArea.receiveShadow = false;
  for (const p of parts) if (p.role) p.group.traverse(object => { if (object.isMesh) object.userData.part = p.role; });

  let powered = false, flightElapsed = 0;
  const demonstrationDuration = 5.4;
  const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
  function aeroPosition(amount) {
    movingWing.position.y = amount * .5; movingWing.rotation.z = amount * -.12;
    splitter.position.x = -4.33 - amount * .15; splitter.position.y = -.43 - amount * .075;
    for (const skirt of skirts) { skirt.position.y = -.46 - amount * .11; skirt.position.z = skirt.userData.side * (1.65 + amount * .1); }
  }
  function hideJets() {
    for (const jet of jets) jet.group.visible = false;
    for (const item of plungers) item.mesh.position.y = item.homeY;
  }
  function setPowered(on) {
    const next = Boolean(on);
    if (next && !powered) flightElapsed = 0;
    powered = next;
    m.head.color.setHex(powered ? 0xe7faff : 0x9cafb8); m.head.emissiveIntensity = powered ? 2.4 : 0;
    m.tail.emissiveIntensity = powered ? 1.5 : .08;
    m.indicator.color.setHex(powered ? 0x70d69b : 0x5e7568); m.indicator.emissiveIntensity = powered ? 1.15 : 0;
    powerCap.position.y = powered ? -.012 : 0;
    if (!powered) { flightElapsed = 0; root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); aeroPosition(0); hideJets(); }
  }
  function animate(_time, dt, on = powered) {
    if (!powered || !on) return;
    const step = Math.max(0, Math.min(dt, .1)); flightElapsed = Math.min(demonstrationDuration, flightElapsed + step);
    const t = flightElapsed;
    let lift = 0;
    if (t >= .55 && t < 1.9) lift = .82 * smooth((t - .55) / 1.35);
    else if (t >= 1.9 && t < 3.2) lift = .82 + Math.sin((t - 1.9) / 1.3 * Math.PI) * .025;
    else if (t >= 3.2 && t < 4.95) lift = .82 * (1 - smooth((t - 3.2) / 1.75));
    root.position.y = lift;
    root.position.x = lift > 0 ? -.13 * Math.sin((t - .55) / 4.4 * Math.PI) : 0;
    root.rotation.z = lift > 0 ? Math.sin((t - .55) / 4.4 * Math.PI * 2) * .023 * (lift / .82) : 0;
    aeroPosition(smooth(t / .55));
    // Suction fans run on the ground, providing downforce rather than lift.
    if (lift < .035) {
      for (const fan of fans) fan.rotation.y = (fan.rotation.y + step * 22) % (Math.PI * 2);
      for (const wheel of wheels) wheel.rotation.z = (wheel.rotation.z + step * 2.2) % (Math.PI * 2);
    }
    const gas = t > .38 && t < 5.15 ? smooth((t - .38) / .24) * (1 - smooth((t - 4.8) / .35)) : 0;
    for (const item of plungers) item.mesh.position.y = item.homeY + gas * .035;
    for (let j = 0; j < jets.length; j++) {
      const jet = jets[j]; jet.group.visible = gas > .005;
      jet.group.scale.y = Math.min(1, (.59 + lift) / 1.23);
      jet.plume.material.opacity = gas * .105;
      for (let i = 0; i < jet.puffs.length; i++) {
        const puff = jet.puffs[i], phase = (t * 2.2 + i / 5 + j * .11) % 1;
        puff.position.set(Math.sin(i * 2 + t * 5) * phase * .055, -.1 - phase * 1.1, Math.cos(i * 2 + t * 4) * phase * .055);
        const scale = .32 + phase * 1.6; puff.scale.set(scale, .25 + phase * .28, scale);
        puff.material.opacity = gas * .2 * (1 - phase);
      }
    }
  }
  setPowered(false);
  return {
    root, parts, rotors: [], floorY: -1.19, focus: V(0, .4, 0), viewDirection: V(-.62, .52, 1).normalize(),
    motionHeight: 1.15, demonstrationDuration, get flightElapsed() { return flightElapsed; }, setPowered, animate,
  };
}
