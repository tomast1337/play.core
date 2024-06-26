/**
[header]
@author ertdfgcvb
@title  Sequence export
@desc   Export 10 frames as images
*/

import { drawInfo } from "../../modules/drawbox";
import { exportFrame } from "../../modules/exportframe";
import { Buffer, Context, Coord, Cursor } from "../../modules/types";
// Important: the frame exporter works only with the canvas renderer.
// Optional: reset the frame count and time at each new run!
export const settings = {
  renderer: "canvas",
  restoreState: false, // Reset time
  fps: 2, // Slow down: some browsers can’t keep up with high framerates
};

// The frame is exported at the beginning of each new pass,
// the canvas still contains the previously rendered image.
// Exported frame “10” will in fact be frame “9” of the loop!

export function pre(context: Context, cursor: Cursor, buffer: Buffer) {
  // The filename will be postfixed with the frame number:
  // export_10.png, export_11.png, etc.
  // The last two parameters are the start and the end frame
  // of the sequence to be exported.

  exportFrame(context, "export.png", 10, 20);

  // The image will (probably) be saved in the “Downloads” folder
  // and can be assembled into a movie file; for example with FFmpeg:
  //
  // > ffmpeg -framerate 30 -pattern_type glob -i "export_*.png" \
  //        -vcodec h264 -pix_fmt yuv420p \
  //        -preset:v slow -profile:v baseline -crf 23 export.m4v
}

export function main(
  coord: Coord,
  context: Context,
  cursor: Cursor,
  buffer: Buffer
) {
  if ((coord.x + coord.y) % 2 != 0) return " ";
  return (context.frame - 9) % 10;
}

export function post(context: Context, cursor: Cursor, buffer: Buffer) {
  drawInfo(context, cursor, buffer, {
    color: "white",
    backgroundColor: "royalblue",
    shadowStyle: "gray",
  });
}
