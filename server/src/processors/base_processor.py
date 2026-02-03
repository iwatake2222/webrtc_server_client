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
from typing import Any

import numpy as np
from numpy.typing import NDArray


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
      frame: NDArray[np.uint8]
  ) -> tuple[NDArray[np.uint8], dict[str, Any]]:
    """Process a video frame.

    Args:
      frame: Input image as BGR numpy array (H x W x 3).

    Returns:
      Tuple of (processed_frame, processor_stats).
      - processed_frame: BGR numpy array (H x W x 3)
      - processor_stats: Dictionary with processor-specific statistics
    """
