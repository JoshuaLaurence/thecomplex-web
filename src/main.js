import "./style.css";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { ChunkWorld } from "./world/ChunkWorld.js";
import { PlayerController } from "./player/PlayerController.js";

const WORLD_SEED = "the-complex-001";
const app = document.querySelector("#app");
const seedLabel = document.querySelector("#seed-label");
const pauseMenu = document.querySelector("#pause-menu");
const continueButton = document.querySelector("#continue-button");
const sensitivitySlider = document.querySelector("#sensitivity");
const sensitivityValue = document.querySelector("#sensitivity-value");

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

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
app.prepend(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffe6b4, 0x28271f, 0.12));

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
const clock = new THREE.Clock();
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const gtaoPass = new GTAOPass(
  scene,
  camera,
  Math.ceil(window.innerWidth * renderer.getPixelRatio() * 0.5),
  Math.ceil(window.innerHeight * renderer.getPixelRatio() * 0.5),
  undefined,
  {
    radius: 1.1,
    distanceExponent: 1,
    thickness: 1,
    distanceFallOff: 1,
    scale: 1,
    samples: 8,
  },
);
gtaoPass.blendIntensity = 0.55;
composer.addPass(gtaoPass);
gtaoPass.setSize(
  Math.ceil(window.innerWidth * renderer.getPixelRatio() * 0.5),
  Math.ceil(window.innerHeight * renderer.getPixelRatio() * 0.5),
);
const smaaPass = new SMAAPass();
composer.addPass(smaaPass);
composer.addPass(new OutputPass());

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  gtaoPass.setSize(
    Math.ceil(window.innerWidth * renderer.getPixelRatio() * 0.5),
    Math.ceil(window.innerHeight * renderer.getPixelRatio() * 0.5),
  );
}

function frame() {
  const deltaTime = Math.min(clock.getDelta(), 0.05);
  player.update(deltaTime);
  world.updateAt(camera.position.x, camera.position.z);
  composer.render(deltaTime);
  requestAnimationFrame(frame);
}

window.addEventListener("resize", resize);
frame();
