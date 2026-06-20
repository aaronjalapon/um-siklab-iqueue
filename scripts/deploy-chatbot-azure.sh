#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"

if [[ -f "$repo_root/.env" ]]; then
  # Load deployment variables for this script only.
  # shellcheck disable=SC1090
  source "$repo_root/.env"
fi

if [[ -n "${AZURE_SUBSCRIPTION_ID:-}" ]]; then
  az account set --subscription "$AZURE_SUBSCRIPTION_ID"
fi

: "${AZURE_RESOURCE_GROUP:?Set AZURE_RESOURCE_GROUP}"
: "${AZURE_LOCATION:?Set AZURE_LOCATION}"
: "${AZURE_ACR_NAME:?Set AZURE_ACR_NAME}"
: "${AZURE_APP_SERVICE_PLAN:?Set AZURE_APP_SERVICE_PLAN}"
: "${AZURE_WEBAPP_NAME:?Set AZURE_WEBAPP_NAME}"
: "${DATABASE_URL:?Set DATABASE_URL to the production PostgreSQL URL}"
: "${QR_HMAC_SECRET:?Set QR_HMAC_SECRET}"
: "${SECRET_KEY:?Set SECRET_KEY}"

AZURE_APP_SERVICE_SKU="${AZURE_APP_SERVICE_SKU:-B2}"

python3 "$repo_root/scripts/validate_forecast_bundle.py" \
  --artifacts "$repo_root/iqueue_artifacts/artifacts"

az config set extension.use_dynamic_install=yes_without_prompt >/dev/null

if ! az group show --name "$AZURE_RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Creating resource group ${AZURE_RESOURCE_GROUP} in ${AZURE_LOCATION}"
  az group create --name "$AZURE_RESOURCE_GROUP" --location "$AZURE_LOCATION" >/dev/null
fi

if ! az acr show --name "$AZURE_ACR_NAME" --resource-group "$AZURE_RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Creating Azure Container Registry ${AZURE_ACR_NAME}"
  az acr create \
    --name "$AZURE_ACR_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --sku Basic \
    --admin-enabled true >/dev/null
else
  acr_admin_enabled="$(az acr show --name "$AZURE_ACR_NAME" --resource-group "$AZURE_RESOURCE_GROUP" --query adminUserEnabled -o tsv)"
  if [[ "$acr_admin_enabled" != "true" ]]; then
    az acr update --name "$AZURE_ACR_NAME" --resource-group "$AZURE_RESOURCE_GROUP" --admin-enabled true >/dev/null
  fi
fi

if ! az appservice plan show --name "$AZURE_APP_SERVICE_PLAN" --resource-group "$AZURE_RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Creating Linux App Service plan ${AZURE_APP_SERVICE_PLAN}"
  az appservice plan create \
    --name "$AZURE_APP_SERVICE_PLAN" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --location "$AZURE_LOCATION" \
    --is-linux \
    --sku "$AZURE_APP_SERVICE_SKU" >/dev/null
else
  az appservice plan update \
    --name "$AZURE_APP_SERVICE_PLAN" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --sku "$AZURE_APP_SERVICE_SKU" >/dev/null
fi

IMAGE_NAME="${AZURE_IMAGE_NAME:-iqueue-backend}"
IMAGE_TAG="${AZURE_IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"
ACR_LOGIN_SERVER="$(az acr show --name "$AZURE_ACR_NAME" --resource-group "$AZURE_RESOURCE_GROUP" --query loginServer -o tsv)"
IMAGE_REF="${ACR_LOGIN_SERVER}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "Building ${IMAGE_REF}"
docker build -f "$repo_root/Dockerfile" -t "$IMAGE_REF" "$repo_root"

echo "Pushing ${IMAGE_REF}"
az acr login --name "$AZURE_ACR_NAME"
docker push "$IMAGE_REF"

if az webapp show --name "$AZURE_WEBAPP_NAME" --resource-group "$AZURE_RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Updating existing App Service ${AZURE_WEBAPP_NAME}"
else
  echo "Creating Linux Web App ${AZURE_WEBAPP_NAME}"
  az webapp create \
    --name "$AZURE_WEBAPP_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --plan "$AZURE_APP_SERVICE_PLAN" \
    --deployment-container-image-name "$IMAGE_REF" >/dev/null
fi

acr_username="$(az acr credential show --name "$AZURE_ACR_NAME" --resource-group "$AZURE_RESOURCE_GROUP" --query username -o tsv)"
acr_password="$(az acr credential show --name "$AZURE_ACR_NAME" --resource-group "$AZURE_RESOURCE_GROUP" --query passwords[0].value -o tsv)"

az webapp config container set \
  --name "$AZURE_WEBAPP_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --docker-custom-image-name "$IMAGE_REF" \
  --docker-registry-server-url "https://${ACR_LOGIN_SERVER}" \
  --docker-registry-server-user "$acr_username" \
  --docker-registry-server-password "$acr_password" >/dev/null

az webapp config appsettings set \
  --name "$AZURE_WEBAPP_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --settings \
    PORT=8000 \
    WEBSITES_PORT=8000 \
    WEBSITES_CONTAINER_START_TIME_LIMIT=1800 \
    DATABASE_URL="$DATABASE_URL" \
    QR_HMAC_SECRET="$QR_HMAC_SECRET" \
    SECRET_KEY="$SECRET_KEY" \
    ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-https://iqueue-frontend.vercel.app}" \
    FORECASTING_ARTIFACTS_DIR=/app/backend/app/services/forecasting/artifacts \
    CHATBOT_MODEL_PATH=/app/backend/app/services/chatbot/artifacts/xlm-roberta-iqueue \
    DEMO_MODE=true \
    REQUIRE_FORECAST_MODELS=true \
    DEBUG=false >/dev/null

az webapp config set \
  --name "$AZURE_WEBAPP_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --always-on true \
  --http20-enabled true >/dev/null

app_resource_id="$(az webapp show --name "$AZURE_WEBAPP_NAME" --resource-group "$AZURE_RESOURCE_GROUP" --query id -o tsv)"
az resource update \
  --ids "$app_resource_id" \
  --set properties.siteConfig.healthCheckPath=/api/v1/health/readiness >/dev/null

az webapp restart --name "$AZURE_WEBAPP_NAME" --resource-group "$AZURE_RESOURCE_GROUP" >/dev/null

APP_HOST="${AZURE_WEBAPP_NAME}.azurewebsites.net"
echo "Waiting for ${APP_HOST} to become ready"

for attempt in $(seq 1 30); do
  if curl -fsS "https://${APP_HOST}/api/v1/health/readiness" >/dev/null 2>&1; then
    break
  fi

  if [[ "$attempt" == "30" ]]; then
    echo "App Service did not become ready in time. Check Azure logs for ${AZURE_WEBAPP_NAME}."
    exit 1
  fi

  sleep 10
done

python3 "$repo_root/scripts/smoke_demo.py" \
  --base-url "https://${APP_HOST}/api/v1"

echo "Deployment complete"
echo "Base URL: https://${APP_HOST}"
echo "Readiness: https://${APP_HOST}/api/v1/health/readiness"
echo "Liveness: https://${APP_HOST}/api/v1/health/live"
