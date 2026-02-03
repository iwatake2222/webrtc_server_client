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

"""Base processor module defining abstract interface."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

import numpy as np
from numpy.typing import NDArray


@dataclass
class ClientData:
  """Client-side data passed to processors.

  Contains data from the client device that processors can use for
  context-aware processing, such as sensor data from mobile devices.

  Attributes:
    client_timestamp: Client timestamp in milliseconds for latency calculation.
    client_frame_id: Client-side frame counter for tracking.
    sensor_data: Sensor data from client device (geolocation, IMU, etc.).
  """

  client_timestamp: int | None = None
  client_frame_id: int | None = None
  sensor_data: dict[str, Any] | None = field(default=None)

  @property
  def geolocation(self) -> dict[str, Any] | None:
    """Get geolocation data if available."""
    if self.sensor_data is None:
      return None
    return self.sensor_data.get("geolocation")

  @property
  def accelerometer(self) -> dict[str, Any] | None:
    """Get accelerometer data if available."""
    if self.sensor_data is None:
      return None
    return self.sensor_data.get("accelerometer")

  @property
  def gyroscope(self) -> dict[str, Any] | None:
    """Get gyroscope data if available."""
    if self.sensor_data is None:
      return None
    return self.sensor_data.get("gyroscope")


class BaseProcessor(ABC):
  """Abstract base class for image processors.

  All image processors should inherit from this class and implement
  the required abstract methods.
  """

  @property
  @abstractmethod
  def name(self) -> str:
    """Return the processor name.

    Returns:
      String identifier for this processor.
    """

  @abstractmethod
  def process(
      self,
      frame: NDArray[np.uint8],
      client_data: ClientData | None = None
  ) -> tuple[NDArray[np.uint8], dict[str, Any]]:
    """Process a video frame.

    Args:
      frame: Input image as BGR numpy array (H x W x 3).
      client_data: Optional client data (timestamp, sensor data).

    Returns:
      Tuple of (processed_frame, processor_stats).
      - processed_frame: BGR numpy array (H x W x 3)
      - processor_stats: Dictionary with processor-specific statistics

    Example:
      def process(self, frame, client_data=None):
        if client_data and client_data.geolocation:
          lat = client_data.geolocation.get("latitude")
          # Use geolocation in processing...
        return processed_frame, stats
    """
