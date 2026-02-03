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

"""Tests for processor_manager module."""

import numpy as np
import pytest

from src.processor_manager import ProcessorManager


def test_manager_default_processor() -> None:
  """Test that default processor is canny."""
  manager = ProcessorManager()

  assert manager.current_processor == "canny"


def test_manager_blur_processor() -> None:
  """Test creating manager with blur processor."""
  manager = ProcessorManager(processor="blur")

  assert manager.current_processor == "blur"


def test_manager_unknown_processor_raises() -> None:
  """Test that unknown processor raises ValueError."""
  with pytest.raises(ValueError):
    ProcessorManager(processor="unknown")


def test_manager_process_returns_correct_shape() -> None:
  """Test that processed image has same shape as input."""
  manager = ProcessorManager()
  input_frame = np.zeros((480, 640, 3), dtype=np.uint8)

  processed, _ = manager.process(input_frame)

  assert processed.shape == input_frame.shape


def test_manager_process_returns_stats() -> None:
  """Test that process returns complete stats."""
  manager = ProcessorManager()
  input_frame = np.zeros((480, 640, 3), dtype=np.uint8)

  _, stats = manager.process(input_frame)

  assert "frame_id" in stats
  assert "width" in stats
  assert "height" in stats
  assert "fps" in stats
  assert "processing_time_ms" in stats
  assert "processor" in stats


def test_manager_stats_contain_processor_name() -> None:
  """Test that stats include processor name."""
  manager = ProcessorManager(processor="blur")
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)

  _, stats = manager.process(input_frame)

  assert stats["processor"] == "blur"


def test_manager_frame_id_increments() -> None:
  """Test that frame_id increments with each process call."""
  manager = ProcessorManager()
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)

  _, stats1 = manager.process(input_frame)
  _, stats2 = manager.process(input_frame)
  _, stats3 = manager.process(input_frame)

  assert stats1["frame_id"] == 1
  assert stats2["frame_id"] == 2
  assert stats3["frame_id"] == 3


def test_manager_set_client_timestamp() -> None:
  """Test setting client timestamp."""
  manager = ProcessorManager()
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)

  manager.set_client_timestamp(1234567890)
  _, stats = manager.process(input_frame)

  assert stats["client_ts"] == 1234567890


def test_manager_set_client_frame_id() -> None:
  """Test setting client frame ID."""
  manager = ProcessorManager()
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)

  manager.set_client_frame_id(42)
  _, stats = manager.process(input_frame)

  assert stats["client_frame_id"] == 42


def test_manager_reset_fps() -> None:
  """Test FPS reset."""
  manager = ProcessorManager()
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)

  for _ in range(10):
    manager.process(input_frame)

  manager.reset_fps()
  _, stats = manager.process(input_frame)

  assert stats["fps"] == 0.0


def test_manager_reset() -> None:
  """Test full reset."""
  manager = ProcessorManager()
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)

  for _ in range(5):
    manager.process(input_frame)
  manager.set_client_timestamp(1234567890)

  manager.reset()
  _, stats = manager.process(input_frame)

  assert stats["frame_id"] == 1
  assert stats["fps"] == 0.0
  assert "client_ts" not in stats


def test_manager_client_timestamp_not_included_by_default() -> None:
  """Test that client_ts is not included when not set."""
  manager = ProcessorManager()
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)

  _, stats = manager.process(input_frame)

  assert "client_ts" not in stats


def test_manager_client_frame_id_not_included_by_default() -> None:
  """Test that client_frame_id is not included when not set."""
  manager = ProcessorManager()
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)

  _, stats = manager.process(input_frame)

  assert "client_frame_id" not in stats


def test_manager_clear_client_timestamp() -> None:
  """Test clearing client timestamp."""
  manager = ProcessorManager()
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)

  manager.set_client_timestamp(1234567890)
  manager.set_client_timestamp(None)
  _, stats = manager.process(input_frame)

  assert "client_ts" not in stats


def test_manager_different_processors_produce_different_output() -> None:
  """Test that different processors produce different output."""
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)
  input_frame[40:60, 40:60] = 255

  manager_canny = ProcessorManager(processor="canny")
  processed_canny, _ = manager_canny.process(input_frame.copy())

  manager_blur = ProcessorManager(processor="blur")
  processed_blur, _ = manager_blur.process(input_frame.copy())

  # Canny produces edges (mostly black with white edges)
  # Blur produces smoothed version (keeps overall brightness)
  assert not np.array_equal(processed_canny, processed_blur)


