import { createRandom, hashSeed } from "./random.js";

export const CHUNK_SIZE = 14;
export const WALL_HEIGHT = 3.2;
export const CEILING_PANEL_X = 0.61;
export const CEILING_PANEL_Z = 1.22;
const WALL_THICKNESS = 0.18;
const MIN_OPENING_WIDTH = 0.96;
const MIN_OPENING_HEIGHT = 1.82;

const STYLES = ["classic", "office", "institutional", "decayed"];

function getRoomHeight(worldSeed, chunkX, chunkZ) {
  const random = createRandom(hashSeed(worldSeed, "room", chunkX, chunkZ));
  const roll = random();
  if (roll < 0.72) return WALL_HEIGHT;
  return roll < 0.86 ? 2.7 : 4.4;
}

function parentOf(x, z) {
  if (x !== 0) return [x - Math.sign(x), z];
  if (z !== 0) return [x, z - Math.sign(z)];
  return null;
}

function getEdgeOpening(worldSeed, x, z, side, size) {
  const neighbors = {
    north: [x, z - 1],
    east: [x + 1, z],
    south: [x, z + 1],
    west: [x - 1, z],
  };
  const [nextX, nextZ] = neighbors[side];

  const currentParent = parentOf(x, z);
  const neighborParent = parentOf(nextX, nextZ);

  // Hash the shared grid edge, not the room side, so both chunks agree.
  const isVerticalEdge = side === "east" || side === "west";
  const edgeX = isVerticalEdge ? Math.max(x, nextX) : x;
  const edgeZ = isVerticalEdge ? z : Math.max(z, nextZ);
  const edgeSeed = hashSeed(
    worldSeed,
    "edge",
    isVerticalEdge ? "vertical" : "horizontal",
    edgeX,
    edgeZ,
  );
  const edgeRandom = createRandom(edgeSeed);
  const isParentLink =
    (currentParent &&
      currentParent[0] === nextX &&
      currentParent[1] === nextZ) ||
    (neighborParent && neighborParent[0] === x && neighborParent[1] === z);

  if (!isParentLink && edgeRandom() >= 0.38) return null;

  const shapeRandom = createRandom(hashSeed(edgeSeed, "opening-shape"));
  const widthRoll = shapeRandom();
  let width;
  if (widthRoll < 0.1) {
    width = size - 1.2;
  } else if (widthRoll < 0.32) {
    width = MIN_OPENING_WIDTH + shapeRandom() * 0.5;
  } else if (widthRoll < 0.78) {
    width = 1.6 + shapeRandom() * 1.5;
  } else {
    width = 3.2 + shapeRandom() * 3.2;
  }

  width = Math.min(width, size - 0.8);
  const maxOffset = size / 2 - width / 2 - 0.3;
  const offset = (shapeRandom() * 2 - 1) * maxOffset;
  const height =
    shapeRandom() < 0.2
      ? MIN_OPENING_HEIGHT + shapeRandom() * 0.18
      : 2.02 + shapeRandom() * 0.62;

  return { offset, width, height };
}

function createWallBox(center, dimensions, kind = "perimeter") {
  return { center, size: dimensions, kind };
}

function createChunkWalls(
  worldSeed,
  chunkX,
  chunkZ,
  size,
  wallHeight,
  openings,
  partitions,
) {
  const walls = [];
  const halfSize = size / 2;

  // North/west ownership means each shared boundary is drawn only once.
  for (const side of ["north", "west"]) {
    const opening = openings[side];
    const neighborX = chunkX - (side === "west" ? 1 : 0);
    const neighborZ = chunkZ - (side === "north" ? 1 : 0);
    const neighborHeight = getRoomHeight(worldSeed, neighborX, neighborZ);
    const edgeWallHeight = Math.max(wallHeight, neighborHeight);
    const clearOpeningHeight = opening
      ? Math.min(opening.height, wallHeight, neighborHeight)
      : 0;
    const horizontal = side === "north";
    const fixed = -halfSize;
    const centerFor = (offset, height) =>
      horizontal ? [offset, height, fixed] : [fixed, height, offset];
    const dimensionsFor = (length, height) =>
      horizontal
        ? [length, height, WALL_THICKNESS]
        : [WALL_THICKNESS, height, length];

    if (!opening) {
      walls.push(
        createWallBox(
          centerFor(0, edgeWallHeight / 2),
          dimensionsFor(size, edgeWallHeight),
        ),
      );
      continue;
    }

    const leftLength = halfSize + opening.offset - opening.width / 2;
    const rightLength = halfSize - opening.offset - opening.width / 2;
    if (leftLength > 0) {
      walls.push(
        createWallBox(
          centerFor(-halfSize + leftLength / 2, edgeWallHeight / 2),
          dimensionsFor(leftLength, edgeWallHeight),
        ),
      );
    }
    if (rightLength > 0) {
      walls.push(
        createWallBox(
          centerFor(halfSize - rightLength / 2, edgeWallHeight / 2),
          dimensionsFor(rightLength, edgeWallHeight),
        ),
      );
    }
    if (edgeWallHeight > clearOpeningHeight) {
      walls.push(
        createWallBox(
          centerFor(
            opening.offset,
            clearOpeningHeight + (edgeWallHeight - clearOpeningHeight) / 2,
          ),
          dimensionsFor(opening.width, edgeWallHeight - clearOpeningHeight),
        ),
      );
    }
  }

  for (const partition of partitions) {
    const horizontal = partition.axis === "x";
    walls.push(
      createWallBox(
        [partition.x, wallHeight / 2, partition.z],
        horizontal
          ? [partition.length, wallHeight, WALL_THICKNESS]
          : [WALL_THICKNESS, wallHeight, partition.length],
        "partition",
      ),
    );
  }

  return walls;
}

