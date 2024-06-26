/**
[header]
@author ertdfgcvb
@title  How to log
@desc   Console output inside the main() loop
*/
import { Buffer, Context, Coord, Cursor } from "../../modules/types";

const { abs, floor, max } = Math;
export function main(
  coord: Coord,
  context: Context,
  cursor: Cursor,
  buffer: Buffer
) {
  const x = abs(coord.x - cursor.x);
  const y = abs(coord.y - cursor.y) / context.metrics.aspect;
  const dist = floor(max(x, y) + context.frame);

  // Sometimes it’s useful to inspect values from inside the main loop.
  // The main() function is called every frame for every cell:
  // the console will be flooded with data very quickly!
  // Output can be limited to one cell and every 10 frames, for example:
  if (coord.index == 100 && context.frame % 10 == 0) {
    // console.clear()
    console.log("dist = " + dist);
  }

  return ".-=:abc123?xyz*;%+,"[dist % 30];
}
