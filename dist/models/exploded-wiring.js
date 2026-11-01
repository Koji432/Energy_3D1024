import * as THREE from 'three';

// Terminals stay on their electrical components; cable paths live in model
// coordinates so removing a cover never pulls a wire onto that cover.
export function createExplodedWiring({root, terminals: definitions, leads: routes, components, radius = .044}) {
  const cables = new THREE.Group();
  cables.name = 'exploded-electrical-connections';
  root.add(cables);
  const colors = {supply: 0xd52f43, return: 0x2066bc};
  const wireMaterials = Object.fromEntries(Object.entries(colors).map(([key, color]) => [key,
    new THREE.MeshStandardMaterial({color, roughness: .38, metalness: .12, transparent: true, opacity: 0}),
  ]));
  const contactMaterial = new THREE.MeshStandardMaterial({color: 0xe3bd72, roughness: .28, metalness: .7, transparent: true, opacity: 0});
  function noninteractive(object) {
    object.userData.excludeFromFrame = true;
    object.castShadow = object.receiveShadow = false;
    object.raycast = () => {};
    return object;
  }
  const terminals = definitions.map(definition => {
    const anchor = new THREE.Group();
    anchor.name = `terminal-${definition.id}`;
    anchor.position.copy(definition.position);
    definition.group.add(anchor);
    const contact = noninteractive(new THREE.Mesh(new THREE.SphereGeometry(radius * 1.5, 16, 10), contactMaterial));
    contact.userData.part = definition.role;
    contact.userData.terminal = definition.id;
    anchor.add(contact);
    anchor.visible = false;
    return {...definition, anchor, contact, position: definition.position.clone(), point: new THREE.Vector3()};
  });
  const terminalMap = new Map(terminals.map(terminal => [terminal.id, terminal]));
  const leads = routes.map(route => {
    if (!terminalMap.has(route.from) || !terminalMap.has(route.to)) throw new Error(`Unknown cable terminal: ${route.id}`);
    const mesh = noninteractive(new THREE.Mesh(new THREE.BufferGeometry(), wireMaterials[route.color || 'supply']));
    mesh.name = `wire-${route.id}`;
    mesh.userData.connection = {from: route.from, to: route.to};
    cables.add(mesh);
    return {...route, mesh, start: new THREE.Vector3(), end: new THREE.Vector3(), curve: null, previous: []};
  });
  function updateConnections(progress) {
    const alpha = THREE.MathUtils.clamp((progress - .12) / .26, 0, 1);
    cables.visible = alpha > 0;
    for (const material of Object.values(wireMaterials)) material.opacity = alpha;
    contactMaterial.opacity = alpha;
    root.updateWorldMatrix(true, true);
    for (const terminal of terminals) {
      terminal.anchor.visible = alpha > 0;
      terminal.anchor.getWorldPosition(terminal.point);
      root.worldToLocal(terminal.point);
    }
    for (const lead of leads) {
      lead.start.copy(terminalMap.get(lead.from).point);
      lead.end.copy(terminalMap.get(lead.to).point);
      const points = lead.route(lead.start.clone(), lead.end.clone(), progress);
      // Endpoints are authoritative, even when a route uses movable waypoints.
      points[0].copy(lead.start); points[points.length - 1].copy(lead.end);
      if (points.length === lead.previous.length && points.every((point, index) => point.distanceToSquared(lead.previous[index]) < 1e-12)) continue;
      lead.curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
      const geometry = new THREE.TubeGeometry(lead.curve, 64, radius, 8, false);
      lead.mesh.geometry.dispose(); lead.mesh.geometry = geometry;
      lead.previous = points.map(point => point.clone());
    }
  }
  updateConnections(0);
  return {root: cables, terminals, leads, components, colors, updateConnections};
}
