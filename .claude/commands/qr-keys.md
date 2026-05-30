# /qr-keys — Generate QR Boarding Pass Signing Keys

Generate a cryptographically secure HMAC-SHA256 secret key for IQueue QR boarding pass signing.

## Warning

This command generates a new secret. If a key already exists in `.env` and QR passes have already been issued, rotating the key will invalidate all previously issued boarding passes. Warn the user of this before proceeding.

## Steps

1. Check if `QR_HMAC_SECRET` is already set in `.env`:
   ```bash
   grep QR_HMAC_SECRET .env
   ```
   If it is already set, ask the user: "A QR signing key already exists. Rotating it will invalidate all existing QR boarding passes. Are you sure? (yes/no)"

2. Run the generation script:
   ```bash
   python scripts/generate_qr_keys.py
   ```
   
   If the script does not exist yet, generate the key inline and create the script:
   ```python
   import secrets, base64
   key = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()
   print(f"QR_HMAC_SECRET={key}")
   ```

3. Write the generated key to `.env`:
   - If `QR_HMAC_SECRET` already exists in `.env`, replace that line.
   - If it does not exist, append it.
   - Never print the full key in the conversation after writing it — just confirm "Key written to .env".

4. Verify the key is loadable by the backend config:
   ```bash
   cd backend && python -c "from app.core.config import settings; print('QR key loaded:', bool(settings.QR_HMAC_SECRET))"
   ```

5. Remind the user: **Never commit `.env` to Git.** Confirm `.env` is in `.gitignore`.
