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

"""FPS tracking utility for frame processing."""

import time
from typing import Any


class FpsTracker:
  """Tracks frame rate and frame count statistics."""

  def __init__(self) -> None:
    """Initialize the FPS tracker."""
    self._frame_count = 0
    self._total_frame_count = 0
    self._fps_start_time = time.time()
    self._current_fps = 0.0

  def update(self) -> None:
    """Update frame count and recalculate FPS if needed."""
    self._frame_count += 1
    self._total_frame_count += 1
    elapsed = time.time() - self._fps_start_time
    if elapsed >= 1.0:
      self._current_fps = self._frame_count / elapsed
      self._frame_count = 0
      self._fps_start_time = time.time()

  @property
  def fps(self) -> float:
    """Return the current FPS."""
    return round(self._current_fps, 1)

  @property
  def total_frame_count(self) -> int:
    """Return the total frame count."""
    return self._total_frame_count

  def build_stats(
      self,
      width: int,
      height: int,
      processing_time_ms: float
  ) -> dict[str, Any]:
    """Build base stats dictionary.

    Args:
      width: Frame width in pixels.
      height: Frame height in pixels.
      processing_time_ms: Processing time in milliseconds.

    Returns:
      Dictionary with frame_id, width, height, fps, and processing_time_ms.
    """
    return {
        "frame_id": self._total_frame_count,
        "width": width,
        "height": height,
        "fps": self.fps,
        "processing_time_ms": round(processing_time_ms, 2),
    }

  def reset_fps(self) -> None:
    """Reset FPS calculation only."""
    self._frame_count = 0
    self._fps_start_time = time.time()
    self._current_fps = 0.0

  def reset(self) -> None:
    """Reset all state including frame count."""
    self.reset_fps()
    self._total_frame_count = 0
