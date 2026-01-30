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
  const connectBtn = /** @type {HTMLButtonElement} */ (
    document.getElementById('connectBtn')
  );
  const disconnectBtn = /** @type {HTMLButtonElement} */ (
    document.getElementById('disconnectBtn')
  );
  const serverResponse = document.getElementById('serverResponse');

  serverUrlInput.value = getDefaultServerUrl();

  statsManager = new StatsManager({
    cameraFps: document.getElementById('statsCameraFps'),
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

  connectBtn.addEventListener('click', async () => {
    try {
      const constraints = buildConstraints(resolutionSelect.value);
      await cameraManager.start(localVideo, constraints);

      const stream = cameraManager.getStream();
      if (!stream) {
        throw new Error('Failed to get camera stream');
      }

      const serverUrl = serverUrlInput.value || getDefaultServerUrl();
      await webrtcClient.connect(serverUrl, stream);

      statsManager.startWebRTCStatsCollection(webrtcClient);

      connectBtn.disabled = true;
      disconnectBtn.disabled = false;
      resolutionSelect.disabled = true;
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
 * Builds media constraints from resolution string.
 * @param {string} resolution - Resolution string (e.g., "1280x720").
 * @return {MediaStreamConstraints} The media constraints object.
 */
function buildConstraints(resolution) {
  const [width, height] = resolution.split('x').map(Number);
  return {
    video: {
      width: {ideal: width},
      height: {ideal: height},
    },
    audio: false,
  };
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
