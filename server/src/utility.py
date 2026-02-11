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

"""Utility functions for image processing and visualization."""

from pathlib import Path
from typing import Iterable, List, Tuple

import cv2
import numpy as np
import torch


def put_text_with_bg(
    img: np.ndarray,
    text: str,
    position: Tuple[int, int],
    *,
    font: int = cv2.FONT_HERSHEY_SIMPLEX,
    font_scale: float = 1.0,
    text_color: Tuple[int, int, int] = (0, 255, 0),
    bg_color: Tuple[int, int, int] = (0, 0, 0),
    thickness: int = 2,
    bg_thickness_ratio: int = 3,
) -> None:
  """Draw text with a background (outline) on an image.

  Args:
    img: OpenCV image (BGR).
    text: Text to draw.
    position: (x, y) bottom-left corner of the text.
    font: OpenCV font.
    font_scale: Font scale.
    text_color: Text color (BGR).
    bg_color: Background (outline) color (BGR).
    thickness: Text thickness.
    bg_thickness_ratio: Multiplier for background thickness.
  """
  x, y = position

  for color, thick in (
      (bg_color, thickness * bg_thickness_ratio),
      (text_color, thickness),
  ):
    cv2.putText(
        img,
        text,
        (x, y),
        font,
        font_scale,
        color,
        thick,
        cv2.LINE_AA,
    )


def draw_trajectory(
    traj_x: Iterable[np.ndarray],
    traj_y: Iterable[np.ndarray],
    *,
    world_width_m: float = 5.0,
    world_height_m: float = 100.0,
    image_width_px: int = 400,
    image_height_px: int = 400,
    color: Tuple[int, int, int] = (0, 255, 0),
    thickness: int = 2,
) -> np.ndarray:
  """Draw 2D trajectories on an image.

  Args:
    traj_x: List of 1D numpy arrays with shape (N,) representing x coordinates.
    traj_y: List of 1D numpy arrays with shape (N,) representing y coordinates.
    world_width_m: Width of the real-world area in meters.
    world_height_m: Height of the real-world area in meters.
    image_width_px: Output image width in pixels.
    image_height_px: Output image height in pixels.
    color: Polyline color in BGR format.
    thickness: Line thickness in pixels.

  Returns:
    Rendered image with trajectories.
  """
  img = np.zeros((image_height_px, image_width_px, 3), dtype=np.uint8)

  for x_m, y_m in zip(traj_x, traj_y):
    # Convert meters to pixels (origin at center in x, bottom in y)
    x_px = (x_m + world_width_m / 2) / world_width_m * (image_width_px - 1)
    y_px = y_m / world_height_m * (image_height_px - 1)

    # Flip y-axis (physical: upward positive, image: downward positive)
    y_px = (image_height_px - 1) - y_px

    # Stack and convert to integer pixel coordinates
    pts = np.stack((x_px, y_px), axis=1).astype(np.int32)

    # Clip points to stay inside the image
    pts[:, 0] = np.clip(pts[:, 0], 0, image_width_px - 1)
    pts[:, 1] = np.clip(pts[:, 1], 0, image_height_px - 1)

    # OpenCV expects shape (N, 1, 2)
    pts_cv = pts.reshape(-1, 1, 2)

    cv2.polylines(
        img,
        [pts_cv],
        isClosed=False,
        color=color,
        thickness=thickness,
    )

    for p in pts:
      cv2.circle(img, tuple(p), thickness, (0, 0, 255), -1)

  return img


def depth_to_color(
    depth_m: float,
    min_depth_m: float,
    max_depth_m: float,
) -> Tuple[int, int, int]:
  """Map depth value to a color.

  Near depth is mapped to green, far depth is mapped to blue.

  Args:
    depth_m: Depth value in meters.
    min_depth_m: Minimum depth for normalization.
    max_depth_m: Maximum depth for normalization.

  Returns:
    Color tuple (B, G, R) corresponding to the depth.
  """
  t = (depth_m - min_depth_m) / max(max_depth_m - min_depth_m, 1e-6)
  t = np.clip(t, 0.0, 1.0)

  b = int(255 * t)
  g = int(255 * (1.0 - t))
  r = 0

  return b, g, r


