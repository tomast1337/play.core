/**
@module   buffer.js
@desc     Safe buffer helpers, mostly for internal use
@category internal

Safe set() and get() functions, rect() and text() ‘drawing’ helpers.

Buffers are 1D arrays for 2D data, a ‘width’ and a 'height' parameter
have to be known (and passed to the functions) to correctly / safely access
the array.

const v = get(10, 10, buffer, cols, rows)

*/

import { Buffer, Cell } from "./types";

// Safe get function to read from a buffer
export function get(
  x: number,
  y: number,
  target: Buffer,
  targetCols: number,
  targetRows: number
) {
  if (x < 0 || x >= targetCols) return {};
  if (y < 0 || y >= targetRows) return {};
  const i = x + y * targetCols;
  return target[i];
}

// Safe set and merge functions for a generic buffer object.
// A buffer object contains at least a 'state' array
// and a 'width' and a 'height' field to allow easy setting.
// The value to be set is a single character or a 'cell' object like:
// { char, color, backgroundColor, fontWeight }
// which can overwrite the buffer (set) or partially merged (merge)
export function set(
  val: any,
  x: number,
  y: number,
  target: Buffer,
  targetCols: number = 0,
  targetRows: number = 0
) {
  if (x < 0 || x >= targetCols) return;
  if (y < 0 || y >= targetRows) return;
  const i = x + y * targetCols;
  target[i] = val;
}

export function merge(
  val: any,
  x: number,
  y: number,
  target: Buffer,
  targetCols?: number,
  targetRows?: number
) {
  if (x < 0 || x >= (targetCols || 0)) return;
  if (y < 0 || y >= (targetRows || 0)) return;
  const i = x + y * (targetCols || 0);

  // Flatten:
  const cell = typeof target[i] == "object" ? target[i] : { char: target[i] };

  //target[i] = { ...cell, ...val };
  target[i] = Object.assign(cell, val) as Cell;
}

export function setRect(
  val: any,
  x: number,
  y: number,
  w: number,
  h: number,
  target: Buffer,
  targetCols?: number,
  targetRows?: number
) {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) {
      set(val, i, j, target, targetCols, targetRows);
    }
  }
}

export function mergeRect(
  val: any,
  x: number,
  y: number,
  w: number,
  h: number,
  target: Buffer,
  targetCols?: number,
  targetRows?: number
) {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) {
      merge(val, i, j, target, targetCols, targetRows);
    }
  }
}

// Merges a textObj in the form of:
//	{
// 		text : 'abc\ndef',
// 		color : 'red',
// 		fontWeight : '400',
// 		backgroundColor : 'black',
//      etc...
//	}
// or just as a string into the target buffer.
export function mergeText(
  textObj: any,
  x: number,
  y: number,
  target: Buffer,
  targetCols: number = 0,
  targetRows: number = 0
) {
  let text;
  let mergeObj = {} as any;
  // An object has been passed as argument, expect a 'text' field
  if (typeof textObj == "object") {
    text = textObj.text;
    // Extract all the fields to be merged...
    mergeObj = { ...textObj };
    // ...but emove text field
    delete mergeObj.text;
  }
  // A string has been passed as argument
  else {
    text = textObj;
  }

  let col = x;
  let row = y;
  // Hackish and inefficient way to retain info of the first and last
  // character of each line merged into the matrix.
  // Can be useful to wrap with markup.
  const wrapInfo: { first: {}; last: {} }[] = [];

  text.split("\n").forEach((line: string, lineNum: number) => {
    line.split("").forEach((char: string, charNum: number) => {
      col = x + charNum;
      merge({ char, ...mergeObj }, col, row, target, targetCols, targetRows);
    });
    const first = get(x, row, target, targetCols, targetRows);
    const last = get(x + line.length - 1, row, target, targetCols, targetRows);
    wrapInfo.push({ first, last });
    row++;
  });

  // Adjust for last ++
  row = Math.max(y, row - 1);

  // Returns some info about the inserted text:
  // - the coordinates (offset) of the last inserted character
  // - the first an last chars of each line (wrapInfo)
  return {
    offset: { col, row },
    // first  : wrapInfo[0].first,
    // last   : wrapInfo[wrapInfo.length-1].last,
    wrapInfo,
  };
}
