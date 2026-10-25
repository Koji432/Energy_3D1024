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
    cylinder(group, radius, small ? .46 : .65, materials.metal, [0, small ? .39 : .5, 0]);
    cylinder(group, radius * .9, .08, materials.dark, [0, small ? .65 : .87, 0]);
    cylinder(group, .075, .25, materials.metal, [0, small ? .76 : .98, 0]);
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
    if (rotorType === 'vibration') {
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
    cylinder(rotor, small ? .13 : .18, .12, materials.blue, [0, .02, 0]);
    rotors.push(rotor);
    return group;
  }

  if (deviceId === 'drone' || deviceId === 'controller') {
    const vibration = deviceId === 'controller';
    const motorPositions = vibration ? [.45, 2.85] : [-.75, .55, 1.85, 3.15];
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
      motor(`motor${i + 1}`, `モーター${i + 1}`, x, .35, !vibration, vibration ? 'vibration' : 'propeller');
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
  return { root, parts, rotors, ledMeshes, focus: V(0, .25, 0) };
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

/** SVG children only. The caller supplies the 640 × 560 outer SVG. */
export function diagramMarkup(deviceId) {
  let content;
  if (deviceId === 'drone') {
    content = `<path class="wire" d="M125 290V90H190M250 90H305M425 90H535V200H280M125 310V420H535"/>`;
    content += sourceSymbol(false, 300) + switchSymbol(190, 250, 220);
    content += symbol('controller', '制御基板', `${hit(285, 42, 160, 116)}<rect x="305" y="64" width="120" height="52" rx="3"/>${label('制御基板', 365, 151)}`);
    [280, 365, 450, 535].forEach((x, i) => {
      content += `<path class="wire" d="M${x} 200V273M${x} 337V420"/><circle class="wire" cx="${x}" cy="200" r="4" fill="currentColor"/><circle class="wire" cx="${x}" cy="420" r="4" fill="currentColor"/>`;
      content += motorSymbol(`motor${i + 1}`, `モーター${i + 1}`, x, 305, 32, 470, 20);
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