function createPartitions(worldSeed, chunkX, chunkZ) {
  const random = createRandom(
    hashSeed(worldSeed, "partitions", chunkX, chunkZ),
  );
  if (random() > 0.34) return [];

  const firstWall = {
    axis: "x",
    x: (random() - 0.5) * 3.2,
    z: (random() - 0.5) * 6.4,
    length: 2.4 + random() * 2.8,
  };
  const partitions = [firstWall];

  if (random() < 0.28) {
    partitions.push({
      axis: "z",
      x: firstWall.x,
      z: firstWall.z,
      length: 2.4 + random() * 2.5,
    });
  }

  return partitions;
}

function createFixtures(worldSeed, chunkX, chunkZ) {
  const random = createRandom(hashSeed(worldSeed, "lights", chunkX, chunkZ));
  if (random() < 0.2) return [];

  const cellsX = Math.floor(CHUNK_SIZE / CEILING_PANEL_X);
  const cellsZ = Math.floor(CHUNK_SIZE / CEILING_PANEL_Z);
  const marginX = (CHUNK_SIZE - cellsX * CEILING_PANEL_X) / 2;
  const marginZ = (CHUNK_SIZE - cellsZ * CEILING_PANEL_Z) / 2;
  const count = random() < 0.35 ? 1 : 2;
  const fixtures = [];
  for (let index = 0; index < count; index += 1) {
    const cellX = 2 + Math.floor(random() * (cellsX - 4));
    const cellZ = 1 + Math.floor(random() * (cellsZ - 2));
    if (
      fixtures.some(
        (fixture) => fixture.cellX === cellX && fixture.cellZ === cellZ,
      )
    ) {
      continue;
    }
    fixtures.push({
      cellX,
      cellZ,
      x: -CHUNK_SIZE / 2 + marginX + (cellX + 0.5) * CEILING_PANEL_X,
      z: -CHUNK_SIZE / 2 + marginZ + (cellZ + 0.5) * CEILING_PANEL_Z,
    });
  }
  return fixtures;
}

function toBoxCollider(box, kind = box.kind) {
  const [x, y, z] = box.center;
  const [width, height, depth] = box.size;
  return {
    minX: x - width / 2,
    maxX: x + width / 2,
    minY: y - height / 2,
    maxY: y + height / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
    kind,
  };
}

function createChunkColliders(size, wallHeight, walls) {
  return [
    ...walls.map((wall) => toBoxCollider(wall)),
    toBoxCollider(
      {
        center: [0, wallHeight + 0.08, 0],
        size: [size, 0.16, size],
      },
      "ceiling",
    ),
  ];
}

/** Pure generation: identical seed and integer chunk coordinates yield identical data. */
export function generateChunk(worldSeed, chunkX, chunkZ) {
  const chunkSeed = hashSeed(worldSeed, "chunk", chunkX, chunkZ);
  const regionX = Math.floor(chunkX / 4);
  const regionZ = Math.floor(chunkZ / 4);
  const styleRandom = createRandom(
    hashSeed(worldSeed, "style", regionX, regionZ),
  );
  const wallHeight = getRoomHeight(worldSeed, chunkX, chunkZ);

  const openings = {
    north: getEdgeOpening(worldSeed, chunkX, chunkZ, "north", CHUNK_SIZE),
    east: getEdgeOpening(worldSeed, chunkX, chunkZ, "east", CHUNK_SIZE),
    south: getEdgeOpening(worldSeed, chunkX, chunkZ, "south", CHUNK_SIZE),
    west: getEdgeOpening(worldSeed, chunkX, chunkZ, "west", CHUNK_SIZE),
  };
  const partitions = createPartitions(worldSeed, chunkX, chunkZ);
  const walls = createChunkWalls(
    worldSeed,
    chunkX,
    chunkZ,
    CHUNK_SIZE,
    wallHeight,
    openings,
    partitions,
  );

  return {
    seed: chunkSeed,
    x: chunkX,
    z: chunkZ,
    size: CHUNK_SIZE,
    wallHeight,
    style: STYLES[Math.floor(styleRandom() * STYLES.length)],
    openings,
    partitions,
    walls,
    fixtures: createFixtures(worldSeed, chunkX, chunkZ),
    colliders: createChunkColliders(CHUNK_SIZE, wallHeight, walls),
  };
}
