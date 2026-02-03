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

"""Processor manager for coordinating image processing."""

import time
from typing import Any

import numpy as np
from numpy.typing import NDArray

from src.processors.base_processor import BaseProcessor
from src.processors.blur_processor import BlurProcessor
from src.processors.canny_processor import CannyProcessor


class ProcessorManager:
  """Manages image processor and statistics.

  This class coordinates the image processing pipeline, handling:
  - Processor selection at initialization
  - FPS calculation and statistics tracking
  - Client timestamp/frame ID management

  Example:
    manager = ProcessorManager(processor="canny")
    manager.set_client_timestamp(1234567890)
    processed, stats = manager.process(frame)
  """

  def __init__(self, processor: str = "canny") -> None:
    """Initialize the processor manager.

    Args:
      processor: Name of the processor to use ('canny' or 'blur').
    """
    self._processor: BaseProcessor = self._create_processor(processor)
    self._client_timestamp: int | None = None
    self._client_frame_id: int | None = None

    # Statistics tracking
    self._frame_count = 0
    self._total_frame_count = 0
    self._fps_start_time = time.time()
    self._current_fps = 0.0

  def _create_processor(self, name: str) -> BaseProcessor:
    """Create a processor by name.

    Args:
      name: Name of the processor ('canny' or 'blur').

    Returns:
      The processor instance.

    Raises:
      ValueError: If processor name is unknown.
    """
    if name == "canny":
      return CannyProcessor()
    if name == "blur":
      return BlurProcessor()
    raise ValueError(f"Unknown processor: {name}")

  @property
  def current_processor(self) -> str:
    """Return the name of the current processor."""
    return self._processor.name

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
    """Process a frame through the current processor.

    Args:
      frame: Input image as BGR numpy array.

    Returns:
      Tuple of (processed_frame, stats_dict).
      stats_dict contains frame_id, width, height, fps, processing_time_ms,
      processor-specific stats, and optionally client_ts for latency.
    """
    start_time = time.time()

    height, width = frame.shape[:2]

    # Process frame
    processed, processor_stats = self._processor.process(frame)

    processing_time_ms = (time.time() - start_time) * 1000

    # Update FPS
    self._frame_count += 1
    self._total_frame_count += 1
    elapsed = time.time() - self._fps_start_time
    if elapsed >= 1.0:
      self._current_fps = self._frame_count / elapsed
      self._frame_count = 0
      self._fps_start_time = time.time()

    # Build stats dictionary
    stats: dict[str, Any] = {
        "frame_id": self._total_frame_count,
        "width": width,
        "height": height,
        "fps": round(self._current_fps, 1),
        "processing_time_ms": round(processing_time_ms, 2),
    }

    # Add processor-specific stats
    stats.update(processor_stats)

    # Add client timestamp if available
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
    """Reset all state including frame count and client data."""
    self.reset_fps()
    self._total_frame_count = 0
    self._client_timestamp = None
    self._client_frame_id = None
