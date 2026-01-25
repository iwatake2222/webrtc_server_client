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

"""Main entry point for WebRTC server."""

import argparse
import asyncio
import logging

from src.webrtc_server import WebRTCServer


def parse_args() -> argparse.Namespace:
  """Parse command line arguments.

  Returns:
    Parsed command line arguments.
  """
  parser = argparse.ArgumentParser(description="WebRTC Video Processing Server")
  parser.add_argument(
      "--host",
      type=str,
      default="0.0.0.0",
      help="Host address to bind to (default: 0.0.0.0)"
  )
  parser.add_argument(
      "--port",
      type=int,
      default=8080,
      help="Port to listen on (default: 8080)"
  )
  parser.add_argument(
      "--log-level",
      type=str,
      default="INFO",
      choices=["DEBUG", "INFO", "WARNING", "ERROR"],
      help="Logging level (default: INFO)"
  )
  return parser.parse_args()


async def main() -> None:
  """Run the WebRTC server."""
  args = parse_args()

  logging.basicConfig(
      level=getattr(logging, args.log_level),
      format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
  )

  server = WebRTCServer(host=args.host, port=args.port)

  try:
    await server.start()
    while True:
      await asyncio.sleep(3600)
  except KeyboardInterrupt:
    pass
  finally:
    await server.stop()


if __name__ == "__main__":
  asyncio.run(main())
