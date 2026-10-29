import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const mat = (color, metalness = .12, roughness = .48) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness });

function mesh(parent, geometry, material, position = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function box(parent, size, material, position) {
  return mesh(parent, new THREE.BoxGeometry(...size), material, position);
}

function cylinder(parent, radius, height, material, position, rotationX = 0) {
  const object = mesh(parent, new THREE.CylinderGeometry(radius, radius, height, 40), material, position);
  object.rotation.x = rotationX;
  return object;
}

function wire(parent, points, material, radius = .045) {
  const curve = new THREE.CurvePath();
  for (let i = 1; i < points.length; i++) {
    curve.add(new THREE.LineCurve3(V(...points[i - 1]), V(...points[i])));
  }
  return mesh(parent, new THREE.TubeGeometry(curve, points.length * 12, radius, 10, false), material);
}

/** Electrical parts in the same arrangement as diagramMarkup(). */
export function createCircuit(deviceId) {
  const root = new THREE.Group();
  root.name = `${deviceId}-circuit`;
  const parts = [], rotors = [], ledMeshes = [];
  const hooks = {};
  const materials = {
    red: mat(0xe45c4a), black: mat(0x273e4b), metal: mat(0xd6e1e4, .8, .24),
    dark: mat(0x273646), blue: mat(0x2589be), gold: mat(0xe6ac3a, .5, .3),
    white: mat(0xf5f6ed), green: mat(0x239467), copper: mat(0xc79850, .6, .3),
    resistor: mat(0xe9c38b), blade: mat(0x4b6d7d),
  };
  const y = .24;
  const cable = (points, color = 'red') => wire(root, points.map(([x, z]) => [x, y, z]), materials[color]);

  function part(id, label, x, z, labelOffset = V(0, .95, .1)) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.userData.part = id;
    root.add(group);
    const item = { id, role: id, group, label, labelOffset };
    parts.push(item);
    return group;
  }

  function battery(x = -3.1, z = 0, rechargeable = false) {
    const group = part('source', '電源', x, z, V(-.1, .95, .15));
    if (rechargeable) {
      box(group, [.78, .62, 1.65], materials.blue, [0, .4, 0]);
      box(group, [.79, .1, .26], materials.dark, [0, .76, -.55]);
      box(group, [.2, .13, .16], materials.copper, [-.2, .71, -.87]);
      box(group, [.2, .13, .16], materials.metal, [.2, .71, .87]);
    } else {
      cylinder(group, .37, 1.88, materials.gold, [0, .41, 0], Math.PI / 2);
      cylinder(group, .376, .45, materials.dark, [0, .41, .68], Math.PI / 2);
      cylinder(group, .35, .035, materials.metal, [0, .41, -.96], Math.PI / 2);
      cylinder(group, .14, .13, materials.metal, [0, .41, -1.035], Math.PI / 2);
      cylinder(group, .35, .035, materials.metal, [0, .41, .96], Math.PI / 2);
      // Positive sign sits on the upward-facing battery wrapper.
      box(group, [.23, .014, .055], materials.white, [0, .785, -.57]);
      box(group, [.055, .014, .23], materials.white, [0, .786, -.57]);
      box(group, [.23, .014, .055], materials.white, [0, .785, .62]);
    }
    if (rechargeable) {
      wire(group, [[-.2, .71, -.87], [0, y, -.88]], materials.metal, .035);
      wire(group, [[.2, .71, .87], [0, y, .88]], materials.metal, .035);
    } else {
      wire(group, [[0, .41, -1.1], [0, y, -1.1]], materials.metal, .035);
      wire(group, [[0, .41, .98], [0, y, .98]], materials.metal, .035);
    }
    return group;
  }

  function slideSwitch(x = -.35, z = -2.05) {
    const group = part('switch', 'スイッチ', x, z, V(0, .8, -.15));
    box(group, [.86, .22, .5], materials.dark, [0, .24, 0]);
    box(group, [.66, .035, .36], materials.metal, [0, .369, 0]);
    const lever = box(group, [.3, .2, .3], materials.blue, [-.14, .48, 0]);
    lever.userData.lever = true;
    for (let i = 0; i < 3; i++) {
      box(lever, [.025, .018, .23], materials.white, [-.075 + i * .075, .105, 0]);
    }
    box(group, [.17, .12, .24], materials.copper, [-.5, y, 0]);
    box(group, [.17, .12, .24], materials.copper, [.5, y, 0]);
    return group;
  }

  function resistor(x = 3.05, z = -.9) {
    const group = part('resistor', '抵抗', x, z, V(.1, .9, 0));
    cylinder(group, .22, .72, materials.resistor, [0, .32, 0], Math.PI / 2);
    for (const [offset, color] of [[-.22, 0x744039], [-.08, 0x273646], [.08, 0xe35c39], [.24, 0xd4aa42]]) {
      cylinder(group, .226, .065, mat(color), [0, .32, offset], Math.PI / 2);
    }
    wire(group, [[0, y, -.64], [0, .32, -.5], [0, .32, -.36]], materials.metal, .033);
    wire(group, [[0, .32, .36], [0, .32, .5], [0, y, .64]], materials.metal, .033);
  }

  function led(x = 3.05, z = .95) {
    const group = part('led', 'LED', x, z, V(.05, 1, .1));
    // A large dome and two separate leads remain clear from the default view.
    cylinder(group, .31, .12, materials.white, [0, .2, 0]);
    const lightMaterial = new THREE.MeshStandardMaterial({ color: 0xffdf55, emissive: 0xffd23c, emissiveIntensity: 0, roughness: .25 });
    const dome = mesh(group, new THREE.SphereGeometry(.27, 36, 24, 0, Math.PI * 2, 0, Math.PI / 2), lightMaterial, [0, .39, 0]);
    const stem = cylinder(group, .27, .2, lightMaterial, [0, .29, 0]);
    ledMeshes.push(dome, stem);
    wire(group, [[0, y, -.58], [0, .14, -.28], [0, .14, -.12]], materials.metal, .032);
    wire(group, [[0, .14, .12], [0, .14, .28], [0, y, .58]], materials.metal, .032);
  }

  function motor(id, label, x, z, small = false, rotorType = 'propeller') {
    const group = part(id, label, x, z, V(0, small ? 1.12 : 1.5, .1));
    const radius = small ? .32 : .48;
    const can = cylinder(group, radius, small ? .46 : .65, materials.metal, [0, small ? .39 : .5, 0]);
    const cap = cylinder(group, radius * .9, .08, materials.dark, [0, small ? .65 : .87, 0]);
    const shaft = cylinder(group, .075, .25, materials.metal, [0, small ? .76 : .98, 0]);
    if (rotorType === 'wheel') {
      for (const object of [can, cap, shaft]) object.rotation.z = Math.PI / 2;
      can.position.set(-.15, .5, 0); cap.position.set(-.51, .5, 0); shaft.position.set(.27, .5, 0);
    }
    for (const xSide of [-1, 1]) {
      box(group, [.14, .08, .18], materials.copper, [xSide * radius * .6, .16, xSide * .43]);
    }
    wire(group, [[0, y, -.62], [-radius * .6, .16, -.43]], materials.metal, .03);
    wire(group, [[radius * .6, .16, .43], [0, y, .62]], materials.metal, .03);
    const rotor = new THREE.Group();
    rotor.position.y = small ? .86 : 1.1;
    rotor.userData.axis = 'y';
    rotor.userData.kind = rotorType;
    group.add(rotor);
    if (rotorType === 'wheel') {
      rotor.position.set(.5, .51, 0); rotor.userData.axis = 'x';
      cylinder(rotor, .48, .2, materials.dark, [0, 0, 0]).rotation.z = Math.PI / 2;
      cylinder(rotor, .22, .22, materials.blue, [0, 0, 0]).rotation.z = Math.PI / 2;
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI / 8;
        const tread = box(rotor, [.23, .055, .13], materials.black, [0, Math.cos(a) * .47, Math.sin(a) * .47]);
        tread.rotation.x = a;
      }
    } else if (rotorType === 'vibration') {
      // The offset brass weight turns with the shaft; there are no propeller blades.
      box(rotor, [.4, .22, .3], materials.gold, [.2, .03, 0]);
      cylinder(rotor, .11, .23, materials.metal, [0, .02, 0]);
    } else if (rotorType === 'blower') {
      cylinder(rotor, .64, .065, materials.metal, [0, 0, 0]);
      for (let i = 0; i < 12; i++) {
        const fin = new THREE.Group();
        fin.rotation.y = i * Math.PI / 6;
        rotor.add(fin);
        box(fin, [.25, .16, .045], materials.blue, [.47, .1, 0]);
      }
    } else {
      const bladeLength = small ? .93 : 1.45;
      for (let i = 0; i < (small ? 2 : 3); i++) {
        const bladeGroup = new THREE.Group();
        bladeGroup.rotation.y = i * Math.PI * 2 / (small ? 2 : 3);
        rotor.add(bladeGroup);
        const blade = box(bladeGroup, [bladeLength / 2, .045, small ? .16 : .28], materials.blade, [bladeLength / 4, 0, 0]);
        blade.rotation.z = -.08;
      }
    }
    if (rotorType !== 'wheel') cylinder(rotor, small ? .13 : .18, .12, materials.blue, [0, .02, 0]);
    rotors.push(rotor);
    return group;
  }

  if (deviceId === 'roadster') {
    root.userData.electricalRoles = ['source', 'switch', 'controller', 'motor', 'fan', 'actuator', 'valve'];
    root.userData.electricalLoads = ['motor', 'fan', 'actuator', 'valve'];
    root.userData.gasRoles = ['tank', 'valve', 'thruster'];
    root.userData.architecture = 'simplified-electric-controls-and-separate-gas-path';
    const electric = points => {
      const line = cable(points);
      line.name = 'electric-wire'; line.userData.medium = 'electric'; return line;
    };
    const negative = points => {
      const line = cable(points, 'black');
      line.name = 'electric-return'; line.userData.medium = 'electric'; return line;
    };
    const orange = mat(0xdd8d37, .24, .42);
    function gasPipe(points) {
      const group = new THREE.Group(); group.name = 'gas-pipe'; group.userData.medium = 'gas'; root.add(group);
      for (let i = 1; i < points.length; i++) {
        const a = V(points[i - 1][0], .075, points[i - 1][1]);
        const b = V(points[i][0], .075, points[i][1]);
        const length = a.distanceTo(b);
        for (let d = 0; d < length; d += .25) {
          const start = a.clone().lerp(b, d / length), end = a.clone().lerp(b, Math.min(d + .15, length) / length);
          const dash = wire(group, [start.toArray(), end.toArray()], orange, .033);
          dash.userData.medium = 'gas';
        }
      }
    }
    function mediumLabel(text, color, x, z) {
      if (typeof document === 'undefined') return;
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 96;
      const ctx = canvas.getContext('2d'); ctx.font = 'bold 58px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(text, 128, 48);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
      sprite.position.set(x, .43, z); sprite.scale.set(1.2, .45, 1); sprite.name = `${text}-label`; root.add(sprite);
    }

    battery(-3.55, 0, true);
    slideSwitch(-2.1, -2.3);
    const board = part('controller', '制御基板', -.4, -2.3, V(0, .8, -.15));
    box(board, [1.13, .12, .73], materials.green, [0, .25, 0]);
    box(board, [.39, .16, .35], materials.dark, [0, .39, 0]);
    for (let i = 0; i < 5; i++) {
      box(board, [.035, .04, .15], materials.metal, [-.24 + i * .12, .34, -.26]);
      box(board, [.035, .04, .15], materials.metal, [-.24 + i * .12, .34, .26]);
    }
    electric([[-3.55, -.88], [-3.55, -2.3], [-2.6, -2.3]]);
    electric([[-1.6, -2.3], [-.965, -2.3]]);
    electric([[.165, -2.3], [3.5, -2.3], [3.5, -1.2], [-.9, -1.2]]);
    negative([[-3.55, .88], [-3.55, 1.3], [3.5, 1.3]]);

    motor('motor', '走行モーター', -.9, -.1, false, 'wheel');
    electric([[-.9, -1.2], [-.9, -.72]]); negative([[-.9, .52], [-.9, 1.3]]);

    const fans = part('fan', '吸引ファン', .6, -.1, V(0, 1.0, .1));
    box(fans, [1.18, .09, 1.18], materials.dark, [0, .18, 0]);
    for (const x of [-.3, .3]) for (const z of [-.3, .3]) {
      const duct = mesh(fans, new THREE.TorusGeometry(.255, .035, 10, 36), materials.metal, [x, .42, z]); duct.rotation.x = Math.PI / 2;
      cylinder(fans, .1, .16, materials.blue, [x, .29, z]);
      const rotor = new THREE.Group(); rotor.position.set(x, .42, z); rotor.userData.axis = 'y'; rotor.userData.kind = 'suction-fan'; fans.add(rotor); rotors.push(rotor);
      for (let i = 0; i < 3; i++) {
        const blade = new THREE.Group(); blade.rotation.y = i * Math.PI * 2 / 3; rotor.add(blade);
        box(blade, [.21, .028, .07], materials.blade, [.12, 0, 0]);
      }
      cylinder(rotor, .07, .06, materials.copper, [0, .01, 0]);
    }
    wire(fans, [[0, y, -.7], [0, y, -.56]], materials.metal, .03);
    wire(fans, [[0, y, .56], [0, y, .7]], materials.metal, .03);
    electric([[.6, -1.2], [.6, -.8]]); negative([[.6, .6], [.6, 1.3]]);

    const actuator = part('actuator', '翼の駆動部', 2.0, -.1, V(0, 1.45, .05));
    box(actuator, [.6, .2, .68], materials.dark, [0, .24, 0]);
    cylinder(actuator, .22, .46, materials.metal, [0, .51, 0]);
    const piston = cylinder(actuator, .075, .42, materials.metal, [0, .84, 0]);
    const wing = box(actuator, [1.0, .075, .25], materials.blue, [0, 1.06, 0]);
    wire(actuator, [[0, y, -.62], [-.19, .26, -.28]], materials.metal, .03);
    wire(actuator, [[.19, .26, .28], [0, y, .62]], materials.metal, .03);
    electric([[2.0, -1.2], [2.0, -.72]]); negative([[2.0, .52], [2.0, 1.3]]);

    // The valve's motor receives electricity; its separate side ports carry gas.
    const valve = part('valve', '電動バルブ', 3.5, -.1, V(.05, 1.05, .05));
    box(valve, [.62, .24, .45], materials.copper, [0, .19, 0]);
    for (const x of [-.38, .38]) {
      const port = cylinder(valve, .12, .21, orange, [x, .19, 0]); port.rotation.z = Math.PI / 2;
    }
    box(valve, [.4, .12, .36], materials.dark, [0, .37, 0]);
    cylinder(valve, .18, .32, materials.metal, [0, .59, 0]);
    const valvePosition = box(valve, [.31, .045, .075], materials.blue, [0, .79, 0]);
    wire(valve, [[0, y, -.62], [-.15, .39, -.18]], materials.metal, .03);
    wire(valve, [[.15, .39, .18], [0, y, .62]], materials.metal, .03);
    electric([[3.5, -1.2], [3.5, -.72]]); negative([[3.5, .52], [3.5, 1.3]]);

    const tank = part('tank', 'ガスタンク', -2.7, 2.85, V(0, .95, .1));
    const vessel = cylinder(tank, .32, 1.3, materials.metal, [0, .42, 0]); vessel.rotation.z = Math.PI / 2;
    for (const x of [-.65, .65]) {
      const end = mesh(tank, new THREE.SphereGeometry(.32, 24, 16), materials.metal, [x, .42, 0]); end.scale.x = .35;
    }
    for (const x of [-.36, .36]) {
      const strap = mesh(tank, new THREE.TorusGeometry(.326, .035, 8, 32), materials.dark, [x, .42, 0]); strap.rotation.y = Math.PI / 2;
    }
    const tankPort = cylinder(tank, .1, .23, orange, [.85, .42, 0]); tankPort.rotation.z = Math.PI / 2;
    wire(tank, [[.96, .42, 0], [.96, .075, 0]], orange, .033).userData.medium = 'gas';

    const nozzle = part('thruster', 'ノズル', 4.2, 2.85, V(.05, .9, .25));
    const mouth = mesh(nozzle, new THREE.CylinderGeometry(.1, .32, .65, 36, 1, true), new THREE.MeshStandardMaterial({ color: 0xb5c3c8, metalness: .8, roughness: .28, side: THREE.DoubleSide }), [0, .25, 0]); mouth.rotation.x = -Math.PI / 2;
    const throat = cylinder(nozzle, .105, .18, materials.dark, [0, .25, -.4]); throat.rotation.x = Math.PI / 2;
    wire(nozzle, [[0, .075, -.5], [0, .25, -.5]], orange, .033).userData.medium = 'gas';
    const plume = mesh(nozzle, new THREE.CylinderGeometry(.34, .06, .85, 28, 1, true), new THREE.MeshBasicMaterial({ color: 0xf1f7fa, transparent: true, opacity: .45, depthWrite: false, side: THREE.DoubleSide }), [0, .25, .78]); plume.rotation.x = Math.PI / 2; plume.visible = false; plume.name = 'gas-flow'; plume.userData.medium = 'gas';
    gasPipe([[-1.74, 2.85], [2.8, 2.85], [2.8, -.1], [3.02, -.1]]);
    gasPipe([[3.98, -.1], [4.2, -.1], [4.2, 2.35]]);
    mediumLabel('電気', '#287db0', -3.2, -2.8); mediumLabel('ガス', '#b96e1e', -.3, 2.85);
    hooks.setPowered = on => {
      const powered = Boolean(on); root.userData.powered = powered;
      valvePosition.rotation.y = powered ? Math.PI / 2 : 0;
      piston.position.y = powered ? 1.02 : .84; wing.position.y = powered ? 1.24 : 1.06;
      plume.visible = powered;
    };
    hooks.setPowered(false);
  } else if (deviceId === 'drone' || deviceId === 'controller' || deviceId === 'vacuum') {
    const vibration = deviceId === 'controller';
    const vacuum = deviceId === 'vacuum';
    const motorPositions = vacuum ? [-.4, 1.3, 3] : vibration ? [.45, 2.85] : [-.75, .55, 1.85, 3.15];
    const lastMotor = motorPositions.at(-1);
    battery(-3.2, .3, true);
    slideSwitch(-1.55, -2.05);
    const board = part('controller', '制御基板', .25, -2.05, V(0, .8, -.15));
    box(board, [1.13, .12, .73], materials.green, [0, .25, 0]);
    box(board, [.39, .16, .35], materials.dark, [0, .39, 0]);
    for (let i = 0; i < 5; i++) {
      box(board, [.035, .04, .15], materials.metal, [-.24 + i * .12, .34, -.26]);
      box(board, [.035, .04, .15], materials.metal, [-.24 + i * .12, .34, .26]);
    }
    for (const x of [-.47, .47]) cylinder(board, .055, .075, materials.gold, [x, .34, -.25]);
    cable([[-3.2, -.58], [-3.2, -2.05], [-2.05, -2.05]]);
    cable([[-1.05, -2.05], [-.32, -2.05]]);
    cable([[.82, -2.05], [lastMotor, -2.05], [lastMotor, -1.15], [motorPositions[0], -1.15]]);
    cable([[-3.2, 1.18], [-3.2, 1.85], [lastMotor, 1.85]], 'black');
    motorPositions.forEach((x, i) => {
      const rotorType = vacuum ? (i < 2 ? 'wheel' : 'blower') : vibration ? 'vibration' : 'propeller';
      motor(`motor${i + 1}`, `モーター${i + 1}`, x, .35, !vibration && !vacuum, rotorType);
      cable([[x, -1.15], [x, -.27]]);
      cable([[x, .97], [x, 1.85]], 'black');
    });
  } else if (deviceId === 'fan' || deviceId === 'cleaner') {
    const source = part('source', '電源', -3.1, 0, V(0, 1.0, .1));
    box(source, [.85, .65, 1.1], materials.blue, [0, .4, 0]);
    box(source, [.88, .18, 1.12], materials.white, [0, .82, 0]);
    for (const x of [-.22, .22]) box(source, [.12, .08, .43], materials.metal, [x, .45, -.74]);
    box(source, [.6, .08, .25], materials.dark, [0, .95, 0]);
    slideSwitch();
    motor('motor', 'モーター', 3.05, 0, false, deviceId === 'cleaner' ? 'blower' : 'propeller');
    cable([[-3.1, -.75], [-3.1, -2.05], [-.85, -2.05]]);
    cable([[.15, -2.05], [3.05, -2.05], [3.05, -.62]]);
    cable([[3.05, .62], [3.05, 2.05], [-3.1, 2.05], [-3.1, .58]], 'black');
  } else {
    battery();
    slideSwitch();
    resistor();
    led();
    cable([[-3.1, -1.1], [-3.1, -2.05], [-.85, -2.05]]);
    cable([[.15, -2.05], [3.05, -2.05], [3.05, -1.54]]);
    cable([[3.05, -.26], [3.05, .37]]);
    cable([[3.05, 1.53], [3.05, 2.05], [-3.1, 2.05], [-3.1, .98]], 'black');
  }

  for (const { group, role } of parts) {
    group.traverse(object => { if (object.isMesh) object.userData.part = role; });
  }
  return { root, parts, rotors, ledMeshes, focus: V(0, .25, 0), ...hooks };
}

