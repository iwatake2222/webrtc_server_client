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
 * @fileoverview Statistics display module.
 */

/**
 * Statistics manager class for displaying video/connection stats.
 */
export class StatsManager {
  /**
   * Creates a new StatsManager instance.
   * @param {Object} elements - DOM elements for displaying stats.
   * @param {HTMLElement} elements.fps - Element for FPS display.
   * @param {HTMLElement} elements.resolution - Element for resolution display.
   * @param {HTMLElement} elements.rtt - Element for RTT display.
   * @param {HTMLElement} elements.bitrate - Element for bitrate display.
   */
  constructor(elements) {
    this.elements = elements;
    /** @type {number|null} */
    this.intervalId = null;
    /** @type {number} */
    this.lastBytes = 0;
    /** @type {number} */
    this.lastTimestamp = 0;
  }

  /**
   * Updates the statistics display.
   * @param {Object} stats - Statistics data.
   * @param {number} [stats.fps] - Frame rate.
   * @param {number} [stats.width] - Video width.
   * @param {number} [stats.height] - Video height.
   * @param {number} [stats.rtt] - Round trip time in ms.
   * @param {number} [stats.bitrate] - Bitrate in kbps.
   */
  update(stats) {
    if (stats.fps !== undefined && this.elements.fps) {
      this.elements.fps.textContent = stats.fps.toFixed(1);
    }
    if (stats.width !== undefined && stats.height !== undefined &&
        this.elements.resolution) {
      this.elements.resolution.textContent = `${stats.width}x${stats.height}`;
    }
    if (stats.rtt !== undefined && this.elements.rtt) {
      this.elements.rtt.textContent = stats.rtt.toFixed(1);
    }
    if (stats.bitrate !== undefined && this.elements.bitrate) {
      this.elements.bitrate.textContent = stats.bitrate.toFixed(1);
    }
  }

  /**
   * Resets all statistics to default values.
   */
  reset() {
    if (this.elements.fps) {
      this.elements.fps.textContent = '--';
    }
    if (this.elements.resolution) {
      this.elements.resolution.textContent = '--';
    }
    if (this.elements.rtt) {
      this.elements.rtt.textContent = '--';
    }
    if (this.elements.bitrate) {
      this.elements.bitrate.textContent = '--';
    }
    this.lastBytes = 0;
    this.lastTimestamp = 0;
  }

  /**
   * Starts periodic stats collection from camera manager.
   * @param {Object} cameraManager - Camera manager instance.
   * @param {number} [intervalMs=1000] - Update interval in milliseconds.
   */
  startLocalStatsCollection(cameraManager, intervalMs = 1000) {
    this.stopCollection();
    this.intervalId = setInterval(() => {
      const settings = cameraManager.getVideoSettings();
      if (settings) {
        this.update({
          fps: settings.frameRate,
          width: settings.width,
          height: settings.height,
        });
      }
    }, intervalMs);
  }

  /**
   * Stops periodic stats collection.
   */
  stopCollection() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Calculates bitrate from byte counts.
   * @param {number} currentBytes - Current total bytes.
   * @param {number} currentTimestamp - Current timestamp in ms.
   * @return {number} Bitrate in kbps.
   */
  calculateBitrate(currentBytes, currentTimestamp) {
    if (this.lastTimestamp === 0) {
      this.lastBytes = currentBytes;
      this.lastTimestamp = currentTimestamp;
      return 0;
    }
    const timeDiff = (currentTimestamp - this.lastTimestamp) / 1000;
    const byteDiff = currentBytes - this.lastBytes;
    this.lastBytes = currentBytes;
    this.lastTimestamp = currentTimestamp;
    if (timeDiff <= 0) {
      return 0;
    }
    return (byteDiff * 8) / timeDiff / 1000;
  }
}
