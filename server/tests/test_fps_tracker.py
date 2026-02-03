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

"""Tests for fps_tracker module."""

from src.fps_tracker import FpsTracker


def test_initial_state() -> None:
  """Test initial state of FpsTracker."""
  tracker = FpsTracker()

  assert tracker.fps == 0.0
  assert tracker.total_frame_count == 0


def test_update_increments_frame_count() -> None:
  """Test that update increments total frame count."""
  tracker = FpsTracker()

  tracker.update()
  assert tracker.total_frame_count == 1

  tracker.update()
  assert tracker.total_frame_count == 2


def test_reset_fps() -> None:
  """Test FPS reset."""
  tracker = FpsTracker()

  for _ in range(5):
    tracker.update()

  tracker.reset_fps()

  assert tracker.fps == 0.0
  assert tracker.total_frame_count == 5


def test_reset() -> None:
  """Test full reset."""
  tracker = FpsTracker()

  for _ in range(5):
    tracker.update()

  tracker.reset()

  assert tracker.fps == 0.0
  assert tracker.total_frame_count == 0


def test_build_stats() -> None:
  """Test build_stats returns correct dictionary."""
  tracker = FpsTracker()
  tracker.update()

  stats = tracker.build_stats(width=640, height=480, processing_time_ms=5.123)

  assert stats["frame_id"] == 1
  assert stats["width"] == 640
  assert stats["height"] == 480
  assert stats["fps"] == 0.0
  assert stats["processing_time_ms"] == 5.12
