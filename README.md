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

## ライセンス

Apache 2.0
