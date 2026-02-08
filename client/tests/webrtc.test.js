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
import {WebRTCClient} from '../src/webrtc.js';

describe('WebRTCClient', () => {
  let webrtcClient;
  let mockPeerConnection;
  let mockWebSocket;
  let mockDataChannel;
  let mockStream;
  let mockTrack;
  let mockSender;

  beforeEach(() => {
    global.WebSocket = vi.fn();
    global.WebSocket.OPEN = 1;
    global.WebSocket.CLOSED = 3;

    webrtcClient = new WebRTCClient();

    mockDataChannel = {
      close: vi.fn(),
      send: vi.fn(),
      onmessage: null,
      onopen: null,
      onclose: null,
    };

    mockTrack = {
      kind: 'video',
    };

    mockSender = {
      track: mockTrack,
      getParameters: vi.fn(() => ({encodings: [{}]})),
      setParameters: vi.fn(() => Promise.resolve()),
    };

    const mockTransceiver = {
      sender: mockSender,
      setCodecPreferences: vi.fn(),
    };

    mockPeerConnection = {
      createOffer: vi.fn(() => Promise.resolve({
        type: 'offer',
        sdp: 'mock-sdp',
      })),
      createAnswer: vi.fn(() => Promise.resolve({
        type: 'answer',
        sdp: 'mock-answer-sdp',
      })),
      setLocalDescription: vi.fn(() => Promise.resolve()),
      setRemoteDescription: vi.fn(() => Promise.resolve()),
      addTrack: vi.fn(() => mockSender),
      createDataChannel: vi.fn(() => mockDataChannel),
      close: vi.fn(),
      connectionState: 'new',
      iceGatheringState: 'complete',
      localDescription: {type: 'offer', sdp: 'mock-sdp'},
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getTransceivers: vi.fn(() => [mockTransceiver]),
      ontrack: null,
      onicecandidate: null,
      onconnectionstatechange: null,
    };

    mockWebSocket = {
      send: vi.fn(),
      close: vi.fn(),
      onopen: null,
      onmessage: null,
      onerror: null,
      readyState: WebSocket.OPEN,
    };

    mockStream = {
      getTracks: vi.fn(() => [mockTrack]),
    };

    global.RTCPeerConnection = vi.fn(() => mockPeerConnection);
    global.WebSocket = vi.fn(() => mockWebSocket);
    global.RTCSessionDescription = vi.fn((desc) => desc);
    global.RTCRtpSender = {
      getCapabilities: vi.fn(() => ({
        codecs: [
          {mimeType: 'video/VP8'},
          {mimeType: 'video/H264'},
          {mimeType: 'video/VP9'},
        ],
      })),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with null values', () => {
      expect(webrtcClient.peerConnection).toBeNull();
      expect(webrtcClient.websocket).toBeNull();
      expect(webrtcClient.dataChannel).toBeNull();
      expect(webrtcClient.timestampIntervalId).toBeNull();
    });

    it('should initialize with null callbacks', () => {
      expect(webrtcClient.onStats).toBeNull();
      expect(webrtcClient.onRemoteStream).toBeNull();
      expect(webrtcClient.onConnectionStateChange).toBeNull();
      expect(webrtcClient.onError).toBeNull();
      expect(webrtcClient.getClientFrameId).toBeNull();
    });

    it('should initialize with null outbound stats tracking', () => {
      expect(webrtcClient.lastFramesSent).toBeNull();
      expect(webrtcClient.lastStatsTimestamp).toBeNull();
    });
  });

  describe('disconnect', () => {
    it('should close data channel if exists', () => {
      webrtcClient.dataChannel = mockDataChannel;
      webrtcClient.disconnect();
      expect(mockDataChannel.close).toHaveBeenCalled();
      expect(webrtcClient.dataChannel).toBeNull();
    });

    it('should close peer connection if exists', () => {
      webrtcClient.peerConnection = mockPeerConnection;
      webrtcClient.disconnect();
      expect(mockPeerConnection.close).toHaveBeenCalled();
      expect(webrtcClient.peerConnection).toBeNull();
    });

    it('should close websocket if exists', () => {
      webrtcClient.websocket = mockWebSocket;
      webrtcClient.disconnect();
      expect(mockWebSocket.close).toHaveBeenCalled();
      expect(webrtcClient.websocket).toBeNull();
    });

    it('should handle disconnect when nothing is connected', () => {
      expect(() => webrtcClient.disconnect()).not.toThrow();
    });

    it('should stop timestamp sending on disconnect', () => {
      vi.useFakeTimers();
      webrtcClient.timestampIntervalId = setInterval(() => {}, 100);
      webrtcClient.disconnect();
      expect(webrtcClient.timestampIntervalId).toBeNull();
      vi.useRealTimers();
    });

    it('should reset outbound stats on disconnect', () => {
      webrtcClient.lastFramesSent = 100;
      webrtcClient.lastStatsTimestamp = 1000;
      webrtcClient.disconnect();
      expect(webrtcClient.lastFramesSent).toBeNull();
      expect(webrtcClient.lastStatsTimestamp).toBeNull();
    });
  });

  describe('timestamp sending', () => {
    it('should send timestamp via data channel', () => {
      mockDataChannel.readyState = 'open';
      webrtcClient.dataChannel = mockDataChannel;
      webrtcClient.sendTimestamp();
      expect(mockDataChannel.send).toHaveBeenCalled();
      const sentData = JSON.parse(mockDataChannel.send.mock.calls[0][0]);
      expect(sentData.type).toBe('timestamp');
      expect(typeof sentData.ts).toBe('number');
    });

    it('should include client_frame_id when getClientFrameId is set', () => {
      mockDataChannel.readyState = 'open';
      webrtcClient.dataChannel = mockDataChannel;
      webrtcClient.getClientFrameId = () => 42;
      webrtcClient.sendTimestamp();
      const sentData = JSON.parse(mockDataChannel.send.mock.calls[0][0]);
      expect(sentData.type).toBe('timestamp');
      expect(sentData.client_frame_id).toBe(42);
    });

    it('should not include client_frame_id when callback is null', () => {
      mockDataChannel.readyState = 'open';
      webrtcClient.dataChannel = mockDataChannel;
      webrtcClient.getClientFrameId = null;
      webrtcClient.sendTimestamp();
      const sentData = JSON.parse(mockDataChannel.send.mock.calls[0][0]);
      expect(sentData.client_frame_id).toBeUndefined();
    });

    it('should not send timestamp when data channel is not open', () => {
      mockDataChannel.readyState = 'closed';
      webrtcClient.dataChannel = mockDataChannel;
      webrtcClient.sendTimestamp();
      expect(mockDataChannel.send).not.toHaveBeenCalled();
    });

    it('should not send timestamp when data channel is null', () => {
      webrtcClient.dataChannel = null;
      expect(() => webrtcClient.sendTimestamp()).not.toThrow();
    });
  });

  describe('getConnectionState', () => {
    it('should return null when not connected', () => {
      expect(webrtcClient.getConnectionState()).toBeNull();
    });

    it('should return connection state when connected', () => {
      webrtcClient.peerConnection = mockPeerConnection;
      mockPeerConnection.connectionState = 'connected';
      expect(webrtcClient.getConnectionState()).toBe('connected');
    });
  });

  describe('getOutboundVideoStats', () => {
    it('should return null when not connected', async () => {
      const stats = await webrtcClient.getOutboundVideoStats();
      expect(stats).toBeNull();
    });

    it('should return framesPerSecond from outbound-rtp stats', async () => {
      const mockStats = new Map([
        ['outbound-rtp-video', {
          type: 'outbound-rtp',
          kind: 'video',
          framesPerSecond: 30,
        }],
      ]);
      mockPeerConnection.getStats = vi.fn(() => Promise.resolve(mockStats));
      webrtcClient.peerConnection = mockPeerConnection;

      const stats = await webrtcClient.getOutboundVideoStats();
      expect(stats).toEqual({framesPerSecond: 30});
    });

    it('should calculate fps from framesSent when framesPerSecond unavailable',
      async () => {
        const mockStats1 = new Map([
          ['outbound-rtp-video', {
            type: 'outbound-rtp',
            kind: 'video',
            framesSent: 100,
            timestamp: 1000,
          }],
        ]);
        const mockStats2 = new Map([
          ['outbound-rtp-video', {
            type: 'outbound-rtp',
            kind: 'video',
            framesSent: 130,
            timestamp: 2000,
          }],
        ]);
        mockPeerConnection.getStats = vi.fn()
          .mockResolvedValueOnce(mockStats1)
          .mockResolvedValueOnce(mockStats2);
        webrtcClient.peerConnection = mockPeerConnection;

        const stats1 = await webrtcClient.getOutboundVideoStats();
        expect(stats1).toBeNull();

        const stats2 = await webrtcClient.getOutboundVideoStats();
        expect(stats2).toEqual({framesPerSecond: 30});
      });

    it('should return null when no framesSent data available', async () => {
      const mockStats = new Map([
        ['outbound-rtp-video', {
          type: 'outbound-rtp',
          kind: 'video',
        }],
      ]);
      mockPeerConnection.getStats = vi.fn(() => Promise.resolve(mockStats));
      webrtcClient.peerConnection = mockPeerConnection;

      const stats = await webrtcClient.getOutboundVideoStats();
      expect(stats).toBeNull();
    });

    it('should return null when no video outbound-rtp stats', async () => {
      const mockStats = new Map([
        ['outbound-rtp-audio', {
          type: 'outbound-rtp',
          kind: 'audio',
        }],
      ]);
      mockPeerConnection.getStats = vi.fn(() => Promise.resolve(mockStats));
      webrtcClient.peerConnection = mockPeerConnection;

      const stats = await webrtcClient.getOutboundVideoStats();
      expect(stats).toBeNull();
    });

    it('should handle getStats error gracefully', async () => {
      mockPeerConnection.getStats = vi.fn(() =>
        Promise.reject(new Error('Stats error')));
      webrtcClient.peerConnection = mockPeerConnection;

      const stats = await webrtcClient.getOutboundVideoStats();
      expect(stats).toBeNull();
    });
  });

  describe('callbacks', () => {
    it('should allow setting onStats callback', () => {
      const callback = vi.fn();
      webrtcClient.onStats = callback;
      expect(webrtcClient.onStats).toBe(callback);
    });

    it('should allow setting onRemoteStream callback', () => {
      const callback = vi.fn();
      webrtcClient.onRemoteStream = callback;
      expect(webrtcClient.onRemoteStream).toBe(callback);
    });

    it('should allow setting onConnectionStateChange callback', () => {
      const callback = vi.fn();
      webrtcClient.onConnectionStateChange = callback;
      expect(webrtcClient.onConnectionStateChange).toBe(callback);
    });

    it('should allow setting onError callback', () => {
      const callback = vi.fn();
      webrtcClient.onError = callback;
      expect(webrtcClient.onError).toBe(callback);
    });
  });

  describe('connect', () => {
    /**
     * Helper to simulate WebSocket connection and answer.
     * @param {Promise} connectPromise - The connect promise.
     */
    async function simulateConnection(connectPromise) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      webrtcClient.websocket.onopen();
      await new Promise((resolve) => setTimeout(resolve, 0));
      webrtcClient.websocket.onmessage({
        data: JSON.stringify({type: 'answer', sdp: 'mock-answer'}),
      });
      await connectPromise;
    }

    it('should create WebSocket with correct URL', async () => {
      const connectPromise = webrtcClient.connect(
        'ws://localhost:8080/ws',
        mockStream,
      );

      await simulateConnection(connectPromise);

      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:8080/ws');
    });

    it('should create RTCPeerConnection', async () => {
      const connectPromise = webrtcClient.connect(
        'ws://localhost:8080/ws',
        mockStream,
      );

      await simulateConnection(connectPromise);

      expect(global.RTCPeerConnection).toHaveBeenCalled();
    });

    it('should add tracks from local stream', async () => {
      const connectPromise = webrtcClient.connect(
        'ws://localhost:8080/ws',
        mockStream,
      );

      await simulateConnection(connectPromise);

      expect(mockPeerConnection.addTrack).toHaveBeenCalledWith(
        mockTrack,
        mockStream,
      );
    });

    it('should create data channel', async () => {
      const connectPromise = webrtcClient.connect(
        'ws://localhost:8080/ws',
        mockStream,
      );

      await simulateConnection(connectPromise);

      expect(mockPeerConnection.createDataChannel).toHaveBeenCalledWith(
        'stats',
      );
    });

    it('should send offer via WebSocket', async () => {
      const connectPromise = webrtcClient.connect(
        'ws://localhost:8080/ws',
        mockStream,
      );

      await simulateConnection(connectPromise);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({type: 'offer', sdp: 'mock-sdp'}),
      );
    });

    it('should set remote description from answer', async () => {
      const connectPromise = webrtcClient.connect(
        'ws://localhost:8080/ws',
        mockStream,
      );

      await simulateConnection(connectPromise);

      expect(mockPeerConnection.setRemoteDescription).toHaveBeenCalled();
    });
  });
});
