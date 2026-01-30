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
 * Duration in milliseconds for calculating rolling average.
 * @const {number}
 */
const AVERAGE_WINDOW_MS = 10000;

/**
 * Statistics manager class for displaying video/connection stats.
 */
export class StatsManager {
  /**
   * Creates a new StatsManager instance.
   * @param {Object} elements - DOM elements for displaying stats.
   * @param {HTMLElement} elements.cameraFps - Element for camera FPS display.
   * @param {HTMLElement} elements.fps - Element for server FPS display.
   * @param {HTMLElement} elements.resolution - Element for resolution display.
   * @param {HTMLElement} elements.processingTime - Element for processing time.
   * @param {HTMLElement} elements.latency - Element for latency display.
   */
  constructor(elements) {
    this.elements = elements;
    /** @type {number|null} */
    this.intervalId = null;
    /** @type {Array<{timestamp: number, value: number}>} */
    this.cameraFpsHistory = [];
    /** @type {Array<{timestamp: number, value: number}>} */
    this.fpsHistory = [];
    /** @type {Array<{timestamp: number, value: number}>} */
    this.processingTimeHistory = [];
    /** @type {Array<{timestamp: number, value: number}>} */
    this.latencyHistory = [];
  }

  /**
   * Adds a value to history and removes entries older than the window.
   * @param {Array<{timestamp: number, value: number}>} history - History array.
   * @param {number} value - Value to add.
   * @private
   */
  addToHistory(history, value) {
    const now = Date.now();
    history.push({timestamp: now, value});
    const cutoff = now - AVERAGE_WINDOW_MS;
    while (history.length > 0 && history[0].timestamp < cutoff) {
      history.shift();
    }
  }

  /**
   * Calculates the average of values in history.
   * @param {Array<{timestamp: number, value: number}>} history - History array.
   * @return {number|null} Average value or null if no data.
   * @private
   */
  calculateAverage(history) {
    if (history.length === 0) {
      return null;
    }
    const sum = history.reduce((acc, entry) => acc + entry.value, 0);
    return sum / history.length;
  }

  /**
   * Pads a number string to a fixed width.
   * @param {string} str - Number string to pad.
   * @param {number} width - Total width including decimal point.
   * @return {string} Padded string.
   * @private
   */
  padNumber(str, width) {
    return str.padStart(width, '\u00A0');
  }

  /**
   * Formats a value with its average for display.
   * @param {number} current - Current value.
   * @param {number|null} average - Average value or null.
   * @param {number} decimals - Number of decimal places.
   * @param {number} width - Total width for each number.
   * @return {string} Formatted string like "30.2 / 30.1".
   * @private
   */
  formatWithAverage(current, average, decimals, width) {
    const currentStr = this.padNumber(current.toFixed(decimals), width);
    if (average === null) {
      return `${currentStr} / ${'--'.padStart(width, '\u00A0')}`;
    }
    const avgStr = this.padNumber(average.toFixed(decimals), width);
    return `${currentStr} / ${avgStr}`;
  }

  /**
   * Updates the statistics display.
   * @param {Object} stats - Statistics data.
   * @param {number} [stats.cameraFps] - Camera frame rate.
   * @param {number} [stats.fps] - Server frame rate.
   * @param {number} [stats.width] - Video width.
   * @param {number} [stats.height] - Video height.
   * @param {number} [stats.processingTime] - Server processing time in ms.
   * @param {number} [stats.latency] - Round trip latency in ms.
   */
  update(stats) {
    if (stats.cameraFps !== undefined && this.elements.cameraFps) {
      this.addToHistory(this.cameraFpsHistory, stats.cameraFps);
      const avg = this.calculateAverage(this.cameraFpsHistory);
      this.elements.cameraFps.textContent =
        this.formatWithAverage(stats.cameraFps, avg, 1, 5);
    }
    if (stats.fps !== undefined && this.elements.fps) {
      this.addToHistory(this.fpsHistory, stats.fps);
      const avg = this.calculateAverage(this.fpsHistory);
      this.elements.fps.textContent =
        this.formatWithAverage(stats.fps, avg, 1, 5);
    }
    if (stats.width !== undefined && stats.height !== undefined &&
        this.elements.resolution) {
      this.elements.resolution.textContent = `${stats.width}x${stats.height}`;
    }
    if (stats.processingTime !== undefined && this.elements.processingTime) {
      this.addToHistory(this.processingTimeHistory, stats.processingTime);
      const avg = this.calculateAverage(this.processingTimeHistory);
      this.elements.processingTime.textContent =
        this.formatWithAverage(stats.processingTime, avg, 1, 6);
    }
    if (stats.latency !== undefined && this.elements.latency) {
      this.addToHistory(this.latencyHistory, stats.latency);
      const avg = this.calculateAverage(this.latencyHistory);
      this.elements.latency.textContent =
        this.formatWithAverage(stats.latency, avg, 0, 5);
    }
  }

  /**
   * Resets all statistics to default values.
   */
  reset() {
    const pad = (width) => '--'.padStart(width, '\u00A0');
    if (this.elements.cameraFps) {
      this.elements.cameraFps.textContent = `${pad(5)} / ${pad(5)}`;
    }
    if (this.elements.fps) {
      this.elements.fps.textContent = `${pad(5)} / ${pad(5)}`;
    }
    if (this.elements.resolution) {
      this.elements.resolution.textContent = '--';
    }
    if (this.elements.processingTime) {
      this.elements.processingTime.textContent = `${pad(6)} / ${pad(6)}`;
    }
    if (this.elements.latency) {
      this.elements.latency.textContent = `${pad(5)} / ${pad(5)}`;
    }
    this.cameraFpsHistory = [];
    this.fpsHistory = [];
    this.processingTimeHistory = [];
    this.latencyHistory = [];
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
   * Starts periodic WebRTC stats collection.
   * @param {Object} webrtcClient - WebRTC client instance.
   * @param {number} [intervalMs=1000] - Update interval in milliseconds.
   */
  startWebRTCStatsCollection(webrtcClient, intervalMs = 1000) {
    this.stopCollection();
    this.intervalId = setInterval(async () => {
      const stats = await webrtcClient.getOutboundVideoStats();
      if (stats) {
        this.update({
          cameraFps: stats.framesPerSecond,
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
