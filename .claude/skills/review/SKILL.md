---
name: review
description: Review current code changes for Google Style compliance, security issues, and test coverage. Uses Git MCP for diff analysis.
user-invocable: true
allowed-tools: Bash, Read, Grep, Glob, mcp__git
---

`mcp__git` で変更を確認し、以下をチェック:
- Google Style (2-space indent, 80文字/行)
- Python: 型ヒント、docstring
- JavaScript: JSDoc、ES6+
- テストの存在
- 変更量300行以内
- OWASP Top 10 脆弱性
