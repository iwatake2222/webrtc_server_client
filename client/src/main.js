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

/** @type {CameraManager} */
const cameraManager = new CameraManager();

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

  statsManager = new StatsManager({
    fps: document.getElementById('statsFps'),
    resolution: document.getElementById('statsResolution'),
    rtt: document.getElementById('statsRtt'),
    bitrate: document.getElementById('statsBitrate'),
  });

  setupCollapseHandlers(localVideo, remoteVideo);

  connectBtn.addEventListener('click', async () => {
    try {
      const constraints = buildConstraints(resolutionSelect.value);
      await cameraManager.start(localVideo, constraints);
      statsManager.startLocalStatsCollection(cameraManager);
      connectBtn.disabled = true;
      disconnectBtn.disabled = false;
      resolutionSelect.disabled = true;
      console.log('Camera started, URL:', serverUrlInput.value);
    } catch (error) {
      console.error('Failed to start camera:', error);
      if (serverResponse) {
        serverResponse.textContent = `Error: ${error.message}`;
      }
    }
  });

  disconnectBtn.addEventListener('click', () => {
    cameraManager.stop();
    statsManager.stopCollection();
    statsManager.reset();
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
    resolutionSelect.disabled = false;
    console.log('Camera stopped');
  });
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
