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
- `src/world/surfaceTextures.js`: seeded wallpaper/carpet albedo, normal, and roughness maps.
- `src/world/ChunkWorld.js`: nearby chunk streaming.
- `src/player/`: pointer-lock look, WASD movement, head bob, and collision.

The pause menu is the only non-3D interface. Rooms are deliberately empty;
there are no generated tables, chairs, or door models. Ceiling panels use a
2 x 4 ft suspended tile grid with narrow exposed tees, and roughly one in five
chunks has no fluorescent fixtures. The renderer uses screen-space SSGI with
TRAA for indirect bounce and temporal reprojection. Horizontal world
coordinates use Three.js's X/Z axes; Y is vertical. The floor is level; gravity
and jumping are not implemented.

## Surface and lighting approach

Backrooms wallpaper albedo uses the supplied high-quality wallpaper image;
dusty carpet albedo and the wall/floor normal and roughness maps are generated
deterministically in the browser and shared by architectural style. Texture UVs
are scaled in approximate world metres. Fluorescent spotlights cast
static soft shadows, with only the six nearest fixtures using shadow maps to
keep streaming performance bounded. The render path uses `WebGPURenderer` and
the official TSL SSGI node to add screen-space diffuse bounce and contact
occlusion, followed by motion-reprojected TRAA to filter GI noise. Three.js
falls back to its WebGL 2 backend if WebGPU is unavailable. GI is deliberately
kept restrained (one slice, eight steps, six-metre radius) because the official
SSGI example is expensive even on modern GPUs.

Volumetrics are deferred: convincing beams need depth-aware scattering and
shadow integration, while a screen-space god-ray smear tends to look detached
from the room. Three.js `LightProbe` is diffuse spherical-harmonic environment
lighting and is not spatially localized by its position, so placing many room
probes in the scene would not provide local GI. A baked/procedural per-room
irradiance solution may be worth exploring later; for now, shadowed direct light
is the simplest useful atmospheric improvement. Volumetric lighting remains a
possible later addition; the official Three.js volume-lighting examples also
use WebGPU and a 3D density field, so they can be layered into this pipeline
after SSGI has been visually tested.
