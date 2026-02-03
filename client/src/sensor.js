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
 * @fileoverview Sensor data capture module for mobile devices.
 * Supports geolocation, accelerometer, and gyroscope.
 */

/**
 * @typedef {Object} GeolocationData
 * @property {number|null} latitude - Latitude in degrees
 * @property {number|null} longitude - Longitude in degrees
 * @property {number|null} altitude - Altitude in meters
 * @property {number|null} accuracy - Accuracy in meters
 * @property {number|null} heading - Heading in degrees
 * @property {number|null} speed - Speed in m/s
 */

/**
 * @typedef {Object} AccelerometerData
 * @property {number|null} x - X-axis acceleration (m/s^2)
 * @property {number|null} y - Y-axis acceleration (m/s^2)
 * @property {number|null} z - Z-axis acceleration (m/s^2)
 */

/**
 * @typedef {Object} GyroscopeData
 * @property {number|null} alpha - Rotation around Z-axis (degrees)
 * @property {number|null} beta - Rotation around X-axis (degrees)
 * @property {number|null} gamma - Rotation around Y-axis (degrees)
 */

/**
 * @typedef {Object} SensorData
 * @property {GeolocationData} geolocation - Geolocation data
 * @property {AccelerometerData} accelerometer - Accelerometer data
 * @property {GyroscopeData} gyroscope - Gyroscope/orientation data
 */

/**
 * Sensor manager class for handling device sensors.
 */
export class SensorManager {
  /**
   * Checks if geolocation is supported.
   * @return {boolean} True if geolocation is supported.
   */
  static isGeolocationSupported() {
    return 'geolocation' in navigator;
  }

  /**
   * Checks if DeviceMotionEvent is supported.
   * @return {boolean} True if device motion is supported.
   */
  static isDeviceMotionSupported() {
    return 'DeviceMotionEvent' in window;
  }

  /**
   * Checks if DeviceOrientationEvent is supported.
   * @return {boolean} True if device orientation is supported.
   */
  static isDeviceOrientationSupported() {
    return 'DeviceOrientationEvent' in window;
  }

