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

from src.processors.base_processor import ClientData
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


def test_canny_process_with_client_data() -> None:
  """Test processing with client data."""
  processor = CannyProcessor()
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)
  client_data = ClientData(
      client_timestamp=1234567890,
      client_frame_id=42,
      sensor_data={
          "geolocation": {"latitude": 35.6762, "longitude": 139.6503},
          "accelerometer": {"x": 0.5, "y": -0.3, "z": 9.8},
      }
  )

  processed, stats = processor.process(input_frame, client_data)

  assert processed.shape == input_frame.shape
  assert stats["processor"] == "canny"


def test_canny_process_without_client_data() -> None:
  """Test processing without client data (backward compatibility)."""
  processor = CannyProcessor()
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)

  processed, stats = processor.process(input_frame)

  assert processed.shape == input_frame.shape
  assert stats["processor"] == "canny"


def test_client_data_properties() -> None:
  """Test ClientData convenience properties."""
  sensor_data = {
      "geolocation": {"latitude": 35.6762},
      "accelerometer": {"x": 0.5},
      "gyroscope": {"alpha": 180},
  }
  client_data = ClientData(
      client_timestamp=1234567890,
      client_frame_id=42,
      sensor_data=sensor_data,
  )

  assert client_data.client_timestamp == 1234567890
  assert client_data.client_frame_id == 42
  assert client_data.geolocation == {"latitude": 35.6762}
  assert client_data.accelerometer == {"x": 0.5}
  assert client_data.gyroscope == {"alpha": 180}


def test_client_data_none_sensor_data() -> None:
  """Test ClientData properties when sensor_data is None."""
  client_data = ClientData()

  assert client_data.client_timestamp is None
  assert client_data.client_frame_id is None
  assert client_data.sensor_data is None
  assert client_data.geolocation is None
  assert client_data.accelerometer is None
  assert client_data.gyroscope is None
