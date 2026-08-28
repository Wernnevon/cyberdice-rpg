import * as THREE from "three";

/**
 * Procedural texture for the tray floor.
 *
 * Drawn on a canvas once at first use, then cached: the tray is static, so the
 * cost is paid a single time and no image files ship with the bundle.
 *
 * It is painted on an opaque black base and used as an *emissive* map rather
 * than as a transparent overlay mesh. An overlay would sit two millimetres above
 * the floor and lose the depth test outright on a low-precision depth buffer;
 * baked into the material, the markings cannot z-fight with the surface they are
 * painted on.
 */

const CYAN = "0, 243, 255";
const MAGENTA = "255, 0, 255";
const SIZE = 1024;
const LOGO_SRC = "/icon.png";

/**
 * Markings are laid out in the square that circumscribes the floor circle,
 * which is exactly how CircleGeometry lays out its UVs.
 */
const draw = (ctx: CanvasRenderingContext2D) => {
  const c = SIZE / 2;
  const r = SIZE / 2;

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Fine grid, brighter every fourth line.
  const step = SIZE / 32;
  for (let i = 0; i <= 32; i++) {
    const major = i % 4 === 0;
    ctx.strokeStyle = `rgba(${CYAN}, ${major ? 0.16 : 0.07})`;
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, SIZE);
    ctx.moveTo(0, i * step);
    ctx.lineTo(SIZE, i * step);
    ctx.stroke();
  }

  // Two hairline guide circles.
  for (const [radius, alpha] of [
    [0.4, 0.3],
    [0.72, 0.2],
  ]) {
    ctx.strokeStyle = `rgba(${CYAN}, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c, c, r * radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Graduated tick ring -- the detail that makes the floor read as an
  // instrument rather than a dinner plate.
  const TICKS = 72;
  for (let i = 0; i < TICKS; i++) {
    const angle = (i / TICKS) * Math.PI * 2;
    const major = i % 6 === 0;
    ctx.strokeStyle = `rgba(${CYAN}, ${major ? 0.9 : 0.4})`;
    ctx.lineWidth = major ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(angle) * r * (major ? 0.85 : 0.88), c + Math.sin(angle) * r * (major ? 0.85 : 0.88));
    ctx.lineTo(c + Math.cos(angle) * r * 0.925, c + Math.sin(angle) * r * 0.925);
    ctx.stroke();
  }

  // Magenta accent arcs: they break the symmetry, so the floor looks designed
  // instead of generated.
  ctx.strokeStyle = `rgba(${MAGENTA}, 0.85)`;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(c, c, r * 0.78, Math.PI * 0.12, Math.PI * 0.46);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(c, c, r * 0.78, Math.PI * 1.06, Math.PI * 1.2);
  ctx.stroke();

  // Stencilled label, sitting just inside the tick ring.
  ctx.fillStyle = `rgba(${CYAN}, 0.45)`;
  ctx.font = `600 ${Math.round(SIZE * 0.021)}px ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ARENA_01  //  RNG.SECURE", c, c + r * 0.6);

  // The rim's glow spilling onto the floor. There is no bloom pass in this
  // scene, so the falloff is painted in.
  const spill = ctx.createRadialGradient(c, c, r * 0.72, c, c, r);
  spill.addColorStop(0, "rgba(0, 243, 255, 0)");
  spill.addColorStop(0.75, "rgba(0, 243, 255, 0.07)");
  spill.addColorStop(1, "rgba(140, 247, 255, 0.34)");
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = spill;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.globalCompositeOperation = "source-over";
};

/**
 * Stamps the app icon into the middle of the floor.
 *
 * The icon is already a glowing shape on black, which is exactly what an
 * emissive map wants, so it composites straight in with `lighter`. It loads
 * asynchronously; the texture is simply flagged for re-upload when it arrives.
 */
const stampLogo = (ctx: CanvasRenderingContext2D, texture: THREE.Texture) => {
  const logo = new Image();
  logo.src = LOGO_SRC;
  logo.onload = () => {
    const width = SIZE * 0.46;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.4;
    ctx.drawImage(logo, (SIZE - width) / 2, (SIZE - width) / 2, width, width);
    ctx.restore();
    texture.needsUpdate = true;
  };
};

let floorTexture: THREE.Texture | undefined;

export const getFloorMarkingsTexture = (): THREE.Texture => {
  if (!floorTexture) {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;
    draw(ctx);

    floorTexture = new THREE.CanvasTexture(canvas);
    floorTexture.colorSpace = THREE.SRGBColorSpace;
    floorTexture.anisotropy = 8;
    stampLogo(ctx, floorTexture);
  }
  return floorTexture;
};
