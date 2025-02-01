// Grab references to the HTML elements
const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('output');
const canvasCtx = canvasElement.getContext('2d');

// Global variables to store the latest landmarks detected.
let latestFaceLandmarks = null;
let latestHandsLandmarks = null;

/**
 * Define simplified connectors for hand features.
 */

// Palm outline connections.
const SIMPLE_HAND_CONNECTIONS = [
  [0, 5],
  [5, 9],
  [9, 13],
  [13, 17],
  [17, 0]
];

// Finger connections for each finger.
const FINGER_CONNECTIONS = [
  // Thumb (landmarks: 1, 2, 3, 4)
  [1, 2],
  [2, 3],
  [3, 4],
  // Index finger (landmarks: 5, 6, 7, 8)
  [5, 6],
  [6, 7],
  [7, 8],
  // Middle finger (landmarks: 9, 10, 11, 12)
  [9, 10],
  [10, 11],
  [11, 12],
  // Ring finger (landmarks: 13, 14, 15, 16)
  [13, 14],
  [14, 15],
  [15, 16],
  // Pinky (landmarks: 17, 18, 19, 20)
  [17, 18],
  [18, 19],
  [19, 20]
];

/**
 * Callback for MediaPipe FaceMesh results.
 * Updates the latest detected face landmarks.
 */
function onFaceResults(results) {
  if (results.multiFaceLandmarks) {
    latestFaceLandmarks = results.multiFaceLandmarks;
  } else {
    latestFaceLandmarks = null;
  }
}

/**
 * Callback for MediaPipe Hands results.
 * Updates the latest detected hand landmarks.
 */
function onHandsResults(results) {
  if (results.multiHandLandmarks) {
    latestHandsLandmarks = results.multiHandLandmarks;
  } else {
    latestHandsLandmarks = null;
  }
}

// Initialize MediaPipe FaceMesh
const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});
faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
faceMesh.onResults(onFaceResults);

// Initialize MediaPipe Hands
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});
hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
hands.onResults(onHandsResults);

// Adjust canvas size once the video metadata is loaded.
videoElement.addEventListener('loadedmetadata', () => {
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;
});

/**
 * Render loop that:
 * 1. Fills the canvas with black.
 * 2. Applies a horizontal mirror (inversion) transformation.
 * 3. Draws the landmark lines for facial features (with distinct colors) and hand.
 */
function renderFrame() {
  // Fill the canvas with black.
  canvasCtx.fillStyle = 'black';
  canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

  // Save and invert the canvas horizontally.
  canvasCtx.save();
  canvasCtx.translate(canvasElement.width, 0);
  canvasCtx.scale(-1, 1);

  // Draw simplified facial features if available.
  if (latestFaceLandmarks) {
    for (const landmarks of latestFaceLandmarks) {
      // Draw face contour in DodgerBlue.
      drawConnectors(canvasCtx, landmarks, FACEMESH_FACE_OVAL, { color: '#1E90FF', lineWidth: 2 });
      // Draw lips in OrangeRed.
      drawConnectors(canvasCtx, landmarks, FACEMESH_LIPS, { color: '#FF4500', lineWidth: 2 });
      // Draw eyes (both left and right) in LimeGreen.
      drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYE, { color: '#32CD32', lineWidth: 2 });
      drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYE, { color: '#32CD32', lineWidth: 2 });
      // Draw eyebrows in Gold.
      drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYEBROW, { color: '#FFD700', lineWidth: 2 });
      drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYEBROW, { color: '#FFD700', lineWidth: 2 });
      // Draw iris connectors in HotPink.
      drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_IRIS, { color: '#FF69B4', lineWidth: 2 });
      drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_IRIS, { color: '#FF69B4', lineWidth: 2 });
    }
  }

  // Draw simplified hand features if available.
  if (latestHandsLandmarks) {
    for (const landmarks of latestHandsLandmarks) {
      // Draw palm outline in BlueViolet.
      drawConnectors(canvasCtx, landmarks, SIMPLE_HAND_CONNECTIONS, { color: '#8A2BE2', lineWidth: 2 });
      // Draw finger joints connections in Orange.
      drawConnectors(canvasCtx, landmarks, FINGER_CONNECTIONS, { color: '#FFA500', lineWidth: 2 });
    }
  }
  canvasCtx.restore(); // Restore to default state.
  requestAnimationFrame(renderFrame);
}

// Initialize MediaPipe Camera from the camera_utils library.
const camera = new Camera(videoElement, {
  onFrame: async () => {
    // Process the current video frame for both face and hand landmarks.
    await faceMesh.send({ image: videoElement });
    await hands.send({ image: videoElement });
  },
  width: 640,  // Dimensions for the square feed.
  height: 640
});
camera.start();

// Start the render loop.
requestAnimationFrame(renderFrame);
