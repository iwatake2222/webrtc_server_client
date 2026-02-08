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
 * @fileoverview WebRTC client module for server communication.
 */

/**
 * WebRTC client class for handling peer connection and signaling.
 */
export class WebRTCClient {
  /**
   * Creates a new WebRTCClient instance.
   */
  constructor() {
    /** @type {RTCPeerConnection|null} */
    this.peerConnection = null;
    /** @type {WebSocket|null} */
    this.websocket = null;
    /** @type {RTCDataChannel|null} */
    this.dataChannel = null;
    /** @type {function(Object):void|null} */
    this.onStats = null;
    /** @type {function(MediaStream):void|null} */
    this.onRemoteStream = null;
    /** @type {function(string):void|null} */
    this.onConnectionStateChange = null;
    /** @type {function(Error):void|null} */
    this.onError = null;
    /** @type {function():number|null} */
    this.getClientFrameId = null;
    /** @type {function():Object|null} */
    this.getSensorData = null;
    /** @type {number|null} */
    this.timestampIntervalId = null;
    /** @type {number|null} */
    this.lastFramesSent = null;
    /** @type {number|null} */
    this.lastStatsTimestamp = null;
  }

  /**
   * Connects to the WebRTC server.
   * @param {string} serverUrl - WebSocket server URL.
   * @param {MediaStream} localStream - Local media stream to send.
   * @param {string} [preferredCodec='vp8'] - Preferred video codec.
   * @return {Promise<void>}
   */
  async connect(serverUrl, localStream, preferredCodec = 'vp8') {
    try {
      this.websocket = new WebSocket(serverUrl);
      await this.waitForWebSocketOpen();

      this.peerConnection = new RTCPeerConnection({
        iceServers: [{urls: 'stun:stun.l.google.com:19302'}],
      });

      this.setupPeerConnectionHandlers();
      this.createDataChannel();

      localStream.getTracks().forEach((track) => {
        const sender = this.peerConnection.addTrack(track, localStream);
        if (track.kind === 'video') {
          this.configureVideoSender(sender);
        }
      });

      this.setPreferredCodec(preferredCodec);

      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Wait for ICE gathering to complete before sending offer
      await this.waitForIceGathering();

      this.websocket.send(JSON.stringify({
        type: this.peerConnection.localDescription.type,
        sdp: this.peerConnection.localDescription.sdp,
      }));

      await this.waitForAnswer();
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Configures video sender to maintain resolution.
   * @param {RTCRtpSender} sender - The RTP sender for video.
   * @private
   */
  async configureVideoSender(sender) {
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [{}];
    }
    params.encodings[0].scaleResolutionDownBy = 1.0;
    // Set high max bitrate (20 Mbps) to prevent quality degradation
    params.encodings[0].maxBitrate = 20_000_000;
    // params.encodings[0].maxFramerate = 10;
    try {
      await sender.setParameters(params);
    } catch (error) {
      console.warn('Failed to set video sender parameters:', error);
    }
  }

  /**
   * Sets the preferred video codec for the connection.
   * @param {string} codecName - The codec name (vp8, h264, vp9).
   * @private
   */
  setPreferredCodec(codecName) {
    if (!this.peerConnection) return;

    const transceivers = this.peerConnection.getTransceivers();
    const videoTransceiver = transceivers.find(
      (t) => t.sender.track && t.sender.track.kind === 'video',
    );

    if (!videoTransceiver) {
      console.warn('No video transceiver found');
      return;
    }

    const codecs = RTCRtpSender.getCapabilities('video')?.codecs;
    if (!codecs) {
      console.warn('Failed to get video codec capabilities');
      return;
    }

    const codecMimeTypes = {
      'vp8': 'video/VP8',
      'h264': 'video/H264',
      'vp9': 'video/VP9',
    };

    const preferredMimeType = codecMimeTypes[codecName.toLowerCase()];
    if (!preferredMimeType) {
      console.warn(`Unknown codec: ${codecName}`);
      return;
    }

    const preferredCodecs = codecs.filter(
      (c) => c.mimeType.toLowerCase() === preferredMimeType.toLowerCase(),
    );
    const otherCodecs = codecs.filter(
      (c) => c.mimeType.toLowerCase() !== preferredMimeType.toLowerCase(),
    );

    if (preferredCodecs.length === 0) {
      console.warn(`Codec ${codecName} is not supported by this browser`);
      return;
    }

    const sortedCodecs = [...preferredCodecs, ...otherCodecs];

    try {
      videoTransceiver.setCodecPreferences(sortedCodecs);
      console.log(`Preferred codec set to: ${codecName}`);
    } catch (error) {
      console.warn('Failed to set codec preferences:', error);
    }
  }

  /**
   * Waits for ICE gathering to complete.
   * @return {Promise<void>}
   * @private
   */
  waitForIceGathering() {
    return new Promise((resolve) => {
      if (!this.peerConnection) {
        resolve();
        return;
      }
      if (this.peerConnection.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      const checkState = () => {
        if (this.peerConnection &&
            this.peerConnection.iceGatheringState === 'complete') {
          this.peerConnection.removeEventListener(
            'icegatheringstatechange', checkState);
          resolve();
        }
      };
      this.peerConnection.addEventListener(
        'icegatheringstatechange', checkState);

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.peerConnection) {
          this.peerConnection.removeEventListener(
            'icegatheringstatechange', checkState);
        }
        resolve();
      }, 5000);
    });
  }

  /**
   * Waits for WebSocket to open.
   * @return {Promise<void>}
   * @private
   */
  waitForWebSocketOpen() {
    return new Promise((resolve, reject) => {
      if (!this.websocket) {
        reject(new Error('WebSocket not initialized'));
        return;
      }
      this.websocket.onopen = () => resolve();
      this.websocket.onerror = (event) => {
        reject(new Error('WebSocket connection failed'));
      };
    });
  }

  /**
   * Waits for answer from server.
   * @return {Promise<void>}
   * @private
   */
  waitForAnswer() {
    return new Promise((resolve, reject) => {
      if (!this.websocket) {
        reject(new Error('WebSocket not initialized'));
        return;
      }
      this.websocket.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'answer') {
            await this.peerConnection.setRemoteDescription(
              new RTCSessionDescription(message),
            );
            resolve();
          }
        } catch (error) {
          reject(error);
        }
      };
    });
  }

  /**
   * Sets up peer connection event handlers.
   * @private
   */
  setupPeerConnectionHandlers() {
    if (!this.peerConnection) return;

    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0] && this.onRemoteStream) {
        this.onRemoteStream(event.streams[0]);
      }
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.websocket) {
        this.websocket.send(JSON.stringify({
          type: 'candidate',
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
        }));
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(this.peerConnection.connectionState);
      }
    };
  }

  /**
   * Creates a data channel for receiving stats.
   * @private
   */
  createDataChannel() {
    if (!this.peerConnection) return;

    this.dataChannel = this.peerConnection.createDataChannel('stats');

    this.dataChannel.onmessage = (event) => {
      try {
        const stats = JSON.parse(event.data);
        if (this.onStats) {
          this.onStats(stats);
        }
      } catch (error) {
        console.warn('Failed to parse stats:', error);
      }
    };

    this.dataChannel.onopen = () => {
      console.log('DataChannel opened');
      this.startTimestampSending();
    };

    this.dataChannel.onclose = () => {
      console.log('DataChannel closed');
      this.stopTimestampSending();
    };
  }

  /**
   * Starts sending periodic timestamps for latency measurement.
   * @private
   */
  startTimestampSending() {
    this.stopTimestampSending();
    this.timestampIntervalId = setInterval(() => {
      this.sendTimestamp();
    }, 100);
  }

  /**
   * Stops sending periodic timestamps.
   * @private
   */
  stopTimestampSending() {
    if (this.timestampIntervalId !== null) {
      clearInterval(this.timestampIntervalId);
      this.timestampIntervalId = null;
    }
  }

  /**
   * Sends a timestamp message for latency measurement.
   */
  sendTimestamp() {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      const message = {
        type: 'timestamp',
        ts: Date.now(),
      };
      if (this.getClientFrameId) {
        message.client_frame_id = this.getClientFrameId();
      }
      if (this.getSensorData) {
        const sensorData = this.getSensorData();
        if (sensorData) {
          message.sensor_data = sensorData;
        }
      }
      this.dataChannel.send(JSON.stringify(message));
    }
  }

  /**
   * Handles errors.
   * @param {Error} error - The error to handle.
   * @private
   */
  handleError(error) {
    console.error('WebRTC error:', error);
    if (this.onError) {
      this.onError(error);
    }
  }

  /**
   * Disconnects from the server.
   */
  disconnect() {
    this.stopTimestampSending();
    this.resetOutboundStats();
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  /**
   * Gets the current connection state.
   * @return {string|null} The connection state.
   */
  getConnectionState() {
    return this.peerConnection ? this.peerConnection.connectionState : null;
  }

  /**
   * Gets outbound video statistics including camera FPS.
   * @return {Promise<{framesPerSecond: number}|null>} Outbound stats or null.
   */
  async getOutboundVideoStats() {
    if (!this.peerConnection) return null;

    try {
      const stats = await this.peerConnection.getStats();
      for (const report of stats.values()) {
        if (report.type === 'outbound-rtp' && report.kind === 'video') {
          if (report.framesPerSecond !== undefined) {
            return {framesPerSecond: report.framesPerSecond};
          }
          const fps = this.calculateFpsFromFramesSent(
            report.framesSent, report.timestamp);
          if (fps !== null) {
            return {framesPerSecond: fps};
          }
          return null;
        }
      }
    } catch (error) {
      console.warn('Failed to get outbound stats:', error);
    }
    return null;
  }

  /**
   * Calculates FPS from framesSent difference.
   * @param {number} framesSent - Current frames sent count.
   * @param {number} timestamp - Current timestamp in milliseconds.
   * @return {number|null} Calculated FPS or null if not enough data.
   * @private
   */
  calculateFpsFromFramesSent(framesSent, timestamp) {
    if (framesSent === undefined || timestamp === undefined) {
      return null;
    }
    if (this.lastFramesSent === null || this.lastStatsTimestamp === null) {
      this.lastFramesSent = framesSent;
      this.lastStatsTimestamp = timestamp;
      return null;
    }
    const frameDiff = framesSent - this.lastFramesSent;
    const timeDiff = (timestamp - this.lastStatsTimestamp) / 1000;
    this.lastFramesSent = framesSent;
    this.lastStatsTimestamp = timestamp;
    if (timeDiff <= 0) {
      return null;
    }
    return frameDiff / timeDiff;
  }

  /**
   * Resets outbound stats tracking state.
   */
  resetOutboundStats() {
    this.lastFramesSent = null;
    this.lastStatsTimestamp = null;
  }
}
