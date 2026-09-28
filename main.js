import * as THREE from "three/webgpu";

const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.setSize(WIDTH, HEIGHT);
renderer.setClearColor(0xdddddd, 1);
document.body.appendChild(renderer.domElement);

await renderer.init();
