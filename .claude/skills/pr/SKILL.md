---
name: pr
description: Create a pull request with change validation. Checks line count limit (max 300 lines) and ensures proper commit prefix. Uses GitHub MCP for PR operations.
user-invocable: true
allowed-tools: Bash, Read, Grep, mcp__github, mcp__git
---

1. `git diff main --stat` で変更量確認（最大300行）
2. 300行超は分割を提案
3. PRタイトルにprefix: `feat:`, `fix:`, `docs:`, `refactor:`, `ci:`, `test:`, `chore:`
4. `mcp__github` または `gh pr create` でPR作成
