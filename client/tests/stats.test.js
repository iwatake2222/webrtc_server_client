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

import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {StatsManager} from '../src/stats.js';

describe('StatsManager', () => {
  let statsManager;
  let mockElements;

  beforeEach(() => {
    mockElements = {
      fps: {textContent: ''},
      resolution: {textContent: ''},
      processingTime: {textContent: ''},
      latency: {textContent: ''},
    };
    statsManager = new StatsManager(mockElements);
  });

  afterEach(() => {
    statsManager.stopCollection();
  });

  describe('constructor', () => {
    it('should initialize with elements', () => {
      expect(statsManager.elements).toBe(mockElements);
      expect(statsManager.intervalId).toBeNull();
    });
  });

  describe('update', () => {
    it('should update fps display', () => {
      statsManager.update({fps: 29.97});
      expect(mockElements.fps.textContent).toBe('30.0');
    });

    it('should update resolution display', () => {
      statsManager.update({width: 1920, height: 1080});
      expect(mockElements.resolution.textContent).toBe('1920x1080');
    });

    it('should update processing time display', () => {
      statsManager.update({processingTime: 15.5});
      expect(mockElements.processingTime.textContent).toBe('15.5');
    });

    it('should update latency display', () => {
      statsManager.update({latency: 42.7});
      expect(mockElements.latency.textContent).toBe('43');
    });

    it('should handle partial updates', () => {
      statsManager.update({fps: 30});
      expect(mockElements.fps.textContent).toBe('30.0');
      expect(mockElements.resolution.textContent).toBe('');
    });

    it('should handle missing elements gracefully', () => {
      const partialManager = new StatsManager({fps: null, resolution: null});
      expect(() => partialManager.update({fps: 30})).not.toThrow();
    });
  });

  describe('reset', () => {
    it('should reset all displays to default', () => {
      statsManager.update({fps: 30, width: 1920, height: 1080,
        processingTime: 10, latency: 50});
      statsManager.reset();

      expect(mockElements.fps.textContent).toBe('--');
      expect(mockElements.resolution.textContent).toBe('--');
      expect(mockElements.processingTime.textContent).toBe('--');
      expect(mockElements.latency.textContent).toBe('--');
    });
  });

  describe('startLocalStatsCollection', () => {
    it('should start periodic stats collection', () => {
      vi.useFakeTimers();

      const mockCameraManager = {
        getVideoSettings: vi.fn(() => ({
          width: 1280,
          height: 720,
          frameRate: 30,
        })),
      };

      statsManager.startLocalStatsCollection(mockCameraManager, 100);

      expect(statsManager.intervalId).not.toBeNull();

      vi.advanceTimersByTime(100);
      expect(mockCameraManager.getVideoSettings).toHaveBeenCalled();
      expect(mockElements.fps.textContent).toBe('30.0');
      expect(mockElements.resolution.textContent).toBe('1280x720');

      vi.useRealTimers();
    });

    it('should stop previous collection before starting new one', () => {
      vi.useFakeTimers();

      const mockCameraManager = {
        getVideoSettings: vi.fn(() => ({width: 640, height: 480,
          frameRate: 15})),
      };

      statsManager.startLocalStatsCollection(mockCameraManager, 100);
      const firstIntervalId = statsManager.intervalId;

      statsManager.startLocalStatsCollection(mockCameraManager, 200);
      expect(statsManager.intervalId).not.toBe(firstIntervalId);

      vi.useRealTimers();
    });
  });

  describe('stopCollection', () => {
    it('should stop interval when running', () => {
      vi.useFakeTimers();

      const mockCameraManager = {
        getVideoSettings: vi.fn(() => ({width: 640, height: 480,
          frameRate: 15})),
      };

      statsManager.startLocalStatsCollection(mockCameraManager);
      statsManager.stopCollection();

      expect(statsManager.intervalId).toBeNull();

      vi.useRealTimers();
    });

    it('should handle stop when not running', () => {
      expect(() => statsManager.stopCollection()).not.toThrow();
    });
  });
});
