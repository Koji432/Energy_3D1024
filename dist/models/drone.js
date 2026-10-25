import * as THREE from 'three';

// A deliberately clean, unbranded quadcopter. Every item belongs to one
// independently movable part so the same geometry is used before and after
// the disassembly animation.
export function createDrone() {
  const root = new THREE.Group();
  const parts = [];
  const rotors = [];
  const materials = {
    shell: new THREE.MeshStandardMaterial({ color: 0xf2f1ed, roughness: .32, metalness: .08 }),
    lower: new THREE.MeshStandardMaterial({ color: 0xd4d6d3, roughness: .46, metalness: .1 }),
    white: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .35, metalness: .05 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x252a30, roughness: .5, metalness: .16 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x161c23, roughness: .78 }),
    prop: new THREE.MeshStandardMaterial({ color: 0x454a4d, roughness: .45, metalness: .2, side: THREE.DoubleSide }),
    orange: new THREE.MeshStandardMaterial({ color: 0xfa8b47, roughness: .5, side: THREE.DoubleSide }),
    metal: new THREE.MeshStandardMaterial({ color: 0x929fa6, roughness: .25, metalness: .85 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xd9e3e8, roughness: .2, metalness: .88 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xc88639, roughness: .3, metalness: .76 }),
    board: new THREE.MeshStandardMaterial({ color: 0x167a55, roughness: .65, metalness: .15 }),
    trace: new THREE.MeshStandardMaterial({ color: 0x6cba83, roughness: .6, metalness: .35 }),
    battery: new THREE.MeshStandardMaterial({ color: 0x38444b, roughness: .52, metalness: .22 }),
    red: new THREE.MeshStandardMaterial({ color: 0xe25d50, roughness: .5 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x1e566e, roughness: .23, metalness: .6 }),
    lens: new THREE.MeshPhysicalMaterial({ color: 0x153c5a, metalness: .7, roughness: .1, clearcoat: 1 }),
    light: new THREE.MeshStandardMaterial({ color: 0x75e2a3, emissive: 0x24aa64, emissiveIntensity: .3, roughness: .3 }),
  };

  function mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
    const item = new THREE.Mesh(geometry, material);
    item.position.set(x, y, z);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }
  function box(parent, w, h, d, material, x = 0, y = 0, z = 0) {
    return mesh(new THREE.BoxGeometry(w, h, d), material, parent, x, y, z);
  }
  function cylinder(parent, radius, height, material, x = 0, y = 0, z = 0, radiusBottom = radius) {
    return mesh(new THREE.CylinderGeometry(radius, radiusBottom, height, 40), material, parent, x, y, z);
  }
  function line(parent, from, to, radius, material) {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const item = cylinder(parent, radius, start.distanceTo(end), material);
    item.position.copy(start).add(end).multiplyScalar(.5);
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    return item;
  }
  function cable(parent, points, material, radius = .025) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return mesh(new THREE.TubeGeometry(curve, 28, radius, 8, false), material, parent);
  }
  function part(id, role, label, home, away, start, end, labelOffset = [0, .4, 0]) {
    const group = new THREE.Group();
    const entry = {
      id, role, label, group,
      home: new THREE.Vector3(...home), away: new THREE.Vector3(...away),
      start, end, labelOffset: new THREE.Vector3(...labelOffset),
    };
    group.position.copy(entry.home);
    root.add(group);
    parts.push(entry);
    return group;
  }
  function roundedShape(w, d, r) {
    const s = new THREE.Shape();
    const x = -w / 2, z = -d / 2;
    s.moveTo(x + r, z);
    s.lineTo(x + w - r, z); s.quadraticCurveTo(x + w, z, x + w, z + r);
    s.lineTo(x + w, z + d - r); s.quadraticCurveTo(x + w, z + d, x + w - r, z + d);
    s.lineTo(x + r, z + d); s.quadraticCurveTo(x, z + d, x, z + d - r);
    s.lineTo(x, z + r); s.quadraticCurveTo(x, z, x + r, z);
    return s;
  }
  function roundedBody(parent, w, h, d, r, material, y = 0) {
    const geometry = new THREE.ExtrudeGeometry(roundedShape(w, d, r), {
      depth: h, bevelEnabled: true, bevelThickness: .065, bevelSize: .065,
      bevelSegments: 3, steps: 1, curveSegments: 16,
    });
    geometry.rotateX(Math.PI / 2);
    geometry.translate(0, h / 2, 0);
    return mesh(geometry, material, parent, 0, y, 0);
  }
  function screw(parent, x, y, z, radius = .045) {
    cylinder(parent, radius, .017, materials.steel, x, y, z);
    box(parent, radius * 1.25, .02, .012, materials.dark, x, y + .009, z);
  }

  // Lower shell, four folding-style arms, feet, and the visible wire routes.
  const chassis = part('chassis', null, '本体', [0, -.1, 0], [0, -.65, 0], .13, .62);
  roundedBody(chassis, 1.91, .32, 3.05, .36, materials.lower, 0);
  roundedBody(chassis, 1.66, .06, 2.65, .3, materials.dark, .17);
  const corners = [
    [-2.35, 2.05], [2.35, 2.05], [-2.35, -2.05], [2.35, -2.05],
  ];
  corners.forEach(([x, z], index) => {
    const side = Math.sign(x), fore = Math.sign(z);
    const pivot = [.77 * side, .015, .96 * fore];
    const armEnd = [x, -.015, z];
    const start = new THREE.Vector3(...pivot), end = new THREE.Vector3(...armEnd);
    const arm = box(chassis, .47, .27, start.distanceTo(end), materials.shell);
    arm.position.copy(start).add(end).multiplyScalar(.5);
    arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), end.clone().sub(start).normalize());
    cylinder(chassis, .27, .3, materials.lower, pivot[0], .01, pivot[2]);
    screw(chassis, pivot[0], .175, pivot[2], .065);
    cylinder(chassis, .39, .25, materials.shell, x, .005, z, .32);
    cylinder(chassis, .28, .035, materials.dark, x, .146, z);
    const footLength = z > 0 ? .81 : .46;
    line(chassis, [x, -.08, z], [x + side * .09, -footLength, z + fore * .04], .095, materials.shell);
    cylinder(chassis, .105, .06, materials.rubber, x + side * .09, -footLength - .015, z + fore * .04);
    // Wires are laid on top of the arms so their motor connection is exposed.
    cable(chassis, [[side * .35, .2, fore * .55], [side * .85, .21, fore * 1.04], [x * .7, .19, z * .75], [x, .16, z]], index % 2 ? materials.dark : materials.red, .018);
  });
  for (const x of [-.77, .77]) {
    for (let i = 0; i < 6; i++) {
      box(chassis, .06, .11, .035, materials.dark, x, -.08, -.76 + i * .16);
    }
  }
  for (const x of [-.65, .65]) {
    for (const z of [-1.06, 1.06]) screw(chassis, x, .21, z);
  }

  // Smooth white lid with only physical seams and vents.
  const lid = part('cover', null, 'カバー', [0, .41, -.04], [-4, 2.1, -.5], 0, .42, [0, .4, 0]);
  roundedBody(lid, 1.99, .42, 3.13, .4, materials.shell);
  const nose = box(lid, 1.55, .11, .11, materials.lower, 0, -.11, 1.56);
  nose.rotation.x = -.14;
  for (const x of [-.99, .99]) {
    for (let i = 0; i < 5; i++) {
      box(lid, .022, .095, .07, materials.dark, x, -.06, -.97 + i * .15);
    }
  }
  box(lid, .83, .015, .02, materials.lower, 0, .278, -.91);

  // One rechargeable battery module. The large dark pack remains visibly
  // distinct from the green control board during disassembly.
  const battery = part('battery', 'source', '電源', [0, .17, -.52], [-.5, 3.05, -1.5], .24, .78, [-.05, .42, 0]);
  roundedBody(battery, 1.27, .37, 1.48, .1, materials.battery);
  box(battery, 1.11, .035, 1.27, materials.dark, 0, .239, 0);
  for (const x of [-.39, 0, .39]) {
    box(battery, .027, .042, 1.17, materials.lower, x, .267, 0);
  }
  box(battery, .55, .08, .19, materials.lower, 0, -.02, .79);
  for (let i = 0; i < 4; i++) box(battery, .065, .035, .11, materials.copper, -.155 + i * .105, .04, .83);
  for (let i = 0; i < 4; i++) box(battery, .065, .025, .025, materials.light, -.18 + i * .12, .272, -.46);
  for (const x of [-.67, .67]) box(battery, .09, .18, .55, materials.lower, x, -.02, 0);

  // The controller has recognizable large chips and sparse, readable traces.
  const board = part('controller', 'controller', '制御基板', [0, .19, .83], [1.2, 2.5, 1.15], .28, .8, [.1, .34, 0]);
  box(board, 1.26, .075, 1.02, materials.board);
  box(board, .43, .1, .42, materials.dark, -.1, .09, -.04);
  box(board, .23, .075, .31, materials.dark, .38, .08, .12);
  box(board, .23, .075, .21, materials.metal, -.4, .08, .26);
  for (let i = 0; i < 6; i++) {
    for (const side of [-1, 1]) {
      box(board, .048, .025, .022, materials.steel, -.1 + side * .24, .068, -.19 + i * .058);
    }
  }
  for (const x of [-.52, .52]) {
    for (const z of [-.4, .4]) {
      cylinder(board, .045, .09, materials.copper, x, .01, z);
      cylinder(board, .022, .1, materials.dark, x, .015, z);
    }
  }
  for (let i = 0; i < 4; i++) {
    box(board, .13, .055, .08, materials.steel, -.46 + i * .28, .075, -.37);
    box(board, .036, .008, .23, materials.trace, -.46 + i * .28, .043, -.2);
    box(board, .07, .08, .18, materials.white, -.43 + i * .28, .07, .47);
    box(board, .025, .015, .13, materials.copper, -.43 + i * .28, .12, .49);
  }
  box(board, .8, .009, .022, materials.trace, 0, .044, .29);
  box(board, .022, .009, .25, materials.trace, .17, .044, .16);

  const powerSwitch = part('switch', 'switch', 'スイッチ', [0, .08, -1.61], [2.65, 1.68, -1.25], .29, .8, [0, .3, 0]);
  box(powerSwitch, .48, .19, .22, materials.dark);
  box(powerSwitch, .2, .09, .17, materials.lower, 0, .13, 0);
  for (const x of [-.13, .13]) box(powerSwitch, .045, .1, .11, materials.copper, x, -.12, 0);

  // Camera under the nose and a small gimbal cradle.
  const camera = part('camera', null, 'カメラ', [0, -.48, 1.55], [0, .13, 3.5], .12, .66, [0, .35, .1]);
  for (const x of [-.46, .46]) {
    box(camera, .08, .42, .32, materials.lower, x, .13, -.05);
    const axle = cylinder(camera, .11, .12, materials.metal, x, 0, -.04);
    axle.rotation.z = Math.PI / 2;
  }
  roundedBody(camera, .78, .43, .55, .1, materials.dark);
  const ring = cylinder(camera, .22, .11, materials.rubber, 0, -.005, .32);
  ring.rotation.x = Math.PI / 2;
  const lens = cylinder(camera, .17, .12, materials.lens, 0, -.005, .365);
  lens.rotation.x = Math.PI / 2;
  const glint = mesh(new THREE.SphereGeometry(.038, 12, 8), materials.blue, camera, -.06, .065, .429);
  glint.scale.z = .2;

  function bladeShape() {
    const shape = new THREE.Shape();
    shape.moveTo(.05, -.075);
    shape.quadraticCurveTo(.52, -.19, 1.22, -.17);
    shape.quadraticCurveTo(1.4, -.15, 1.39, -.045);
    shape.quadraticCurveTo(1.1, .05, .6, .16);
    shape.quadraticCurveTo(.24, .23, .05, .075);
    shape.closePath();
    return shape;
  }
  function tipShape() {
    const shape = new THREE.Shape();
    shape.moveTo(1.19, -.173);
    shape.quadraticCurveTo(1.4, -.15, 1.39, -.045);
    shape.lineTo(1.22, .004);
    shape.lineTo(1.19, -.173);
    return shape;
  }
  corners.forEach(([x, z], index) => {
    const motor = part(`motor${index + 1}`, `motor${index + 1}`, 'モーター', [x, .15, z], [x * 1.2, 1.72, z * 1.2], .27, .82, [0, .47, 0]);
    cylinder(motor, .28, .34, materials.metal, 0, .08, 0, .29);
    cylinder(motor, .31, .08, materials.dark, 0, -.09, 0);
    cylinder(motor, .245, .055, materials.steel, 0, .275, 0);
    cylinder(motor, .085, .17, materials.dark, 0, .35, 0);
    for (let i = 0; i < 10; i++) {
      const angle = i * Math.PI / 5;
      const vent = box(motor, .07, .1, .025, materials.dark, Math.sin(angle) * .279, .12, Math.cos(angle) * .279);
      vent.rotation.y = angle;
    }
    for (let i = 0; i < 3; i++) {
      const angle = i * Math.PI * 2 / 3;
      screw(motor, Math.sin(angle) * .17, .31, Math.cos(angle) * .17, .025);
    }
    const propPart = part(`propeller${index + 1}`, null, 'プロペラ', [x, .63, z], [x * 1.2, 3.45, z * 1.2], .02, .55, [0, .3, 0]);
    const spinning = new THREE.Group();
    spinning.rotation.y = (index % 2 ? .75 : -.4) + (z < 0 ? .35 : 0);
    propPart.add(spinning);
    rotors.push(spinning);
    for (let side = 0; side < 2; side++) {
      const wing = new THREE.Group();
      wing.rotation.y = side * Math.PI;
      spinning.add(wing);
      const geometry = new THREE.ExtrudeGeometry(bladeShape(), { depth: .032, bevelEnabled: false, curveSegments: 18 });
      geometry.rotateX(Math.PI / 2);
      mesh(geometry, materials.prop, wing);
      const tip = new THREE.ShapeGeometry(tipShape(), 16);
      tip.rotateX(Math.PI / 2);
      // The tip is a surface marking on the upper face.
      mesh(tip, materials.orange, wing, 0, .003, 0);
    }
    cylinder(spinning, .13, .10, materials.dark, 0, .025, 0);
    cylinder(spinning, .075, .02, materials.steel, 0, .083, 0);
    screw(spinning, 0, .1, 0, .045);
  });

  for (const entry of parts) {
    entry.group.traverse(object => {
      if (object.isMesh && entry.role) object.userData.part = entry.role;
    });
  }
  return { root, parts, rotors, focus: new THREE.Vector3(0, .85, 0) };
}
