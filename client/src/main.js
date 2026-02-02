/**
 * @license
 * Copyright 2026 iwatake2222
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Main entry point for WebRTC client.
 */

import {CameraManager} from './camera.js';
import {StatsManager} from './stats.js';
import {WebRTCClient} from './webrtc.js';

/** @type {CameraManager} */
const cameraManager = new CameraManager();

/** @type {WebRTCClient} */
const webrtcClient = new WebRTCClient();

/** @type {StatsManager} */
let statsManager;

/**
 * Initializes the application.
 */
async function init() {
  const localVideo = /** @type {HTMLVideoElement} */ (
    document.getElementById('localVideo')
  );
  const remoteVideo = /** @type {HTMLVideoElement} */ (
    document.getElementById('remoteVideo')
  );
  const serverUrlInput = /** @type {HTMLInputElement} */ (
    document.getElementById('serverUrl')
  );
  const resolutionSelect = /** @type {HTMLSelectElement} */ (
    document.getElementById('resolution')
  );
  const cameraSelect = /** @type {HTMLSelectElement} */ (
    document.getElementById('cameraSelect')
  );
  const connectBtn = /** @type {HTMLButtonElement} */ (
    document.getElementById('connectBtn')
  );
  const disconnectBtn = /** @type {HTMLButtonElement} */ (
    document.getElementById('disconnectBtn')
  );
  const serverResponse = document.getElementById('serverResponse');

  serverUrlInput.value = getDefaultServerUrl();

  await populateCameraList(cameraSelect);

  statsManager = new StatsManager({
    cameraFps: document.getElementById('statsCameraFps'),
    cameraResolution: document.getElementById('statsCameraResolution'),
    fps: document.getElementById('statsFps'),
    resolution: document.getElementById('statsResolution'),
    processingTime: document.getElementById('statsProcessingTime'),
    latency: document.getElementById('statsLatency'),
  });

  setupCollapseHandlers(localVideo, remoteVideo);

  webrtcClient.onRemoteStream = (stream) => {
    remoteVideo.srcObject = stream;
    console.log('Remote stream received');
  };

  webrtcClient.onStats = (stats) => {
    if (serverResponse) {
      serverResponse.textContent = JSON.stringify(stats, null, 2);
    }
    const latencyMs = stats.client_ts !== undefined ?
      Date.now() - stats.client_ts : undefined;
    statsManager.update({
      fps: stats.fps,
      width: stats.width,
      height: stats.height,
      processingTime: stats.processing_time_ms,
      latency: latencyMs,
    });
  };

  webrtcClient.onConnectionStateChange = (state) => {
    console.log('Connection state:', state);
    if (state === 'disconnected' || state === 'failed' || state === 'closed') {
      handleDisconnect();
    }
  };

  webrtcClient.onError = (error) => {
    if (serverResponse) {
      serverResponse.textContent = `Error: ${error.message}`;
    }
  };

  webrtcClient.getClientFrameId = () => cameraManager.getTotalFrameCount();

  connectBtn.addEventListener('click', async () => {
    try {
      const constraints = buildConstraints(
        resolutionSelect.value,
        cameraSelect.value,
      );
      await cameraManager.start(localVideo, constraints);
      statsManager.startCameraStatsCollection(cameraManager);

      const stream = cameraManager.getStream();
      if (!stream) {
        throw new Error('Failed to get camera stream');
      }

      const serverUrl = serverUrlInput.value || getDefaultServerUrl();
      await webrtcClient.connect(serverUrl, stream);

      connectBtn.disabled = true;
      disconnectBtn.disabled = false;
      resolutionSelect.disabled = true;
      cameraSelect.disabled = true;
      serverUrlInput.disabled = true;

      if (serverResponse) {
        serverResponse.textContent = 'Connected. Waiting for data...';
      }
      console.log('Connected to server:', serverUrl);
    } catch (error) {
      console.error('Failed to connect:', error);
      if (serverResponse) {
        serverResponse.textContent = `Error: ${error.message}`;
      }
      cameraManager.stop();
    }
  });

  disconnectBtn.addEventListener('click', () => {
    handleDisconnect();
  });

  /**
   * Handles disconnect and cleanup.
   */
  function handleDisconnect() {
    webrtcClient.disconnect();
    cameraManager.stop();
    statsManager.stopCollection();
    statsManager.reset();
    remoteVideo.srcObject = null;
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
    resolutionSelect.disabled = false;
    cameraSelect.disabled = false;
    serverUrlInput.disabled = false;
    if (serverResponse) {
      serverResponse.textContent = 'Disconnected.';
    }
    console.log('Disconnected');
  }
}

/**
 * Gets the default server URL based on current location.
 * @return {string} The default WebSocket URL.
 */
function getDefaultServerUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host || 'localhost:8080';
  return `${protocol}//${host}/ws`;
}

/**
 * Builds media constraints from resolution string and optional device ID.
 * @param {string} resolution - Resolution string (e.g., "1280x720").
 * @param {string} [deviceId] - Optional camera device ID.
 * @return {MediaStreamConstraints} The media constraints object.
 */
function buildConstraints(resolution, deviceId) {
  const [width, height] = resolution.split('x').map(Number);
  /** @type {MediaTrackConstraints} */
  const videoConstraints = {
    width: {ideal: width},
    height: {ideal: height},
  };
  if (deviceId) {
    videoConstraints.deviceId = {exact: deviceId};
  }
  return {
    video: videoConstraints,
    audio: false,
  };
}

/**
 * Populates the camera selection dropdown.
 * @param {HTMLSelectElement} selectElement - The select element to populate.
 */
async function populateCameraList(selectElement) {
  try {
    const cameras = await CameraManager.getCameraDevices();
    selectElement.innerHTML = '';
    if (cameras.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No camera found';
      selectElement.appendChild(option);
      return;
    }
    cameras.forEach((camera) => {
      const option = document.createElement('option');
      option.value = camera.deviceId;
      option.textContent = camera.label;
      selectElement.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to get camera devices:', error);
    selectElement.innerHTML = '<option value="">Default</option>';
  }
}

/**
 * Sets up collapse event handlers for video containers.
 * @param {HTMLVideoElement} localVideo - Local video element.
 * @param {HTMLVideoElement} remoteVideo - Remote video element.
 */
function setupCollapseHandlers(localVideo, remoteVideo) {
  const localCollapse = document.getElementById('localVideoCollapse');
  const remoteCollapse = document.getElementById('remoteVideoCollapse');

  if (localCollapse) {
    localCollapse.addEventListener('hidden.bs.collapse', () => {
      cameraManager.pause();
    });
    localCollapse.addEventListener('shown.bs.collapse', () => {
      cameraManager.resume();
    });
  }

  if (remoteCollapse) {
    remoteCollapse.addEventListener('hidden.bs.collapse', () => {
      remoteVideo.pause();
    });
    remoteCollapse.addEventListener('shown.bs.collapse', () => {
      if (remoteVideo.srcObject) {
        remoteVideo.play();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
