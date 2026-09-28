# The Complex

A small Three.js prototype for a seeded, streamable liminal building.

## Run it

- `npm run dev` starts the local Vite preview.
- `npm run build` creates a production build.

## Generation

`generateChunk(worldSeed, chunkX, chunkZ)` in `src/world/generator.js` is a
pure function: the same seed and integer chunk coordinates return the same
room description. Generation uses deterministic hash-based random streams;
it does not depend on rendering or `Math.random()`.

The returned description includes regional style, variable openings, wall
segments, occasional intersecting partitions, sparse fluorescent fixtures,
and matching colliders. Each chunk has a deterministic connection toward the
origin; additional shared edges are seeded independently. This keeps every
chunk reachable while letting passages shift in position and width. Some
openings are nearly wall-wide, joining empty rooms into larger spaces.
`ChunkWorld` loads a 5-by-5 area around a position and drops distant chunks.

## Structure

- `src/world/random.js`: seeded hash and PRNG.
- `src/world/generator.js`: renderer-independent room descriptions.
- `src/world/renderChunk.js`: shared Three.js materials, geometry, and lights.
- `src/world/ChunkWorld.js`: nearby chunk streaming.
- `src/player/`: pointer-lock look, WASD movement, head bob, and collision.
- `src/render/`: postprocessing for ambient occlusion and edge antialiasing.

The pause menu is the only non-3D interface. Rooms are deliberately empty;
there are no generated tables, chairs, or door models. Ceiling panels use a
2 x 4 ft suspended tile grid with narrow exposed tees, and roughly one in five
chunks has no fluorescent fixtures. The renderer uses screen-space GTAO and
SMAA; it intentionally avoids static-scene TAA accumulation and fake radial
light smearing during camera motion. Horizontal world coordinates use Three.js's
X/Z axes; Y is vertical. The floor is level; gravity and jumping are not
implemented.
