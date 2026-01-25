"""Tests for app module."""

from src.app import greet


def test_greet() -> None:
  """Test greet function returns correct message."""
  assert greet("World") == "Hello, World!"
