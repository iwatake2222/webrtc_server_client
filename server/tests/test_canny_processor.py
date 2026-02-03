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

"""Tests for canny_processor module."""

import numpy as np

from src.processors.canny_processor import CannyProcessor


def test_canny_processor_name() -> None:
  """Test that processor name is 'canny'."""
  processor = CannyProcessor()

  assert processor.name == "canny"


def test_canny_process_returns_correct_shape() -> None:
  """Test that processed image has the same shape as input."""
  processor = CannyProcessor()
  input_frame = np.zeros((480, 640, 3), dtype=np.uint8)

  processed, _ = processor.process(input_frame)

  assert processed.shape == input_frame.shape


def test_canny_process_returns_bgr_image() -> None:
  """Test that processed image is BGR (3 channels)."""
  processor = CannyProcessor()
  input_frame = np.zeros((480, 640, 3), dtype=np.uint8)

  processed, _ = processor.process(input_frame)

  assert processed.shape[2] == 3
  assert processed.dtype == np.uint8


def test_canny_process_returns_stats() -> None:
  """Test that stats contain processor info."""
  processor = CannyProcessor()
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)

  _, stats = processor.process(input_frame)

  assert stats["processor"] == "canny"


def test_canny_produces_edges() -> None:
  """Test edge detection produces non-zero output for edges."""
  processor = CannyProcessor()
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)
  input_frame[40:60, 40:60] = 255

  processed, _ = processor.process(input_frame)

  assert np.any(processed > 0)


def test_canny_with_various_sizes() -> None:
  """Test processing with various image sizes."""
  processor = CannyProcessor()
  sizes = [(240, 320), (480, 640), (720, 1280)]

  for height, width in sizes:
    input_frame = np.zeros((height, width, 3), dtype=np.uint8)
    processed, _ = processor.process(input_frame)

    assert processed.shape == (height, width, 3)
