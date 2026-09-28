import * as THREE from "three";
import { createRandom, hashSeed } from "./random.js";

const SIZE = 512;
const NOISE_SIZE = 32;
const maps = new Map();
let wallpaperTexture;
let wallpaperPromise;

const surfaceColors = {
  classic: { wall: [190, 181, 126], floor: [91, 73, 52] },
  office: { wall: [159, 148, 119], floor: [77, 66, 53] },
  institutional: { wall: [176, 174, 157], floor: [96, 91, 78] },
  decayed: { wall: [151, 132, 94], floor: [72, 63, 45] },
};

function configureRepeat(texture, anisotropy = 8) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  return texture;
}

function getWallpaperTexture() {
  if (!wallpaperTexture) {
    throw new Error(
      "Call preloadSurfaceTextures() before generating rendered chunks.",
    );
  }

  return wallpaperTexture;
}

export function preloadSurfaceTextures() {
  if (!wallpaperPromise) {
    wallpaperPromise = new THREE.TextureLoader()
      .loadAsync(
        "/high_quality_backroom_s_wallpaper_texture_by_planetary4820_dm6xboe-fullview.jpg",
      )
      .then((texture) => {
        wallpaperTexture = texture;
        wallpaperTexture.colorSpace = THREE.SRGBColorSpace;
        configureRepeat(wallpaperTexture);
        return wallpaperTexture;
      });
  }

  return wallpaperPromise;
}

