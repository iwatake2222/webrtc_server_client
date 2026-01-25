---
name: test
description: Run all project tests including Python pytest and JavaScript tests. Reports test results and failures.
user-invocable: true
allowed-tools: Bash, Read
---

```bash
# Python
cd server && python -m pytest tests/ -v --tb=short

# JavaScript
cd client && npm test
```
