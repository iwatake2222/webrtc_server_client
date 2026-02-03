# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Real-time video processing application using WebRTC. Client captures camera video, sends to Python server via WebRTC, server applies Canny edge detection (OpenCV), returns processed video to client with stats via DataChannel.

## Commands

### Server (Python)
```bash
cd server
uv venv                                         # Create venv
uv sync                                         # Install dependencies
source .venv/bin/activate                       # Activate venv
python -m src.main --host 0.0.0.0 --port 8080   # Run server (default: canny)
python -m src.main --processor blur             # Run with blur processor
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

### System Overview

```
Browser (client/)                    Python Server (server/)
┌─────────────────┐                 ┌─────────────────────────────────┐
│ CameraManager   │──video track──→│ VideoTransformTrack             │
│ (camera.js)     │                 │ (webrtc_server.py)              │
│                 │                 │         │                       │
│ WebRTCClient    │←─processed─────│   ProcessorManager              │
│ (webrtc.js)     │   video         │   (processor_manager.py)        │
│                 │                 │         │                       │
│ StatsManager    │──timestamp/────→│   BaseProcessor (Strategy)      │
│ (stats.js)      │  frame_id       │     ├─ CannyProcessor           │
│                 │←─stats JSON─────│     └─ BlurProcessor            │
│                 │  (DataChannel)  │                                 │
└─────────────────┘                 └─────────────────────────────────┘
```

### Processor Architecture (Strategy Pattern)

```
┌─────────────────────┐
│  ProcessorManager   │  - Processor selection at startup
│                     │  - FPS calculation & stats tracking
│                     │  - Client timestamp/frame ID management
└──────────┬──────────┘
           │ uses
           ▼
┌─────────────────────┐
│   BaseProcessor     │  Abstract base class (src/processors/base_processor.py)
│   <<abstract>>      │
│  + name: str        │
│  + process(frame)   │
└──────────┬──────────┘
           │ implements
     ┌─────┴─────┐
     ▼           ▼
┌──────────┐ ┌──────────┐
│  Canny   │ │   Blur   │
│Processor │ │Processor │
└──────────┘ └──────────┘
```

**Key Files:**
- `src/processor_manager.py` - Coordinates processing, tracks stats
- `src/processors/base_processor.py` - Abstract base class
- `src/processors/canny_processor.py` - Canny edge detection
- `src/processors/blur_processor.py` - Gaussian blur

### Data Flow

```
1. Startup
   main.py --processor canny/blur
       │
       ▼
   WebRTCServer(processor="canny")
       │
       ▼
   ProcessorManager(processor="canny")
       │
       ▼
   CannyProcessor() or BlurProcessor()

2. Frame Processing (per WebSocket connection)
   Client                          Server
     │                               │
     │──── video frame ────────────→│ VideoTransformTrack.recv()
     │                               │      │
     │──── timestamp JSON ─────────→│      │ (DataChannel)
     │     {type:"timestamp",        │      │
     │      ts, client_frame_id}     │      ▼
     │                               │ ProcessorManager.process(frame)
     │                               │      │
     │                               │      ▼
     │                               │ BaseProcessor.process(frame)
     │                               │      │
     │←─── processed frame ─────────│←─────┘
     │                               │
     │←─── stats JSON ──────────────│ (DataChannel)
     │     {frame_id, width, height, │
     │      fps, processing_time_ms, │
     │      processor, client_ts,    │
     │      client_frame_id}         │
```

### DataChannel Messages

**Client → Server (timestamp):**
```json
{
  "type": "timestamp",
  "ts": 1234567890,
  "client_frame_id": 42
}
```

**Server → Client (stats):**
```json
{
  "frame_id": 123,
  "width": 640,
  "height": 480,
  "fps": 30.0,
  "processing_time_ms": 5.23,
  "processor": "canny",
  "client_ts": 1234567890,
  "client_frame_id": 42
}
```
※ `client_ts`, `client_frame_id` はクライアントから送信された場合のみ含まれる

### Adding New Processor

1. Create `src/processors/new_processor.py`:
```python
class NewProcessor(BaseProcessor):
  @property
  def name(self) -> str:
    return "new"

  def process(self, frame: NDArray[np.uint8]) -> tuple[NDArray[np.uint8], dict[str, Any]]:
    # Process frame
    return processed, {"processor": self.name}
```

2. Register in `src/processor_manager.py`:
```python
def _create_processor(self, name: str) -> BaseProcessor:
  if name == "canny":
    return CannyProcessor()
  if name == "blur":
    return BlurProcessor()
  if name == "new":
    return NewProcessor()
  raise ValueError(f"Unknown processor: {name}")
```

3. Add CLI option in `src/main.py`:
```python
choices=["canny", "blur", "new"]
```

4. Export in `src/processors/__init__.py`

5. Add tests in `tests/test_new_processor.py`

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
