/**
@module   camera.js
@desc     Webcam init and helper
@category public

Initializes a user-facing camera,
returns a video element (initialised asynchronously).
*/

export default { init };

type UserMedia = HTMLVideoElement & { srcObject: MediaStream; src: string };

let video: HTMLVideoElement | null = null;
function init(callback?: (stream: MediaStream) => void) {
  // Avoid double init of video object
  video = video || getUserMedia(callback);
  return video;
}

// https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
function getUserMedia(
  callback?: (stream: MediaStream) => void
): HTMLVideoElement {
  // getUserMedia is not supported by browser
  if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
    throw new DOMException("getUserMedia not supported in this browser");
  }

  // Create a video element
  const video = document.createElement("video") as UserMedia;
  video.setAttribute("playsinline", ""); // Required to work in iOS 11 & up

  const constraints = {
    audio: false,
    video: { facingMode: "user" },
  };

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(function (stream: MediaStream | MediaSource) {
      if ("srcObject" in video) {
        video.srcObject = stream as MediaStream;
      } else {
        (video as UserMedia).src = window.URL.createObjectURL(
          stream as MediaSource
        );
      }
    })
    .catch(function (err) {
      let msg = "No camera available.";
      if (err.code == 1) msg = "User denied access to use camera.";
      console.log(msg);
      console.error(err);
    });

  video.addEventListener("loadedmetadata", function () {
    video.play();
    if (typeof callback === "function") callback(video.srcObject);
  });
  return video;
}
