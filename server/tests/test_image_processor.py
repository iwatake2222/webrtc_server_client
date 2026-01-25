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

"""Tests for image_processor module."""

import numpy as np

from src.image_processor import ImageProcessor


def test_process_returns_correct_shape() -> None:
  """Test that processed image has the same shape as input."""
  processor = ImageProcessor()
  input_frame = np.zeros((480, 640, 3), dtype=np.uint8)

  processed, _ = processor.process(input_frame)

  assert processed.shape == input_frame.shape


def test_process_returns_bgr_image() -> None:
  """Test that processed image is BGR (3 channels)."""
  processor = ImageProcessor()
  input_frame = np.zeros((480, 640, 3), dtype=np.uint8)

  processed, _ = processor.process(input_frame)

  assert processed.shape[2] == 3
  assert processed.dtype == np.uint8


def test_process_returns_stats_dict() -> None:
  """Test that stats dict contains required keys."""
  processor = ImageProcessor()
  input_frame = np.zeros((480, 640, 3), dtype=np.uint8)

  _, stats = processor.process(input_frame)

  assert "width" in stats
  assert "height" in stats
  assert "fps" in stats
  assert "processing_time_ms" in stats


def test_process_returns_correct_dimensions() -> None:
  """Test that stats contain correct width and height."""
  processor = ImageProcessor()
  input_frame = np.zeros((480, 640, 3), dtype=np.uint8)

  _, stats = processor.process(input_frame)

  assert stats["width"] == 640
  assert stats["height"] == 480


def test_process_with_various_sizes() -> None:
  """Test processing with various image sizes."""
  processor = ImageProcessor()
  sizes = [(240, 320), (480, 640), (720, 1280), (1080, 1920)]

  for height, width in sizes:
    input_frame = np.zeros((height, width, 3), dtype=np.uint8)
    processed, stats = processor.process(input_frame)

    assert processed.shape == (height, width, 3)
    assert stats["width"] == width
    assert stats["height"] == height


def test_process_with_real_edge_detection() -> None:
  """Test edge detection produces non-zero output for edges."""
  processor = ImageProcessor()
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)
  input_frame[40:60, 40:60] = 255

  processed, _ = processor.process(input_frame)

  assert np.any(processed > 0)


def test_processing_time_is_positive() -> None:
  """Test that processing time is recorded correctly."""
  processor = ImageProcessor()
  input_frame = np.zeros((480, 640, 3), dtype=np.uint8)

  _, stats = processor.process(input_frame)

  assert stats["processing_time_ms"] >= 0


def test_custom_canny_thresholds() -> None:
  """Test that custom Canny thresholds can be set."""
  processor = ImageProcessor(canny_threshold1=50, canny_threshold2=150)
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)
  input_frame[40:60, 40:60] = 255

  processed, _ = processor.process(input_frame)

  assert processed.shape == input_frame.shape


def test_reset_fps() -> None:
  """Test FPS reset functionality."""
  processor = ImageProcessor()
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)

  for _ in range(10):
    processor.process(input_frame)

  processor.reset_fps()
  _, stats = processor.process(input_frame)

  assert stats["fps"] == 0.0
