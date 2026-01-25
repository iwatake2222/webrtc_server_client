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
  }

  /**
   * Connects to the WebRTC server.
   * @param {string} serverUrl - WebSocket server URL.
   * @param {MediaStream} localStream - Local media stream to send.
   * @return {Promise<void>}
   */
  async connect(serverUrl, localStream) {
    try {
      this.websocket = new WebSocket(serverUrl);
      await this.waitForWebSocketOpen();

      this.peerConnection = new RTCPeerConnection({
        iceServers: [{urls: 'stun:stun.l.google.com:19302'}],
      });

      this.setupPeerConnectionHandlers();
      this.createDataChannel();

      localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, localStream);
      });

      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      this.websocket.send(JSON.stringify({
        type: offer.type,
        sdp: offer.sdp,
      }));

      await this.waitForAnswer();
    } catch (error) {
      this.handleError(error);
      throw error;
    }
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
    };

    this.dataChannel.onclose = () => {
      console.log('DataChannel closed');
    };
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
}
