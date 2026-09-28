import * as THREE from "three";
import { MouseLook } from "./camera.js";
import { moveWithCollisions } from "./collision.js";
import { WASDMovement } from "./movement.js";

const WALK_SPEED = 3.8;
const PLAYER_RADIUS = 0.32;
const PLAYER_HEIGHT = 1.72;
const EYE_HEIGHT = 1.62;
const BOB_CADENCE = Math.PI * 2 * 1.9;

export class PlayerController {
  constructor(camera, lockElement, getColliders, onPauseChange) {
    this.camera = camera;
    this.getColliders = getColliders;
    this.onPauseChange = onPauseChange;
    this.position = new THREE.Vector3(camera.position.x, 0, camera.position.z);
    this.mouseLook = new MouseLook(camera, lockElement, (locked) => {
      this.setPaused(!locked);
    });
    this.movement = new WASDMovement();
    this.paused = false;
    this.bobPhase = 0;
    this.bobBlend = 0;
    this.syncCamera();
  }

  syncCamera() {
    const sideBob = Math.sin(this.bobPhase * 0.5) * 0.012 * this.bobBlend;
    const verticalBob =
      (Math.abs(Math.sin(this.bobPhase)) - 0.5) * 0.022 * this.bobBlend;
    const yaw = this.mouseLook.yaw;
    this.camera.position.set(
      this.position.x + Math.cos(yaw) * sideBob,
      this.position.y + EYE_HEIGHT + verticalBob,
      this.position.z - Math.sin(yaw) * sideBob,
    );
  }

  update(deltaTime) {
    if (this.paused) return;

    const direction = this.movement.getDirection(this.mouseLook.yaw);
    const previousX = this.position.x;
    const previousZ = this.position.z;
    moveWithCollisions(
      this.position,
      direction.x * WALK_SPEED * deltaTime,
      direction.z * WALK_SPEED * deltaTime,
      this.getColliders(),
      { radius: PLAYER_RADIUS, height: PLAYER_HEIGHT },
    );
    const isMoving =
      Math.hypot(this.position.x - previousX, this.position.z - previousZ) >
      1e-5;
    this.bobBlend +=
      ((isMoving ? 1 : 0) - this.bobBlend) * (1 - Math.exp(-10 * deltaTime));
    if (isMoving) this.bobPhase += BOB_CADENCE * deltaTime;
    this.syncCamera();
  }

  setPaused(paused) {
    if (this.paused === paused) return;
    this.paused = paused;
    if (paused) this.movement.clear();
    this.onPauseChange?.(paused);
  }

  pause() {
    this.setPaused(true);
    if (document.pointerLockElement === this.mouseLook.element) {
      document.exitPointerLock();
    }
  }

  resume() {
    this.mouseLook.requestPointerLock();
  }

  setSensitivity(multiplier) {
    this.mouseLook.setSensitivity(multiplier);
  }

  dispose() {
    this.mouseLook.dispose();
    this.movement.dispose();
  }
}
