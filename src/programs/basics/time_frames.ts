/**
[header]
@author ertdfgcvb
@title  Time: frames
@desc   Use of context.frame (ASCII horizon)
*/

// The default framerate can be altered
// by exporting a 'settings' object (see the manual for details).
import { drawInfo } from "../../modules/drawbox";
import { Buffer, Context, Coord, Cursor } from "../../modules/types";
export const settings = { fps: 30 };
export function main(
  coord: Coord,
  context: Context,
  cursor: Cursor,
  buffer: Buffer
) {
  const z = Math.floor(coord.y - context.rows / 2);

  // Avoid division by zero
  if (z == 0) return " ";

  // Calculate a fake perspective
  const val = (coord.x - context.cols / 2) / z;

  // Add time (context.frame) for animation
  // and make sure to get adisplayable charCode (int, positive, valid range)
  const code =
    (Math.floor(val + context.cols / 2 + context.frame * 0.3) % 94) + 32;
  return String.fromCharCode(code);
}

// Display some info

export function post(context: Context, cursor: Cursor, buffer: Buffer) {
  drawInfo(context, cursor, buffer, {
    color: "white",
    backgroundColor: "royalblue",
    shadowStyle: "gray",
  });
}
