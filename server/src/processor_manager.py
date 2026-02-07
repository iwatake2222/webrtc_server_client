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

from src.fps_tracker import FpsTracker
from src.processors.alpamayo_processor import AlpamayoProcessor
from src.processors.base_processor import BaseProcessor, ClientData
from src.processors.blur_processor import BlurProcessor
from src.processors.canny_processor import CannyProcessor


def _format_sensor_value(value: Any) -> Any:
  """Format a sensor value to 3 decimal places if it's a number.

  Args:
    value: The value to format.

  Returns:
    Formatted value as string with 3 decimals if numeric, otherwise unchanged.
  """
  if isinstance(value, float):
    return f"{value:.3f}"
  if isinstance(value, int):
    return f"{value:.3f}"
  return value


def _format_sensor_data(data: dict[str, Any] | None) -> dict[str, Any] | None:
  """Format all numeric values in sensor data to 3 decimal places.

  Args:
    data: Sensor data dict or None.

  Returns:
    Formatted sensor data dict or None.
  """
  if data is None:
    return None

  formatted: dict[str, Any] = {}
  for key, value in data.items():
    if isinstance(value, dict):
      formatted[key] = {
          k: _format_sensor_value(v) for k, v in value.items()
      }
    else:
      formatted[key] = _format_sensor_value(value)
  return formatted


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
      processor: Name of the processor to use ('canny' or 'blur' or 'alpamayo').
    """
    self._processor: BaseProcessor = self._create_processor(processor)
    self._client_timestamp: int | None = None
    self._client_frame_id: int | None = None
    self._sensor_data: dict[str, Any] | None = None
    self._fps_tracker = FpsTracker()

  def _create_processor(self, name: str) -> BaseProcessor:
    """Create a processor by name.

    Args:
      name: Name of the processor ('canny' or 'blur' or 'alpamayo').

    Returns:
      The processor instance.

    Raises:
      ValueError: If processor name is unknown.
    """
    if name == "canny":
      return CannyProcessor()
    if name == "blur":
      return BlurProcessor()
    if name == "alpamayo":
      return AlpamayoProcessor()

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

  def set_sensor_data(self, sensor_data: dict[str, Any] | None) -> None:
    """Set the sensor data from client.

    Args:
      sensor_data: Sensor data dict containing geolocation, accelerometer,
        gyroscope, or None to clear.
    """
    self._sensor_data = sensor_data

  def get_sensor_data(self) -> dict[str, Any] | None:
    """Get the current sensor data.

    Returns:
      The current sensor data dict or None if not set.
    """
    return self._sensor_data

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

    client_data = ClientData(
        client_timestamp=self._client_timestamp,
        client_frame_id=self._client_frame_id,
        sensor_data=self._sensor_data,
    )
    processed, processor_stats = self._processor.process(frame, client_data)

    processing_time_ms = (time.time() - start_time) * 1000
    self._fps_tracker.update()
    stats = self._fps_tracker.build_stats(width, height, processing_time_ms)

    stats.update(processor_stats)

    if self._client_timestamp is not None:
      stats["client_ts"] = self._client_timestamp

    if self._client_frame_id is not None:
      stats["client_frame_id"] = self._client_frame_id

    if self._sensor_data is not None:
      stats["sensor_data"] = _format_sensor_data(self._sensor_data)

    return processed, stats

  def reset_fps(self) -> None:
    """Reset FPS calculation."""
    self._fps_tracker.reset_fps()

  def reset(self) -> None:
    """Reset all state including frame count and client data."""
    self._fps_tracker.reset()
    self._client_timestamp = None
    self._client_frame_id = None
    self._sensor_data = None
