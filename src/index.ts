import textRenderer from "./core/textrenderer";
import canvasRenderer from "./core/canvasrenderer";
import FPS from "./core/fps";
import storage from "./core/storage";
import RUNNER_VERSION from "./core/version";
import {
  Buffer,
  Context,
  Metrics,
  Pointer,
  Program,
  Settings,
  State,
} from "./modules/types";
import { RenderModes } from "./core/types";

export { RUNNER_VERSION };

const renderers: Record<
  RenderModes,
  typeof textRenderer | typeof canvasRenderer
> = {
  canvas: canvasRenderer,
  text: textRenderer,
};

// Default settings for the program runner.
// They can be overwritten by the parameters of the runner
// or as a settings object exported by the program (in this order).
const defaultSettings = {
  element: null, // target element for output
  cols: 0, // number of columns, 0 is equivalent to 'auto'
  rows: 0, // number of columns, 0 is equivalent to 'auto'
  once: false, // if set to true the renderer will run only once
  fps: 30, // fps capping
  renderer: "text", // can be 'canvas', anything else falls back to 'text'
  allowSelect: false, // allows selection of the rendered element
  restoreState: false, // will store the "state" object in local storage
  // this is handy for live-coding situations
} as unknown as Settings;

// CSS styles which can be passed to the container element via settings
const CSSStyles = [
  "backgroundColor",
  "color",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "textAlign",
];