  /**
   * Requests permission for device motion/orientation sensors (iOS 13+).
   * @return {Promise<boolean>} True if permission granted.
   */
  static async requestMotionPermission() {
    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const response = await DeviceMotionEvent.requestPermission();
        return response === 'granted';
      } catch (e) {
        console.warn('Failed to request motion permission:', e);
        return false;
      }
    }
    return true;
  }

  /**
   * Requests permission for device orientation sensors (iOS 13+).
   * @return {Promise<boolean>} True if permission granted.
   */
  static async requestOrientationPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const response = await DeviceOrientationEvent.requestPermission();
        return response === 'granted';
      } catch (e) {
        console.warn('Failed to request orientation permission:', e);
        return false;
      }
    }
    return true;
  }

  /**
   * Creates a new SensorManager instance.
   */
  constructor() {
    /** @type {GeolocationData} */
    this.geolocation = {
      latitude: null,
      longitude: null,
      altitude: null,
      accuracy: null,
      heading: null,
      speed: null,
    };

    /** @type {AccelerometerData} */
    this.accelerometer = {
      x: null,
      y: null,
      z: null,
    };

    /** @type {GyroscopeData} */
    this.gyroscope = {
      alpha: null,
      beta: null,
      gamma: null,
    };

    /** @type {number|null} */
    this.geolocationWatchId = null;
    /** @type {boolean} */
    this.isMotionActive = false;
    /** @type {boolean} */
    this.isOrientationActive = false;
    /** @type {((event: DeviceMotionEvent) => void)|null} */
    this.motionHandler = null;
    /** @type {((event: DeviceOrientationEvent) => void)|null} */
    this.orientationHandler = null;
  }

  /**
   * Starts all available sensors.
   * @return {Promise<Object>} Object with geolocation, motion, orientation.
   */
  async start() {
    const results = {
      geolocation: false,
      motion: false,
      orientation: false,
    };

    results.geolocation = this.startGeolocation();
    results.motion = await this.startMotion();
    results.orientation = await this.startOrientation();

    return results;
  }

  /**
   * Stops all sensors.
   */
  stop() {
    this.stopGeolocation();
    this.stopMotion();
    this.stopOrientation();
  }

  /**
   * Starts geolocation tracking.
   * @return {boolean} True if started successfully.
   */
  startGeolocation() {
    if (!SensorManager.isGeolocationSupported()) {
      return false;
    }

    if (this.geolocationWatchId !== null) {
      return true;
    }

    try {
      this.geolocationWatchId = navigator.geolocation.watchPosition(
        (position) => this.handleGeolocationSuccess(position),
        (error) => this.handleGeolocationError(error),
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000,
        },
      );
      return true;
    } catch (e) {
      console.warn('Failed to start geolocation:', e);
      return false;
    }
  }

  /**
   * Stops geolocation tracking.
   */
  stopGeolocation() {
    if (this.geolocationWatchId !== null) {
      navigator.geolocation.clearWatch(this.geolocationWatchId);
      this.geolocationWatchId = null;
    }
    this.geolocation = {
      latitude: null,
      longitude: null,
      altitude: null,
      accuracy: null,
      heading: null,
      speed: null,
    };
  }

  /**
   * Handles successful geolocation update.
   * @param {GeolocationPosition} position - The position object.
   * @private
   */
  handleGeolocationSuccess(position) {
    const coords = position.coords;
    this.geolocation = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      altitude: coords.altitude,
      accuracy: coords.accuracy,
      heading: coords.heading,
      speed: coords.speed,
    };
  }

  /**
   * Handles geolocation error.
   * @param {GeolocationPositionError} error - The error object.
   * @private
   */
  handleGeolocationError(error) {
    console.warn('Geolocation error:', error.message);
  }

  /**
   * Starts device motion tracking (accelerometer).
   * @return {Promise<boolean>} True if started successfully.
   */
  async startMotion() {
    if (!SensorManager.isDeviceMotionSupported()) {
      return false;
    }

    if (this.isMotionActive) {
      return true;
    }

    const hasPermission = await SensorManager.requestMotionPermission();
    if (!hasPermission) {
      return false;
    }

    this.motionHandler = (event) => this.handleMotion(event);
    window.addEventListener('devicemotion', this.motionHandler);
    this.isMotionActive = true;
    return true;
  }

  /**
   * Stops device motion tracking.
   */
  stopMotion() {
    if (this.motionHandler) {
      window.removeEventListener('devicemotion', this.motionHandler);
      this.motionHandler = null;
    }
    this.isMotionActive = false;
    this.accelerometer = {
      x: null,
      y: null,
      z: null,
    };
  }

  /**
   * Handles device motion event.
   * @param {DeviceMotionEvent} event - The motion event.
   * @private
   */
  handleMotion(event) {
    const accel = event.accelerationIncludingGravity;
    if (accel) {
      this.accelerometer = {
        x: accel.x,
        y: accel.y,
        z: accel.z,
      };
    }
  }

  /**
   * Starts device orientation tracking (gyroscope).
   * @return {Promise<boolean>} True if started successfully.
   */
  async startOrientation() {
    if (!SensorManager.isDeviceOrientationSupported()) {
      return false;
    }

    if (this.isOrientationActive) {
      return true;
    }

    const hasPermission = await SensorManager.requestOrientationPermission();
    if (!hasPermission) {
      return false;
    }

    this.orientationHandler = (event) => this.handleOrientation(event);
    window.addEventListener('deviceorientation', this.orientationHandler);
    this.isOrientationActive = true;
    return true;
  }

  /**
   * Stops device orientation tracking.
   */
  stopOrientation() {
    if (this.orientationHandler) {
      window.removeEventListener('deviceorientation', this.orientationHandler);
      this.orientationHandler = null;
    }
    this.isOrientationActive = false;
    this.gyroscope = {
      alpha: null,
      beta: null,
      gamma: null,
    };
  }

  /**
   * Handles device orientation event.
   * @param {DeviceOrientationEvent} event - The orientation event.
   * @private
   */
  handleOrientation(event) {
    this.gyroscope = {
      alpha: event.alpha,
      beta: event.beta,
      gamma: event.gamma,
    };
  }

  /**
   * Gets the current sensor data.
   * @return {SensorData} The current sensor data.
   */
  getData() {
    return {
      geolocation: {...this.geolocation},
      accelerometer: {...this.accelerometer},
      gyroscope: {...this.gyroscope},
    };
  }

  /**
   * Checks if any sensor data is available.
   * @return {boolean} True if any sensor has data.
   */
  hasData() {
    return this.geolocation.latitude !== null ||
           this.accelerometer.x !== null ||
           this.gyroscope.alpha !== null;
  }
}