const label = (text, x, y, size = 28) => `<text class="symbol-label" x="${x}" y="${y}" text-anchor="middle" fill="currentColor" stroke="none" style="font-size:${size}px" font-family="sans-serif">${text}</text>`;
const hit = (x, y, width, height) => `<rect class="hitbox" x="${x}" y="${y}" width="${width}" height="${height}" rx="14" fill="transparent" stroke="none"/>`;
const symbol = (id, name, body, role = 'button') => `<g class="symbol" data-part="${id}" role="${role}" tabindex="0" aria-label="${name}"${role === 'switch' ? ' aria-checked="false"' : ''}>${body}</g>`;
const switchSymbol = (left = 270, right = 350, textX = 310) => {
  const open = `M${left} 90L${right - 10} 52`, closed = `M${left} 90H${right}`;
  return symbol('switch', 'スイッチ', `${hit(left - 28, 35, right - left + 56, 118)}<circle cx="${left}" cy="90" r="4"/><circle cx="${right}" cy="90" r="4"/><path class="switch-arm" data-open="${open}" data-closed="${closed}" d="${open}"/>${label('スイッチ', textX, 145)}`, 'switch');
};

function sourceSymbol(ac = false, center = 275) {
  const shape = ac
    ? `<circle cx="125" cy="${center}" r="36"/><path d="M102 ${center}C108 ${center - 22} 119 ${center - 22} 125 ${center}S142 ${center + 22} 148 ${center}"/>`
    : `<path d="M89 ${center - 10}H161M104 ${center + 10}H146"/><text x="76" y="${center - 11}" fill="currentColor" stroke="none" font-size="24">＋</text><text x="76" y="${center + 28}" fill="currentColor" stroke="none" font-size="24">−</text>`;
  return symbol('source', '電源', `${hit(45, center - 58, 190, 116)}${shape}${label('電源', 202, center + 10)}`);
}

