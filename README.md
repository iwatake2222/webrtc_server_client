# WebRTC Server-Client

Python + HTML/JavaScript を使用した WebRTC サーバー・クライアントアプリケーション

## 環境セットアップ

### 必要条件

- Python 3.12+
- Node.js 20+

### Server

```bash
cd server
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Client

```bash
cd client
npm install
```

## ビルド

現在ビルドステップは不要です。

## テスト

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

## 実行

### Server

```bash
cd server
source .venv/bin/activate
python -m src.main
```

### Client

ブラウザで `client/index.html` を開く

## Deploy for AWS

### EC2サーバーの構築

```bash
cd aws

Region=ap-northeast-1
AvailabilityZone=ap-northeast-1a

SystemName=webrtc-ec2-public-alb
TemplateFileName=./ec2_public_alb.yaml

aws cloudformation deploy \
--region "${Region}" \
--stack-name "${SystemName}" \
--template-file ${TemplateFileName} \
--capabilities CAPABILITY_NAMED_IAM \
--parameter-overrides \
SystemName="${SystemName}" \
AvailabilityZone="${AvailabilityZone}"
```

### SSH設定

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
    ProxyCommand sh -c "aws ec2-instance-connect send-ssh-public-key --instance-id %h --instance-os-user %r --ssh-public-key 'file://~/.ssh/id_rsa.pub' && aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p'"
```

```bash
ssh ubuntu@i-00000000000000000
# or
ssh webrtc-ec2-server
```

## ライセンス

Apache 2.0
