# Alpamayo WebRTC Demo

Real-time video processing application using WebRTC with NVIDIA Alpamayo trajectory prediction.

## Features

- Real-time video streaming from client to server via WebRTC
- Image processing with multiple processor options:
  - **Alpamayo**: NVIDIA Alpamayo-R1 model for trajectory prediction with visualization
  - **Canny**: Canny edge detection using OpenCV
  - **Blur**: Gaussian blur using OpenCV
- Return processed video to client in real-time
- Send processing stats (image size, FPS, processing time, CoT) via DataChannel
- Mobile-friendly web client with sensor data support (GPS, accelerometer, gyroscope)

## System Requirements

- **GPU**: NVIDIA GPU with CUDA support (required for Alpamayo processor)
- **VRAM**: 24GB+ recommended for Alpamayo-R1-10B model
- **Python**: 3.12+
- **Node.js**: 20+ (for client development)

## Quick Start (AWS Deployment)

### 1. Deploy AWS Infrastructure

```bash
cd aws

Region=ap-northeast-1
AvailabilityZone=ap-northeast-1d
ImageId=ami-0e7d0c8815f409923   # Deep Learning OSS Nvidia Driver AMI GPU PyTorch 2.9 (Ubuntu 24.04)
InstanceType=g6.2xlarge
RootVolumeSize=256
SystemName=webrtc-alpamayo
TemplateFileName=./ec2_public_alb.yaml

aws cloudformation deploy \
  --region "${Region}" \
  --stack-name "${SystemName}" \
  --template-file ${TemplateFileName} \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    SystemName="${SystemName}" \
    AvailabilityZone="${AvailabilityZone}" \
    ImageId="${ImageId}" \
    InstanceType="${InstanceType}" \
    RootVolumeSize="${RootVolumeSize}"
```

### 2. Setup on EC2

```bash
# Install dependencies
sudo apt update
sudo apt install -y nvidia-cuda-toolkit python3-pip
pip install huggingface_hub
huggingface-cli login

# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"

# Clone and setup
git clone https://github.com/iwatake2222/webrtc_server_client.git
cd webrtc_server_client
git submodule update --init

# Install Python dependencies
cd server
uv venv
source .venv/bin/activate
cd alpamayo
uv sync --active
cd ..
uv pip install -e .

# Test demo
python3 src/demo_01_example_clip.py

# Generate SSL certificate and run server
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"
python -m src.main --host 0.0.0.0 --port 8080 --cert cert.pem --key key.pem --processor alpamayo
```

### 3. Access the Application

1. Open `https://ec2-xxx-xxx-xxx-xxx.ap-northeast-1.compute.amazonaws.com:8080/`
2. Accept the self-signed certificate warning (click "Advanced" -> "Proceed to site")
3. Click the **Connect** button

## Local Development

### Setup

#### Server

```bash
cd server
uv venv
uv sync
source .venv/bin/activate  # Windows: .venv\Scripts\activate
```

#### Client

```bash
cd client
npm install
```

### Run

#### HTTP (localhost only)

```bash
cd server
source .venv/bin/activate
python -m src.main --host 0.0.0.0 --port 8080                      # Canny (default)
python -m src.main --host 0.0.0.0 --port 8080 --processor blur     # Blur
python -m src.main --host 0.0.0.0 --port 8080 --processor alpamayo # Alpamayo
```

Open `http://localhost:8080` in browser.

#### HTTPS (required for remote access)

HTTPS is required for camera access (`navigator.mediaDevices`) from remote browsers.

```bash
cd server

# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"

# Run with HTTPS
source .venv/bin/activate
python -m src.main --host 0.0.0.0 --port 8080 --cert cert.pem --key key.pem --processor alpamayo
```

Open `https://<server-ip>:8080` and accept the certificate warning.

### Test

#### Server

```bash
cd server
source .venv/bin/activate
pytest -v
flake8 src/ tests/
pylint src/
mypy src/
```

#### Client

```bash
cd client
npm test
npm run lint
```

## Command Line Options

| Option | Default | Description |
|--------|---------|-------------|
| `--host` | `0.0.0.0` | Host address to bind |
| `--port` | `8080` | Port to listen on |
| `--processor` | `canny` | Image processor (`canny`, `blur`, `alpamayo`) |
| `--log-level` | `INFO` | Log level (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |
| `--cert` | None | Path to SSL certificate file (enables HTTPS) |
| `--key` | None | Path to SSL private key file |

## API Endpoints

| URL | Description |
|-----|-------------|
| `/` | Client UI |
| `/ws` | WebSocket signaling |
| `/health` | Health check |

## SSH Configuration for AWS EC2

Add to `~/.ssh/config`:

```bash
Host i-* mi-*
    ProxyCommand sh -c "aws ec2-instance-connect send-ssh-public-key --instance-id %h --instance-os-user %r --ssh-public-key 'file://~/.ssh/id_rsa.pub' && aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p'"

# Optional: specific instance alias
Host webrtc-ec2-server
    HostName i-00000000000000000
    User ubuntu
    ProxyCommand sh -c "aws ec2-instance-connect send-ssh-public-key --instance-id %h --instance-os-user %r --ssh-public-key 'file://~/.ssh/id_rsa.pub' && aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p'"
```

For Windows PowerShell, replace:
- `sh -c` -> `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`
- `&&` -> `;`

Connect via:

```bash
ssh ubuntu@i-00000000000000000
# or
ssh webrtc-ec2-server
```

## Acknowledgments

This project uses [NVIDIA Alpamayo](https://github.com/NVlabs/alpamayo) for trajectory prediction.

- **Inference code**: Apache 2.0 License
- **Model weights**: Non-commercial license (research and evaluation only)

If you use Alpamayo in research, please cite:

```bibtex
@article{wang2025alpamayo,
  title={Alpamayo-R1: Bridging Reasoning and Action Prediction for Generalizable Autonomous Driving in the Long Tail},
  author={Wang, Yan and Luo, Wenjie and Ivanovic, Boris and Pavone, Marco and others},
  journal={arXiv preprint arXiv:2511.00088},
  year={2025}
}
```

## License

This project is licensed under Apache 2.0.

**Note**: The Alpamayo model weights are released under a non-commercial license and are intended for research, experimentation, and evaluation purposes only.
