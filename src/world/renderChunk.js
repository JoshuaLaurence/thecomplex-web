import * as THREE from "three";
import { CEILING_PANEL_X, CEILING_PANEL_Z } from "./generator.js";
import { getSurfaceMaps } from "./surfaceTextures.js";

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const materials = new Map();

const palettes = {
  classic: {
    wall: 0xb7aa70,
    floor: 0x716044,
    ceilingTile: 0xc7c1a7,
    ceilingGrid: 0x847d6b,
    lamp: 0xffedb5,
  },
  office: {
    wall: 0x998e75,
    floor: 0x575044,
    ceilingTile: 0xc1bca9,
    ceilingGrid: 0x777365,
    lamp: 0xffe4a2,
  },
  institutional: {
    wall: 0xaaa99a,
    floor: 0x69665c,
    ceilingTile: 0xd0cebd,
    ceilingGrid: 0x898879,
    lamp: 0xfff0ca,
  },
  decayed: {
    wall: 0x97845f,
    floor: 0x514a38,
    ceilingTile: 0xb7ae93,
    ceilingGrid: 0x77705f,
    lamp: 0xffd58a,
  },
};

function getMaterials(style) {
  if (!materials.has(style)) {
    const palette = palettes[style] ?? palettes.classic;
    const wallpaper = getSurfaceMaps(style, "wall");
    const carpet = getSurfaceMaps(style, "floor");
    const wall = new THREE.MeshStandardMaterial({
      map: wallpaper.map,
      normalMap: wallpaper.normalMap,
      roughnessMap: wallpaper.roughnessMap,
      roughness: 0.94,
      metalness: 0,
    });
    wall.normalScale.set(0.65, 0.65);
    wall.userData.worldTileSize = 0.48;
    const floor = new THREE.MeshStandardMaterial({
      map: carpet.map,
      normalMap: carpet.normalMap,
      roughnessMap: carpet.roughnessMap,
      roughness: 0.98,
      metalness: 0,
    });
    floor.normalScale.set(0.55, 0.55);
    floor.userData.worldTileSize = 2.1;
    materials.set(style, {
      wall,
      floor,
      ceilingTile: new THREE.MeshStandardMaterial({
        color: palette.ceilingTile,
        roughness: 0.96,
      }),
      ceilingGrid: new THREE.MeshStandardMaterial({
        color: palette.ceilingGrid,
        roughness: 0.78,
        metalness: 0.12,
      }),
      lamp: new THREE.MeshStandardMaterial({
        color: palette.lamp,
        emissive: palette.lamp,
        emissiveIntensity: 0.4,
        roughness: 0.6,
      }),
    });
  }

  return materials.get(style);
}

function addBox(parent, material, position, size, castShadow = false) {
  let geometry = unitBox;
  if (material.userData.worldTileSize) {
    geometry = unitBox.clone();
    const uv = geometry.attributes.uv;
    const normal = geometry.attributes.normal;
    const [width, height, depth] = size;
    const tileSize = material.userData.worldTileSize;

    for (let vertex = 0; vertex < uv.count; vertex += 1) {
      const nx = Math.abs(normal.getX(vertex));
      const ny = Math.abs(normal.getY(vertex));
      const uMeters = ny > 0.5 ? width : nx > 0.5 ? depth : width;
      const vMeters = ny > 0.5 ? depth : height;
      uv.setXY(
        vertex,
        uv.getX(vertex) * (uMeters / tileSize),
        uv.getY(vertex) * (vMeters / tileSize),
      );
    }

    uv.needsUpdate = true;
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...size);
  mesh.receiveShadow = true;
  mesh.castShadow = castShadow;
  if (geometry !== unitBox) mesh.userData.ownedGeometry = true;
  parent.add(mesh);
  return mesh;
}

function addFloor(parent, material, size) {
  const geometry = new THREE.PlaneGeometry(size, size);
  const uv = geometry.attributes.uv;
  const repeats = size / material.userData.worldTileSize;
  for (let vertex = 0; vertex < uv.count; vertex += 1) {
    uv.setXY(vertex, uv.getX(vertex) * repeats, uv.getY(vertex) * repeats);
  }
  uv.needsUpdate = true;

  const floor = new THREE.Mesh(geometry, material);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.userData.ownedGeometry = true;
  parent.add(floor);
}

