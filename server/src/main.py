"""Main entry point."""

from src.app import greet


def main() -> None:
  """Run the application."""
  print(greet("WebRTC"))


if __name__ == "__main__":
  main()
