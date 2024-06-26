/**
[header]
@author ertdfgcvb
@title  Rectangles
@desc   Smooth SDF Rectangles
*/
import { drawInfo } from "../../modules/drawbox.js";
import { map } from "../../modules/num.js";
import { opSmoothUnion, sdBox } from "../../modules/sdf.js";
import { Buffer, Context, Coord, Cursor } from "../../modules/types";
import { Vec2 } from "../../modules/vec2";

let density = "▚▀abc|/:÷×+-=?*· ";

export function main(
  coord: Coord,
  context: Context,
  cursor: Cursor,
  buffer: Buffer
) {
  const t = context.time;
  const m = Math.max(context.cols, context.rows);
  const a = context.metrics.aspect;

  const st = {
    x: (2.0 * (coord.x - context.cols / 2)) / m,
    y: (2.0 * (coord.y - context.rows / 2)) / m / a,
  };

  let d = 1e100;

  const s = map(Math.sin(t * 0.0005), -1, 1, 0.0, 0.4);
  const g = 1.2;
  for (let by = -g; by <= g; by += g * 0.33) {
    for (let bx = -g; bx <= g; bx += g * 0.33) {
      const r = t * 0.0004 * (bx + g * 2) + (by + g * 2);
      const f = transform(st, { x: bx, y: by }, r);
      const d1 = sdBox(f, { x: g * 0.33, y: 0.01 });
      d = opSmoothUnion(d, d1, s);
    }
  }

  let c = 1.0 - Math.exp(-5 * Math.abs(d));
  const index = Math.floor(c * density.length);

  return density[index];
}

function transform(p: Vec2, trans: Vec2, rot: number) {
  const s = Math.sin(-rot);
  const c = Math.cos(-rot);
  const dx = p.x - trans.x;
  const dy = p.y - trans.y;
  return {
    x: dx * c - dy * s,
    y: dx * s + dy * c,
  };
}

export function post(context: Context, cursor: Cursor, buffer: Buffer) {
  drawInfo(context, cursor, buffer);
}
