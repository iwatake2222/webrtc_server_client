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

"""Alpamayo processor for trajectory prediction."""

import logging
import time
from collections import deque
from typing import Any

import cv2
import numpy as np
import torch
from numpy.typing import NDArray

from alpamayo_r1 import helper
from alpamayo_r1.models.alpamayo_r1 import AlpamayoR1
from src.processors.base_processor import BaseProcessor, ClientData
from src.utility import (
    create_dummy_ego_history,
    draw_trajectory,
    draw_trajectory_projected,
    opencv_images_to_torch,
    put_text_with_bg,
)


WIDTH_TRAJECTORY_WINDOW_PX = 200
WORLD_WIDTH_TRAJECTORY_WINDOW_M = 10.0
WORLD_HEIGHT_TRAJECTORY_WINDOW_M = 70.0
MODEL_INPUT_NUM_FRAMES = 4
MODEL_INPUT_WIDTH = 1920 // 2
MODEL_INPUT_HEIGHT = 1080 // 2
CAMERA_FX = 1000.0
CAMERA_FY = 1000.0
CAMERA_HEIGHT_M = 1.5
CAMERA_PITCH_DEG = 0.0

logger = logging.getLogger(__name__)

_model = None
_processor = None
_is_model_loaded = False


def _load_model() -> tuple[AlpamayoR1, Any]:
  """Load Alpamayo model globally.

  This function performs heavy initialization once at application startup.
  Uses print() instead of logger because logging is not configured yet
  at module import time.

  Returns:
    Tuple of (model, processor).
  """
  global _model, _processor, _is_model_loaded
  print("Loading Alpamayo model...")
  _model = AlpamayoR1.from_pretrained(
      "nvidia/Alpamayo-R1-10B", dtype=torch.bfloat16
  ).to("cuda")
  _processor = helper.get_processor(_model.tokenizer)
  _is_model_loaded = True
  print("Finished loading Alpamayo model")
  return _model, _processor


_load_model()


class AlpamayoProcessor(BaseProcessor):
  """Processor that applies Alpamayo for trajectory prediction.

  This processor uses the Alpamayo-R1 model to predict vehicle trajectories
  from input frames and visualizes the results.
  """

  def __init__(self) -> None:
    """Initialize the Alpamayo processor."""
    self._ego_history_xyz, self._ego_history_rot = create_dummy_ego_history()
    self._frame_buffer: deque[NDArray[np.uint8]] = deque(
        maxlen=MODEL_INPUT_NUM_FRAMES
    )
    self._frame_id = 0

  @property
  def name(self) -> str:
    """Return the processor name."""
    return "alpamayo"

  def process(
      self,
      frame: NDArray[np.uint8],
      client_data: ClientData | None = None
  ) -> tuple[NDArray[np.uint8], dict[str, Any]]:
    """Apply Alpamayo to the frame.

    Args:
      frame: Input image as BGR numpy array.
      client_data: Optional client data (timestamp, sensor data).

    Returns:
      Tuple of (processed_frame, stats).
      - processed_frame: BGR image with trajectory drawn.
      - stats: cot text
    """

    if not _is_model_loaded:
      logger.info("Model is not loaded yet. Skipping processing.")
      return frame, {}

    original_height, original_width = frame.shape[:2]

    frame = cv2.resize(frame, (MODEL_INPUT_WIDTH, MODEL_INPUT_HEIGHT))
    current_input_image = frame.copy()

    logger.info("Preparing input...")
    self._frame_buffer.append(frame)
    input_images = opencv_images_to_torch(list(self._frame_buffer))

    messages = helper.create_message(input_images)
    inputs = _processor.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=False,
        continue_final_message=True,
        return_dict=True,
        return_tensors="pt",
    )
    model_inputs = {
        "tokenized_data": inputs,
        "ego_history_xyz": self._ego_history_xyz,
        "ego_history_rot": self._ego_history_rot,
    }
    model_inputs = helper.to_device(model_inputs, "cuda")

    logger.info("Running inference...")
    torch.cuda.manual_seed_all(42)
    start = time.time()
    with torch.autocast("cuda", dtype=torch.bfloat16):
      pred_xyz, pred_rot, extra = _model.sample_trajectories_from_data_with_vlm_rollout(
          data=model_inputs,
          top_p=0.98,
          temperature=0.6,
          num_traj_samples=1,
          max_generation_length=64,
          return_extra=True,
      )
    elapsed = time.time() - start
    logger.info("Inference done. elapsed: %.3f sec", elapsed)

    pred_xy = pred_xyz.cpu().numpy()[0, 0, :, :, :2].transpose(0, 2, 1)
    reason_text_list = extra["cot"][0][0]
    logger.debug("Extra: %s", extra)
    logger.debug("pred_xy shape: %s", pred_xy.shape)

    traj_x = []
    traj_y = []
    for traj_i in range(pred_xy.shape[0]):
      y = pred_xy[traj_i, 0]  # (N,)
      x = pred_xy[traj_i, 1]  # (N,)
      traj_x.append(-x)
      traj_y.append(y)

    logger.debug("Drawing trajectory...")
    img_trajectory = draw_trajectory(
        traj_x,
        traj_y,
        world_width_m=WORLD_WIDTH_TRAJECTORY_WINDOW_M,
        world_height_m=WORLD_HEIGHT_TRAJECTORY_WINDOW_M,
        image_width_px=WIDTH_TRAJECTORY_WINDOW_PX,
        image_height_px=current_input_image.shape[0],
    )

    logger.debug("Projecting trajectory onto input image...")
    img_trajectory_projected = draw_trajectory_projected(
        img=current_input_image,
        traj_x=traj_x,
        traj_y=traj_y,
        fx=CAMERA_FX,
        fy=CAMERA_FY,
        camera_height_m=CAMERA_HEIGHT_M,
        camera_pitch_deg=CAMERA_PITCH_DEG,
    )

    put_text_with_bg(
        img_trajectory_projected,
        ", ".join(reason_text_list),
        (10, 40),
    )

    img_output = cv2.hconcat([img_trajectory_projected, img_trajectory])

    stats: dict[str, Any] = {
        "inference_time_sec": f"{elapsed:.3f}",
        "cot": ", ".join(reason_text_list),
        "original_width": original_width,
        "original_height": original_height,
    }

    return img_output, stats
