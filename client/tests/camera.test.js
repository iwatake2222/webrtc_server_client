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

import {describe, it, expect, vi, beforeEach} from 'vitest';
import {CameraManager} from '../src/camera.js';

describe('CameraManager', () => {
  let cameraManager;
  let mockVideoElement;
  let mockStream;
  let mockTrack;

  beforeEach(() => {
    cameraManager = new CameraManager();

    mockTrack = {
      stop: vi.fn(),
      getSettings: vi.fn(() => ({
        width: 1280,
        height: 720,
        frameRate: 30,
      })),
    };

    mockStream = {
      getTracks: vi.fn(() => [mockTrack]),
      getVideoTracks: vi.fn(() => [mockTrack]),
    };

    mockVideoElement = {
      srcObject: null,
      pause: vi.fn(),
      play: vi.fn(),
      addEventListener: vi.fn(),
    };

    global.navigator = {
      mediaDevices: {
        getUserMedia: vi.fn(() => Promise.resolve(mockStream)),
      },
    };
  });

  describe('constructor', () => {
    it('should initialize with null stream and video element', () => {
      expect(cameraManager.stream).toBeNull();
      expect(cameraManager.videoElement).toBeNull();
      expect(cameraManager.isPlaying).toBe(true);
    });

    it('should initialize frame counting properties', () => {
      expect(cameraManager.frameCount).toBe(0);
      expect(cameraManager.lastFpsCalcTime).toBe(0);
      expect(cameraManager.currentFps).toBe(0);
      expect(cameraManager.frameCallbackId).toBeNull();
    });
  });

  describe('start', () => {
    it('should start camera and attach stream to video element', async () => {
      const result = await cameraManager.start(mockVideoElement);

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: true,
        audio: false,
      });
      expect(mockVideoElement.srcObject).toBe(mockStream);
      expect(result).toBe(mockStream);
      expect(cameraManager.isPlaying).toBe(true);
    });

    it('should use custom constraints when provided', async () => {
      const constraints = {video: {width: 1920}, audio: true};
      await cameraManager.start(mockVideoElement, constraints);

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
        constraints,
      );
    });
  });

  describe('stop', () => {
    it('should stop all tracks and clear video element', async () => {
      await cameraManager.start(mockVideoElement);
      cameraManager.stop();

      expect(mockTrack.stop).toHaveBeenCalled();
      expect(mockVideoElement.srcObject).toBeNull();
      expect(cameraManager.stream).toBeNull();
      expect(cameraManager.isPlaying).toBe(false);
    });

    it('should handle stop when not started', () => {
      expect(() => cameraManager.stop()).not.toThrow();
    });
  });

  describe('pause', () => {
    it('should pause video element when playing', async () => {
      await cameraManager.start(mockVideoElement);
      cameraManager.pause();

      expect(mockVideoElement.pause).toHaveBeenCalled();
      expect(cameraManager.isPlaying).toBe(false);
    });

    it('should not pause when already paused', async () => {
      await cameraManager.start(mockVideoElement);
      cameraManager.pause();
      mockVideoElement.pause.mockClear();
      cameraManager.pause();

      expect(mockVideoElement.pause).not.toHaveBeenCalled();
    });
  });

  describe('resume', () => {
    it('should resume video element when paused', async () => {
      await cameraManager.start(mockVideoElement);
      cameraManager.pause();
      cameraManager.resume();

      expect(mockVideoElement.play).toHaveBeenCalled();
      expect(cameraManager.isPlaying).toBe(true);
    });

    it('should not resume when already playing', async () => {
      await cameraManager.start(mockVideoElement);
      cameraManager.resume();

      expect(mockVideoElement.play).not.toHaveBeenCalled();
    });
  });

  describe('getStream', () => {
    it('should return null when not started', () => {
      expect(cameraManager.getStream()).toBeNull();
    });

    it('should return stream when started', async () => {
      await cameraManager.start(mockVideoElement);
      expect(cameraManager.getStream()).toBe(mockStream);
    });
  });

  describe('getVideoSettings', () => {
    it('should return null when no stream', () => {
      expect(cameraManager.getVideoSettings()).toBeNull();
    });

    it('should return video settings when stream exists', async () => {
      await cameraManager.start(mockVideoElement);
      const settings = cameraManager.getVideoSettings();

      expect(settings).toEqual({
        width: 1280,
        height: 720,
        frameRate: 30,
      });
    });

    it('should return null when no video tracks', async () => {
      mockStream.getVideoTracks = vi.fn(() => []);
      await cameraManager.start(mockVideoElement);

      expect(cameraManager.getVideoSettings()).toBeNull();
    });
  });

  describe('getCurrentFps', () => {
    it('should return 0 initially', () => {
      expect(cameraManager.getCurrentFps()).toBe(0);
    });

    it('should return current fps value', () => {
      cameraManager.currentFps = 29.97;
      expect(cameraManager.getCurrentFps()).toBe(29.97);
    });
  });

  describe('frame counting', () => {
    it('should reset fps on stop', async () => {
      await cameraManager.start(mockVideoElement);
      cameraManager.currentFps = 30;
      cameraManager.stop();

      expect(cameraManager.currentFps).toBe(0);
    });
  });
});