function motorSymbol(id, name, x, cy, radius = 42, textY = cy + 91, fontSize = 28, textX = x) {
  const numbered=/^motor[1-4]$/.test(id);
  const motorText=numbered?'M'+id.slice(5):'M';
  const motorFont=numbered&&radius<40?30:38;
  const left=x-radius-13;
  const right=numbered?x+radius+13:Math.max(x+radius+13,textX+name.length*fontSize/2+6);
  const height=numbered?radius*2+26:Math.max(radius*2+26,textY-cy+radius+24);
  return symbol(id,name,`${hit(left,cy-radius-13,right-left,height)}<circle cx="${x}" cy="${cy}" r="${radius}"/><text x="${x}" y="${cy+(motorFont===30?10:13)}" text-anchor="middle" fill="currentColor" stroke="none" style="font-size:${motorFont}px" font-family="sans-serif">${motorText}</text>${numbered?'':label(name,textX,textY,fontSize)}`);
}

function roadsterDiagramMarkup() {
  const loadLabel = (top, bottom, x) => `<text class="symbol-label" x="${x}" y="465" text-anchor="middle" fill="currentColor" stroke="none" style="font-size:22px" font-family="sans-serif">${top}<tspan x="${x}" dy="26">${bottom}</tspan></text>`;
  // Four control-driven electrical branches; the pneumatic ports never join a wire.
  let content = `<g data-medium="electric"><path class="wire" d="M125 290V90H190M250 90H305M425 90H545V190H275M125 310V425H545"/>`;
  for (const x of [275, 365, 455, 545]) {
    content += `<path class="wire" d="M${x} 190V254M${x} 316V425"/><circle class="wire" cx="${x}" cy="190" r="4" fill="currentColor"/><circle class="wire" cx="${x}" cy="425" r="4" fill="currentColor"/>`;
  }
  content += '</g>';
  const inlet = 'M180 550H493V285H525', outlet = 'M565 285H605V515';
  // The white clearance at the crossing means the orange pipe passes over the wire.
  content += `<g class="gas-pipes" data-medium="gas" stroke="#ca7c25"><path class="gas-clearance" d="${inlet} ${outlet}" stroke="#fff" stroke-width="14"/><path class="gas-path" d="${inlet} ${outlet}" stroke-dasharray="10 8" stroke-width="5"/></g>`;
  content += sourceSymbol(false, 300) + switchSymbol(190, 250, 220);
  content += symbol('controller', '制御基板', `${hit(285, 42, 160, 116)}<rect x="305" y="64" width="120" height="52" rx="3"/>${label('制御基板', 365, 151)}`);
  content += symbol('motor', '走行モーター', `${hit(228, 238, 94, 260)}<circle cx="275" cy="285" r="31"/><text x="275" y="298" text-anchor="middle" fill="currentColor" stroke="none" style="font-size:38px" font-family="sans-serif">M</text>${loadLabel('走行', 'モーター', 275)}`);
  let fanDrawing = '<rect x="335" y="254" width="60" height="62" rx="6"/>';
  for (const x of [351, 379]) for (const y of [270, 299]) fanDrawing += `<circle cx="${x}" cy="${y}" r="10"/><path d="M${x - 6} ${y}H${x + 6}M${x} ${y - 6}V${y + 6}" stroke-width="3"/>`;
  content += symbol('fan', '吸引ファン', `${hit(323, 238, 84, 260)}${fanDrawing}${loadLabel('吸引', 'ファン', 365)}`);
  content += symbol('actuator', '翼の駆動部', `${hit(413, 238, 84, 260)}<rect x="440" y="267" width="30" height="49" rx="2"/><path d="M455 254V288M445 288H465M440 254H470"/>${loadLabel('翼の', '駆動部', 455)}`);
  content += symbol('valve', '電動バルブ', `${hit(503, 238, 84, 260)}<rect x="525" y="254" width="40" height="62" rx="4"/><path d="M535 264H555M535 274H555M530 285L560 305V282L530 305Z" stroke-width="3"/>${loadLabel('電動', 'バルブ', 545)}`);
  content += `<g class="gas-components" color="#b76e1f" stroke="#b76e1f" data-medium="gas">`;
  content += symbol('tank', 'ガスタンク', `${hit(57, 505, 141, 125)}<rect x="70" y="520" width="110" height="60" rx="28"/><path d="M92 522V578M158 522V578" stroke-width="3"/>${label('ガスタンク', 125, 620, 26)}`);
  content += symbol('thruster', 'ノズル', `${hit(489, 501, 144, 137)}<path d="M596 515H614L628 571H582Z"/><path d="M583 571H627"/>${label('ノズル', 540, 628, 26)}`);
  content += `<g class="gas-flow" opacity="0" stroke="#b8ccd3" stroke-width="4"><path d="M597 582V615M597 615L590 605M597 615L604 605M613 582V615M613 615L606 605M613 615L620 605"/></g></g>`;
  content += `<text x="80" y="39" fill="#287db0" stroke="none" style="font-size:26px" font-family="sans-serif">電気</text><text x="305" y="535" text-anchor="middle" fill="#b76e1f" stroke="none" style="font-size:28px" font-family="sans-serif">ガス</text><text x="320" y="643" text-anchor="middle" fill="#71808a" stroke="none" style="font-size:18px" font-family="sans-serif">模式図</text>`;
  return content;
}

