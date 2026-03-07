# Security

- **API:** Use HTTPS only in production. Secrets (JWT, DB URL, etc.) must come from environment variables; see `backend/.env.example`. No secrets in repo or client bundles.
- **Rate limiting:** Implement rate limiting on auth and public endpoints in production.
- **CORS:** Backend is configured for a single web origin (`CORS_ORIGIN`); set appropriately for your deployment.
- **Data:** Sensitive data at rest should be encrypted (DB, backups). Define retention and deletion for vitals and PII; support account deletion and data export as in the product plan.
