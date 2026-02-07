# SPDX-FileCopyrightText: Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: Apache-2.0
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# End-to-end example script for the inference pipeline:
# This script loads a dataset, runs inference, and computes the minADE.
# It can be used to test the inference pipeline.

import cv2
import numpy as np
import os
import sys
import time
import torch

import sys
from pathlib import Path

from alpamayo_r1.models.alpamayo_r1 import AlpamayoR1
from alpamayo_r1.load_physical_aiavdataset import load_physical_aiavdataset
from alpamayo_r1 import helper

from utility import (
    put_text_with_bg,
    draw_trajectory,
    draw_trajectory_projected,
)


WIDTH_TRAJECTORY_WINDOW_PX = 200
MODEL_INPUT_WIDTH = 640
MODEL_INPUT_HEIGHT = 384


# Example clip ID
clip_id = "030c760c-ae38-49aa-9ad8-f5650a545d26"
print(f"Loading dataset for clip_id: {clip_id}...")
data = load_physical_aiavdataset(clip_id, t0_us=5_100_000)
print("Dataset loaded.")

# messages = helper.create_message(data["image_frames"].flatten(0, 1))

print("Reading input images...")
### Debug Code to know input images
input_images = data["image_frames"]
print(input_images.shape, input_images.dtype)  # [CAM, FRAME, C, H, W], torch.uint8(0-255)

from torchvision.utils import save_image
for i in range(input_images.shape[0]):
    for j in range(input_images.shape[1]):
        img = input_images[i, j]  # [3, 1080, 1920]
        if img.dtype != torch.float32:
            img = img.float() / 255.0
        save_image(img, f"image_{i}_{j}.png")

### Lighten the input
# Use the last camera (front camera) only
input_images = input_images[-1:, :, :, :, :]
input_images = input_images.flatten(0, 1)  # [CAM x FRAME, C, H, W]

# Resize to 384x640
# resized_input_images = torch.nn.functional.interpolate(
#     input_images,
#     size=(MODEL_INPUT_HEIGHT, MODEL_INPUT_WIDTH),
#     mode="bilinear",
#     align_corners=False,
# )
# messages = helper.create_message(resized_input_images)
messages = helper.create_message(input_images)

### Store current input image for later visualization
current_input_image = input_images[-1 , :, :, :]
current_input_image = current_input_image.permute(1, 2, 0).numpy()
current_input_image = cv2.cvtColor(current_input_image, cv2.COLOR_RGB2BGR)
current_input_image = cv2.resize(current_input_image, (1920//2, 1080//2))


print("Loading Alpamayo model...")
model = AlpamayoR1.from_pretrained("nvidia/Alpamayo-R1-10B", dtype=torch.bfloat16).to("cuda")
processor = helper.get_processor(model.tokenizer)

print("Preparing input...")
inputs = processor.apply_chat_template(
    messages,
    tokenize=True,
    add_generation_prompt=False,
    continue_final_message=True,
    return_dict=True,
    return_tensors="pt",
)
model_inputs = {
    "tokenized_data": inputs,
    "ego_history_xyz": data["ego_history_xyz"],
    "ego_history_rot": data["ego_history_rot"],
}

model_inputs = helper.to_device(model_inputs, "cuda")

print("Running inference...")
torch.cuda.manual_seed_all(42)
start = time.time()
with torch.autocast("cuda", dtype=torch.bfloat16):
    pred_xyz, pred_rot, extra = model.sample_trajectories_from_data_with_vlm_rollout(
        data=model_inputs,
        top_p=0.98,
        temperature=0.6,
        num_traj_samples=1,  # Feel free to raise this for more output trajectories and CoC traces.
        # max_generation_length=256,
        max_generation_length=128,
        return_extra=True,
    )
end = time.time()
print(f"Inference done. elapsed: {end - start:.3f} sec")

pred_xy = pred_xyz.cpu().numpy()[0, 0, :, :, :2].transpose(0, 2, 1)
reason_text_list = extra["cot"][0][0]
print(extra)
print(pred_xy.shape)

traj_x = []
traj_y = []
for traj_i in range(pred_xy.shape[0]):
    y = pred_xy[traj_i, 0]  # (N,)
    x = pred_xy[traj_i, 1]  # (N,)
    traj_x.append(-x)
    traj_y.append(y)

print("Drawing trajectory...")
img_trajectory = draw_trajectory(
    traj_x,
    traj_y,
    world_width_m=10.0,
    world_height_m=70.0,
    image_width_px=WIDTH_TRAJECTORY_WINDOW_PX,
    # image_height_px=400
    image_height_px=current_input_image.shape[0]
)
cv2.imwrite("trajectory.png", img_trajectory)

print("Projecting trajectory onto input image...")
img_trajectory_projected = draw_trajectory_projected(
    img=current_input_image,
    traj_x=traj_x,
    traj_y=traj_y,
    fx=1000.0,
    fy=1000.0,
    camera_height_m=1.5,
    camera_pitch_deg=0.0,
)

print("Saving output image...")
put_text_with_bg(
    img_trajectory_projected,
    ', '.join(reason_text_list),
    (10, 20),
)
cv2.imwrite(f"trajectory_projected.png", img_trajectory_projected)

img_output = cv2.hconcat([img_trajectory_projected, img_trajectory])
cv2.imwrite(f"output.png", img_output)

# Evaluate the result visually using matplotlib
import matplotlib.pyplot as plt
def rotate_90cc(xy):
    # Rotate (x, y) by 90 deg CCW -> (y, -x)
    return np.stack([-xy[1], xy[0]], axis=0)

plt.figure(figsize=(6, 6))

for i in range(pred_xyz.shape[2]):
    pred_xy = pred_xyz.cpu()[0, 0, i, :, :2].T.numpy()
    pred_xy_rot = rotate_90cc(pred_xy)

    gt_xy = data["ego_future_xyz"].cpu()[0, 0, :, :2].T.numpy()
    gt_xy_rot = rotate_90cc(gt_xy)

    plt.plot(*pred_xy_rot, "o-", label=f"Predicted Trajectory #{i + 1}")

plt.plot(*gt_xy_rot, "r-", label="Ground Truth Trajectory")

plt.xlabel("x coordinate (meters)")
plt.ylabel("y coordinate (meters)")
plt.legend(loc="best")
plt.axis("equal")

plt.savefig("trajectory_eval.png", dpi=200, bbox_inches="tight")
plt.close()
