function overlapsVertically(position, height, collider) {
  return position.y < collider.maxY && position.y + height > collider.minY;
}

function resolveOverlaps(position, colliders, radius, height) {
  for (let iteration = 0; iteration < 3; iteration += 1) {
    let moved = false;

    for (const collider of colliders) {
      if (!overlapsVertically(position, height, collider)) continue;

      const closestX = Math.max(
        collider.minX,
        Math.min(position.x, collider.maxX),
      );
      const closestZ = Math.max(
        collider.minZ,
        Math.min(position.z, collider.maxZ),
      );
      const offsetX = position.x - closestX;
      const offsetZ = position.z - closestZ;
      const distanceSquared = offsetX * offsetX + offsetZ * offsetZ;

      if (distanceSquared >= radius * radius) continue;

      if (distanceSquared > 1e-10) {
        const distance = Math.sqrt(distanceSquared);
        const push = radius - distance;
        position.x += (offsetX / distance) * push;
        position.z += (offsetZ / distance) * push;
      } else {
        const exits = [
          {
            distance: position.x - (collider.minX - radius),
            axis: "x",
            value: collider.minX - radius,
          },
          {
            distance: collider.maxX + radius - position.x,
            axis: "x",
            value: collider.maxX + radius,
          },
          {
            distance: position.z - (collider.minZ - radius),
            axis: "z",
            value: collider.minZ - radius,
          },
          {
            distance: collider.maxZ + radius - position.z,
            axis: "z",
            value: collider.maxZ + radius,
          },
        ];
        exits.sort((a, b) => a.distance - b.distance);
        position[exits[0].axis] = exits[0].value;
      }

      moved = true;
    }

    if (!moved) break;
  }
}

/** Move the player's horizontal capsule and resolve against generated box colliders. */
export function moveWithCollisions(
  position,
  deltaX,
  deltaZ,
  colliders,
  options = {},
) {
  const radius = options.radius ?? 0.32;
  const height = options.height ?? 1.72;
  const maxStep = radius * 0.4;
  const steps = Math.max(
    1,
    Math.ceil(Math.max(Math.abs(deltaX), Math.abs(deltaZ)) / maxStep),
  );
  const stepX = deltaX / steps;
  const stepZ = deltaZ / steps;

  for (let step = 0; step < steps; step += 1) {
    position.x += stepX;
    resolveOverlaps(position, colliders, radius, height);
    position.z += stepZ;
    resolveOverlaps(position, colliders, radius, height);
  }

  return position;
}
