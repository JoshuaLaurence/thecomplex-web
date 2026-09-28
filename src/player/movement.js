const MOVEMENT_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD"]);

export class WASDMovement {
  constructor(target = window) {
    this.target = target;
    this.keys = new Set();

    this.handleKeyDown = (event) => {
      if (!MOVEMENT_KEYS.has(event.code)) return;
      this.keys.add(event.code);
      event.preventDefault();
    };
    this.handleKeyUp = (event) => this.keys.delete(event.code);
    this.clearKeys = () => this.keys.clear();

    target.addEventListener("keydown", this.handleKeyDown);
    target.addEventListener("keyup", this.handleKeyUp);
    target.addEventListener("blur", this.clearKeys);
  }

  getDirection(yaw) {
    const forward =
      Number(this.keys.has("KeyW")) - Number(this.keys.has("KeyS"));
    const strafe =
      Number(this.keys.has("KeyD")) - Number(this.keys.has("KeyA"));
    const length = Math.hypot(forward, strafe);

    if (length === 0) return { x: 0, z: 0 };

    const inverseLength = 1 / length;
    return {
      x: (-Math.sin(yaw) * forward + Math.cos(yaw) * strafe) * inverseLength,
      z: (-Math.cos(yaw) * forward - Math.sin(yaw) * strafe) * inverseLength,
    };
  }

  clear() {
    this.keys.clear();
  }

  dispose() {
    this.target.removeEventListener("keydown", this.handleKeyDown);
    this.target.removeEventListener("keyup", this.handleKeyUp);
    this.target.removeEventListener("blur", this.clearKeys);
  }
}
