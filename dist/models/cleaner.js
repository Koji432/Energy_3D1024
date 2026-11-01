import * as THREE from 'three';
import {createExplodedWiring} from './exploded-wiring.js';

// The brush opening, collection bag and blower remain separate in the exploded view.
export function createCleaner() {
  const root = new THREE.Group();
  root.name = 'blackboard-eraser-cleaner';
  const parts = [], rotors = [];
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const material = (color, roughness = .5, metalness = .04) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const green = new THREE.MeshPhysicalMaterial({color: 0x37780b, roughness: .25, metalness: .02, clearcoat: .65, clearcoatRoughness: .2, vertexColors: true});
  const greenSide = material(0x2b5c09, .34);
  const greenEdge = material(0x244d0b, .4);
  const cream = new THREE.MeshPhysicalMaterial({color: 0xd4c49a, roughness: .38, metalness: .02, clearcoat: .3, clearcoatRoughness: .35});
  const creamEdge = material(0xc5ba94, .54);
  const black = material(0x25302c, .66);
  const rubber = material(0x363d38, .92);
  const bristle = material(0x99967c, .95);
  const cloth = material(0xd5d1be, .98);
  const seam = material(0xb6b49f, .95);
  const silver = material(0xb4bfc0, .26, .8);
  const copper = material(0xa67745, .48, .56);

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
  function mouldedSurface(group, profiles, mat, {convex = false, shadeSides = false} = {}) {
    const positions = [], colors = [], indices = [];
    const count = 128;
    for (const profile of profiles) {
      const outline = roundedPath(profile.w, profile.d, profile.r).getSpacedPoints(count).slice(0, count);
      for (const point of outline) {
        const x = point.x, z = point.y;
        const bulge = convex ? .09 * Math.max(0, 1 - (x / 2.45) ** 2) * Math.max(0, 1 - (profile.y / 1.8) ** 2) * Math.max(0, z / (profile.d / 2)) ** 4 : 0;
        const drop = profile.leftDrop ? profile.leftDrop * THREE.MathUtils.smoothstep(-x, 1.85, 2.45) : 0;
        const front = THREE.MathUtils.smoothstep(z / (profile.d / 2), .15, .8) * THREE.MathUtils.smoothstep(x, -2.45, -1.8);
        positions.push(x, profile.y - drop + (profile.frontRise || 0) * front, z + bulge - (profile.frontSetback || 0) * front);
        const shade = shadeSides ? .83 + .17 * Math.max(0, z / (profile.d / 2)) : 1;
        colors.push(shade, shade, shade);
      }
    }
    for (let ring = 0; ring < profiles.length - 1; ring++) for (let i = 0; i < count; i++) {
      const a = ring * count + i, b = ring * count + (i + 1) % count, d = a + count, e = b + count;
      indices.push(a, d, b, b, d, e);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    return add(group, geometry, mat);
  }

  // A hollow green shell, rather than a solid cube, reveals the collection chamber.
  const housing = part('housing', null, '本体', V(0, -.1, 0), V(-3.3, -.1, -1.2), .19, .82, V(-.4, 1.85, .1));
  mouldedSurface(housing, [
    {w: 4.57, d: 2.06, r: .26, y: -1.65},
    {w: 4.81, d: 2.28, r: .29, y: -1.59},
    {w: 4.9, d: 2.36, r: .31, y: -1.47},
    {w: 4.9, d: 2.36, r: .31, y: 1.24},
    {w: 4.88, d: 2.34, r: .32, y: 1.41, frontRise: .06},
    {w: 4.77, d: 2.22, r: .32, y: 1.56, frontRise: .18},
    {w: 4.48, d: 1.6, r: .23, y: 1.51, frontRise: .18},
    {w: 4.48, d: 1.94, r: .23, y: -1.53},
  ], green, {convex: true, shadeSides: true});
  for (const x of [-2.22, 2.22]) {
    roundedBox(housing, .09, 2.8, .16, .035, greenEdge, x, -.07, -.88);
  }
  for (let i = 0; i < 8; i++) roundedBox(housing, 2.3, .055, .018, .026, greenEdge, 0, -.78 + i * .14, -1.174);

  // The pale top has a true recessed opening and a rounded front lip.
  const lid = part('lid', null, '上カバー', V(0, 1.48, 0), V(-2.05, 3.7, -.9), 0, .47, V(0, .65, 0));
  mouldedSurface(lid, [
    {w: 4.82, d: 2.17, r: .3, y: -.03, leftDrop: .27, frontSetback: .24},
    {w: 4.9, d: 2.25, r: .34, y: .065, leftDrop: .06, frontSetback: .24},
    {w: 4.77, d: 2.12, r: .36, y: .2, frontSetback: .15},
    {w: 4.35, d: 1.8, r: .34, y: .24, frontSetback: .1},
    {w: 3.96, d: 1.12, r: .25, y: .185, frontSetback: .04},
    {w: 3.69, d: .78, r: .17, y: .1},
  ], cream);
  const recessFloor = roundedPath(3.69, .78, .17);
  for (const z of [-.245, .245]) {
    const slot = roundedPath(3.42, .075, .035, new THREE.Path());
    for (const curve of slot.curves) for (const key of ['v0', 'v1', 'v2']) if (curve[key]) curve[key].y += z;
    recessFloor.holes.push(slot);
  }
  const floorGeometry = new THREE.ExtrudeGeometry(recessFloor, {depth: .028, bevelEnabled: true, bevelSize: .012, bevelThickness: .012, bevelSegments: 2, curveSegments: 12});
  const cleaningRecess = add(lid, floorGeometry, cream, 0, .061, 0);
  cleaningRecess.rotation.x = -Math.PI / 2;

  const brushes = part('brushes', null, 'ブラシ', V(0, 1.25, 0), V(.65, 3.25, 1.45), .08, .6, V(0, .62, 0));
  roundedBox(brushes, 3.94, .14, 1.04, .08, black, 0, -.12, 0);
  for (const z of [-.245, .245]) {
    const rollerPivot = new THREE.Group();
    rollerPivot.name = z < 0 ? 'cleaner-back-brush-rotor' : 'cleaner-front-brush-rotor';
    rollerPivot.position.set(0, .105, z);
    rollerPivot.userData.axis = 'x';
    rollerPivot.userData.speed = z < 0 ? 8.5 : -8.5;
    brushes.add(rollerPivot);
    rotors.push(rollerPivot);
    const roller = cylinder(rollerPivot, .15, 3.48, bristle, 0, 0, 0, 40);
    roller.rotation.z = Math.PI / 2;
    for (let i = 0; i < 38; i++) {
      const rib = add(rollerPivot, new THREE.TorusGeometry(.148, .01, 5, 28), bristle, -1.7 + i * .092, 0, 0);
      rib.rotation.y = Math.PI / 2;
    }
    // Fine longitudinal bristle rows make the brush's rotation visible.
    for (const a of [0, 1.9, 4.1]) {
      const row = cylinder(rollerPivot, .009, 3.4, creamEdge, 0, Math.cos(a) * .154, Math.sin(a) * .154, 8);
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
  for (const x of [-.24, .24]) {
    roundedBox(motor, .15, .15, .16, .025, black, x, -.45, .4);
    roundedBox(motor, .11, .1, .11, .02, copper, x, -.45, .485);
  }
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

  const sw = part('switch', 'switch', 'スイッチ', V(1.78, .24, 1.17), V(4.0, -1.25, 2.0), .43, .97, V(0, .65, .1));
  roundedBox(sw, .34, .38, .08, .055, greenEdge, 0, 0, -.015);
  const bezel = cylinder(sw, .14, .06, black, 0, .025, .07);
  bezel.rotation.x = Math.PI / 2;
  const powerButton = new THREE.Group();
  powerButton.name = 'cleaner-power-button';
  powerButton.position.set(0, .025, .13);
  powerButton.userData.part = 'switch';
  powerButton.userData.powerControl = true;
  sw.add(powerButton);
  const buttonFace = cylinder(powerButton, .105, .08, rubber.clone());
  buttonFace.name = 'cleaner-power-button-face';
  buttonFace.rotation.x = Math.PI / 2;
  buttonFace.userData.powerControl = true;
  const indicatorMaterial = cream.clone();
  const powerIndicator = add(powerButton, new THREE.TorusGeometry(.031, .004, 7, 36, Math.PI * 1.6), indicatorMaterial, 0, 0, .045);
  powerIndicator.rotation.z = Math.PI * .7;
  powerIndicator.name = 'cleaner-power-indicator';
  roundedBox(powerButton, .009, .043, .008, .004, indicatorMaterial, 0, .033, .045);
  const controlHitArea = add(sw, new THREE.BoxGeometry(.62, .7, .16), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }), 0, .025, .14);
  controlHitArea.name = 'cleaner-power-hit-area';
  controlHitArea.userData.powerControl = true;
  controlHitArea.castShadow = controlHitArea.receiveShadow = false;
  for (const x of [-.27, .27]) roundedBox(sw, .11, .09, .18, .02, copper, x, -.12, -.2);

  const source = part('source', 'source', '電源プラグ', V(-2.15, -1.45, -.45), V(-4, -1.43, 1.8), .47, 1, V(-.5, .5, .1));
  const outlet = cylinder(source, .1, .2, rubber, 0, 0, 0, 24);
  outlet.rotation.z = Math.PI / 2;
  tube(source, [[0, 0, 0], [-.5, -.33, -.1], [-.95, -.39, .25], [-1.35, -.38, .8]], .034, black, 34);
  roundedBox(source, .36, .19, .48, .06, rubber, -1.36, -.37, 1.0);
  for (const x of [-.09, .09]) add(source, new THREE.BoxGeometry(.045, .09, .24), silver, -1.36 + x, -.37, 1.35);
  roundedBox(source, .42, .21, .44, .055, rubber, .18, .015, 0);
  for (const z of [-.16, .16]) roundedBox(source, .12, .085, .08, .018, silver, .35, .03, z);

  for (const item of parts) {
    item.group.traverse(object => {
      if (object.isMesh) {
        object.userData.part = item.role;
        object.userData.partId = item.id;
      }
    });
  }
  const connections = createExplodedWiring({root, radius: .048,
    terminals: [
      {id: 'supply-a', node: 'source', role: 'source', partId: 'source', group: source, position: V(.41, .03, -.16)},
      {id: 'supply-b', node: 'source', role: 'source', partId: 'source', group: source, position: V(.41, .03, .16)},
      {id: 'switch-input', node: 'switch', role: 'switch', partId: 'switch', group: sw, position: V(-.27, -.12, -.12)},
      {id: 'switch-output', node: 'switch', role: 'switch', partId: 'switch', group: sw, position: V(.27, -.12, -.12)},
      {id: 'motor-input', node: 'motor', role: 'motor', partId: 'motor', group: motor, position: V(.24, -.45, .54)},
      {id: 'motor-return', node: 'motor', role: 'motor', partId: 'motor', group: motor, position: V(-.24, -.45, .54)},
    ],
    components: [
      {id: 'source', kind: 'ac-source', terminals: ['supply-a', 'supply-b']},
      {id: 'switch', kind: 'switch', terminals: ['switch-input', 'switch-output']},
      {id: 'motor', kind: 'motor', terminals: ['motor-input', 'motor-return']},
    ],
    leads: [
      {id: 'supply-feed', from: 'supply-a', to: 'switch-input', color: 'supply', route: (a, b) => [
        a, a.clone().add(V(.55, -.17, .65)),
        V((a.x + b.x) / 2, Math.min(a.y, b.y) - .1, Math.max(a.z, b.z) + 1.6),
        b.clone().add(V(-.55, -.12, .65)), b,
      ]},
      {id: 'motor-feed', from: 'switch-output', to: 'motor-input', color: 'supply', route: (a, b) => [
        a, a.clone().add(V(.6, .15, .4)),
        V(Math.max(a.x, b.x) + .9, (a.y + b.y) / 2, Math.max(a.z, b.z) + .65),
        b.clone().add(V(.7, -.15, .55)), b,
      ]},
      {id: 'motor-return', from: 'motor-return', to: 'supply-b', color: 'return', route: (a, b) => [
        a, a.clone().add(V(-.65, .4, .8)),
        V((a.x + b.x) / 2 + .35, Math.max(a.y, b.y) + 1.3, Math.max(a.z, b.z) + 2),
        b.clone().add(V(.15, .5, .65)), b,
      ]},
    ],
  });
  let powered = false;
  function setPowered(on) {
    powered = Boolean(on);
    powerButton.position.z = powered ? .075 : .13;
    buttonFace.material.emissive.setHex(0x28623a);
    buttonFace.material.emissiveIntensity = powered ? .2 : 0;
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
  function updateConnections(progress) {
    // The product photo keeps the cord out of view; expose it with its wiring.
    source.visible = progress > .08;
    connections.updateConnections(progress);
  }
  updateConnections(0);
  setPowered(false);
  return { root, parts, rotors, focus: V(0, -.08, 0), floorY: -2.04, viewDirection: V(-.7, .48, 1), setPowered, animate, connections, updateConnections };
}
