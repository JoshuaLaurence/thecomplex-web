import "./style.css";
import * as THREE from "three/webgpu";
import {
  add,
  diffuseColor,
  mrt,
  normalView,
  output,
  packNormalToRGB,
  pass,
  sample,
  unpackRGBToNormal,
  vec4,
  velocity,
} from "three/tsl";
import { ssgi } from "three/addons/tsl/display/SSGINode.js";
import { traa } from "three/addons/tsl/display/TRAANode.js";
import { ChunkWorld } from "./world/ChunkWorld.js";
import { preloadSurfaceTextures } from "./world/surfaceTextures.js";
import { PlayerController } from "./player/PlayerController.js";

const WORLD_SEED = "the-complex-001";
const app = document.querySelector("#app");
const seedLabel = document.querySelector("#seed-label");
const pauseMenu = document.querySelector("#pause-menu");
const continueButton = document.querySelector("#continue-button");
const sensitivitySlider = document.querySelector("#sensitivity");
const sensitivityValue = document.querySelector("#sensitivity-value");

await preloadSurfaceTextures();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x514b38);
scene.fog = new THREE.Fog(0x514b38, 20, 60);

const camera = new THREE.PerspectiveCamera(
  72,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(0, 1.62, 4);
camera.lookAt(0, 1.62, -1);

const renderer = new THREE.WebGPURenderer({
  antialias: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
renderer.shadowMap.enabled = true;
app.prepend(renderer.domElement);
await renderer.init();

scene.add(new THREE.HemisphereLight(0xffe6b4, 0x28271f, 0.38));

const world = new ChunkWorld(scene, WORLD_SEED, 2);
world.updateAt(camera.position.x, camera.position.z);
seedLabel.textContent = WORLD_SEED;
const player = new PlayerController(
  camera,
  renderer.domElement,
  () => world.getColliders(),
  (paused) => {
    pauseMenu.hidden = !paused;
  },
);
continueButton.addEventListener("click", () => player.resume());
sensitivitySlider.addEventListener("input", () => {
  const multiplier = Number(sensitivitySlider.value);
  player.setSensitivity(multiplier);
  sensitivityValue.value = `${multiplier.toFixed(1)}×`;
});
window.addEventListener("keydown", (event) => {
  if (event.code === "Escape") player.pause();
});
const clock = new THREE.Timer();
const renderPipeline = new THREE.RenderPipeline(renderer);
const scenePass = pass(scene, camera);
scenePass.setMRT(
  mrt({
    output,
    diffuseColor,
    normal: packNormalToRGB(normalView),
    velocity,
  }),
);

const sceneColor = scenePass.getTextureNode("output");
const sceneDiffuse = scenePass.getTextureNode("diffuseColor");
const sceneDepth = scenePass.getTextureNode("depth");
const sceneNormal = sample((uv) =>
  unpackRGBToNormal(scenePass.getTextureNode("normal").sample(uv)),
);

// SSGI reconstructs near-field diffuse bounce and contact occlusion from scene depth/normals.
const giPass = ssgi(sceneColor, sceneDepth, sceneNormal, camera);
giPass.sliceCount.value = 1;
giPass.stepCount.value = 8;
giPass.radius.value = 6;
giPass.aoIntensity.value = 0.8;
giPass.giIntensity.value = 4.2;
giPass.thickness.value = 0.8;
giPass.useTemporalFiltering = true;

const indirectLight = sceneDiffuse.rgb.mul(giPass.getGINode().rgb);
const litScene = vec4(
  add(sceneColor.rgb.mul(giPass.getAONode()), indirectLight),
  sceneColor.a,
);
renderPipeline.outputNode = traa(
  litScene,
  sceneDepth,
  scenePass.getTextureNode("velocity"),
  camera,
);

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function frame() {
  clock.update();
  const deltaTime = Math.min(clock.getDelta(), 0.05);
  player.update(deltaTime);
  world.updateAt(camera.position.x, camera.position.z);
  world.updateLightingAt(camera.position.x, camera.position.z);
  renderPipeline.render();
  requestAnimationFrame(frame);
}

window.addEventListener("resize", resize);
frame();
