import { CHUNK_SIZE, generateChunk } from "./generator.js";
import { renderChunk } from "./renderChunk.js";

export class ChunkWorld {
  constructor(scene, worldSeed, radius = 2) {
    this.scene = scene;
    this.worldSeed = worldSeed;
    this.radius = radius;
    this.chunks = new Map();
    this.colliders = [];
  }

  updateAt(worldX, worldZ) {
    const centerX = Math.floor(worldX / CHUNK_SIZE + 0.5);
    const centerZ = Math.floor(worldZ / CHUNK_SIZE + 0.5);
    const wanted = new Set();
    let changed = false;

    for (let x = centerX - this.radius; x <= centerX + this.radius; x += 1) {
      for (let z = centerZ - this.radius; z <= centerZ + this.radius; z += 1) {
        const key = `${x},${z}`;
        wanted.add(key);

        if (!this.chunks.has(key)) {
          const descriptor = generateChunk(this.worldSeed, x, z);
          const group = renderChunk(descriptor);
          this.chunks.set(key, group);
          this.scene.add(group);
          changed = true;
        }
      }
    }

    for (const [key, group] of this.chunks) {
      if (!wanted.has(key)) {
        this.scene.remove(group);
        this.chunks.delete(key);
        changed = true;
      }
    }

    if (changed) {
      const groups = [...this.chunks.values()];
      this.colliders = groups.flatMap((group) => group.userData.colliders);
    }
  }

  getColliders() {
    return this.colliders;
  }
}
