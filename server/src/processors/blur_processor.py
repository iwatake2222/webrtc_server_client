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

"""Gaussian blur processor."""

from typing import Any, cast

import cv2
import numpy as np
from numpy.typing import NDArray

from src.processors.base_processor import BaseProcessor, ClientData


class BlurProcessor(BaseProcessor):
  """Processor that applies Gaussian blur.

  This processor smooths the input frame using a Gaussian filter.
  """

  def __init__(self, kernel_size: int = 15) -> None:
    """Initialize the blur processor.

    Args:
      kernel_size: Size of the Gaussian kernel (must be odd and positive).
    """
    kernel_size = max(kernel_size, 1)
    if kernel_size % 2 == 0:
      kernel_size += 1
    self._kernel_size = kernel_size

  @property
  def name(self) -> str:
    """Return the processor name."""
    return "blur"

  def process(
      self,
      frame: NDArray[np.uint8],
      client_data: ClientData | None = None
  ) -> tuple[NDArray[np.uint8], dict[str, Any]]:
    """Apply Gaussian blur to the frame.

    Args:
      frame: Input image as BGR numpy array.
      client_data: Optional client data (timestamp, sensor data).

    Returns:
      Tuple of (processed_frame, stats).
      - processed_frame: Blurred BGR image
      - stats: Dictionary with processor name
    """
    # Example: Access sensor data if available
    # if client_data and client_data.accelerometer:
    #   accel_x = client_data.accelerometer.get("x")
    processed = cast(
        NDArray[np.uint8],
        cv2.GaussianBlur(
            frame,
            (self._kernel_size, self._kernel_size),
            0
        )
    )

    stats: dict[str, Any] = {
        "processor": self.name,
    }

    return processed, stats
