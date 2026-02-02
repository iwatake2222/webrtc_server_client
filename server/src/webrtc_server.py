# Copyright 2026 iwatake2222
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""WebRTC server module for video processing."""

import asyncio
import json
import logging
import ssl
from pathlib import Path
from typing import Any, Optional, cast

from aiohttp import web
from aiortc import (
    MediaStreamTrack,
    RTCDataChannel,
    RTCPeerConnection,
    RTCSessionDescription,
)
from aiortc.contrib.media import MediaRelay
from av import VideoFrame

from src.image_processor import ImageProcessor

DEFAULT_CLIENT_DIR = Path(__file__).parent.parent.parent / "client"

logger = logging.getLogger(__name__)


class VideoTransformTrack(MediaStreamTrack):
  """A video track that applies edge detection to incoming frames."""

  kind = "video"

  def __init__(
      self,
      track: MediaStreamTrack,
      processor: ImageProcessor,
      data_channel: Optional[RTCDataChannel] = None
  ) -> None:
    """Initialize the video transform track.

    Args:
      track: The source video track to transform.
      processor: The image processor for edge detection.
      data_channel: Optional data channel for sending stats.
    """
    super().__init__()
    self._track = track
    self._processor = processor
    self._data_channel = data_channel
    self._frame_state: dict[str, Any] = {
        "latest": None,
        "lock": asyncio.Lock(),
        "ready": asyncio.Event(),
    }
    self._client_data: dict[str, int | None] = {
        "current_ts": None,
        "current_frame_id": None,
        "latest_ts": None,
        "latest_frame_id": None,
    }
    self._receiver: dict[str, Any] = {
        "task": None,
        "running": True,
    }

  def set_data_channel(self, data_channel: RTCDataChannel) -> None:
    """Set the data channel for sending stats.

    Args:
      data_channel: The WebRTC data channel.
    """
    self._data_channel = data_channel
    self._setup_data_channel_handlers()

  def _setup_data_channel_handlers(self) -> None:
    """Set up message handlers for the data channel."""
    if self._data_channel is None:
      return

    @self._data_channel.on("message")
    def on_message(message: str) -> None:
      try:
        data = json.loads(message)
        if data.get("type") == "timestamp":
          self._client_data["current_ts"] = data.get("ts")
          self._client_data["current_frame_id"] = data.get("client_frame_id")
      except (json.JSONDecodeError, TypeError) as e:
        logger.debug("Failed to parse data channel message: %s", e)

  async def _start_receiver(self) -> None:
    """Start the background frame receiver task."""
    if self._receiver["task"] is None:
      self._receiver["task"] = asyncio.create_task(self._receive_frames())

  async def _receive_frames(self) -> None:
    """Continuously receive frames, keeping only the latest one."""
    while self._receiver["running"]:
      try:
        frame = cast(VideoFrame, await self._track.recv())
        async with self._frame_state["lock"]:
          self._frame_state["latest"] = frame
          self._client_data["latest_ts"] = self._client_data["current_ts"]
          current_frame_id = self._client_data["current_frame_id"]
          self._client_data["latest_frame_id"] = current_frame_id
          self._frame_state["ready"].set()
      except Exception as e:
        logger.debug("Frame receiver stopped: %s", e)
        break

  async def recv(self) -> VideoFrame:
    """Receive a frame, process it, and return the result.

    Only the latest frame is processed; older frames are dropped
    to prevent delay accumulation when processing is slow.

    Returns:
      The processed video frame with edge detection applied.
    """
    await self._start_receiver()

    await self._frame_state["ready"].wait()

    async with self._frame_state["lock"]:
      frame = self._frame_state["latest"]
      client_ts = self._client_data["latest_ts"]
      client_frame_id = self._client_data["latest_frame_id"]
      self._frame_state["latest"] = None
      self._client_data["latest_ts"] = None
      self._client_data["latest_frame_id"] = None
      self._frame_state["ready"].clear()

    if frame is None:
      raise Exception("No frame available")

    self._processor.set_client_timestamp(client_ts)
    self._processor.set_client_frame_id(client_frame_id)
    img = frame.to_ndarray(format="bgr24")

    loop = asyncio.get_event_loop()
    processed_img, stats = await loop.run_in_executor(
        None, self._processor.process, img
    )

    if self._data_channel is not None:
      try:
        if self._data_channel.readyState == "open":
          self._data_channel.send(json.dumps(stats))
      except Exception as e:
        logger.warning("Failed to send stats: %s", e)

    new_frame = VideoFrame.from_ndarray(processed_img, format="bgr24")
    new_frame.pts = frame.pts
    new_frame.time_base = frame.time_base
    return new_frame

  def stop(self) -> None:
    """Stop the frame receiver task."""
    self._receiver["running"] = False
    if self._receiver["task"] is not None:
      self._receiver["task"].cancel()


class WebRTCServer:
  """WebRTC server for receiving and processing video streams."""

  def __init__(
      self,
      host: str = "0.0.0.0",
      port: int = 8080,
      client_dir: Optional[Path] = None,
      ssl_context: Optional[ssl.SSLContext] = None
  ) -> None:
    """Initialize the WebRTC server.

    Args:
      host: The host address to bind to.
      port: The port to listen on.
      client_dir: Path to client files directory for static file serving.
      ssl_context: Optional SSL context for HTTPS support.
    """
    self._host = host
    self._port = port
    self._client_dir = client_dir or DEFAULT_CLIENT_DIR
    self._ssl_context = ssl_context
    self._app: Optional[web.Application] = None
    self._runner: Optional[web.AppRunner] = None
    self._pcs: set[RTCPeerConnection] = set()
    self._relay = MediaRelay()

  async def start(self) -> None:
    """Start the WebRTC server."""
    self._app = web.Application()
    self._app.router.add_get("/ws", self._handle_websocket)
    self._app.router.add_get("/health", self._handle_health)

    if self._client_dir.exists():
      self._app.router.add_get("/", self._handle_index)
      self._app.router.add_static(
          "/src", self._client_dir / "src", name="src"
      )
      logger.info("Serving client files from %s", self._client_dir)

    self._app.on_shutdown.append(self._on_shutdown)

    self._runner = web.AppRunner(self._app)
    await self._runner.setup()
    site = web.TCPSite(
        self._runner, self._host, self._port, ssl_context=self._ssl_context
    )
    await site.start()
    protocol = "https" if self._ssl_context else "http"
    logger.info("WebRTC server started on %s://%s:%d", protocol, self._host, self._port)

  async def stop(self) -> None:
    """Stop the WebRTC server."""
    if self._runner is not None:
      await self._runner.cleanup()
    logger.info("WebRTC server stopped")

  async def _on_shutdown(self, app: web.Application) -> None:
    """Handle application shutdown.

    Args:
      app: The aiohttp application.
    """
    coros = [pc.close() for pc in self._pcs]
    await asyncio.gather(*coros)
    self._pcs.clear()

  async def _handle_health(self, request: web.Request) -> web.Response:
    """Handle health check requests.

    Args:
      request: The HTTP request.

    Returns:
      A JSON response indicating the server is healthy.
    """
    return web.json_response({"status": "healthy"})

  async def _handle_index(self, request: web.Request) -> web.FileResponse:
    """Serve the client index.html file.

    Args:
      request: The HTTP request.

    Returns:
      The index.html file response.
    """
    return web.FileResponse(self._client_dir / "index.html")

  async def _handle_websocket(
      self,
      request: web.Request
  ) -> web.WebSocketResponse:
    """Handle WebSocket connections for WebRTC signaling.

    Args:
      request: The HTTP request to upgrade to WebSocket.

    Returns:
      The WebSocket response.
    """
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    logger.info("WebSocket connection established")

    pc = RTCPeerConnection()
    self._pcs.add(pc)
    processor = ImageProcessor()
    transform_track: Optional[VideoTransformTrack] = None

    @pc.on("datachannel")
    def on_datachannel(channel: RTCDataChannel) -> None:
      logger.info("Data channel received: %s", channel.label)
      if transform_track is not None:
        transform_track.set_data_channel(channel)

    @pc.on("track")
    def on_track(track: MediaStreamTrack) -> None:
      nonlocal transform_track
      logger.info("Track received: %s", track.kind)
      if track.kind == "video":
        transform_track = VideoTransformTrack(
            self._relay.subscribe(track),
            processor
        )
        pc.addTrack(transform_track)

    @pc.on("connectionstatechange")
    async def on_connectionstatechange() -> None:
      logger.info("Connection state: %s", pc.connectionState)
      if pc.connectionState == "failed":
        await pc.close()
        self._pcs.discard(pc)
      elif pc.connectionState == "closed":
        self._pcs.discard(pc)

    try:
      async for msg in ws:
        if msg.type == web.WSMsgType.TEXT:
          data = json.loads(msg.data)
          msg_type = data.get("type")

          if msg_type == "offer":
            offer = RTCSessionDescription(
                sdp=data["sdp"],
                type=data["type"]
            )
            await pc.setRemoteDescription(offer)
            answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)

            await ws.send_json({
                "type": pc.localDescription.type,
                "sdp": pc.localDescription.sdp
            })
            logger.info("Answer sent")

          elif msg_type == "candidate":
            if data.get("candidate"):
              logger.debug(
                  "ICE candidate: %s, mid=%s, index=%s",
                  data["candidate"],
                  data.get("sdpMid"),
                  data.get("sdpMLineIndex")
              )

        elif msg.type == web.WSMsgType.ERROR:
          logger.error("WebSocket error: %s", ws.exception())
          break

    except Exception as e:
      logger.exception("Error in WebSocket handler: %s", e)
    finally:
      await pc.close()
      self._pcs.discard(pc)
      logger.info("WebSocket connection closed")

    return ws