export default async function runner(
  program: Program,
  settings: Settings,
  userData: any = {}
): Promise<void> {
  // Merge the default settings with the user settings
  const mergedSettings = { ...defaultSettings, ...settings };

  if (!mergedSettings.element || !settings.element) {
    throw new Error("No renderer specified");
  }

  // If the renderer is not supported, fall back to text renderer
  const renderer = renderers[mergedSettings.renderer] || textRenderer;

  // State is stored in local storage and will loaded on program launch
  // if settings.restoreState == true.
  // The purpose of this is to live edit the code without resetting
  // time and the frame counter.
  const state: State = {
    time: 0, // The time in ms
    frame: 0, // The frame number (int)
    cycle: 0, // An cycle count for debugging purposes
    fps: settings.fps || 30, // The target fps
  };

  // Name of local storage key
  const LOCAL_STORAGE_KEY_STATE = "currentState";

  if (settings.restoreState) {
    storage.restore(LOCAL_STORAGE_KEY_STATE, state);
    state.cycle++; // Keep track of the cycle count for debugging purposes
  }

  // Apply CSS settings to element
  for (const s of CSSStyles) {
    if (settings[s]) settings.element.style[s as any] = settings[s];
  }

  // Eventqueue
  // Stores events and pops them at the end of the renderloop
  // TODO: needed?
  const eventQueue: ("pointerMove" | "pointerDown" | "pointerUp")[] = [];

  // Input pointer updated by DOM events
  const pointer: Pointer = {
    x: 0,
    y: 0,
    pressed: false,
    px: 0,
    py: 0,
    ppressed: false,
  };

  settings.element.addEventListener("pointermove", ((e: PointerEvent) => {
    const rect = settings.element?.getBoundingClientRect();
    if (!rect) return;
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    eventQueue.push("pointerMove");
  }) as EventListenerOrEventListenerObject);

  settings.element.addEventListener("pointerdown", ((e: PointerEvent) => {
    pointer.pressed = true;
    eventQueue.push("pointerDown");
  }) as EventListenerOrEventListenerObject);

  settings.element.addEventListener("pointerup", ((e: PointerEvent) => {
    pointer.pressed = false;
    eventQueue.push("pointerUp");
  }) as EventListenerOrEventListenerObject);

  const touchHandler = ((e: TouchEvent) => {
    const rect = settings.element?.getBoundingClientRect();
    if (!rect) return;
    pointer.x = e.touches[0].clientX - rect.left;
    pointer.y = e.touches[0].clientY - rect.top;
    eventQueue.push("pointerMove");
  }) as EventListenerOrEventListenerObject;

  settings.element.addEventListener("touchmove", touchHandler);
  settings.element.addEventListener("touchstart", touchHandler);
  settings.element.addEventListener("touchend", touchHandler);

  // CSS fix
  settings.element.style.fontStretch = "normal";

  // Text selection may be annoing in case of interactive programs
  if (!settings.allowSelect) disableSelect(settings.element);

  // FPS object (keeps some state for precise FPS measure)
  const fps = new FPS();

  // A cell with no value at all is just a space
  const EMPTY_CELL = " ";

  // Default cell style inserted in case of undefined / null
  const DEFAULT_CELL_STYLE = Object.freeze({
    color: settings.color,
    backgroundColor: settings.backgroundColor,
    fontWeight: settings.fontWeight,
  });

  // Buffer needed for the final DOM rendering,
  // each array entry represents a cell.
  const buffer: Buffer = [];

  // Metrics object, calc once (below)
  let metrics: Metrics;

  function boot() {
    metrics = calcMetrics(settings.element as HTMLElement);
    const context = getContext(state, settings, metrics, fps);
    if (typeof program.boot == "function") {
      program.boot(context, buffer, userData);
    }
    requestAnimationFrame(loop);
  }

  // Time sample to calculate precise offset
  let timeSample = 0;
  // Previous time step to increment state.time (with state.time initial offset)
  let ptime = 0;
  const interval = 1000 / settings.fps;
  const timeOffset = state.time;

  // Used to track window resize
  let cols: number, rows: number;

  // Main program loop
  function loop(t: number) {
    // Timing
    const delta = t - timeSample;
    if (delta < interval) {
      // Skip the frame
      if (!settings.once) requestAnimationFrame(loop);
      return;
    }

    // Snapshot of context data
    const context = getContext(state, settings, metrics, fps);

    // FPS update
    fps.update(t);

    // Timing update
    timeSample = t - (delta % interval); // adjust timeSample
    state.time = t + timeOffset; // increment time + initial offs
    state.frame++; // increment frame counter
    storage.store(LOCAL_STORAGE_KEY_STATE, state); // store state

    // Cursor update
    const cursor = {
      // The canvas might be slightly larger than the number
      // of cols/rows, min is required!
      x: Math.min(context.cols - 1, pointer.x / metrics.cellWidth),
      y: Math.min(context.rows - 1, pointer.y / metrics.lineHeight),
      pressed: pointer.pressed,
      p: {
        // state of previous frame
        x: pointer.px / metrics.cellWidth,
        y: pointer.py / metrics.lineHeight,
        pressed: pointer.ppressed,
      },
    };

    // Pointer: store previous state
    pointer.px = pointer.x;
    pointer.py = pointer.y;
    pointer.ppressed = pointer.pressed;

    // 1. --------------------------------------------------------------
    // In case of resize / init normalize the buffer
    if (cols != context.cols || rows != context.rows) {
      cols = context.cols;
      rows = context.rows;
      buffer.length = context.cols * context.rows;
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = { ...DEFAULT_CELL_STYLE, char: EMPTY_CELL };
      }
    }

    // 2. --------------------------------------------------------------
    // Call pre(), if defined
    if (typeof program.pre == "function") {
      program.pre(context, cursor, buffer, userData);
    }

    // 3. --------------------------------------------------------------
    // Call main(), if defined
    if (typeof program.main == "function") {
      for (let j = 0; j < context.rows; j++) {
        const offs = j * context.cols;
        for (let i = 0; i < context.cols; i++) {
          const idx = i + offs;
          // Override content:
          // buffer[idx] = program.main({x:i, y:j, index:idx}, context, cursor, buffer, userData)
          const out = program.main(
            { x: i, y: j, index: idx },
            context,
            cursor,
            buffer,
            userData
          );
          if (typeof out == "object" && out !== null) {
            buffer[idx] = { ...buffer[idx], ...out };
          } else {
            buffer[idx] = { ...buffer[idx], char: out };
          }
          // Fix undefined / null / etc.
          if (buffer[idx].char === undefined || buffer[idx].char === null) {
            buffer[idx].char = EMPTY_CELL;
          }
        }
      }
    }

    // 4. --------------------------------------------------------------
    // Call post(), if defined
    if (typeof program.post == "function") {
      program.post(context, cursor, buffer, userData);
    }

    // 5. --------------------------------------------------------------
    renderer.render(context, buffer);

    // 6. --------------------------------------------------------------
    // Queued events
    while (eventQueue.length > 0) {
      const type = eventQueue.shift();
      if (type && typeof program[type] == "function") {
        program[type](context, cursor, buffer);
      }
    }

    // 7. --------------------------------------------------------------
    // Loop (eventually)
    if (!settings.once) requestAnimationFrame(loop);
  }
}

