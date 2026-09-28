function mixHash(hash, text) {
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function hashSeed(...parts) {
  let hash = 2166136261;

  for (const part of parts) {
    hash = mixHash(hash, `${String(part)}\0`);
  }

  return hash >>> 0;
}

export function createRandom(seed) {
  let state = seed >>> 0;
  if (state === 0) state = 0x6d2b79f5;

  return function random() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}