function addCeilingTiles(parent, material, size, wallHeight, fixtures) {
  // 2 x 4 ft (0.61 x 1.22 m) panels with a 24 mm exposed T-bar.
  const cellsX = Math.floor(size / CEILING_PANEL_X);
  const cellsZ = Math.floor(size / CEILING_PANEL_Z);
  const marginX = (size - cellsX * CEILING_PANEL_X) / 2;
  const marginZ = (size - cellsZ * CEILING_PANEL_Z) / 2;
  const fixtureCells = new Set(
    fixtures.map((fixture) => `${fixture.cellX},${fixture.cellZ}`),
  );
  const tiles = new THREE.InstancedMesh(
    unitBox,
    material,
    cellsX * cellsZ - fixtureCells.size,
  );
  const rails = new THREE.InstancedMesh(
    unitBox,
    parent.userData.ceilingGridMaterial,
    cellsX + cellsZ + 2,
  );
  const transform = new THREE.Object3D();
  let index = 0;

  for (let x = 0; x < cellsX; x += 1) {
    for (let z = 0; z < cellsZ; z += 1) {
      if (fixtureCells.has(`${x},${z}`)) continue;

      transform.position.set(
        -size / 2 + marginX + (x + 0.5) * CEILING_PANEL_X,
        wallHeight - 0.018,
        -size / 2 + marginZ + (z + 0.5) * CEILING_PANEL_Z,
      );
      transform.scale.set(
        CEILING_PANEL_X - 0.012,
        0.028,
        CEILING_PANEL_Z - 0.012,
      );
      transform.updateMatrix();
      tiles.setMatrixAt(index, transform.matrix);
      index += 1;
    }
  }

  tiles.instanceMatrix.needsUpdate = true;
  tiles.castShadow = false;
  tiles.receiveShadow = true;
  parent.add(tiles);

  index = 0;
  for (let line = 0; line <= cellsX; line += 1) {
    const position = -size / 2 + marginX + line * CEILING_PANEL_X;
    transform.position.set(position, wallHeight - 0.006, 0);
    transform.scale.set(0.024, 0.02, size);
    transform.updateMatrix();
    rails.setMatrixAt(index, transform.matrix);
    index += 1;
  }

  for (let line = 0; line <= cellsZ; line += 1) {
    const position = -size / 2 + marginZ + line * CEILING_PANEL_Z;
    transform.position.set(0, wallHeight - 0.006, position);
    transform.scale.set(size, 0.02, 0.024);
    transform.updateMatrix();
    rails.setMatrixAt(index, transform.matrix);
    index += 1;
  }

  rails.instanceMatrix.needsUpdate = true;
  rails.castShadow = false;
  rails.receiveShadow = true;
  parent.add(rails);
}

export function renderChunk(descriptor) {
  const group = new THREE.Group();
  const materialsForStyle = getMaterials(descriptor.style);
  const halfSize = descriptor.size / 2;
  group.position.set(
    descriptor.x * descriptor.size,
    0,
    descriptor.z * descriptor.size,
  );
  const worldX = descriptor.x * descriptor.size;
  const worldZ = descriptor.z * descriptor.size;
  group.userData = {
    chunkX: descriptor.x,
    chunkZ: descriptor.z,
    halfSize,
    colliders: descriptor.colliders.map((collider) => ({
      ...collider,
      minX: collider.minX + worldX,
      maxX: collider.maxX + worldX,
      minZ: collider.minZ + worldZ,
      maxZ: collider.maxZ + worldZ,
    })),
  };
  group.userData.ceilingGridMaterial = materialsForStyle.ceilingGrid;
  group.userData.spotLights = [];

  addFloor(group, materialsForStyle.floor, descriptor.size);
  addCeilingTiles(
    group,
    materialsForStyle.ceilingTile,
    descriptor.size,
    descriptor.wallHeight,
    descriptor.fixtures,
  );

  for (const wall of descriptor.walls) {
    addBox(group, materialsForStyle.wall, wall.center, wall.size, true);
  }

  for (const fixture of descriptor.fixtures) {
    addBox(
      group,
      materialsForStyle.lamp,
      [fixture.x, descriptor.wallHeight + 0.012, fixture.z],
      [CEILING_PANEL_X - 0.012, 0.045, CEILING_PANEL_Z - 0.012],
    );
    const light = new THREE.SpotLight(
      palettes[descriptor.style].lamp,
      1,
      9,
      Math.PI / 3,
      0.65,
      2,
    );
    light.power = 1300;
    light.position.set(fixture.x, descriptor.wallHeight + 0.12, fixture.z);
    light.target.position.set(fixture.x, descriptor.wallHeight - 4, fixture.z);
    light.userData.worldX = worldX + fixture.x;
    light.userData.worldZ = worldZ + fixture.z;
    light.userData.fullIntensity = light.intensity;
    light.castShadow = false;
    light.shadow.mapSize.set(512, 512);
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 9;
    light.shadow.camera.fov = THREE.MathUtils.radToDeg(light.angle * 2);
    light.shadow.camera.updateProjectionMatrix();
    light.shadow.bias = -0.00015;
    light.shadow.normalBias = 0.025;
    light.shadow.autoUpdate = false;
    group.userData.spotLights.push(light);
    group.add(light, light.target);
  }

  return group;
}
