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

"""Tests for blur_processor module."""

import numpy as np

from src.processors.blur_processor import BlurProcessor


def test_blur_processor_name() -> None:
  """Test that processor name is 'blur'."""
  processor = BlurProcessor()

  assert processor.name == "blur"


def test_blur_process_returns_correct_shape() -> None:
  """Test that processed image has the same shape as input."""
  processor = BlurProcessor()
  input_frame = np.zeros((480, 640, 3), dtype=np.uint8)

  processed, _ = processor.process(input_frame)

  assert processed.shape == input_frame.shape


def test_blur_process_returns_bgr_image() -> None:
  """Test that processed image is BGR (3 channels)."""
  processor = BlurProcessor()
  input_frame = np.zeros((480, 640, 3), dtype=np.uint8)

  processed, _ = processor.process(input_frame)

  assert processed.shape[2] == 3
  assert processed.dtype == np.uint8


def test_blur_process_returns_stats() -> None:
  """Test that stats contain processor info."""
  processor = BlurProcessor()
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)

  _, stats = processor.process(input_frame)

  assert stats["processor"] == "blur"


def test_blur_actually_blurs() -> None:
  """Test that blur actually smooths the image."""
  processor = BlurProcessor(kernel_size=15)
  # Create image with sharp edge
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)
  input_frame[:, 50:] = 255

  processed, _ = processor.process(input_frame)

  # After blur, the edge should be smoothed (gradient instead of sharp)
  # Check that middle column has intermediate values
  middle_values = processed[50, 45:55, 0]
  assert np.any((middle_values > 0) & (middle_values < 255))


def test_blur_with_various_sizes() -> None:
  """Test processing with various image sizes."""
  processor = BlurProcessor()
  sizes = [(240, 320), (480, 640), (720, 1280)]

  for height, width in sizes:
    input_frame = np.zeros((height, width, 3), dtype=np.uint8)
    processed, _ = processor.process(input_frame)

    assert processed.shape == (height, width, 3)
