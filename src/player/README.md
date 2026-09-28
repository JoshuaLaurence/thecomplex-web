# Player systems

- `camera.js`: pointer lock and clamped mouse look.
- `movement.js`: normalized WASD input.
- `collision.js`: capsule-footprint approximation, box collision, and wall sliding.
- `PlayerController.js`: connects input, collision, and the Three.js camera.

Movement is level and has no jump or gravity yet. Room walls, ceilings, and
intersecting wall fragments produce deterministic AABB colliders from the
same generated chunk description as the rendered geometry.
