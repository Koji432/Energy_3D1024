import * as THREE from 'three';

// The brush opening, collection bag and blower remain separate in the exploded view.
export function createCleaner() {
  const root = new THREE.Group();
  root.name = 'blackboard-eraser-cleaner';
  const parts = [], rotors = [];
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const material = (color, roughness = .5, metalness = .04) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const green = material(0x548f1e, .32);
  const greenSide = material(0x4c831d, .38);
  const greenEdge = material(0x365b1d, .47);
  const cream = material(0xe9e4c6, .48);
  const creamEdge = material(0xc5c0a5, .61);
  const black = material(0x25302c, .66);
  const rubber = material(0x363d38, .92);
  const bristle = material(0x666a5b, .95);
  const cloth = material(0xd5d1be, .98);
  const seam = material(0xb6b49f, .95);
  const silver = material(0xb4bfc0, .26, .8);
  const copper = material(0xa67745, .48, .56);
  const red = material(0xb74b35, .62);

  function part(id, role, label, home, away, start, end, labelOffset = V(0, .6, 0)) {
    const group = new THREE.Group();
    group.name = `cleaner-${id}`;
    group.userData.part = role;
    group.position.copy(home);
    root.add(group);
    parts.push({ id, role, group, home, away, start, end, label, labelOffset });
    return group;
  }
  function add(group, geometry, mat, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  function roundedPath(w, h, r, path = new THREE.Shape()) {
    const x = -w / 2, y = -h / 2;
    path.moveTo(x + r, y);
    path.lineTo(x + w - r, y); path.quadraticCurveTo(x + w, y, x + w, y + r);
    path.lineTo(x + w, y + h - r); path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    path.lineTo(x + r, y + h); path.quadraticCurveTo(x, y + h, x, y + h - r);
    path.lineTo(x, y + r); path.quadraticCurveTo(x, y, x + r, y);
    return path;
  }
  function roundedBox(group, w, h, d, r, mat, x = 0, y = 0, z = 0) {
    const bevel = Math.min(.065, d / 4, r / 2);
    const shape = roundedPath(w - bevel * 2, h - bevel * 2, Math.max(.015, r - bevel));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: d - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 6, steps: 1 });
    geo.translate(0, 0, -d / 2 + bevel);
    return add(group, geo, mat, x, y, z);
  }
  function cylinder(group, radius, height, mat, x = 0, y = 0, z = 0, segments = 48) {
    return add(group, new THREE.CylinderGeometry(radius, radius, height, segments), mat, x, y, z);
  }
  function tube(group, points, radius, mat, segments = 24) {
    return add(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => V(...p))), segments, radius, 8, false), mat);
  }
  function horizontalFrame(group, w, d, openingW, openingD, thickness, mat, y) {
    const shape = roundedPath(w, d, .2);
    shape.holes.push(roundedPath(openingW, openingD, .12, new THREE.Path()));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelThickness: .035, bevelSize: .035, bevelSegments: 2, curveSegments: 10, steps: 1 });
    const mesh = add(group, geo, mat, 0, y, 0);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  // A hollow green shell, rather than a solid cube, reveals the collection chamber.
  const housing = part('housing', null, '本体', V(0, -.1, 0), V(-3.3, -.1, -1.2), .19, .82, V(-.4, 1.85, .1));
  roundedBox(housing, 4.9, 3.24, .24, .3, green, 0, -.02, 1.055);
  roundedBox(housing, 4.9, 3.24, .22, .3, greenSide, 0, -.02, -1.055);
  roundedBox(housing, .22, 3.17, 2.05, .1, greenSide, -2.33, -.02, 0);
  roundedBox(housing, .22, 3.17, 2.05, .1, green, 2.33, -.02, 0);
  for (const x of [-2.22, 2.22]) {
    roundedBox(housing, .09, 2.8, .16, .035, greenEdge, x, -.07, -.88);
    const screw = cylinder(housing, .06, .025, silver, x, 1.1, 1.187, 20);
    screw.rotation.x = Math.PI / 2;
    add(housing, new THREE.BoxGeometry(.065, .012, .005), black, x, 1.1, 1.204);
  }
  for (let i = 0; i < 8; i++) roundedBox(housing, 2.3, .055, .018, .026, greenEdge, 0, -.78 + i * .14, -1.174);
  for (const z of [-.68, .68]) {
    const screw = cylinder(housing, .065, .018, silver, 2.449, -.92, z, 20);
    screw.rotation.z = Math.PI / 2;
    add(housing, new THREE.BoxGeometry(.006, .07, .012), black, 2.46, -.92, z);
  }

  // The pale top has a true recessed opening and a rounded front lip.
  const lid = part('lid', null, '上カバー', V(0, 1.48, 0), V(-2.05, 3.7, -.9), 0, .47, V(0, .65, 0));
  horizontalFrame(lid, 4.91, 2.29, 3.86, .96, .24, cream, 0);
  roundedBox(lid, 3.86, .13, .13, .045, creamEdge, 0, .13, -.49);
  roundedBox(lid, 3.86, .13, .13, .045, creamEdge, 0, .13, .49);
  for (const x of [-2.14, 2.14]) roundedBox(lid, .15, .12, 1.65, .055, creamEdge, x, -.05, 0);

  const brushes = part('brushes', null, 'ブラシ', V(0, 1.38, 0), V(.65, 3.25, 1.45), .08, .6, V(0, .62, 0));
  roundedBox(brushes, 3.94, .14, 1.04, .08, black, 0, -.12, 0);
  for (const z of [-.245, .245]) {
    const rollerPivot = new THREE.Group();
    rollerPivot.name = z < 0 ? 'cleaner-back-brush-rotor' : 'cleaner-front-brush-rotor';
    rollerPivot.position.set(0, .105, z);
    rollerPivot.userData.axis = 'x';
    rollerPivot.userData.speed = z < 0 ? 8.5 : -8.5;
    brushes.add(rollerPivot);
    rotors.push(rollerPivot);
    const roller = cylinder(rollerPivot, .185, 3.69, bristle, 0, 0, 0, 40);
    roller.rotation.z = Math.PI / 2;
    for (let i = 0; i < 38; i++) {
      const rib = add(rollerPivot, new THREE.TorusGeometry(.182, .014, 5, 28), i % 2 ? rubber : bristle, -1.8 + i * .097, 0, 0);
      rib.rotation.y = Math.PI / 2;
    }
    // Fine longitudinal bristle rows make the brush's rotation visible.
    for (const a of [0, 1.9, 4.1]) {
      const row = cylinder(rollerPivot, .014, 3.55, creamEdge, 0, Math.cos(a) * .188, Math.sin(a) * .188, 8);
      row.rotation.z = Math.PI / 2;
    }
    for (const x of [-1.9, 1.9]) {
      const axle = cylinder(brushes, .12, .13, silver, x, .1, z, 24);
      axle.rotation.z = Math.PI / 2;
    }
  }
  tube(brushes, [[-1.85, -.17, -.38], [-1.4, -.37, -.39], [-.7, -.48, -.4]], .055, black);

  // A centrifugal blower, with its impeller and electric motor both visible.
  const motor = part('motor', 'motor', 'モーター', V(.95, -.42, -.18), V(3.7, .45, .6), .3, .9, V(.2, 1.1, .2));
  cylinder(motor, .45, .82, silver, 0, -.3, 0);
  cylinder(motor, .465, .11, black, 0, -.73, 0);
  cylinder(motor, .34, .09, copper, 0, .14, 0);
  cylinder(motor, .73, .1, black, 0, .23, 0);
  const blowerRim = add(motor, new THREE.TorusGeometry(.68, .095, 10, 64), black, 0, .43, 0);
  blowerRim.rotation.x = Math.PI / 2;
  const impeller = new THREE.Group();
  impeller.position.y = .34;
  impeller.userData.axis = 'y';
  impeller.userData.speed = 24;
  motor.add(impeller); rotors.push(impeller);
  cylinder(impeller, .18, .14, silver);
  for (let i = 0; i < 9; i++) {
    const a = i * Math.PI * 2 / 9;
    const vane = roundedBox(impeller, .38, .13, .055, .02, silver, Math.cos(a) * .38, 0, Math.sin(a) * .38);
    vane.rotation.y = -a - .46;
  }
  roundedBox(motor, .62, .34, .36, .065, black, -.63, .35, 0);
  roundedBox(motor, 1.3, .08, .8, .05, silver, 0, -.77, 0);
  for (const x of [-.52, .52]) cylinder(motor, .055, .06, black, x, -.7, .25, 20);
  tube(motor, [[-.25, -.63, .17], [-.5, -.7, .45], [-1.15, -.48, .7]], .027, red);
  tube(motor, [[-.15, -.63, .23], [-.42, -.75, .51], [-1.08, -.55, .75]], .026, black);
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI * 2 / 10;
    const vent = add(motor, new THREE.BoxGeometry(.025, .17, .055), black, Math.cos(a) * .45, -.42, Math.sin(a) * .45);
    vent.rotation.y = -a;
  }

  // Pleated cloth collection bag, with an open frame under the brush opening.
  const filter = part('filter', null, '集じん袋', V(-.96, -.35, .02), V(.1, .35, 2.9), .27, .85, V(0, 1.13, .1));
  roundedBox(filter, 1.66, 1.15, 1.37, .13, cloth, 0, -.18, 0);
  horizontalFrame(filter, 1.84, 1.52, 1.43, 1.1, .09, creamEdge, .4);
  roundedBox(filter, 1.49, .035, 1.17, .09, seam, 0, .15, 0);
  for (let i = 0; i < 9; i++) {
    const x = -.68 + i * .17;
    tube(filter, [[x, .33, .7], [x + .025, -.1, .716], [x, -.63, .62]], .011, seam, 9);
    tube(filter, [[x, .33, -.7], [x + .025, -.1, -.716], [x, -.63, -.62]], .011, seam, 9);
  }
  tube(filter, [[-.7, -.64, .62], [0, -.69, .65], [.7, -.64, .62]], .015, seam, 12);

  const tray = part('tray', null, 'トレー', V(0, -1.68, 0), V(.55, -1.58, 1.8), .34, .93, V(.15, .45, 1.0));
  roundedBox(tray, 4.76, .27, 2.25, .16, greenSide, 0, -.04, 0);
  for (const z of [-1.04, 1.04]) roundedBox(tray, 4.56, .19, .12, .045, greenEdge, 0, .15, z);
  for (const x of [-2.22, 2.22]) roundedBox(tray, .12, .19, 2.05, .045, greenEdge, x, .15, 0);
  for (const x of [-1.87, 1.87]) for (const z of [-.76, .76]) cylinder(tray, .13, .16, rubber, x, -.25, z, 24);
  roundedBox(tray, .64, .09, .11, .035, greenEdge, 0, .025, 1.15);

  const sw = part('switch', 'switch', 'スイッチ', V(1.73, -.77, 1.205), V(4.0, -1.25, 2.0), .43, .97, V(0, .65, .1));
  roundedBox(sw, .47, .59, .13, .075, greenEdge);
  roundedBox(sw, .34, .46, .12, .045, black, 0, .01, .09);
  const rocker = roundedBox(sw, .27, .34, .075, .025, rubber.clone(), 0, .025, .17);
  rocker.name = 'cleaner-power-rocker';
  rocker.userData.powerControl = true;
  rocker.rotation.x = -.12;
  const powerIndicator = add(rocker, new THREE.BoxGeometry(.1, .018, .009), cream.clone(), 0, .07, .044);
  powerIndicator.name = 'cleaner-power-indicator';
  const controlHitArea = add(sw, new THREE.BoxGeometry(.68, .8, .18), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }), 0, .025, .205);
  controlHitArea.name = 'cleaner-power-hit-area';
  controlHitArea.userData.powerControl = true;
  controlHitArea.castShadow = controlHitArea.receiveShadow = false;
  tube(sw, [[-.12, -.16, -.09], [-.35, -.29, -.38], [-.6, -.23, -.65]], .026, red);
  tube(sw, [[.08, -.16, -.09], [-.21, -.38, -.42], [-.51, -.31, -.68]], .026, black);

  const source = part('source', 'source', '電源プラグ', V(-2.15, -1.45, -.45), V(-4, -1.43, 1.8), .47, 1, V(-.5, .5, .1));
  const outlet = cylinder(source, .1, .2, rubber, 0, 0, 0, 24);
  outlet.rotation.z = Math.PI / 2;
  tube(source, [[0, 0, 0], [-.5, -.33, -.1], [-.95, -.39, .25], [-1.35, -.38, .8]], .034, black, 34);
  roundedBox(source, .36, .19, .48, .06, rubber, -1.36, -.37, 1.0);
  for (const x of [-.09, .09]) add(source, new THREE.BoxGeometry(.045, .09, .24), silver, -1.36 + x, -.37, 1.35);

  for (const item of parts) {
    item.group.traverse(object => {
      if (object.isMesh) {
        object.userData.part = item.role;
        object.userData.partId = item.id;
      }
    });
  }
  let powered = false;
  function setPowered(on) {
    powered = Boolean(on);
    rocker.rotation.x = powered ? .22 : -.18;
    rocker.material.emissive.setHex(0x28623a);
    rocker.material.emissiveIntensity = powered ? .2 : 0;
    powerIndicator.material.emissive.setHex(0x2cba63);
    powerIndicator.material.emissiveIntensity = powered ? .7 : 0;
  }
  function animate(_time, dt, on = powered) {
    if (!on) return;
    const step = Math.max(0, Math.min(dt, .1));
    for (const rotor of rotors) {
      const axis = rotor.userData.axis;
      rotor.rotation[axis] = (rotor.rotation[axis] + step * rotor.userData.speed) % (Math.PI * 2);
    }
  }
  setPowered(false);
  return { root, parts, rotors, focus: V(0, -.08, 0), floorY: -2.04, viewDirection: V(.65, .4, 1), setPowered, animate };
}
