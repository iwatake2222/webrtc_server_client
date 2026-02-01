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

"""Image processing module for WebRTC server."""

import time
from typing import Any, cast

import cv2
import numpy as np
from numpy.typing import NDArray


class ImageProcessor:
  """Processes images with edge detection."""

  def __init__(
      self,
      canny_threshold1: int = 100,
      canny_threshold2: int = 200
  ) -> None:
    """Initialize the image processor.

    Args:
      canny_threshold1: First threshold for Canny edge detection.
      canny_threshold2: Second threshold for Canny edge detection.
    """
    self._canny_threshold1 = canny_threshold1
    self._canny_threshold2 = canny_threshold2
    self._frame_count = 0
    self._total_frame_count = 0
    self._fps_start_time = time.time()
    self._current_fps = 0.0
    self._client_timestamp: int | None = None
    self._client_frame_id: int | None = None

  def set_client_timestamp(self, timestamp: int | None) -> None:
    """Set the client timestamp for latency calculation.

    Args:
      timestamp: Client timestamp in milliseconds, or None to clear.
    """
    self._client_timestamp = timestamp

  def set_client_frame_id(self, frame_id: int | None) -> None:
    """Set the client frame ID for tracking.

    Args:
      frame_id: Client frame ID, or None to clear.
    """
    self._client_frame_id = frame_id

  def process(
      self,
      frame: NDArray[np.uint8]
  ) -> tuple[NDArray[np.uint8], dict[str, Any]]:
    """Apply edge detection to the input frame.

    Args:
      frame: Input image as BGR numpy array.

    Returns:
      Tuple of (processed_frame, stats_dict).
      stats_dict contains frame_id, width, height, fps, processing_time_ms,
      and optionally client_ts for latency calculation.
    """
    start_time = time.time()

    height, width = frame.shape[:2]

    edges = cv2.Canny(frame, self._canny_threshold1, self._canny_threshold2)
    processed = cast(
        NDArray[np.uint8],
        cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
    )

    processing_time_ms = (time.time() - start_time) * 1000

    self._frame_count += 1
    self._total_frame_count += 1
    elapsed = time.time() - self._fps_start_time
    if elapsed >= 1.0:
      self._current_fps = self._frame_count / elapsed
      self._frame_count = 0
      self._fps_start_time = time.time()

    stats: dict[str, Any] = {
        "frame_id": self._total_frame_count,
        "width": width,
        "height": height,
        "fps": round(self._current_fps, 1),
        "processing_time_ms": round(processing_time_ms, 2),
    }

    if self._client_timestamp is not None:
      stats["client_ts"] = self._client_timestamp

    if self._client_frame_id is not None:
      stats["client_frame_id"] = self._client_frame_id

    return processed, stats

  def reset_fps(self) -> None:
    """Reset FPS calculation."""
    self._frame_count = 0
    self._fps_start_time = time.time()
    self._current_fps = 0.0

  def reset(self) -> None:
    """Reset all state including frame count and client timestamp."""
    self.reset_fps()
    self._total_frame_count = 0
    self._client_timestamp = None
    self._client_frame_id = None
