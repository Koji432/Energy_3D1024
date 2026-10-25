import * as THREE from 'three';

export function createVacuum() {
  const root = new THREE.Group();
  root.name = 'robot-vacuum';
  const parts = [];
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const material = (color, roughness = .5, metalness = .08) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const m = {
    shell: material(0x26292b, .34, .18), edge: material(0x151a1e, .57),
    glossy: material(0x101416, .16, .38), rubber: material(0x1e2225, .91),
    silver: material(0xaab5ba, .28, .82), brushed: material(0x727e85, .44, .72),
    black: material(0x232c31, .64), board: material(0x278463, .56),
    trace: material(0x72b880, .48, .3), copper: material(0xc99d55, .32, .72),
    battery: material(0x44677f, .46), red: material(0xc64c3a, .52),
    clear: new THREE.MeshStandardMaterial({ color: 0x788a8e, transparent: true, opacity: .7, roughness: .3, metalness: .1 }),
    bristle: material(0x746b51, .94), white: material(0xe8eeec, .46),
  };
  function mesh(parent, geometry, mat, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(x, y, z); object.castShadow = object.receiveShadow = true;
    parent.add(object); return object;
  }
  const box = (parent, size, mat, x = 0, y = 0, z = 0) => mesh(parent, new THREE.BoxGeometry(...size), mat, x, y, z);
  const cylinder = (parent, r, h, mat, x = 0, y = 0, z = 0) => mesh(parent, new THREE.CylinderGeometry(r, r, h, 80), mat, x, y, z);
  function ring(parent, r, tube, mat, x = 0, y = 0, z = 0) {
    const object = mesh(parent, new THREE.TorusGeometry(r, tube, 12, 96), mat, x, y, z);
    object.rotation.x = Math.PI / 2; return object;
  }
  function annulus(parent, outer, inner, height, mat, y = 0) {
    const shape = new THREE.Shape(); shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); hole.absarc(0, 0, inner, 0, Math.PI * 2, true); shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 64, steps: 1 });
    geo.translate(0, 0, -height / 2);
    const object = mesh(parent, geo, mat, 0, y, 0); object.rotation.x = -Math.PI / 2; return object;
  }
  function tube(parent, points, radius, mat) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => V(...p)));
    return mesh(parent, new THREE.TubeGeometry(curve, Math.max(12, points.length * 5), radius, 6, false), mat);
  }
  function part(id, role, label, home, away, start, end, labelOffset = [0, .65, 0]) {
    const group = new THREE.Group(); group.name = `vacuum-${id}`; group.position.set(...home); root.add(group);
    parts.push({ id, role, label, group, home: V(...home), away: V(...away), start, end, labelOffset: V(...labelOffset) });
    return group;
  }

  // The low perimeter is hollow, so lifting the cover exposes real separate parts.
  const chassis = part('chassis', null, '本体', [0, 0, 0], [0, 0, 0], .1, .8);
  cylinder(chassis, 2.73, .09, m.edge, 0, -.22, 0);
  annulus(chassis, 2.98, 2.72, .47, m.shell, -.005);
  annulus(chassis, 3.005, 2.92, .14, m.silver, -.19);
  ring(chassis, 2.955, .035, m.brushed, 0, .243, 0);
  const bumperMat = m.edge.clone(); bumperMat.side = THREE.DoubleSide;
  mesh(chassis, new THREE.CylinderGeometry(3.055, 3.055, .28, 80, 1, true, -Math.PI / 2, Math.PI), bumperMat, 0, -.005, 0);
  const bumperSeam = mesh(chassis, new THREE.TorusGeometry(3.057, .013, 6, 80, Math.PI), m.black, 0, .1, 0);
  bumperSeam.rotation.x = Math.PI / 2;
  for (let i = 0; i < 11; i++) {
    const a = -.23 + i * .046;
    const vent = box(chassis, [.018, .12, .025], m.rubber, Math.sin(a) * 3.065, -.1, Math.cos(a) * 3.065);
    vent.rotation.y = a;
  }
  for (const a of [-1.16, -.6, .6, 1.16, 2.3, -2.3]) {
    const sensor = box(chassis, [.19, .11, .025], m.glossy, Math.sin(a) * 3.015, .045, Math.cos(a) * 3.015);
    sensor.rotation.y = a;
  }
  for (const [x, z] of [[-1.9, -1.5], [1.9, -1.5], [-1.55, 1.65], [1.55, 1.65]]) {
    cylinder(chassis, .065, .13, m.brushed, x, -.09, z);
    box(chassis, [.07, .006, .012], m.black, x, -.02, z);
  }
  box(chassis, [1.9, .09, .85], m.black, 0, -.2, .9);
  cylinder(chassis, .23, .13, m.rubber, 0, -.37, -2.12);

  const cover = part('cover', null, 'カバー', [0, .335, 0], [-4.35, 2.75, -.8], 0, .5);
  cylinder(cover, 2.9, .13, m.shell);
  cylinder(cover, 2.72, .025, m.glossy, 0, .077, 0);
  annulus(cover, 1.79, 1.44, .055, m.silver, .108);
  cylinder(cover, 1.437, .025, m.glossy, 0, .112, 0);
  for (const x of [-1.61, 1.61]) box(cover, [.36, .008, .016], m.edge, x, .142, 0);
  // A short raised sensor, and the front release plate, break up the circular lid.
  cylinder(cover, .13, .16, m.edge, 0, .14, -2.64);
  cylinder(cover, .1, .035, m.silver, 0, .238, -2.64);
  const frontPlate = box(cover, [.96, .035, .29], m.brushed, 0, .085, 2.55);
  frontPlate.rotation.x = -.06;
  for (const x of [-.25, 0, .25]) cylinder(cover, .025, .012, m.white, x, .111, 2.56);
  for (const a of [-1.53, 1.53]) {
    const seam = box(cover, [.37, .008, .022], m.black, Math.sin(a) * 2.75, .085, Math.cos(a) * 2.75);
    seam.rotation.y = a - Math.PI / 2;
  }

  const source = part('source', 'source', '電源', [-1.08, .025, -.55], [-1.0, 1.65, -2.65], .2, .76, [0, .65, 0]);
  box(source, [1.5, .34, .71], m.battery);
  for (const x of [-.49, .49]) box(source, [.11, .354, .73], m.black, x);
  for (const x of [-.62, .62]) box(source, [.12, .08, .14], m.copper, x, .19, -.26);
  tube(source, [[.62, .17, -.22], [.9, .24, -.2], [1.04, .12, .18]], .026, m.red);
  tube(source, [[-.62, .17, -.22], [-.9, .2, -.2], [-.98, .08, .18]], .025, m.black);

  const board = part('controller', 'controller', '制御基板', [.7, .045, -.6], [1.25, 2.65, -1.75], .25, .8, [0, .65, 0]);
  box(board, [1.42, .075, 1.15], m.board);
  box(board, [.45, .14, .4], m.black, -.08, .11, -.05);
  for (let i = 0; i < 7; i++) {
    box(board, [.025, .025, .17], m.silver, -.34 + i * .09, .07, -.29);
    box(board, [.025, .025, .17], m.silver, -.34 + i * .09, .07, .25);
    box(board, [.018, .008, .3], m.trace, -.5 + i * .16, .045, .39);
  }
  for (const [x, z] of [[-.52, -.42], [.52, -.42], [-.52, .42], [.52, .42]]) cylinder(board, .047, .04, m.copper, x, .055, z);
  for (const x of [.35, .53]) cylinder(board, .065, .2, m.brushed, x, .14, -.25);
  box(board, [.3, .12, .18], m.white, -.46, .09, -.36);

  const sw = part('switch', 'switch', 'スイッチ', [0, .51, 0], [.05, 4.0, .2], .23, .78, [0, .6, 0]);
  cylinder(sw, .36, .045, m.glossy);
  ring(sw, .38, .025, m.silver, 0, .005, 0);
  const powerMaterial = material(0x404c48, .28, .4);
  const powerRing = ring(sw, .315, .012, powerMaterial, 0, .03, 0);
  // Small geometric lettering keeps the power button clear without loading fonts.
  const letters = {
    C: [[.075, -.06], [.01, -.06], [-.025, -.03], [-.025, .035], [.01, .06], [.075, .06]],
    L: [[-.025, -.06], [-.025, .06], [.065, .06]],
    E: [[.065, -.06], [-.025, -.06], [-.025, .06], [.065, .06]],
    A: [[-.03, .06], [.015, -.06], [.06, .06]],
    N: [[-.025, .06], [-.025, -.06], [.065, .06], [.065, -.06]],
  };
  [...'CLEAN'].forEach((letter, index) => {
    const x = -.245 + index * .105;
    tube(sw, letters[letter].map(([dx, z]) => [x + dx, .03, z]), .006, m.white);
    if (letter === 'E') tube(sw, [[x - .025, .03, 0], [x + .05, .03, 0]], .006, m.white);
    if (letter === 'A') tube(sw, [[x - .009, .03, .015], [x + .042, .03, .015]], .006, m.white);
  });

  const wheelRotors = [];
  function driveMotor(id, side, away) {
    const group = part(id, id, id === 'motor1' ? 'モーター1' : 'モーター2', [side * 2.16, -.15, .27], away, .29, .89, [0, .9, 0]);
    box(group, [.55, .33, .8], m.black, -side * .22, .03, 0);
    const can = cylinder(group, .215, .64, m.silver, -side * .5, .07, -.12); can.rotation.z = Math.PI / 2;
    cylinder(group, .1, .05, m.copper, -side * .84, .07, -.12).rotation.z = Math.PI / 2;
    const wheel = new THREE.Group(); wheel.position.set(side * .1, -.08, 0); group.add(wheel);
    cylinder(wheel, .44, .26, m.rubber).rotation.z = Math.PI / 2;
    cylinder(wheel, .23, .275, m.brushed).rotation.z = Math.PI / 2;
    for (let i = 0; i < 20; i++) {
      const a = i * Math.PI / 10;
      const tread = box(wheel, [.285, .055, .11], m.edge, 0, Math.cos(a) * .429, Math.sin(a) * .429);
      tread.rotation.x = a;
    }
    tube(group, [[-side * .7, .05, -.26], [-side * .98, .18, -.45], [-side * 1.05, .05, -.65]], .023, m.red);
    wheelRotors.push(wheel);
  }
  driveMotor('motor1', -1, [-1.8, .75, 2.9]);
  driveMotor('motor2', 1, [2.55, .75, 2.9]);

  const suction = part('motor3', 'motor3', 'モーター3', [.65, .02, 1.25], [4.25, 1.6, .1], .3, .9, [0, 1.0, 0]);
  cylinder(suction, .38, .4, m.silver, 0, -.03, 0);
  cylinder(suction, .64, .08, m.black, 0, .19, 0);
  ring(suction, .59, .055, m.brushed, 0, .31, 0);
  const blower = new THREE.Group(); blower.position.y = .25; suction.add(blower);
  cylinder(blower, .14, .09, m.copper);
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5;
    const vane = box(blower, [.28, .1, .055], m.silver, Math.cos(a) * .37, 0, Math.sin(a) * .37);
    vane.rotation.y = -a - .35;
  }
  tube(suction, [[-.2, -.1, 0], [-.5, -.03, .15], [-.66, .08, .3]], .023, m.red);

  const tray = part('dust-tray', null, '集じん容器', [0, -.04, -1.85], [.6, .8, -4.1], .12, .68);
  box(tray, [2.15, .35, .8], m.clear);
  box(tray, [2.2, .1, .84], m.black, 0, -.2, 0);
  box(tray, [1.6, .055, .47], m.bristle, 0, .15, .07);
  for (let i = 0; i < 11; i++) box(tray, [.02, .065, .44], m.white, -.72 + i * .144, .187, .07);
  box(tray, [.55, .1, .12], m.brushed, 0, .08, -.44);

  const brush = part('brush', null, 'ブラシ', [0, -.38, .8], [.1, .3, 4.8], .34, .95);
  const roller = cylinder(brush, .19, 2.2, m.rubber, 0, 0, .2); roller.rotation.z = Math.PI / 2;
  for (let i = 0; i < 19; i++) {
    const band = ring(brush, .19, .027, m.bristle, -1.02 + i * .114, 0, .2);
    band.rotation.set(0, Math.PI / 2, 0);
  }
  const sideBrush = new THREE.Group(); sideBrush.position.set(-2.13, -.02, .45); brush.add(sideBrush);
  cylinder(sideBrush, .16, .09, m.brushed);
  for (let i = 0; i < 3; i++) {
    const arm = new THREE.Group(); arm.rotation.y = i * Math.PI * 2 / 3; sideBrush.add(arm);
    box(arm, [.61, .035, .075], m.rubber, .39, 0, 0);
    for (let j = 0; j < 7; j++) tube(arm, [[.64, 0, -.11 + j * .035], [.94, -.01, -.16 + j * .05]], .012, m.bristle);
  }

  for (const item of parts) if (item.role) item.group.traverse(object => { if (object.isMesh) object.userData.part = item.role; });
  let travelPhase = 0;
  function setPowered(on) {
    const set = mat => {
      mat.color.setHex(on ? 0x58b858 : 0x404c48);
      mat.emissive.setHex(on ? 0x35d354 : 0x000000);
      mat.emissiveIntensity = on ? .8 : 0;
    };
    set(powerMaterial); if (powerRing.material !== powerMaterial) set(powerRing.material);
    if (!on) { travelPhase = 0; root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); }
  }
  function animate(time, dt, powered) {
    if (!powered) return;
    travelPhase += Math.min(dt, .05) * .7;
    root.position.set(Math.sin(travelPhase) * .52, 0, Math.sin(travelPhase * 1.4) * .3);
    root.rotation.y = Math.sin(travelPhase * .8) * .15;
    for (const wheel of wheelRotors) wheel.rotation.x += dt * 2.4;
    sideBrush.rotation.y += dt * 9;
    blower.rotation.y += dt * 17;
    roller.rotation.x += dt * 6;
  }
  return { root, parts, rotors: [], focus: V(0, 0, 0), floorY: -.74, viewDirection: V(.45, .95, 1), setPowered, animate };
}
