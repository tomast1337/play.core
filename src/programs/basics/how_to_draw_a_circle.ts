/**
[header]
@author ertdfgcvb
@title  How to draw a circle
@desc   Use of context.metrics.aspect
*/

import { drawBox } from "../../modules/drawbox";
import { Buffer, Context, Coord, Cursor, Style } from "../../modules/types";
import { length } from "../../modules/vec2";
export function main(
  coord: Coord,
  context: Context,
  cursor: Cursor,
  buffer: Buffer
) {
  // contex.metrics.aspect holds the font (or cell) aspect ratio
  const aspectRatio = cursor.pressed ? 1 : context.metrics.aspect;

  // Transform coordinate space to (-1, 1)
  // width corrected screen aspect (m) and cell aspect (aspectRatio)
  const m = Math.min(context.cols * aspectRatio, context.rows);
  const st = {
    x: ((2.0 * (coord.x - context.cols / 2)) / m) * aspectRatio, // apply aspect
    y: (2.0 * (coord.y - context.rows / 2)) / m,
  };

  // Distance of each cell from the center (0, 0)
  const l = length(st);

  // 0.7 is the radius of the circle
  return l < 0.7 ? "X" : ".";
}

// Draw some info
export function post(context: Context, cursor: Cursor, buffer: Buffer) {
  // Apply some rounding to the aspect for better output
  const ar = cursor.pressed ? 1 : ("" + context.metrics.aspect).substr(0, 8);

  // Output string
  let text = "";
  text += "Hold the cursor button\n";
  text += "to change the aspect ratio:\n";
  text += "aspectRatio = " + ar + "\n";

  // Custom box style
  const style: Style = {
    backgroundColor: "tomato",
    borderStyle: "double",
    shadowStyle: "gray",
  };

  // Finally draw the box
  drawBox(text, style, buffer, context.cols, context.rows);
}
