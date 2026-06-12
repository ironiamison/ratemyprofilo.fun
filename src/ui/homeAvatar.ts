export function createCaptainAvatarUrl(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0a1020";
  ctx.fillRect(0, 0, 64, 64);

  const block = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(x, y, w, 2);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(x, y + h - 2, w, 2);
  };

  block(20, 8, 24, 18, "#e8b888");
  block(22, 6, 20, 4, "#3a5068");
  block(18, 26, 28, 22, "#2a6090");
  block(14, 30, 6, 14, "#1a4878");
  block(44, 30, 6, 14, "#1a4878");
  block(22, 48, 10, 12, "#1a3050");
  block(32, 48, 10, 12, "#1a3050");
  block(26, 14, 5, 5, "#2a3848");
  block(33, 14, 5, 5, "#2a3848");
  block(28, 34, 8, 6, "#44aadd");

  return canvas.toDataURL("image/png");
}
