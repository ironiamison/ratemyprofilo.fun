import * as THREE from "three";
import type { Garage } from "../visuals/Garage";

export function bindGarageViewport(garage: Garage): () => void {
  const el = document.querySelector(".gar-viewport");
  if (!el) return () => {};

  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const onDown = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    garage.onDrag(e.clientX - lastX, e.clientY - lastY);
    lastX = e.clientX;
    lastY = e.clientY;
  };

  const onUp = (e: PointerEvent) => {
    dragging = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    garage.onZoom(e.deltaY);
  };

  const onDblClick = () => garage.resetView();

  el.addEventListener("pointerdown", onDown as EventListener);
  el.addEventListener("pointermove", onMove as EventListener);
  el.addEventListener("pointerup", onUp as EventListener);
  el.addEventListener("pointercancel", onUp as EventListener);
  el.addEventListener("wheel", onWheel as EventListener, { passive: false });
  el.addEventListener("dblclick", onDblClick);

  return () => {
    el.removeEventListener("pointerdown", onDown as EventListener);
    el.removeEventListener("pointermove", onMove as EventListener);
    el.removeEventListener("pointerup", onUp as EventListener);
    el.removeEventListener("pointercancel", onUp as EventListener);
    el.removeEventListener("wheel", onWheel as EventListener);
    el.removeEventListener("dblclick", onDblClick);
  };
}

export function applyGarageViewOffset(camera: THREE.PerspectiveCamera): void {
  const el = document.querySelector(".gar-viewport");
  if (!el) {
    camera.clearViewOffset();
    return;
  }
  const rect = el.getBoundingClientRect();
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (rect.width < 40 || rect.height < 40) {
    camera.clearViewOffset();
    return;
  }
  camera.setViewOffset(w, h, rect.left, rect.top, rect.width, rect.height);
}
