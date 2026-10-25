import * as THREE from 'three';

export function createController() {
  const root = new THREE.Group();
  const parts = [];
  const rotors = [];
  const mat = {
    white: new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: .33, metalness: .04 }),
    rear: new THREE.MeshStandardMaterial({ color: 0x777c80, roughness: .64, metalness: .07 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x25292c, roughness: .61, metalness: .09 }),
    black: new THREE.MeshStandardMaterial({ color: 0x15191b, roughness: .74 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x34383a, roughness: .9 }),
    orange: new THREE.MeshStandardMaterial({ color: 0xe46f23, roughness: .42, metalness: .12 }),
    letter: new THREE.MeshStandardMaterial({ color: 0xa4aaad, roughness: .5 }),
    silver: new THREE.MeshStandardMaterial({ color: 0xb5c2c6, roughness: .29, metalness: .88 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xbb8548, roughness: .32, metalness: .8 }),
    board: new THREE.MeshStandardMaterial({ color: 0x17825c, roughness: .6, metalness: .08 }),
    trace: new THREE.MeshStandardMaterial({ color: 0x82bd7b, roughness: .65, metalness: .25 }),
    battery: new THREE.MeshStandardMaterial({ color: 0x415467, roughness: .5, metalness: .19 }),
    red: new THREE.MeshStandardMaterial({ color: 0xca4a38, roughness: .6 }),
  };
  function mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(parent, w, h, d, material, x = 0, y = 0, z = 0) {
    return mesh(new THREE.BoxGeometry(w, h, d), material, parent, x, y, z);
  }
  function cylinder(parent, r, length, material, x = 0, y = 0, z = 0, bottom = r) {
    return mesh(new THREE.CylinderGeometry(r, bottom, length, 40), material, parent, x, y, z);
  }
  function disc(parent, radius, depth, material, x, y, z) {
    const object = cylinder(parent, radius, depth, material, x, y, z);
    object.rotation.x = Math.PI / 2;
    return object;
  }
  function torus(parent, radius, tube, material, x, y, z) {
    return mesh(new THREE.TorusGeometry(radius, tube, 10, 48), material, parent, x, y, z);
  }
  function wire(parent, points, material, radius = .025) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return mesh(new THREE.TubeGeometry(curve, 24, radius, 8, false), material, parent);
  }
  function segment(parent, points, material, radius = .016) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal');
    return mesh(new THREE.TubeGeometry(curve, points.length * 5, radius, 6, false), material, parent);
  }
  function addPart(id, role, label, home, away, start, end, labelOffset = [0, .45, .25]) {
    const group = new THREE.Group();
    const item = {
      id, role, label, group, home: new THREE.Vector3(...home), away: new THREE.Vector3(...away),
      start, end, labelOffset: new THREE.Vector3(...labelOffset),
    };
    group.position.copy(item.home);
    root.add(group);
    parts.push(item);
    return group;
  }
  function outline() {
    const s = new THREE.Shape();
    s.moveTo(-1.7, 1.93);
    s.bezierCurveTo(-2.43, 1.96, -2.85, 1.61, -3.1, .88);
    s.bezierCurveTo(-3.43, -.04, -3.77, -1.7, -3.38, -2.21);
    s.bezierCurveTo(-3.08, -2.62, -2.55, -2.54, -2.22, -2.04);
    s.lineTo(-1.43, -.86);
    s.quadraticCurveTo(-1.22, -.56, -.83, -.56);
    s.lineTo(.83, -.56);
    s.quadraticCurveTo(1.22, -.56, 1.43, -.86);
    s.lineTo(2.22, -2.04);
    s.bezierCurveTo(2.55, -2.54, 3.08, -2.62, 3.38, -2.21);
    s.bezierCurveTo(3.77, -1.7, 3.43, -.04, 3.1, .88);
    s.bezierCurveTo(2.85, 1.61, 2.43, 1.96, 1.7, 1.93);
    s.lineTo(-1.7, 1.93);
    return s;
  }
  function roundedRect(w, h, radius) {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2, r = radius;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function extrude(parent, shape, depth, bevel, material, x = 0, y = 0, z = 0) {
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel,
      bevelSegments: 4, curveSegments: 24, steps: 1,
    });
    geometry.translate(0, 0, -depth / 2);
    return mesh(geometry, material, parent, x, y, z);
  }
  function hole(shape, x, y, radius) {
    const path = new THREE.Path();
    path.absarc(x, y, radius, 0, Math.PI * 2, true);
    shape.holes.push(path);
  }
  const sticks = [[-1.97, .89], [.96, -.25]];
  const buttons = [
    { x: 2.0, y: 1.24, letter: 'Y' },
    { x: 1.53, y: .79, letter: 'X' },
    { x: 2.47, y: .79, letter: 'B' },
    { x: 2.0, y: .34, letter: 'A' },
  ];

  // The twin grips form one continuous rounded shell. Actual openings let
  // the controls remain attached to their electronics as the cover lifts.
  const front = addPart('front-shell', null, 'カバー', [0, 0, 0], [-4.7, 3.5, 1.45], 0, .43);
  const faceShape = outline();
  sticks.forEach(([x, y]) => hole(faceShape, x, y, .535));
  buttons.forEach(({ x, y }) => hole(faceShape, x, y, .255));
  hole(faceShape, -1.0, -.25, .54);
  hole(faceShape, 0, 1.48, .265);
  extrude(front, faceShape, .24, .14, mat.white, 0, 0, .34);
  for (const [x, y] of sticks) torus(front, .54, .057, mat.white, x, y, .58);
  // Fine grip seam marks follow the rounded handles rather than using labels.
  for (const side of [-1, 1]) {
    segment(front, [[side * 2.82, -.57, .46], [side * 2.86, -1.18, .44], [side * 2.93, -1.78, .42]], mat.rear, .009);
  }

  const rear = addPart('rear-shell', null, '背面カバー', [0, 0, 0], [1, -.8, -1.45], .12, .65);
  extrude(rear, outline(), .37, .14, mat.rear, 0, 0, -.31);
  for (const side of [-1, 1]) {
    // Rounded shoulder buttons and triggers retain their real location.
    extrude(rear, roundedRect(.92, .24, .11), .37, .06, mat.dark, side * 2.06, 1.93, -.19);
    extrude(rear, roundedRect(.72, .43, .14), .32, .065, mat.black, side * 2.17, 1.79, -.63);
    for (let i = 0; i < 5; i++) {
      const x = side * (2.57 + i * .075);
      segment(rear, [[x, -1.33, -.52], [x + side * .04, -1.61, -.53]], mat.dark, .012);
    }
  }
  for (const [x, y] of [[-2.75, -1.7], [2.75, -1.7], [-2.22, 1.3], [2.22, 1.3]]) {
    disc(rear, .057, .035, mat.silver, x, y, -.65);
    box(rear, .062, .012, .01, mat.dark, x, y, -.671);
  }
  extrude(rear, roundedRect(1.83, .91, .08), .035, .018, mat.dark, 0, .72, -.65);

  // Main board; controls and their supporting modules stay with the board.
  const electronics = addPart('controller-board', 'controller', '制御基板', [0, 0, 0], [.1, .25, .45], .23, .75, [.1, 1.7, .2]);
  const pcb = new THREE.Shape();
  pcb.moveTo(-2.6, 1.45); pcb.lineTo(2.6, 1.45); pcb.lineTo(2.78, .9);
  pcb.lineTo(2.38, -.55); pcb.lineTo(1.5, -.72); pcb.lineTo(-1.5, -.72);
  pcb.lineTo(-2.38, -.55); pcb.lineTo(-2.78, .9); pcb.closePath();
  extrude(electronics, pcb, .105, .012, mat.board, 0, 0, -.005);
  extrude(electronics, roundedRect(.69, .59, .025), .1, .012, mat.dark, -.1, .47, .105);
  extrude(electronics, roundedRect(.34, .24, .02), .065, .006, mat.dark, .62, .71, .088);
  for (let i = 0; i < 9; i++) {
    for (const side of [-1, 1]) {
      box(electronics, .024, .075, .025, mat.silver, -.36 + i * .067, .47 + side * .34, .08);
    }
  }
  for (let i = 0; i < 6; i++) {
    box(electronics, .12, .06, .055, mat.silver, -.8 + i * .3, 1.24, .085);
    box(electronics, .02, .5, .009, mat.trace, -.8 + i * .3, .92, .058);
  }
  for (const x of [-2.4, 2.4]) {
    for (const y of [-.3, 1.14]) {
      torus(electronics, .065, .018, mat.copper, x, y, .064);
      disc(electronics, .043, .035, mat.dark, x, y, .055);
    }
  }
  box(electronics, 3.75, .018, .009, mat.trace, 0, -.51, .059);
  box(electronics, .018, .7, .009, mat.trace, -.74, -.18, .059);
  for (const [x, y] of sticks) {
    extrude(electronics, roundedRect(.72, .68, .05), .23, .015, mat.silver, x, y, .15);
    disc(electronics, .34, .25, mat.black, x, y, .36);
    disc(electronics, .43, .21, mat.orange, x, y, .59);
    disc(electronics, .414, .19, mat.rubber, x, y, .77);
    disc(electronics, .343, .012, mat.dark, x, y, .871);
    torus(electronics, .375, .032, mat.black, x, y, .862);
    // The short radial knurls create a tactile rubber rim.
    for (let i = 0; i < 42; i++) {
      const a = i * Math.PI * 2 / 42;
      const grip = box(electronics, .018, .038, .11, mat.black, x + Math.cos(a) * .4, y + Math.sin(a) * .4, .79);
      grip.rotation.z = a - Math.PI / 2;
    }
  }
  const cross = new THREE.Shape();
  const arm = .195, end = .5;
  cross.moveTo(-arm, end); cross.lineTo(arm, end); cross.lineTo(arm, arm);
  cross.lineTo(end, arm); cross.lineTo(end, -arm); cross.lineTo(arm, -arm);
  cross.lineTo(arm, -end); cross.lineTo(-arm, -end); cross.lineTo(-arm, -arm);
  cross.lineTo(-end, -arm); cross.lineTo(-end, arm); cross.lineTo(-arm, arm); cross.closePath();
  disc(electronics, .52, .24, mat.black, -1, -.25, .36);
  extrude(electronics, cross, .17, .04, mat.dark, -1, -.25, .64);
  for (const [x, y] of [[-1, .1], [-1, -.6], [-.65, -.25], [-1.35, -.25]]) {
    const marker = mesh(new THREE.ConeGeometry(.04, .065, 3), mat.letter, electronics, x, y, .754);
    marker.rotation.x = Math.PI / 2;
  }
  function letter(parent, character, cx, cy, z) {
    const paths = {
      A: [[[-.092, -.115], [0, .12], [.092, -.115]], [[-.055, -.025], [.055, -.025]]],
      X: [[[-.09, -.115], [.09, .115]], [[-.09, .115], [.09, -.115]]],
      Y: [[[-.095, .115], [0, 0], [.095, .115]], [[0, 0], [0, -.115]]],
      B: [[[-.075, -.115], [-.075, .115], [.025, .115], [.09, .075], [.025, 0], [-.075, 0]], [[.025, 0], [.095, -.06], [.025, -.115], [-.075, -.115]]],
    };
    for (const points of paths[character]) {
      segment(parent, points.map(([x, y]) => [cx + x, cy + y, z]), mat.letter, .014);
    }
  }
  buttons.forEach(({ x, y, letter: name }) => {
    disc(electronics, .2, .41, mat.black, x, y, .39);
    disc(electronics, .237, .14, mat.dark, x, y, .688);
    torus(electronics, .222, .015, mat.black, x, y, .756);
    letter(electronics, name, x, y, .772);
  });
  for (const side of [-1, 1]) {
    const button = extrude(electronics, roundedRect(.2, .36, .09), .13, .03, mat.dark, side * .7, 1.33, .64);
    button.rotation.z = -side * .3;
    segment(electronics, [[side * .7 - .025, 1.4, .75], [side * .7 + .025, 1.27, .75]], mat.letter, .012);
  }
  extrude(electronics, roundedRect(.44, .16, .08), .1, .025, mat.dark, 0, 1.03, .64);
  extrude(electronics, roundedRect(.43, .16, .07), .1, .025, mat.dark, 0, -.32, .62);
  for (const side of [-1, 1]) {
    wire(electronics, [[side * 1.45, -.35, .01], [side * 1.75, -.66, -.08], [side * 2.37, -1.1, -.12]], mat.red);
    wire(electronics, [[side * 1.53, -.35, -.01], [side * 1.88, -.68, -.12], [side * 2.46, -1.08, -.14]], mat.black);
  }

  const battery = addPart('battery', 'source', '電源', [0, .77, -.36], [2.45, 3.3, 1.3], .25, .78, [0, .6, .3]);
  extrude(battery, roundedRect(1.67, .69, .07), .33, .025, mat.battery);
  box(battery, 1.4, .037, .02, mat.silver, 0, .237, .196);
  box(battery, 1.4, .037, .02, mat.silver, 0, -.237, .196);
  for (let i = 0; i < 3; i++) box(battery, .13, .09, .1, mat.copper, -.25 + i * .25, .38, 0);
  for (const side of [-1, 1]) box(battery, .08, .54, .37, mat.black, side * .81, 0, 0);

  const power = addPart('power-switch', 'switch', 'スイッチ', [0, 1.48, .61], [.35, 3.55, 1.3], .2, .76, [0, .4, .2]);
  box(power, .33, .33, .22, mat.board, 0, 0, -.15);
  const powerRingMaterial = mat.orange.clone();
  powerRingMaterial.emissive.setHex(0x24a359);
  powerRingMaterial.emissiveIntensity = 0;
  const ring = disc(power, .225, .12, powerRingMaterial, 0, 0, 0);
  ring.name = 'controller-power-ring';
  const powerButton = new THREE.Group();
  power.add(powerButton);
  const button = disc(powerButton, .197, .095, mat.dark, 0, 0, .077);
  button.name = 'controller-power-button';
  button.userData.powerControl = true;
  // A physical power icon without any manufacturer lettering.
  const arc = [];
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI * .21 + i * Math.PI * 1.58 / 24;
    arc.push([Math.sin(a) * .103, Math.cos(a) * .103, .132]);
  }
  segment(powerButton, arc, mat.letter, .013);
  segment(powerButton, [[0, .14, .132], [0, .035, .132]], mat.letter, .014);

  for (const side of [-1, 1]) {
    const role = side < 0 ? 'motor1' : 'motor2';
    const motor = addPart(role, role, 'モーター', [side * 2.43, -1.22, -.1], [side * 3.7, -.85, .85], .29, .83, [0, .74, .15]);
    motor.rotation.z = side * .39;
    cylinder(motor, .285, .71, mat.silver);
    cylinder(motor, .294, .065, mat.dark, 0, -.345, 0);
    cylinder(motor, .294, .065, mat.dark, 0, .345, 0);
    cylinder(motor, .045, .22, mat.silver, 0, .46, 0);
    for (let i = 0; i < 4; i++) {
      const vent = box(motor, .1, .18, .025, mat.dark, 0, .03, .284);
      vent.rotation.y = i * Math.PI / 2;
      vent.position.set(Math.sin(i * Math.PI / 2) * .284, .03, Math.cos(i * Math.PI / 2) * .284);
    }
    const weight = new THREE.Group();
    weight.position.y = .57;
    weight.userData.axis = 'y';
    weight.userData.spinDirection = side;
    motor.add(weight);
    mesh(new THREE.CylinderGeometry(.29, .29, .18, 32, 1, false, -.2, Math.PI * 1.45), mat.dark, weight, .075, 0, 0);
    cylinder(weight, .06, .21, mat.silver);
    rotors.push(weight);
    for (const x of [-.14, .14]) box(motor, .055, .09, .07, mat.copper, x, -.41, 0);
  }
  for (const part of parts) {
    part.group.traverse(object => {
      if (object.isMesh && part.role) object.userData.part = part.role;
    });
  }
  let powered = false;
  function resetVibration() {
    root.position.set(0, 0, 0);
    root.rotation.z = 0;
  }
  function setPowered(on) {
    powered = Boolean(on);
    powerRingMaterial.color.setHex(powered ? 0x64c88b : 0xe46f23);
    powerRingMaterial.emissiveIntensity = powered ? 1.1 : 0;
    powerButton.position.z = powered ? -.022 : 0;
    if (!powered) resetVibration();
  }
  function animate(time, dt, active = powered) {
    if (!powered || !active) {
      resetVibration();
      return;
    }
    const step = Math.min(Math.max(dt, 0), .05) * 58;
    for (const rotor of rotors) {
      rotor.rotation.y = (rotor.rotation.y + step * rotor.userData.spinDirection) % (Math.PI * 2);
    }
    // A small bounded movement makes the handle motors' action visible while
    // preserving the solid controller silhouette and all assembled parts.
    root.position.x = Math.sin(time * 76) * .028;
    root.position.y = Math.sin(time * 94) * .014;
    root.rotation.z = Math.sin(time * 66) * .007;
  }
  return {
    root, parts, rotors, setPowered, animate,
    focus: new THREE.Vector3(0, .75, .05),
    floorY: -3.6,
    viewDirection: new THREE.Vector3(.1, .2, 1).normalize(),
  };
}
