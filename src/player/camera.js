const MAX_PITCH = Math.PI / 2 - 0.08;
const BASE_SENSITIVITY = 0.002;

export class MouseLook {
  constructor(camera, element, onLockChange = () => {}) {
    this.camera = camera;
    this.element = element;
    this.onLockChange = onLockChange;
    this.yaw = 0;
    this.pitch = 0;
    this.sensitivity = BASE_SENSITIVITY;

    this.handleClick = this.handleClick.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handlePointerLockChange = this.handlePointerLockChange.bind(this);

    camera.rotation.order = "YXZ";
    element.addEventListener("click", this.handleClick);
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener(
      "pointerlockchange",
      this.handlePointerLockChange,
    );
  }

  handleClick() {
    this.requestPointerLock();
  }

  requestPointerLock() {
    if (document.pointerLockElement === this.element) return;
    const request = this.element.requestPointerLock();
    request?.catch(() => {});
  }

  setSensitivity(multiplier) {
    this.sensitivity = BASE_SENSITIVITY * multiplier;
  }

  handleMouseMove(event) {
    if (document.pointerLockElement !== this.element) return;

    this.yaw -= event.movementX * this.sensitivity;
    this.pitch = Math.max(
      -MAX_PITCH,
      Math.min(MAX_PITCH, this.pitch - event.movementY * this.sensitivity),
    );
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  handlePointerLockChange() {
    this.onLockChange(document.pointerLockElement === this.element);
  }

  dispose() {
    this.element.removeEventListener("click", this.handleClick);
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener(
      "pointerlockchange",
      this.handlePointerLockChange,
    );
  }
}