def test_manager_set_sensor_data() -> None:
  """Test setting sensor data."""
  manager = ProcessorManager()
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)

  sensor_data = {
      "geolocation": {
          "latitude": 35.6762,
          "longitude": 139.6503,
          "altitude": 40,
          "accuracy": 10,
          "heading": 90,
          "speed": 1.5,
      },
      "accelerometer": {
          "x": 0.5,
          "y": -0.3,
          "z": 9.8,
      },
      "gyroscope": {
          "alpha": 180,
          "beta": 45,
          "gamma": -30,
      },
  }
  manager.set_sensor_data(sensor_data)
  _, stats = manager.process(input_frame)

  # Values are formatted to 3 decimal places as strings
  expected = {
      "geolocation": {
          "latitude": "35.676",
          "longitude": "139.650",
          "altitude": "40.000",
          "accuracy": "10.000",
          "heading": "90.000",
          "speed": "1.500",
      },
      "accelerometer": {
          "x": "0.500",
          "y": "-0.300",
          "z": "9.800",
      },
      "gyroscope": {
          "alpha": "180.000",
          "beta": "45.000",
          "gamma": "-30.000",
      },
  }
  assert stats["sensor_data"] == expected


def test_manager_get_sensor_data() -> None:
  """Test getting sensor data."""
  manager = ProcessorManager()
  sensor_data = {"geolocation": {"latitude": 35.6762}}

  manager.set_sensor_data(sensor_data)
  result = manager.get_sensor_data()

  assert result == sensor_data


def test_manager_sensor_data_not_included_by_default() -> None:
  """Test that sensor_data is not included when not set."""
  manager = ProcessorManager()
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)

  _, stats = manager.process(input_frame)

  assert "sensor_data" not in stats


def test_manager_clear_sensor_data() -> None:
  """Test clearing sensor data."""
  manager = ProcessorManager()
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)

  sensor_data = {"geolocation": {"latitude": 35.6762}}
  manager.set_sensor_data(sensor_data)
  manager.set_sensor_data(None)
  _, stats = manager.process(input_frame)

  assert "sensor_data" not in stats


def test_manager_reset_clears_sensor_data() -> None:
  """Test that reset clears sensor data."""
  manager = ProcessorManager()
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)

  sensor_data = {"geolocation": {"latitude": 35.6762}}
  manager.set_sensor_data(sensor_data)
  manager.reset()
  _, stats = manager.process(input_frame)

  assert "sensor_data" not in stats
  assert manager.get_sensor_data() is None


def test_manager_sensor_data_formatted_to_3_decimals() -> None:
  """Test that sensor data values are formatted to 3 decimal places."""
  manager = ProcessorManager()
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)

  sensor_data = {
      "geolocation": {
          "latitude": 35.67621234567,
          "longitude": 139.65031234567,
          "altitude": 40.123456789,
      },
      "accelerometer": {
          "x": 0.123456789,
          "y": -0.987654321,
          "z": 9.80665,
      },
      "gyroscope": {
          "alpha": 180.111222333,
          "beta": 45.999888777,
          "gamma": -30.555444333,
      },
  }
  manager.set_sensor_data(sensor_data)
  _, stats = manager.process(input_frame)

  geo = stats["sensor_data"]["geolocation"]
  assert geo["latitude"] == "35.676"
  assert geo["longitude"] == "139.650"
  assert geo["altitude"] == "40.123"

  accel = stats["sensor_data"]["accelerometer"]
  assert accel["x"] == "0.123"
  assert accel["y"] == "-0.988"
  assert accel["z"] == "9.807"

  gyro = stats["sensor_data"]["gyroscope"]
  assert gyro["alpha"] == "180.111"
  assert gyro["beta"] == "46.000"
  assert gyro["gamma"] == "-30.555"


def test_manager_sensor_data_preserves_none_values() -> None:
  """Test that None values in sensor data are preserved."""
  manager = ProcessorManager()
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)

  sensor_data = {
      "geolocation": {
          "latitude": 35.6762,
          "longitude": None,
          "altitude": None,
      },
  }
  manager.set_sensor_data(sensor_data)
  _, stats = manager.process(input_frame)

  geo = stats["sensor_data"]["geolocation"]
  assert geo["latitude"] == "35.676"
  assert geo["longitude"] is None
  assert geo["altitude"] is None


def test_manager_sensor_data_formats_int_as_string() -> None:
  """Test that integer values are formatted as strings with 3 decimals."""
  manager = ProcessorManager()
  input_frame = np.zeros((100, 100, 3), dtype=np.uint8)

  sensor_data = {
      "geolocation": {
          "latitude": 35.6762,
          "accuracy": 10,
      },
  }
  manager.set_sensor_data(sensor_data)
  _, stats = manager.process(input_frame)

  geo = stats["sensor_data"]["geolocation"]
  assert geo["latitude"] == "35.676"
  assert geo["accuracy"] == "10.000"
