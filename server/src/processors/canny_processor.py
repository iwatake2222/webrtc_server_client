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

"""Canny edge detection processor."""

from typing import Any, cast

import cv2
import numpy as np
from numpy.typing import NDArray

from src.processors.base_processor import BaseProcessor, ProcessContext


class CannyProcessor(BaseProcessor):
  """Processor that applies Canny edge detection.

  This processor converts the input frame to edges using the Canny
  algorithm and returns a BGR image with white edges on black background.
  """

  def __init__(
      self,
      threshold1: int = 100,
      threshold2: int = 200
  ) -> None:
    """Initialize the Canny processor.

    Args:
      threshold1: First threshold for the hysteresis procedure.
      threshold2: Second threshold for the hysteresis procedure.
    """
    self._threshold1 = threshold1
    self._threshold2 = threshold2

  @property
  def name(self) -> str:
    """Return the processor name."""
    return "canny"

  def process(
      self,
      frame: NDArray[np.uint8],
      context: ProcessContext | None = None
  ) -> tuple[NDArray[np.uint8], dict[str, Any]]:
    """Apply Canny edge detection to the frame.

    Args:
      frame: Input image as BGR numpy array.
      context: Optional context with client data (timestamp, sensor data).

    Returns:
      Tuple of (processed_frame, stats).
      - processed_frame: BGR image with edges
      - stats: Dictionary with threshold values
    """
    # Example: Access sensor data if available
    # if context and context.geolocation:
    #   lat = context.geolocation.get("latitude")
    #   lon = context.geolocation.get("longitude")
    edges = cv2.Canny(frame, self._threshold1, self._threshold2)
    processed = cast(
        NDArray[np.uint8],
        cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
    )

    stats: dict[str, Any] = {
        "processor": self.name,
    }

    return processed, stats