// -- Helpers ------------------------------------------------------------------

// Build / update the 'context' object (immutable)
// A bit of spaghetti... but the context object needs to be ready for
// the boot function and also to be updated at each frame.
function getContext(
  state: State,
  settings: Settings,
  metrics: Metrics,
  fps: FPS
): Context {
  const rect = settings.element?.getBoundingClientRect() as DOMRect;
  const cols = settings.cols || Math.floor(rect.width / metrics.cellWidth);
  const rows = settings.rows || Math.floor(rect.height / metrics.lineHeight);
  return Object.freeze({
    frame: state.frame,
    time: state.time,
    cols,
    rows,
    metrics,
    width: rect.width,
    height: rect.height,
    settings,
    // Runtime & debug data
    runtime: Object.freeze({
      cycle: state.cycle,
      fps: fps.fps,
      // updatedRowNum
    }),
  }) as Context;
}

// Disables selection for an HTML element
function disableSelect(el: HTMLElement) {
  el.style.userSelect = "none";
  el.style.webkitUserSelect = "none"; // for Safari on mac and iOS
  el.style.userSelect = "none"; // for mobile FF
  el.dataset.selectionEnabled = "false";
}

// Enables selection for an HTML element
function enableSelect(el: HTMLElement) {
  el.style.userSelect = "auto";
  el.style.webkitUserSelect = "auto";
  el.style.userSelect = "auto";
  el.dataset.selectionEnabled = "true";
}

// Copies the content of an element to the clipboard
export function copyContent(el: HTMLElement) {
  // Store selection default
  const selectionEnabled = !el.dataset.selectionEnabled === false;

  // Enable selection if necessary
  if (!selectionEnabled) enableSelect(el);

  // Copy the text block
  const range = document.createRange();
  range.selectNode(el);
  const sel = window.getSelection();
  if (!sel) throw new Error("Could not get selection");
  sel.removeAllRanges();
  sel.addRange(range);
  document.execCommand("copy");
  sel.removeAllRanges();

  // Restore default, if necessary
  if (!selectionEnabled) disableSelect(el);
}

// Calcs width (fract), height, aspect of a monospaced char
// assuming that the CSS font-family is a monospaced font.
// Returns a mutable object.
export function calcMetrics(el: HTMLElement | HTMLCanvasElement) {
  const style = getComputedStyle(el);

  // Extract info from the style: in case of a canvas element
  // the style and font family should be set anyways.
  const fontFamily = style.getPropertyValue("font-family");
  const fontSize = parseFloat(style.getPropertyValue("font-size"));
  // Can’t rely on computed lineHeight since Safari 14.1
  // See:  https://bugs.webkit.org/show_bug.cgi?id=225695
  const lineHeight = parseFloat(style.getPropertyValue("line-height"));
  let cellWidth;

  // If the output element is a canvas 'measureText()' is used
  // else cellWidth is computed 'by hand' (should be the same, in any case)
  if (el.nodeName == "CANVAS") {
    const ctx = (el as HTMLCanvasElement).getContext("2d");
    if (!ctx) throw new Error("Could not get 2d context");
    ctx.font = fontSize + "px " + fontFamily;
    cellWidth = ctx.measureText("".padEnd(50, "X")).width / 50;
  } else {
    const span = document.createElement("span");
    el.appendChild(span);
    span.innerHTML = "".padEnd(50, "X");
    cellWidth = span.getBoundingClientRect().width / 50;
    el.removeChild(span);
  }

  const metrics = {
    aspect: cellWidth / lineHeight,
    cellWidth,
    lineHeight,
    fontFamily,
    fontSize,
    // Semi-hackish way to allow an update of the metrics object.
    // This may be useful in some situations, for example
    // responsive layouts with baseline or font change.
    // NOTE: It’s not an immutable object anymore
    _update: function () {
      const tmp = calcMetrics(el);
      for (var k in tmp) {
        // NOTE: Object.assign won’t work
        //if (typeof tmp[k] == "number" || typeof tmp[k] == "string") {
        //  m[k] = tmp[k];
        //}
      }
    },
  };

  return metrics;
}