/** SVG children only. Outer viewBox: 640 × 650 for Roadster, 640 × 560 otherwise. */
export function diagramMarkup(deviceId) {
  let content;
  if (deviceId === 'roadster') {
    content = roadsterDiagramMarkup();
  } else if (deviceId === 'drone') {
    content = `<path class="wire" d="M125 290V90H190M250 90H305M425 90H535V200H280M125 310V420H535"/>`;
    content += sourceSymbol(false, 300) + switchSymbol(190, 250, 220);
    content += symbol('controller', '制御基板', `${hit(285, 42, 160, 116)}<rect x="305" y="64" width="120" height="52" rx="3"/>${label('制御基板', 365, 151)}`);
    [280, 365, 450, 535].forEach((x, i) => {
      content += `<path class="wire" d="M${x} 200V273M${x} 337V420"/><circle class="wire" cx="${x}" cy="200" r="4" fill="currentColor"/><circle class="wire" cx="${x}" cy="420" r="4" fill="currentColor"/>`;
      content += motorSymbol(`motor${i + 1}`, `モーター${i + 1}`, x, 305, 32, 470, 20);
    });
  } else if (deviceId === 'vacuum') {
    content = `<path class="wire" d="M125 290V90H190M250 90H305M425 90H520V200H300M125 310V420H520"/>`;
    content += sourceSymbol(false, 300) + switchSymbol(190, 250, 220);
    content += symbol('controller', '制御基板', `${hit(285, 42, 160, 116)}<rect x="305" y="64" width="120" height="52" rx="3"/>${label('制御基板', 365, 151)}`);
    [300, 410, 520].forEach((x, i) => {
      content += `<path class="wire" d="M${x} 200V265M${x} 345V420"/><circle class="wire" cx="${x}" cy="200" r="4" fill="currentColor"/><circle class="wire" cx="${x}" cy="420" r="4" fill="currentColor"/>`;
      content += motorSymbol(`motor${i + 1}`, `モーター${i + 1}`, x, 305, 40);
    });
  } else if (deviceId === 'controller') {
    content = `<path class="wire" d="M125 290V90H190M250 90H305M425 90H510V200H340M125 310V420H510"/>`;
    content += sourceSymbol(false, 300) + switchSymbol(190, 250, 220);
    content += symbol('controller', '制御基板', `${hit(285, 42, 160, 116)}<rect x="305" y="64" width="120" height="52" rx="3"/>${label('制御基板', 365, 151)}`);
    [340, 510].forEach((x, i) => {
      content += `<path class="wire" d="M${x} 200V261M${x} 349V420"/><circle class="wire" cx="${x}" cy="200" r="4" fill="currentColor"/><circle class="wire" cx="${x}" cy="420" r="4" fill="currentColor"/>`;
      content += motorSymbol(`motor${i + 1}`, `モーター${i + 1}`, x, 305, 44);
    });
  } else if (deviceId === 'fan' || deviceId === 'cleaner') {
    content = `<path class="wire" d="M125 239V90H270M350 90H500V233M500 317V460H125V311"/>`;
    content += sourceSymbol(true) + switchSymbol() + motorSymbol('motor', 'モーター', 500, 275, 42, 360, 25, 568);
  } else {
    content = `<path class="wire" d="M125 265V90H270M350 90H500V174M500 226V311M500 359V460H125V285"/>`;
    content += sourceSymbol() + switchSymbol();
    content += symbol('resistor', '抵抗', `${hit(462, 159, 148, 83)}<rect x="485" y="174" width="30" height="52"/>${label('抵抗', 567, 210)}`);
    content += symbol('led', 'LED', `${hit(458, 280, 157, 96)}<path class="led-symbol" d="M478 311H522L500 347Z"/><path d="M480 350H520M500 350V359"/><path class="led-rays" d="M526 319L550 293M550 293L537 298M550 293L546 306M539 337L563 311M563 311L550 316M563 311L559 324"/>${label('LED', 571, 364)}`);
  }
  return `<g class="circuit-symbols" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${content}</g>`;
}