function makeColorMap(style, surface) {
  if (surface === "wall") return getWallpaperTexture();

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext("2d");
  const image = context.createImageData(SIZE, SIZE);
  const random = createRandom(hashSeed("surface-albedo", style, surface));
  const noise = new Int8Array(NOISE_SIZE * NOISE_SIZE);
  for (let index = 0; index < noise.length; index += 1) {
    noise[index] = Math.floor(random() * 19) - 9;
  }

  const [red, green, blue] = surfaceColors[style][surface];
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const index = (y * SIZE + x) * 4;
      const grain = noise[(y % NOISE_SIZE) * NOISE_SIZE + (x % NOISE_SIZE)];
      const slowVariation = Math.sin((x / SIZE) * Math.PI * 2) * 2;
      const fiber =
        surface === "floor"
          ? Math.sin(((3 * x + 2 * y) * Math.PI) / 8) * 3
          : Math.sin((y / 44) * Math.PI * 2) * 1.5;
      image.data[index] = Math.max(
        0,
        Math.min(255, red + grain + slowVariation + fiber),
      );
      image.data[index + 1] = Math.max(
        0,
        Math.min(255, green + grain + slowVariation + fiber),
      );
      image.data[index + 2] = Math.max(
        0,
        Math.min(255, blue + grain + slowVariation + fiber),
      );
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);

  if (surface === "wall") {
    // A small, low-contrast repeating ditsy wallpaper motif, not a flat yellow wall.
    for (let y = 32; y < SIZE; y += 64) {
      for (let x = 32; x < SIZE; x += 64) {
        context.fillStyle = "rgba(79, 83, 48, 0.13)";
        context.beginPath();
        context.moveTo(x, y - 5);
        context.lineTo(x + 3, y);
        context.lineTo(x, y + 5);
        context.lineTo(x - 3, y);
        context.closePath();
        context.fill();
        context.fillStyle = "rgba(93, 88, 50, 0.18)";
        context.fillRect(x - 1, y - 1, 2, 2);
        context.fillStyle = "rgba(70, 78, 48, 0.10)";
        context.fillRect(x - 8, y - 1, 2, 2);
        context.fillRect(x + 6, y - 1, 2, 2);
        context.fillRect(x - 1, y - 8, 2, 2);
        context.fillRect(x - 1, y + 6, 2, 2);
      }
    }

    const flecks = createRandom(hashSeed("wallpaper-flecks", style));
    for (let index = 0; index < 900; index += 1) {
      const x = 4 + Math.floor(flecks() * (SIZE - 8));
      const y = 4 + Math.floor(flecks() * (SIZE - 8));
      context.fillStyle =
        flecks() < 0.5 ? "rgba(76, 72, 47, 0.08)" : "rgba(242, 229, 180, 0.13)";
      context.fillRect(x, y, 1, 1);
    }
  } else {
    // Fine, short fibers and embedded dust; the broad color variation stays restrained.
    const fibers = createRandom(hashSeed("carpet-fibers", style));
    for (let index = 0; index < 15000; index += 1) {
      const x = 3 + Math.floor(fibers() * (SIZE - 6));
      const y = 3 + Math.floor(fibers() * (SIZE - 6));
      const length = 1 + Math.floor(fibers() * 4);
      const light = fibers() < 0.5;
      context.strokeStyle = light
        ? "rgba(190, 163, 119, 0.12)"
        : "rgba(35, 31, 25, 0.12)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + length, y + (fibers() - 0.5) * 2);
      context.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  return configureRepeat(texture);
}

function makeSurfaceData(style, surface) {
  const random = createRandom(hashSeed("surface-detail", style, surface));
  const height = new Uint8Array(SIZE * SIZE);
  const roughness = new Uint8Array(SIZE * SIZE * 4);
  const normal = new Uint8Array(SIZE * SIZE * 4);
  const noise = new Int8Array(NOISE_SIZE * NOISE_SIZE);
  for (let index = 0; index < noise.length; index += 1) {
    noise[index] = Math.floor(random() * 17) - 8;
  }

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const pixel = y * SIZE + x;
      const grain = noise[(y % NOISE_SIZE) * NOISE_SIZE + (x % NOISE_SIZE)];
      const weave =
        surface === "floor"
          ? Math.sin(((3 * x + 2 * y) * Math.PI) / 8) * 13
          : Math.sin((y / 8) * Math.PI * 2) * 3;
      height[pixel] = Math.max(0, Math.min(255, 128 + grain + weave));
      const roughnessValue = surface === "floor" ? 242 + grain : 218 + grain;
      const colorIndex = pixel * 4;
      roughness[colorIndex] = roughnessValue;
      roughness[colorIndex + 1] = roughnessValue;
      roughness[colorIndex + 2] = roughnessValue;
      roughness[colorIndex + 3] = 255;
    }
  }

  const normalStrength = surface === "floor" ? 2.4 : 1.35;
  for (let y = 0; y < SIZE; y += 1) {
    const previousY = ((y + SIZE - 1) % SIZE) * SIZE;
    const nextY = ((y + 1) % SIZE) * SIZE;
    for (let x = 0; x < SIZE; x += 1) {
      const previousX = (x + SIZE - 1) % SIZE;
      const nextX = (x + 1) % SIZE;
      const dx =
        (height[y * SIZE + nextX] - height[y * SIZE + previousX]) / 255;
      const dy = (height[nextY + x] - height[previousY + x]) / 255;
      let nx = -dx * normalStrength;
      let ny = -dy * normalStrength;
      let nz = 1;
      const length = Math.hypot(nx, ny, nz);
      nx /= length;
      ny /= length;
      nz /= length;
      const index = (y * SIZE + x) * 4;
      normal[index] = Math.round((nx * 0.5 + 0.5) * 255);
      normal[index + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      normal[index + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      normal[index + 3] = 255;
    }
  }

  const normalTexture = new THREE.DataTexture(
    normal,
    SIZE,
    SIZE,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  normalTexture.colorSpace = THREE.NoColorSpace;
  const roughnessTexture = new THREE.DataTexture(
    roughness,
    SIZE,
    SIZE,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  roughnessTexture.colorSpace = THREE.NoColorSpace;
  return {
    normalMap: configureRepeat(normalTexture),
    roughnessMap: configureRepeat(roughnessTexture),
  };
}

export function getSurfaceMaps(style, surface) {
  const key = `${style}:${surface}`;
  if (!maps.has(key)) {
    maps.set(key, {
      map: makeColorMap(style, surface),
      ...makeSurfaceData(style, surface),
    });
  }
  return maps.get(key);
}
