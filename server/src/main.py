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
import ssl
from pathlib import Path

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
  parser.add_argument(
      "--cert",
      type=str,
      default=None,
      help="Path to SSL certificate file (enables HTTPS)"
  )
  parser.add_argument(
      "--key",
      type=str,
      default=None,
      help="Path to SSL private key file"
  )
  parser.add_argument(
      "--processor",
      type=str,
      default="canny",
      choices=["canny", "blur"],
      help="Image processor to use (default: canny)"
  )
  return parser.parse_args()


async def main() -> None:
  """Run the WebRTC server."""
  args = parse_args()

  logging.basicConfig(
      level=getattr(logging, args.log_level),
      format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
  )

  ssl_context = None
  if args.cert and args.key:
    cert_path = Path(args.cert)
    key_path = Path(args.key)
    if not cert_path.exists():
      raise FileNotFoundError(f"Certificate file not found: {cert_path}")
    if not key_path.exists():
      raise FileNotFoundError(f"Key file not found: {key_path}")
    ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
    ssl_context.load_cert_chain(str(cert_path), str(key_path))

  server = WebRTCServer(
      host=args.host,
      port=args.port,
      ssl_context=ssl_context,
      processor=args.processor
  )

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
