// Grab references to the HTML elements
const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('output');
const canvasCtx = canvasElement.getContext('2d');

// Global variables to store the latest landmarks detected.
let latestFaceLandmarks = null;
let latestHandsLandmarks = null;

// Global flag to toggle live feed visibility.
let showLiveFeed = false;

// Get reference to the toggle button.
const toggleFeedButton = document.getElementById('toggleFeed');
toggleFeedButton.addEventListener('click', () => {
  showLiveFeed = !showLiveFeed;
  // Update the button text based on current state.
  toggleFeedButton.textContent = showLiveFeed ? 'Hide Live Feed' : 'Show Live Feed';
});

/**
 * Mobile performance optimizations:
 * 1. Lower resolution on mobile devices.
 * 2. Throttle detection frequency.
 */
const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
const cameraWidth = isMobile ? 320 : 640; // Lower resolution on mobile.
const cameraHeight = cameraWidth;
let lastDetectionTime = 0;
const detectionInterval = isMobile ? 150 : 50; // Throttle rate in ms (mobile slower).

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
 * 1. Clears the canvas.
 * 2. Draws either the inverted live video feed or a black background based on the toggle state.
 * 3. Applies a horizontal mirror transformation to draw the landmark lines in the correct orientation.
 */
function renderFrame() {
  // Clear the canvas.
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  if (showLiveFeed) {
    // Draw the live video feed with inversion.
    canvasCtx.save();
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);
    canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.restore();
  } else {
    // Fill the background with black.
    canvasCtx.fillStyle = 'black';
    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
  }

  // Draw landmark overlays with inversion.
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
  canvasCtx.restore();

  requestAnimationFrame(renderFrame);
}

// Initialize MediaPipe Camera from the camera_utils library.
const camera = new Camera(videoElement, {
  onFrame: async () => {
    // Throttle detection frequency to reduce load on mobile.
    const now = Date.now();
    if (now - lastDetectionTime >= detectionInterval) {
      lastDetectionTime = now;
      await faceMesh.send({ image: videoElement });
      await hands.send({ image: videoElement });
    }
  },
  width: cameraWidth,  // Use lower resolution on mobile.
  height: cameraHeight,
  facingMode: "user" // Use the selfie camera for mobile devices.
});
camera.start();

// Start the render loop.
requestAnimationFrame(renderFrame);
