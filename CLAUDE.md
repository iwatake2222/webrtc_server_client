# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Real-time video processing application using WebRTC. Client captures camera video, sends to Python server via WebRTC, server applies Canny edge detection (OpenCV), returns processed video to client with stats via DataChannel.

## Commands

### Server (Python)
```bash
cd server
source .venv/bin/activate
python -m src.main --host 0.0.0.0 --port 8080  # Run server
pytest -v                                       # Run tests
pytest tests/test_image_processor.py::test_xxx  # Single test
flake8 src/ tests/                              # Lint
pylint src/                                     # Pylint
mypy src/                                       # Type check
```

### Client (JavaScript)
```bash
cd client
npm test                  # Run tests (vitest)
npm run lint              # ESLint
```

## Architecture

```
Browser (client/)                    Python Server (server/)
┌─────────────────┐                 ┌─────────────────────┐
│ CameraManager   │──video track──→│ VideoTransformTrack │
│ (camera.js)     │                 │ (webrtc_server.py)  │
│                 │                 │         │           │
│ WebRTCClient    │←─processed────→│   ImageProcessor    │
│ (webrtc.js)     │   video         │ (image_processor.py)│
│                 │                 │         │           │
│ StatsManager    │←─stats JSON────→│ DataChannel stats   │
│ (stats.js)      │  (DataChannel)  │                     │
└─────────────────┘                 └─────────────────────┘
```

**Data Flow:**
1. `CameraManager` captures video → WebRTC track
2. `WebRTCClient` handles signaling via WebSocket (`/ws`)
3. Server's `VideoTransformTrack` receives frames, applies `ImageProcessor.process()` (Canny edge detection)
4. Stats (fps, resolution, processing_time_ms, latency) sent back via DataChannel

## Rules

- Google Style Guide, 2-space indent
- Tests required for all code
- Python: Type hints required, mypy strict mode
- No direct commits to main, PR max 300 lines

## Skill Usage (Required)

| When | Skill | Description |
|------|-------|-------------|
| Creating branch | `branch` | Create branch following naming conventions |
| After code changes | `test` | Run all tests |
| Before commit | `pre-commit` | Check branch status (prevent work on merged branches) |
| Before commit | `lint` | Static analysis (flake8, pylint, ESLint) |
| Before commit | `typecheck` | Type checking (mypy) |
| Before PR | `review` | Review changes (includes 300-line limit check) |
| Creating PR | `pr` | Create PR after line count check |

**Workflow:**
1. `branch` - Create feature branch
2. Implement code
3. `test` - Run tests
4. `pre-commit` - Check branch status
5. `lint` - Run style checks
6. `typecheck` - Run type checks
7. Commit changes
8. `review` - Review changes
9. `pr` - Create pull request

## License

- Apache 2.0 (Copyright 2026 iwatake2222)
- License header required in all source files
