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
   * @param {HTMLElement} elements.processingTime - Element for processing time.
   * @param {HTMLElement} elements.latency - Element for latency display.
   */
  constructor(elements) {
    this.elements = elements;
    /** @type {number|null} */
    this.intervalId = null;
  }

  /**
   * Updates the statistics display.
   * @param {Object} stats - Statistics data.
   * @param {number} [stats.fps] - Frame rate.
   * @param {number} [stats.width] - Video width.
   * @param {number} [stats.height] - Video height.
   * @param {number} [stats.processingTime] - Server processing time in ms.
   * @param {number} [stats.latency] - Round trip latency in ms.
   */
  update(stats) {
    if (stats.fps !== undefined && this.elements.fps) {
      this.elements.fps.textContent = stats.fps.toFixed(1);
    }
    if (stats.width !== undefined && stats.height !== undefined &&
        this.elements.resolution) {
      this.elements.resolution.textContent = `${stats.width}x${stats.height}`;
    }
    if (stats.processingTime !== undefined && this.elements.processingTime) {
      this.elements.processingTime.textContent =
        stats.processingTime.toFixed(1);
    }
    if (stats.latency !== undefined && this.elements.latency) {
      this.elements.latency.textContent = stats.latency.toFixed(0);
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
    if (this.elements.processingTime) {
      this.elements.processingTime.textContent = '--';
    }
    if (this.elements.latency) {
      this.elements.latency.textContent = '--';
    }
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
}
