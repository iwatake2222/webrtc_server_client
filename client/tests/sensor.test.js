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
import {SensorManager} from '../src/sensor.js';

describe('SensorManager', () => {
  let sensorManager;
  let mockGeolocation;
  let originalNavigator;
  let originalWindow;

  beforeEach(() => {
    sensorManager = new SensorManager();

    originalNavigator = global.navigator;
    originalWindow = global.window;

    mockGeolocation = {
      watchPosition: vi.fn((success, error, options) => {
        return 1;
      }),
      clearWatch: vi.fn(),
    };

    global.navigator = {
      geolocation: mockGeolocation,
    };

    global.window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      DeviceMotionEvent: class {},
      DeviceOrientationEvent: class {},
    };
  });

  afterEach(() => {
    sensorManager.stop();
    global.navigator = originalNavigator;
    global.window = originalWindow;
  });

  describe('constructor', () => {
    it('should initialize with null geolocation data', () => {
      expect(sensorManager.geolocation.latitude).toBeNull();
      expect(sensorManager.geolocation.longitude).toBeNull();
      expect(sensorManager.geolocation.altitude).toBeNull();
      expect(sensorManager.geolocation.accuracy).toBeNull();
      expect(sensorManager.geolocation.heading).toBeNull();
      expect(sensorManager.geolocation.speed).toBeNull();
    });

    it('should initialize with null accelerometer data', () => {
      expect(sensorManager.accelerometer.x).toBeNull();
      expect(sensorManager.accelerometer.y).toBeNull();
      expect(sensorManager.accelerometer.z).toBeNull();
    });

    it('should initialize with null gyroscope data', () => {
      expect(sensorManager.gyroscope.alpha).toBeNull();
      expect(sensorManager.gyroscope.beta).toBeNull();
      expect(sensorManager.gyroscope.gamma).toBeNull();
    });

    it('should initialize with null watch ID', () => {
      expect(sensorManager.geolocationWatchId).toBeNull();
    });
  });

  describe('static methods', () => {
    it('isGeolocationSupported should return true when available', () => {
      expect(SensorManager.isGeolocationSupported()).toBe(true);
    });

    it('isDeviceMotionSupported should return true when available', () => {
      expect(SensorManager.isDeviceMotionSupported()).toBe(true);
    });

    it('isDeviceOrientationSupported should return true when available', () => {
      expect(SensorManager.isDeviceOrientationSupported()).toBe(true);
    });

    it('isGeolocationSupported should return false when not available', () => {
      delete global.navigator.geolocation;
      expect(SensorManager.isGeolocationSupported()).toBe(false);
    });
  });

  describe('startGeolocation', () => {
    it('should start geolocation tracking', () => {
      const result = sensorManager.startGeolocation();

      expect(result).toBe(true);
      expect(mockGeolocation.watchPosition).toHaveBeenCalled();
      expect(sensorManager.geolocationWatchId).toBe(1);
    });

    it('should return true if already started', () => {
      sensorManager.startGeolocation();
      const result = sensorManager.startGeolocation();

      expect(result).toBe(true);
      expect(mockGeolocation.watchPosition).toHaveBeenCalledTimes(1);
    });

    it('should return false if geolocation not supported', () => {
      delete global.navigator.geolocation;
      const result = sensorManager.startGeolocation();

      expect(result).toBe(false);
    });
  });

  describe('stopGeolocation', () => {
    it('should stop geolocation tracking', () => {
      sensorManager.startGeolocation();
      sensorManager.stopGeolocation();

      expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(1);
      expect(sensorManager.geolocationWatchId).toBeNull();
    });

    it('should reset geolocation data', () => {
      sensorManager.geolocation.latitude = 35.6762;
      sensorManager.stopGeolocation();

      expect(sensorManager.geolocation.latitude).toBeNull();
    });
  });

  describe('handleGeolocationSuccess', () => {
    it('should update geolocation data', () => {
      const mockPosition = {
        coords: {
          latitude: 35.6762,
          longitude: 139.6503,
          altitude: 40,
          accuracy: 10,
          heading: 90,
          speed: 1.5,
        },
      };

      sensorManager.handleGeolocationSuccess(mockPosition);

      expect(sensorManager.geolocation.latitude).toBe(35.6762);
      expect(sensorManager.geolocation.longitude).toBe(139.6503);
      expect(sensorManager.geolocation.altitude).toBe(40);
      expect(sensorManager.geolocation.accuracy).toBe(10);
      expect(sensorManager.geolocation.heading).toBe(90);
      expect(sensorManager.geolocation.speed).toBe(1.5);
    });
  });

  describe('startMotion', () => {
    it('should start device motion tracking', async () => {
      const result = await sensorManager.startMotion();

      expect(result).toBe(true);
      expect(window.addEventListener).toHaveBeenCalledWith(
        'devicemotion',
        expect.any(Function),
      );
      expect(sensorManager.isMotionActive).toBe(true);
    });

    it('should return true if already active', async () => {
      await sensorManager.startMotion();
      const result = await sensorManager.startMotion();

      expect(result).toBe(true);
      expect(window.addEventListener).toHaveBeenCalledTimes(1);
    });

    it('should return false if not supported', async () => {
      delete global.window.DeviceMotionEvent;
      const result = await sensorManager.startMotion();

      expect(result).toBe(false);
    });
  });

  describe('stopMotion', () => {
    it('should stop device motion tracking', async () => {
      await sensorManager.startMotion();
      sensorManager.stopMotion();

      expect(window.removeEventListener).toHaveBeenCalledWith(
        'devicemotion',
        expect.any(Function),
      );
      expect(sensorManager.isMotionActive).toBe(false);
    });

    it('should reset accelerometer data', async () => {
      sensorManager.accelerometer.x = 9.8;
      sensorManager.stopMotion();

      expect(sensorManager.accelerometer.x).toBeNull();
    });
  });

  describe('handleMotion', () => {
    it('should update accelerometer data', () => {
      const mockEvent = {
        accelerationIncludingGravity: {
          x: 0.5,
          y: -0.3,
          z: 9.8,
        },
      };

      sensorManager.handleMotion(mockEvent);

      expect(sensorManager.accelerometer.x).toBe(0.5);
      expect(sensorManager.accelerometer.y).toBe(-0.3);
      expect(sensorManager.accelerometer.z).toBe(9.8);
    });

    it('should handle null acceleration', () => {
      const mockEvent = {
        accelerationIncludingGravity: null,
      };

      sensorManager.handleMotion(mockEvent);

      expect(sensorManager.accelerometer.x).toBeNull();
    });
  });

  describe('startOrientation', () => {
    it('should start device orientation tracking', async () => {
      const result = await sensorManager.startOrientation();

      expect(result).toBe(true);
      expect(window.addEventListener).toHaveBeenCalledWith(
        'deviceorientation',
        expect.any(Function),
      );
      expect(sensorManager.isOrientationActive).toBe(true);
    });

    it('should return true if already active', async () => {
      await sensorManager.startOrientation();
      const result = await sensorManager.startOrientation();

      expect(result).toBe(true);
      expect(window.addEventListener).toHaveBeenCalledTimes(1);
    });

    it('should return false if not supported', async () => {
      delete global.window.DeviceOrientationEvent;
      const result = await sensorManager.startOrientation();

      expect(result).toBe(false);
    });
  });

  describe('stopOrientation', () => {
    it('should stop device orientation tracking', async () => {
      await sensorManager.startOrientation();
      sensorManager.stopOrientation();

      expect(window.removeEventListener).toHaveBeenCalledWith(
        'deviceorientation',
        expect.any(Function),
      );
      expect(sensorManager.isOrientationActive).toBe(false);
    });

    it('should reset gyroscope data', async () => {
      sensorManager.gyroscope.alpha = 180;
      sensorManager.stopOrientation();

      expect(sensorManager.gyroscope.alpha).toBeNull();
    });
  });

  describe('handleOrientation', () => {
    it('should update gyroscope data', () => {
      const mockEvent = {
        alpha: 180,
        beta: 45,
        gamma: -30,
      };

      sensorManager.handleOrientation(mockEvent);

      expect(sensorManager.gyroscope.alpha).toBe(180);
      expect(sensorManager.gyroscope.beta).toBe(45);
      expect(sensorManager.gyroscope.gamma).toBe(-30);
    });
  });

  describe('getData', () => {
    it('should return all sensor data', () => {
      sensorManager.geolocation.latitude = 35.6762;
      sensorManager.accelerometer.x = 0.5;
      sensorManager.gyroscope.alpha = 180;

      const data = sensorManager.getData();

      expect(data.geolocation.latitude).toBe(35.6762);
      expect(data.accelerometer.x).toBe(0.5);
      expect(data.gyroscope.alpha).toBe(180);
    });

    it('should return copies of data objects', () => {
      const data = sensorManager.getData();

      data.geolocation.latitude = 100;
      expect(sensorManager.geolocation.latitude).toBeNull();
    });
  });

  describe('hasData', () => {
    it('should return false when no data', () => {
      expect(sensorManager.hasData()).toBe(false);
    });

    it('should return true when geolocation has data', () => {
      sensorManager.geolocation.latitude = 35.6762;
      expect(sensorManager.hasData()).toBe(true);
    });

    it('should return true when accelerometer has data', () => {
      sensorManager.accelerometer.x = 0.5;
      expect(sensorManager.hasData()).toBe(true);
    });

    it('should return true when gyroscope has data', () => {
      sensorManager.gyroscope.alpha = 180;
      expect(sensorManager.hasData()).toBe(true);
    });
  });

  describe('start', () => {
    it('should start all sensors', async () => {
      const results = await sensorManager.start();

      expect(results.geolocation).toBe(true);
      expect(results.motion).toBe(true);
      expect(results.orientation).toBe(true);
    });
  });

  describe('stop', () => {
    it('should stop all sensors', async () => {
      await sensorManager.start();
      sensorManager.stop();

      expect(sensorManager.geolocationWatchId).toBeNull();
      expect(sensorManager.isMotionActive).toBe(false);
      expect(sensorManager.isOrientationActive).toBe(false);
    });
  });

  describe('requestMotionPermission', () => {
    it('should return true when no permission required', async () => {
      const result = await SensorManager.requestMotionPermission();
      expect(result).toBe(true);
    });
  });

  describe('requestOrientationPermission', () => {
    it('should return true when no permission required', async () => {
      const result = await SensorManager.requestOrientationPermission();
      expect(result).toBe(true);
    });
  });
});
