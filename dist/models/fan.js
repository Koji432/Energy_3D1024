import * as THREE from 'three';

// A pedestal fan with individually movable, correctly ordered head components.
export function createFan() {
  const root = new THREE.Group();
  root.name = 'fan';
  const parts = [];
  const rotors = [];
  const plastic = new THREE.MeshStandardMaterial({ color: 0xf1f1ed, roughness: .48, metalness: .05 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xd8dedc, roughness: .47, metalness: .13 });
  const edge = new THREE.MeshStandardMaterial({ color: 0x8e9c9b, roughness: .48, metalness: .35 });
  const grille = new THREE.MeshStandardMaterial({ color: 0xb8c4c3, roughness: .4, metalness: .46 });
  const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0xe1e8e5, roughness: .34, metalness: .12, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3c4b4e, roughness: .61, metalness: .1 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xa4b2b4, roughness: .23, metalness: .8 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x268a98, roughness: .42, metalness: .12 });
  const copper = new THREE.MeshStandardMaterial({ color: 0xa77745, roughness: .48, metalness: .57 });

  function part(id, role, label, home, away, start, end, labelOffset) {
    const group = new THREE.Group();
    group.name = `fan-${id}`;
    group.userData.partId = id;
    group.userData.role = role;
    group.position.copy(home);
    root.add(group);
    const entry = { id, role, group, home, away, start, end, label };
    if (labelOffset) entry.labelOffset = labelOffset;
    parts.push(entry);
    return group;
  }
  function add(group, geometry, material, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.partId = group.userData.partId;
    mesh.userData.role = group.userData.role;
    group.add(mesh);
    return mesh;
  }
  function cylinderZ(group, radius, depth, material, x = 0, y = 0, z = 0, radiusBack = radius) {
    const mesh = add(group, new THREE.CylinderGeometry(radius, radiusBack, depth, 48), material, x, y, z);
    mesh.rotation.x = Math.PI / 2;
    return mesh;
  }
  function ring(group, radius, thickness, material, z = 0) {
    return add(group, new THREE.TorusGeometry(radius, thickness, 8, 96), material, 0, 0, z);
  }
  function tube(group, points, radius, material, segments = 30) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return add(group, new THREE.TubeGeometry(curve, segments, radius, 6, false), material);
  }

  // Low, broad oval base; the dark seam makes the perimeter readable on white.
  const base = part('base', null, '台座', new THREE.Vector3(0, -4, -.08), new THREE.Vector3(0, -4, -.08), 0, 1);
  const profile = [
    [0, -.18], [1.15, -.18], [1.45, -.15], [1.62, -.05],
    [1.62, .04], [1.55, .15], [1.27, .25], [.68, .32], [.29, .35], [0, .35],
  ].map(p => new THREE.Vector2(...p));
  const baseShell = add(base, new THREE.LatheGeometry(profile, 80), plastic);
  baseShell.scale.z = .79;
  const baseSeam = add(base, new THREE.CylinderGeometry(1.58, 1.56, .045, 80), edge, 0, -.07, 0);
  baseSeam.scale.z = .79;
  for (const x of [-1.04, 1.04]) {
    for (const z of [-.63, .63]) add(base, new THREE.CylinderGeometry(.14, .15, .07, 20), dark, x, -.205, z);
  }
  add(base, new THREE.CylinderGeometry(.32, .4, .19, 48), pale, 0, .35, -.35);

  // The narrow pole remains behind the fan head instead of crossing its blades.
  const stand = part('stand', null, '支柱', new THREE.Vector3(0, -2, -.48), new THREE.Vector3(0, -2, -.48), 0, 1);
  add(stand, new THREE.CylinderGeometry(.2, .29, 2.53, 40), plastic, 0, -.52, 0);
  add(stand, new THREE.CylinderGeometry(.22, .22, .16, 40), edge, 0, .73, 0);
  add(stand, new THREE.CylinderGeometry(.125, .125, 2.44, 32), metal, 0, 1.91, 0);
  add(stand, new THREE.CylinderGeometry(.2, .15, .4, 32), plastic, 0, 3.05, 0);
  add(stand, new THREE.SphereGeometry(.24, 32, 20), pale, 0, 3.28, 0);
  cylinderZ(stand, .11, .5, edge, 0, 3.28, 0);
  const heightKnob = add(stand, new THREE.CylinderGeometry(.095, .095, .18, 24), dark, .24, .54, .04);
  heightKnob.rotation.z = Math.PI / 2;

  // The head contains one back guard, one motor, three blades and one front guard.
  const rear = part('rear-grille', null, '後ろカバー', new THREE.Vector3(0, 1.7, -.2), new THREE.Vector3(3.7, 2.35, -1.15), .12, .69);
  ring(rear, 2.18, .047, pale);
  ring(rear, 2.12, .018, edge, -.015);
  for (const radius of [.65, 1.3, 1.85]) ring(rear, radius, .012, grille, -.11 * (1 - (radius / 2.18) ** 2));
  for (let i = 0; i < 44; i++) {
    const a = i * Math.PI * 2 / 44;
    const points = [.51, .9, 1.4, 1.85, 2.18].map(r => [Math.cos(a) * r, Math.sin(a) * r, -.11 * (1 - (r / 2.18) ** 2)]);
    tube(rear, points, .0125, grille, 8);
  }
  cylinderZ(rear, .59, .065, pale, 0, 0, -.085);
  cylinderZ(rear, .35, .075, dark, 0, 0, -.045);

  const motor = part('motor', 'motor', 'モーター', new THREE.Vector3(0, 1.7, -.57), new THREE.Vector3(2.75, .5, .8), .35, .9, new THREE.Vector3(.6, .5, .1));
  cylinderZ(motor, .57, .88, plastic, 0, 0, -.13, .63);
  cylinderZ(motor, .6, .055, edge, 0, 0, -.58);
  cylinderZ(motor, .5, .09, pale, 0, 0, -.64);
  cylinderZ(motor, .4, .12, copper, 0, 0, .36);
  cylinderZ(motor, .34, .16, metal, 0, 0, .44);
  cylinderZ(motor, .075, .6, metal, 0, 0, .76);
  for (let i = 0; i < 18; i++) {
    const a = i * Math.PI * 2 / 18;
    const vent = add(motor, new THREE.BoxGeometry(.035, .16, .025), dark, Math.cos(a) * .41, Math.sin(a) * .41, -.701);
    vent.rotation.z = a - Math.PI / 2;
  }
  add(motor, new THREE.CylinderGeometry(.065, .065, .17, 20), dark, 0, .65, -.31);
  add(motor, new THREE.CylinderGeometry(.12, .11, .045, 24), pale, 0, .75, -.31);

  const blades = part('blades', null, '羽根', new THREE.Vector3(0, 1.7, .2), new THREE.Vector3(-.95, 1.3, 2.7), .23, .8);
  const spinning = new THREE.Group();
  spinning.name = 'fan-rotor';
  blades.add(spinning);
  rotors.push(spinning);
  const blade = new THREE.Shape();
  blade.moveTo(.2, .11);
  blade.bezierCurveTo(.52, -.15, 1.32, -.63, 1.75, -.4);
  blade.bezierCurveTo(2.02, -.25, 1.81, .37, 1.6, .73);
  blade.bezierCurveTo(1.34, 1.09, .89, 1.11, .53, .76);
  blade.bezierCurveTo(.29, .52, .13, .32, .2, .11);
  const bladeGeometry = new THREE.ExtrudeGeometry(blade, { depth: .045, bevelEnabled: true, bevelThickness: .035, bevelSize: .03, bevelSegments: 2, curveSegments: 24, steps: 1 });
  for (let i = 0; i < 3; i++) {
    const mesh = new THREE.Mesh(bladeGeometry, bladeMaterial);
    mesh.rotation.z = i * Math.PI * 2 / 3 + .16;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.partId = 'blades';
    mesh.userData.role = null;
    spinning.add(mesh);
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(bladeGeometry, 28), new THREE.LineBasicMaterial({ color: 0xa0aeab, transparent: true, opacity: .55 }));
    outline.rotation.copy(mesh.rotation);
    spinning.add(outline);
  }
  cylinderZ(blades, .38, .22, pale, 0, 0, .07);
  cylinderZ(blades, .2, .045, blue, 0, 0, .2);
  cylinderZ(blades, .085, .05, metal, 0, 0, .23);

  const front = part('front-grille', null, '前カバー', new THREE.Vector3(0, 1.7, .57), new THREE.Vector3(-3.7, 2.55, 3.4), .02, .5);
  ring(front, 2.18, .052, plastic);
  ring(front, 2.13, .016, edge, .025);
  const dome = r => .31 * (1 - (r / 2.18) ** 2);
  for (const r of [.55, 1.1, 1.62, 2.05]) ring(front, r, .011, grille, dome(r));
  for (let i = 0; i < 56; i++) {
    const a = i * Math.PI * 2 / 56;
    const points = [.46, .82, 1.25, 1.74, 2.18].map(r => [Math.cos(a) * r, Math.sin(a) * r, dome(r)]);
    tube(front, points, .012, grille, 8);
  }
  cylinderZ(front, .47, .085, plastic, 0, 0, .318);
  ring(front, .46, .018, edge, .363);
  cylinderZ(front, .36, .014, pale, 0, 0, .369);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
    const clip = add(front, new THREE.BoxGeometry(.12, .2, .115), pale, Math.cos(a) * 2.17, Math.sin(a) * 2.17, -.015);
    clip.rotation.z = a - Math.PI / 2;
  }

  // Controls and mains connection are the two other electrical components.
  const controls = part('switch', 'switch', 'スイッチ', new THREE.Vector3(.15, -3.71, .73), new THREE.Vector3(2.8, -3.4, 1.7), .42, .94, new THREE.Vector3(.05, .5, .08));
  const panel = add(controls, new THREE.BoxGeometry(.99, .1, .4), pale);
  panel.rotation.x = -.13;
  for (let i = 0; i < 4; i++) {
    const button = add(controls, new THREE.BoxGeometry(.17, .12, .25), i === 0 ? blue : plastic, -.33 + i * .22, .09, 0);
    button.rotation.x = -.13;
  }
  tube(controls, [[-.22, -.03, -.15], [-.3, -.1, -.45], [-.25, -.1, -.7]], .027, dark, 12);

  const source = part('source', 'source', '電源プラグ', new THREE.Vector3(-.74, -3.94, -.5), new THREE.Vector3(-3.35, -3.4, .45), .46, .98, new THREE.Vector3(-.5, .45, .35));
  tube(source, [[.68, .05, 0], [.15, -.05, -.5], [-.55, -.12, -.6], [-1.2, -.12, -.12], [-1.48, -.1, .44]], .035, pale, 32);
  const plug = add(source, new THREE.BoxGeometry(.35, .19, .52), plastic, -1.48, -.1, .65);
  plug.rotation.y = -.15;
  for (const x of [-.09, .09]) {
    const prong = add(source, new THREE.BoxGeometry(.048, .1, .24), metal, -1.48 + x, -.1, 1.02);
    prong.rotation.y = -.15;
  }

  return { root, parts, rotors, focus: new THREE.Vector3(0, -.1, 0) };
}
