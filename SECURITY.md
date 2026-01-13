# Security

If you discover a security issue, please open an issue or contact the project owner privately.

Do NOT commit secrets (API keys, database URLs, private keys, etc.). Use environment variables locally and GitHub Secrets for CI.

Recommended steps:
- Store secrets in GitHub: Settings → Secrets and variables → Actions
- Avoid committing `.env` files; `.env` is ignored by `.gitignore` already
- Rotate any leaked keys immediately
