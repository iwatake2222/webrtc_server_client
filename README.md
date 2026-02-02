# WebRTC Server-Client

Real-time video processing application using Python + HTML/JavaScript WebRTC

## Features

- Send camera video from client to server via WebRTC
- Server applies Canny edge detection using OpenCV
- Return processed video to client in real-time
- Send processing stats (image size, FPS, processing time) via DataChannel

## Setup

### Requirements

- Python 3.12+
- Node.js 20+
- uv (Python package manager)

### Server

```bash
cd server
uv venv
uv sync
source .venv/bin/activate  # Windows: .venv\Scripts\activate
```

### Client

```bash
cd client
npm install
```

## Build

No build step required.

## Test

### Server

```bash
cd server
source .venv/bin/activate
pytest -v
flake8 src/ tests/
pylint src/
mypy src/
```

### Client

```bash
cd client
npm test
npm run lint
```

## Run

### HTTP (Local Development)

```bash
cd server
source .venv/bin/activate
python -m src.main --host 0.0.0.0 --port 8080
```

Open `http://localhost:8080` in browser

### HTTPS (Remote Access)

When accessing from a remote browser (e.g., AWS server), HTTPS is required for camera access (`navigator.mediaDevices`).

1. Generate self-signed certificate:

```bash
cd server
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"
```

2. Start server with HTTPS:

```bash
python -m src.main --host 0.0.0.0 --port 8080 --cert cert.pem --key key.pem
```

3. Open `https://<server-ip>:8080` in browser
   - Accept the self-signed certificate warning

### Command Line Options

| Option | Default | Description |
|--------|---------|-------------|
| `--host` | `0.0.0.0` | Host address to bind |
| `--port` | `8080` | Port to listen on |
| `--log-level` | `INFO` | Log level (DEBUG/INFO/WARNING/ERROR) |
| `--cert` | None | Path to SSL certificate file (enables HTTPS) |
| `--key` | None | Path to SSL private key file |

### Endpoints

| URL | Description |
|-----|-------------|
| `http://localhost:8080/` | Client UI |
| `ws://localhost:8080/ws` | WebSocket signaling |
| `http://localhost:8080/health` | Health check |

## Deploy for AWS

### Build EC2 Server

```bash
cd aws

Region=ap-northeast-1
AvailabilityZone=ap-northeast-1d
ImageId=ami-0e7d0c8815f409923  # Deep Learning OSS Nvidia Driver AMI GPU PyTorch 2.9 (Ubuntu 24.04)
InstanceType=g5.4xlarge
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

### SSH Configuration

- Configure `~/.ssh/config`
  - (Optional) For Windows: Replace the followings
    - `sh -c` -> `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`
    - `&&` -> `;`
- Connect

```bash
# ~/.ssh/config
Host i-* mi-*
    ProxyCommand sh -c "aws ec2-instance-connect send-ssh-public-key --instance-id %h --instance-os-user %r --ssh-public-key 'file://~/.ssh/id_rsa.pub' && aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p'"

# (Optional) To specify host id
Host webrtc-ec2-server
    HostName i-00000000000000000
    User ubuntu
    # User ec2-user
    ProxyCommand sh -c "aws ec2-instance-connect send-ssh-public-key --instance-id %h --instance-os-user %r --ssh-public-key 'file://~/.ssh/id_rsa.pub' && aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p'"
```

```bash
ssh ubuntu@i-00000000000000000
ssh ec2-user@i-00000000000000000
# or
ssh webrtc-ec2-server
```

## License

Apache 2.0
