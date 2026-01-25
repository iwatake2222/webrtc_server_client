---
name: lint
description: Run static analysis tools (pylint, flake8 for Python, ESLint for JavaScript) to check Google Style compliance.
user-invocable: true
allowed-tools: Bash, Read
---

```bash
# Python
cd server && python -m flake8 src/ tests/ --max-line-length=80
cd server && python -m pylint src/ --indent-string='  '

# JavaScript
cd client && npx eslint src/ --ext .js
```
