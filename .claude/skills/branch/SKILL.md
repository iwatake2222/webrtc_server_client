---
name: branch
description: Create a new feature branch following naming conventions. Uses Git MCP for branch operations.
user-invocable: true
allowed-tools: Bash, mcp__git
---

$ARGUMENTS でブランチ作成。prefix必須:
`feat/`, `fix/`, `docs/`, `refactor/`, `ci/`, `test/`, `chore/`

例: `/branch feat/add-signaling-server`
