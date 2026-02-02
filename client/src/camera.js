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
 * @fileoverview Camera capture module.
 */

/**
 * Camera manager class for handling camera capture.
 */
export class CameraManager {
  /**
   * Gets a list of available camera devices.
   * @return {Promise<Array<{deviceId: string, label: string}>>}
   */
  static async getCameraDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((device) => device.kind === 'videoinput')
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${index + 1}`,
      }));
  }
  /**
   * Creates a new CameraManager instance.
   */
  constructor() {
    /** @type {MediaStream|null} */
    this.stream = null;
    /** @type {HTMLVideoElement|null} */
    this.videoElement = null;
    /** @type {boolean} */
    this.isPlaying = true;
    /** @type {number} */
    this.frameCount = 0;
    /** @type {number} */
    this.totalFrameCount = 0;
    /** @type {number} */
    this.lastFpsCalcTime = 0;
    /** @type {number} */
    this.currentFps = 0;
    /** @type {number|null} */
    this.frameCallbackId = null;
  }

  /**
   * Starts camera capture and attaches to video element.
   * @param {HTMLVideoElement} videoElement - The video element to display.
   * @param {MediaStreamConstraints} [constraints] - Optional media constraints.
   * @return {Promise<MediaStream>} The camera media stream.
   */
  async start(videoElement, constraints = {video: true, audio: false}) {
    this.videoElement = videoElement;
    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.videoElement.srcObject = this.stream;
    this.isPlaying = true;
    this.videoElement.addEventListener('playing', () => {
      this.startFrameCounting();
    }, {once: true});
    return this.stream;
  }

  /**
   * Stops camera capture and releases resources.
   */
  stop() {
    this.stopFrameCounting();
    this.totalFrameCount = 0;
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    this.isPlaying = false;
  }

  /**
   * Pauses video playback (used when collapsed).
   */
  pause() {
    if (this.videoElement && this.isPlaying) {
      this.videoElement.pause();
      this.isPlaying = false;
    }
  }

  /**
   * Resumes video playback (used when expanded).
   */
  resume() {
    if (this.videoElement && !this.isPlaying) {
      this.videoElement.play();
      this.isPlaying = true;
    }
  }

  /**
   * Gets the current media stream.
   * @return {MediaStream|null} The current media stream.
   */
  getStream() {
    return this.stream;
  }

  /**
   * Gets video track settings.
   * @return {{width: number, height: number, frameRate: number}|null}
   */
  getVideoSettings() {
    if (!this.stream) {
      return null;
    }
    const videoTrack = this.stream.getVideoTracks()[0];
    if (!videoTrack) {
      return null;
    }
    const settings = videoTrack.getSettings();
    return {
      width: settings.width || 0,
      height: settings.height || 0,
      frameRate: settings.frameRate || 0,
    };
  }

  /**
   * Starts counting frames using requestVideoFrameCallback.
   * @private
   */
  startFrameCounting() {
    this.frameCount = 0;
    this.totalFrameCount = 0;
    this.lastFpsCalcTime = performance.now();
    this.currentFps = 0;
    this.countFrame();
  }

  /**
   * Stops counting frames.
   * @private
   */
  stopFrameCounting() {
    this.frameCallbackId = null;
    this.currentFps = 0;
  }

  /**
   * Callback for counting video frames.
   * @private
   */
  countFrame() {
    if (!this.videoElement || !this.isPlaying) {
      return;
    }
    this.frameCount++;
    this.totalFrameCount++;
    const now = performance.now();
    const elapsed = now - this.lastFpsCalcTime;
    if (elapsed >= 1000) {
      this.currentFps = (this.frameCount * 1000) / elapsed;
      this.frameCount = 0;
      this.lastFpsCalcTime = now;
    }
    if ('requestVideoFrameCallback' in this.videoElement) {
      this.frameCallbackId = this.videoElement.requestVideoFrameCallback(
        () => this.countFrame());
    }
  }

  /**
   * Gets the current measured FPS.
   * Falls back to device-reported frame rate if measurement not available.
   * @return {number} The current FPS.
   */
  getCurrentFps() {
    if (this.currentFps > 0) {
      return this.currentFps;
    }
    const settings = this.getVideoSettings();
    return settings ? settings.frameRate : 0;
  }

  /**
   * Gets the total frame count since camera started.
   * @return {number} The total frame count.
   */
  getTotalFrameCount() {
    return this.totalFrameCount;
  }
}
