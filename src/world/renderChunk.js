import * as THREE from "three";
import { CEILING_PANEL_X, CEILING_PANEL_Z } from "./generator.js";

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
    materials.set(style, {
      wall: new THREE.MeshStandardMaterial({
        color: palette.wall,
        roughness: 0.96,
      }),
      floor: new THREE.MeshStandardMaterial({
        color: palette.floor,
        roughness: 1,
      }),
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

function addBox(parent, material, position, size) {
  const mesh = new THREE.Mesh(unitBox, material);
  mesh.position.set(...position);
  mesh.scale.set(...size);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
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

  addBox(
    group,
    materialsForStyle.floor,
    [0, -0.08, 0],
    [descriptor.size, 0.16, descriptor.size],
  );
  addCeilingTiles(
    group,
    materialsForStyle.ceilingTile,
    descriptor.size,
    descriptor.wallHeight,
    descriptor.fixtures,
  );

  for (const wall of descriptor.walls) {
    addBox(group, materialsForStyle.wall, wall.center, wall.size);
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
      0.35,
      2,
    );
    light.power = 2200;
    light.position.set(fixture.x, descriptor.wallHeight + 0.12, fixture.z);
    light.target.position.set(fixture.x, descriptor.wallHeight - 4, fixture.z);
    group.add(light, light.target);
  }

  return group;
}
