# WebRTC Server-Client Project

Python + HTML/JavaScript WebRTC サーバー・クライアント

## Tech Stack
- Backend: Python (FastAPI/Flask)
- Frontend: HTML + Vanilla JS
- Protocol: WebRTC, WebSocket

## Project Structure
```
server/   # Python backend (src/, tests/)
client/   # HTML/JS frontend (src/, tests/)
```

## Rules
- Google Style Guide, 2-space indent
- 全コードにテスト必須
- Python: 型ヒント必須、mypy strict mode
- main直接コミット禁止、PR最大300行

## Skill Usage (必須)
以下のタイミングで対応するskillを必ず使用すること：

| タイミング | Skill | 説明 |
|-----------|-------|------|
| ブランチ作成時 | `branch` | 命名規則に従ったブランチ作成 |
| コード変更後 | `test` | 全テスト実行 |
| コミット前 | `pre-commit` | ブランチ状態確認（マージ済みブランチでの作業防止） |
| コミット前 | `lint` | 静的解析（flake8, pylint, ESLint） |
| コミット前 | `typecheck` | 型チェック（mypy） |
| PR作成前 | `review` | 変更内容のレビュー（300行制限確認含む） |
| PR作成時 | `pr` | 行数チェック後にPR作成 |

**ワークフロー例:**
1. `branch` → ブランチ作成
2. コード実装
3. `test` → テスト実行
4. `pre-commit` → ブランチ状態確認
5. `lint` → スタイルチェック（flake8 + pylint + ESLint全て）
6. `typecheck` → 型チェック
7. コミット
8. `review` → 変更レビュー
9. `pr` → PR作成

## Setup
```bash
# pre-commit hookのインストール（初回のみ）
pip install pre-commit
pre-commit install
```
pre-commitにより、コミット時に自動でlint/test/typecheckが実行される。

## License
- Apache 2.0 (Copyright 2026 iwatake2222)
- 全ソースファイルにライセンスヘッダー必須
