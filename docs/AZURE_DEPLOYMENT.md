# IQueue Azure Hackathon Deployment

This runbook deploys IQueue as a split hackathon stack:

- **Frontend:** Vercel
- **Backend:** Azure Linux App Service custom container
- **Database:** Azure Database for PostgreSQL Flexible Server
- **Artifacts:** baked into the backend image for runtime, backed up in Azure Blob via DVC

## 1. Prerequisites

- Azure CLI logged into the subscription that will host IQueue
- Docker installed locally
- Vercel project ready for the frontend
- Local `.env` filled from `.env.example`
- Full forecasting bundle present in `iqueue_artifacts/artifacts`
- Chatbot model unzipped into `deployments/xlm-roberta-iqueue`

Required local files before a release:

- `iqueue_artifacts/artifacts/bundle_manifest.json`
- `iqueue_artifacts/artifacts/model_metadata.json`
- `deployments/xlm-roberta-iqueue/model.safetensors`
- `deployments/xlm-roberta-iqueue/label_map.json`

## 2. Bootstrap Azure once

Provision the resource group, ACR, App Service plan, storage account, Blob container, and PostgreSQL Flexible Server:

```bash
./scripts/bootstrap-azure-hackathon.sh
```

The script prints a recommended `DATABASE_URL` and `AZURE_STORAGE_CONNECTION_STRING`.

Use the printed values to update `.env`:

- `DATABASE_URL=postgresql+asyncpg://...?...sslmode=require`
- `AZURE_STORAGE_CONNECTION_STRING=...`

Notes:

- Prefer a URL-safe PostgreSQL admin password for the hackathon, or URL-encode it
  before copying it into `DATABASE_URL`.
- The bootstrap script infers the PostgreSQL tier from the SKU by default. For
  the default `Standard_B1ms`, that means `AZURE_POSTGRES_TIER=Burstable`.
- The bootstrap script does **not** deploy the backend image.
- The PostgreSQL server is created first. For the default App Service setup,
  PostgreSQL public network access is enabled and firewall rules are restricted
  to the App Service outbound IPs during backend deploy. Set
  `AZURE_POSTGRES_SKIP_FIREWALL_SYNC=true` only if you have configured private
  networking yourself.

## 3. Configure DVC backup

Keep model artifacts out of Git and use Blob only for backup/reproducibility:

```bash
dvc remote add -d azure-prod azure://$AZURE_STORAGE_CONTAINER
dvc remote modify azure-prod connection_string "$AZURE_STORAGE_CONNECTION_STRING"
```

Use `dvc push` after training a new artifact bundle and `dvc pull` on any machine that must build the full runtime image.

## 4. Release the backend

Build the immutable full-ML image, push it to ACR, update App Service, wait for readiness, and run smoke checks:

```bash
./scripts/deploy-chatbot-azure.sh
```

If the deploy script stops on a bundle checksum mismatch, refresh the manifest
only after you have intentionally accepted the current artifact set:

```bash
python3 scripts/validate_forecast_bundle.py \
  --artifacts iqueue_artifacts/artifacts \
  --write-manifest
```

The script will:

- validate the forecasting bundle
- build the root `Dockerfile`
- tag the image with `AZURE_IMAGE_TAG` or the current git SHA
- optionally also push `AZURE_IMAGE_ALIAS_TAG` such as `judge-ready`
- configure App Service app settings
- enable PostgreSQL public network access when needed and sync firewall rules to
  the App Service outbound IPs
- wait for `/api/v1/health/readiness`
- run `scripts/smoke_demo.py`

Manual release policy:

- let CI validate code and packaging first
- promote intentionally with the release script
- do not auto-deploy every merge during the hackathon

## 5. Configure the frontend

Deploy the frontend to Vercel, then set:

```bash
NEXT_PUBLIC_API_URL=https://<azure-webapp>.azurewebsites.net/api/v1
```

Make sure backend CORS includes:

- the Vercel production URL
- any preview URL you want to test from

You can keep these in `.env` as:

- `VERCEL_PRODUCTION_URL=https://your-project.vercel.app`
- `VERCEL_PREVIEW_URLS=https://preview-1.vercel.app,https://preview-2.vercel.app`

The deploy script folds those into `ALLOWED_ORIGINS`.

## 6. Acceptance checks

After deployment, verify:

### Backend readiness

- `GET /api/v1/health/live`
- `GET /api/v1/health/readiness`

`/readiness` must report:

- `ready=true`
- `chatbot_ready=true`
- `forecasting_ready=true`
- `forecast_bundle_ready=true`
- `loaded_routes` contains 6 routes

### Smoke demo

The deploy script already runs:

```bash
python3 scripts/smoke_demo.py --base-url https://<backend>/api/v1
```

It checks:

- readiness
- forecasting endpoint
- chatbot intent response
- evidence summary
- retraining replay

### Manual judge path

Verify the public flow:

1. passenger route search
2. seat selection
3. booking confirmation
4. QR verification
5. operator forecast and recommendation action
6. operational outcome logging
7. evidence view
8. retraining replay

## 7. Rollback

To repoint the Web App to a previous known-good image tag:

```bash
./scripts/rollback-azure-webapp.sh <old-tag>
```

Keep at least:

- one previous known-good backend image tag
- one pinned Vercel deployment URL

before demo day.
