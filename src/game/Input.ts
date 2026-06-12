export class Input {
  keys = new Set<string>();
  mobile = {
    forward: false,
    back: false,
    left: false,
    right: false,
    pitchUp: false,
    pitchDown: false,
    strafeUp: false,
    boost: false,
    mine: false,
    interact: false,
    dock: false,
    scan: false,
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
    if (this.isGameKey(e.code)) e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private isGameKey(code: string): boolean {
    return (
      code.startsWith("Arrow") ||
      code === "Space" ||
      code === "Tab" ||
      code === "KeyW" ||
      code === "KeyA" ||
      code === "KeyS" ||
      code === "KeyD" ||
      code === "KeyQ" ||
      code === "KeyE" ||
      code === "KeyG" ||
      code === "KeyR" ||
      code === "KeyF" ||
      code === "ShiftLeft" ||
      code === "ShiftRight"
    );
  }

  constructor() {
    document.addEventListener("keydown", this.onKeyDown, true);
    document.addEventListener("keyup", this.onKeyUp, true);
    window.addEventListener("blur", () => this.clear());
  }

  clear(): void {
    this.keys.clear();
    Object.keys(this.mobile).forEach((k) => {
      (this.mobile as Record<string, boolean>)[k] = false;
    });
  }

  focusGame(el: HTMLElement): void {
    el.tabIndex = 0;
    el.focus({ preventScroll: true });
  }

  get forward() {
    return this.keys.has("KeyW") || this.keys.has("ArrowUp") || this.mobile.forward;
  }
  get back() {
    return this.keys.has("KeyS") || this.keys.has("ArrowDown") || this.mobile.back;
  }
  get left() {
    return this.keys.has("KeyA") || this.keys.has("ArrowLeft") || this.mobile.left;
  }
  get right() {
    return this.keys.has("KeyD") || this.keys.has("ArrowRight") || this.mobile.right;
  }
  get pitchUp() {
    return this.keys.has("KeyR") || this.mobile.pitchUp;
  }
  get pitchDown() {
    return this.keys.has("KeyF") || this.mobile.pitchDown;
  }
  get strafeUp() {
    return this.keys.has("KeyQ") || this.mobile.strafeUp;
  }
  get boost() {
    return this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") || this.mobile.boost;
  }
  get mine() {
    return this.keys.has("Space") || this.mobile.mine;
  }
  get interact() {
    return this.keys.has("KeyE") || this.mobile.interact;
  }
  get dock() {
    return this.keys.has("KeyG") || this.mobile.dock;
  }
  get scan() {
    return this.keys.has("Tab") || this.mobile.scan;
  }

  private interactLatch = false;
  private dockLatch = false;
  private scanLatch = false;
  private escapeLatch = false;

  consumeInteract(): boolean {
    if (this.interact && !this.interactLatch) {
      this.interactLatch = true;
      return true;
    }
    if (!this.interact) this.interactLatch = false;
    return false;
  }

  consumeDock(): boolean {
    if (this.dock && !this.dockLatch) {
      this.dockLatch = true;
      return true;
    }
    if (!this.dock) this.dockLatch = false;
    return false;
  }

  consumeScan(): boolean {
    if (this.scan && !this.scanLatch) {
      this.scanLatch = true;
      return true;
    }
    if (!this.scan) this.scanLatch = false;
    return false;
  }

  consumeEscape(): boolean {
    if (this.keys.has("Escape") && !this.escapeLatch) {
      this.escapeLatch = true;
      return true;
    }
    if (!this.keys.has("Escape")) this.escapeLatch = false;
    return false;
  }
}