def draw_trajectory_projected(
    img: np.ndarray,
    traj_x: Iterable[np.ndarray],
    traj_y: Iterable[np.ndarray],
    *,
    fx: float,
    fy: float,
    camera_height_m: float,
    camera_pitch_deg: float,
    thickness: int = 2,
) -> np.ndarray:
  """Project 3D ground-plane trajectories onto an image.

  Args:
    img: Input OpenCV image (BGR).
    traj_x: List of 1D numpy arrays representing x coordinates in meters.
    traj_y: List of 1D numpy arrays representing y coordinates in meters.
    fx: Camera focal length in x direction (pixels).
    fy: Camera focal length in y direction (pixels).
    camera_height_m: Camera height above the ground in meters.
    camera_pitch_deg: Camera pitch angle in degrees.
    thickness: Line thickness in pixels.

  Returns:
    Image with projected trajectories drawn.
  """
  img = img.copy()
  img_h, img_w = img.shape[:2]

  # Camera intrinsics
  cx = img_w / 2.0
  cy = img_h / 2.0

  camera_matrix = np.array(
      [
          [fx, 0.0, cx],
          [0.0, fy, cy],
          [0.0, 0.0, 1.0],
      ],
      dtype=np.float64,
  )

  dist_coeffs = np.zeros(5, dtype=np.float64)

  # Camera extrinsics: rotation vector (pitch around X-axis)
  rvec = np.array(
      [np.deg2rad(-camera_pitch_deg), 0.0, 0.0],
      dtype=np.float64,
  )

  # Translation vector (OpenCV camera coordinate: Y-axis points downward)
  tvec = np.array(
      [0.0, camera_height_m, 0.0],
      dtype=np.float64,
  )

  # Debug: project a far point to visualize camera viewing direction
  far_point_3d = np.array([[0.0, 0.0, 1000.0]], dtype=np.float64)
  far_point_2d, _ = cv2.projectPoints(
      far_point_3d, rvec, tvec, camera_matrix, dist_coeffs
  )

  cv2.circle(
      img,
      tuple(far_point_2d.reshape(2).astype(int)),
      radius=6,
      color=(0, 255, 0),
      thickness=1,
  )

  # Project and draw each trajectory
  for x_m, y_m in zip(traj_x, traj_y):
    # Construct 3D points on the ground plane (Y = 0)
    pts_3d = np.stack(
        (x_m, np.zeros_like(x_m), y_m),
        axis=1,
    ).astype(np.float64)

    # Project 3D points onto the image plane
    pts_img, _ = cv2.projectPoints(
        pts_3d, rvec, tvec, camera_matrix, dist_coeffs
    )
    pts_img = pts_img.reshape(-1, 2)

    # Draw line segments with depth-based coloring
    for i in range(len(pts_img) - 1):
      p1 = tuple(pts_img[i].astype(int))
      p2 = tuple(pts_img[i + 1].astype(int))

      color = depth_to_color(
          depth_m=i,
          min_depth_m=0,
          max_depth_m=len(pts_img),
      )

      cv2.line(img, p1, p2, color=color, thickness=thickness)

  return img


def create_dummy_ego_history(
    num_history_steps: int = 16,
) -> tuple[torch.Tensor, torch.Tensor]:
  """Create dummy ego history data (stationary vehicle).

  Args:
    num_history_steps: Number of history steps (default: 16 for 1.6s at 10Hz).

  Returns:
    Tuple of (ego_history_xyz, ego_history_rot).
    - ego_history_xyz: (1, 1, num_history_steps, 3) tensor.
    - ego_history_rot: (1, 1, num_history_steps, 3, 3) identity rotations.
  """
  ego_history_xyz = torch.tensor(
      [[[[-1.3570e+01, 6.1380e-02, -2.1795e-02],
         [-1.2617e+01, 5.5023e-02, -2.1486e-02],
         [-1.1672e+01, 4.9834e-02, -1.9761e-02],
         [-1.0734e+01, 4.4695e-02, -1.8918e-02],
         [-9.8024e+00, 3.9981e-02, -1.9593e-02],
         [-8.8790e+00, 3.4502e-02, -1.6825e-02],
         [-7.9635e+00, 3.0071e-02, -1.1910e-02],
         [-7.0550e+00, 2.5193e-02, -8.3880e-03],
         [-6.1544e+00, 2.0703e-02, -3.8120e-03],
         [-5.2613e+00, 1.6889e-02, 7.0526e-04],
         [-4.3742e+00, 1.2481e-02, 4.6805e-03],
         [-3.4911e+00, 9.1459e-03, 2.9236e-03],
         [-2.6119e+00, 5.6781e-03, 7.7996e-05],
         [-1.7369e+00, 3.5528e-03, -1.8224e-03],
         [-8.6643e-01, 1.9681e-03, -1.7388e-03],
         [0.0000e+00, 0.0000e+00, 0.0000e+00]]]],
      dtype=torch.float32,
  )
  ego_history_rot = torch.eye(3).unsqueeze(0).unsqueeze(0).unsqueeze(0).expand(
      1, 1, num_history_steps, 3, 3
  ).clone()
  return ego_history_xyz, ego_history_rot


IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg")


def load_images_opencv(folder_path: str | Path) -> List[np.ndarray]:
  """Load images in a folder using OpenCV.

  Args:
    folder_path: Path to a folder containing images.

  Returns:
    List of images as numpy arrays (BGR, HWC).

  Raises:
    FileNotFoundError: If the folder does not exist.
    RuntimeError: If no images could be loaded.
  """
  folder = Path(folder_path)
  if not folder.is_dir():
    raise FileNotFoundError(f"Folder not found: {folder}")

  image_paths = sorted(
      p for p in folder.iterdir()
      if p.suffix.lower() in IMAGE_EXTENSIONS
  )

  images: List[np.ndarray] = []

  for path in image_paths:
    img = cv2.imread(str(path))
    if img is not None:
      images.append(img)

  if not images:
    raise RuntimeError(f"No images could be loaded from: {folder}")

  return images


def opencv_images_to_torch(
    images: Iterable[np.ndarray],
    *,
    rgb: bool = True,
) -> torch.Tensor:
  """Convert a list of OpenCV images to a Torch tensor.

  Args:
    images: Iterable of OpenCV images. Each image must be a uint8 numpy
      array with shape (H, W, 3) in BGR order.
    rgb: If True, convert images from BGR to RGB.

  Returns:
    Torch tensor with shape (N, 3, H, W), dtype=torch.uint8, range [0, 255].
  """
  tensors: List[torch.Tensor] = []

  for img in images:
    if img.dtype != np.uint8:
      raise ValueError("OpenCV image must have dtype uint8")

    if img.ndim != 3 or img.shape[2] != 3:
      raise ValueError("OpenCV image must have shape (H, W, 3)")

    if rgb:
      img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    img_chw = img.transpose(2, 0, 1)
    tensor = torch.from_numpy(img_chw)
    tensors.append(tensor)

  return torch.stack(tensors, dim=0)
