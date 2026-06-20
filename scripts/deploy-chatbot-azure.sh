#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"

if [[ -f "$repo_root/.env" ]]; then
  # shellcheck disable=SC1090
  source "$repo_root/.env"
fi

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd az
require_cmd curl
require_cmd docker
require_cmd python3

if [[ -n "${AZURE_SUBSCRIPTION_ID:-}" ]]; then
  az account set --subscription "$AZURE_SUBSCRIPTION_ID"
fi

: "${AZURE_RESOURCE_GROUP:?Set AZURE_RESOURCE_GROUP}"
: "${AZURE_LOCATION:?Set AZURE_LOCATION}"
: "${AZURE_ACR_NAME:?Set AZURE_ACR_NAME}"
: "${AZURE_APP_SERVICE_PLAN:?Set AZURE_APP_SERVICE_PLAN}"
: "${AZURE_WEBAPP_NAME:?Set AZURE_WEBAPP_NAME}"
: "${QR_HMAC_SECRET:?Set QR_HMAC_SECRET}"
: "${SECRET_KEY:?Set SECRET_KEY}"

AZURE_APP_SERVICE_SKU="${AZURE_APP_SERVICE_SKU:-B2}"
IMAGE_NAME="${AZURE_IMAGE_NAME:-iqueue-backend}"
IMAGE_TAG="${AZURE_IMAGE_TAG:-$(git -C "$repo_root" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"
IMAGE_ALIAS_TAG="${AZURE_IMAGE_ALIAS_TAG:-}"
CHATBOT_ARTIFACTS_DIR="${CHATBOT_ARTIFACTS_DIR:-$repo_root/deployments/xlm-roberta-iqueue}"
FORECASTING_ARTIFACTS_DIR="${FORECASTING_ARTIFACTS_DIR:-$repo_root/iqueue_artifacts/artifacts}"

postgres_fqdn=""
database_url="${DATABASE_URL:-}"

ensure_path() {
  local path="$1"
  local label="$2"
  if [[ ! -e "$path" ]]; then
    echo "Missing ${label}: ${path}" >&2
    exit 1
  fi
}

ensure_path "$FORECASTING_ARTIFACTS_DIR/bundle_manifest.json" "forecast bundle manifest"
ensure_path "$FORECASTING_ARTIFACTS_DIR/model_metadata.json" "forecast bundle metadata"
ensure_path "$CHATBOT_ARTIFACTS_DIR/model.safetensors" "chatbot model artifact"
ensure_path "$CHATBOT_ARTIFACTS_DIR/label_map.json" "chatbot label map"

python3 "$repo_root/scripts/validate_forecast_bundle.py" \
  --artifacts "$FORECASTING_ARTIFACTS_DIR"

az config set extension.use_dynamic_install=yes_without_prompt >/dev/null

ensure_resource_group() {
  if ! az group show --name "$AZURE_RESOURCE_GROUP" >/dev/null 2>&1; then
    echo "Creating resource group ${AZURE_RESOURCE_GROUP} in ${AZURE_LOCATION}"
    az group create \
      --name "$AZURE_RESOURCE_GROUP" \
      --location "$AZURE_LOCATION" >/dev/null
  fi
}

ensure_acr() {
  if ! az acr show --name "$AZURE_ACR_NAME" --resource-group "$AZURE_RESOURCE_GROUP" >/dev/null 2>&1; then
    echo "Creating Azure Container Registry ${AZURE_ACR_NAME}"
    az acr create \
      --name "$AZURE_ACR_NAME" \
      --resource-group "$AZURE_RESOURCE_GROUP" \
      --sku Basic \
      --admin-enabled true >/dev/null
  else
    local acr_admin_enabled
    acr_admin_enabled="$(
      az acr show \
        --name "$AZURE_ACR_NAME" \
        --resource-group "$AZURE_RESOURCE_GROUP" \
        --query adminUserEnabled \
        -o tsv
    )"
    if [[ "$acr_admin_enabled" != "true" ]]; then
      az acr update \
        --name "$AZURE_ACR_NAME" \
        --resource-group "$AZURE_RESOURCE_GROUP" \
        --admin-enabled true >/dev/null
    fi
  fi
}

ensure_app_service_plan() {
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
}

compose_allowed_origins() {
  local merged="${ALLOWED_ORIGINS:-}"
  if [[ -n "${VERCEL_PRODUCTION_URL:-}" ]]; then
    merged="${merged:+${merged},}${VERCEL_PRODUCTION_URL}"
  fi
  if [[ -n "${VERCEL_PREVIEW_URLS:-}" ]]; then
    merged="${merged:+${merged},}${VERCEL_PREVIEW_URLS}"
  fi
  printf '%s' "${merged:-https://iqueue-frontend.vercel.app}"
}

is_local_database_url() {
  [[ "$1" == *"@localhost:"* || "$1" == *"@127.0.0.1:"* || "$1" == *"@0.0.0.0:"* ]]
}

ensure_database_url() {
  if [[ -n "$database_url" ]] && ! is_local_database_url "$database_url"; then
    return
  fi

  if [[ -n "$database_url" ]]; then
    echo "Ignoring local DATABASE_URL for Azure deploy; deriving PostgreSQL URL from AZURE_POSTGRES_* settings."
  fi

  : "${AZURE_POSTGRES_SERVER:?Set DATABASE_URL or AZURE_POSTGRES_SERVER}"
  : "${AZURE_POSTGRES_DB:?Set DATABASE_URL or AZURE_POSTGRES_DB}"
  : "${AZURE_POSTGRES_ADMIN:?Set DATABASE_URL or AZURE_POSTGRES_ADMIN}"
  : "${AZURE_POSTGRES_PASSWORD:?Set DATABASE_URL or AZURE_POSTGRES_PASSWORD}"

  postgres_fqdn="$(
    az postgres flexible-server show \
      --resource-group "$AZURE_RESOURCE_GROUP" \
      --name "$AZURE_POSTGRES_SERVER" \
      --query fullyQualifiedDomainName \
      -o tsv
  )"
  database_url="postgresql+asyncpg://${AZURE_POSTGRES_ADMIN}:${AZURE_POSTGRES_PASSWORD}@${postgres_fqdn}:5432/${AZURE_POSTGRES_DB}?sslmode=require"
}

build_and_push_image() {
  local acr_login_server image_ref alias_ref
  acr_login_server="$(
    az acr show \
      --name "$AZURE_ACR_NAME" \
      --resource-group "$AZURE_RESOURCE_GROUP" \
      --query loginServer \
      -o tsv
  )"
  image_ref="${acr_login_server}/${IMAGE_NAME}:${IMAGE_TAG}"

  echo "Building ${image_ref}"
  docker build -f "$repo_root/Dockerfile" -t "$image_ref" "$repo_root"

  if [[ -n "$IMAGE_ALIAS_TAG" ]]; then
    alias_ref="${acr_login_server}/${IMAGE_NAME}:${IMAGE_ALIAS_TAG}"
    docker tag "$image_ref" "$alias_ref"
  fi

  echo "Pushing ${image_ref}"
  az acr login --name "$AZURE_ACR_NAME"
  docker push "$image_ref"

  if [[ -n "$IMAGE_ALIAS_TAG" ]]; then
    echo "Pushing ${acr_login_server}/${IMAGE_NAME}:${IMAGE_ALIAS_TAG}"
    docker push "${acr_login_server}/${IMAGE_NAME}:${IMAGE_ALIAS_TAG}"
  fi

  IMAGE_REF="$image_ref"
}

ensure_webapp() {
  if az webapp show --name "$AZURE_WEBAPP_NAME" --resource-group "$AZURE_RESOURCE_GROUP" >/dev/null 2>&1; then
    echo "Updating existing App Service ${AZURE_WEBAPP_NAME}"
    return
  fi

  echo "Creating Linux Web App ${AZURE_WEBAPP_NAME}"
  az webapp create \
    --name "$AZURE_WEBAPP_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --plan "$AZURE_APP_SERVICE_PLAN" \
    --container-image-name "$IMAGE_REF" >/dev/null
}

configure_container() {
  local acr_login_server acr_username acr_password
  acr_login_server="$(
    az acr show \
      --name "$AZURE_ACR_NAME" \
      --resource-group "$AZURE_RESOURCE_GROUP" \
      --query loginServer \
      -o tsv
  )"
  acr_username="$(
    az acr credential show \
      --name "$AZURE_ACR_NAME" \
      --resource-group "$AZURE_RESOURCE_GROUP" \
      --query username \
      -o tsv
  )"
  acr_password="$(
    az acr credential show \
      --name "$AZURE_ACR_NAME" \
      --resource-group "$AZURE_RESOURCE_GROUP" \
      --query passwords[0].value \
      -o tsv
  )"

  az webapp config container set \
    --name "$AZURE_WEBAPP_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --container-image-name "$IMAGE_REF" \
    --container-registry-url "https://${acr_login_server}" \
    --container-registry-user "$acr_username" \
    --container-registry-password "$acr_password" >/dev/null
}

configure_app_settings() {
  local merged_origins
  merged_origins="$(compose_allowed_origins)"

  az webapp config appsettings set \
    --name "$AZURE_WEBAPP_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --settings \
      PORT=8000 \
      WEBSITES_PORT=8000 \
      WEBSITES_CONTAINER_START_TIME_LIMIT=1800 \
      WEBSITES_ENABLE_APP_SERVICE_STORAGE=false \
      DATABASE_URL="$database_url" \
      QR_HMAC_SECRET="$QR_HMAC_SECRET" \
      SECRET_KEY="$SECRET_KEY" \
      ALLOWED_ORIGINS="$merged_origins" \
      FORECASTING_ARTIFACTS_DIR=/app/backend/app/services/forecasting/artifacts \
      CHATBOT_MODEL_PATH=/app/backend/app/services/chatbot/artifacts/xlm-roberta-iqueue \
      DEMO_MODE="${DEMO_MODE:-true}" \
      REQUIRE_FORECAST_MODELS="${REQUIRE_FORECAST_MODELS:-true}" \
      DEBUG=false >/dev/null

  az webapp config set \
    --name "$AZURE_WEBAPP_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --always-on true \
    --http20-enabled true >/dev/null

  local app_resource_id
  app_resource_id="$(
    az webapp show \
      --name "$AZURE_WEBAPP_NAME" \
      --resource-group "$AZURE_RESOURCE_GROUP" \
      --query id \
      -o tsv
  )"
  az resource update \
    --ids "$app_resource_id" \
    --set properties.siteConfig.healthCheckPath=/api/v1/health/readiness >/dev/null
}

sync_postgres_firewall_rules() {
  if [[ -z "${AZURE_POSTGRES_SERVER:-}" ]]; then
    return
  fi

  if [[ "${AZURE_POSTGRES_SKIP_FIREWALL_SYNC:-false}" == "true" ]]; then
    echo "Skipping PostgreSQL firewall sync because AZURE_POSTGRES_SKIP_FIREWALL_SYNC=true"
    return
  fi

  if [[ -z "$postgres_fqdn" ]]; then
    postgres_fqdn="$(
      az postgres flexible-server show \
        --resource-group "$AZURE_RESOURCE_GROUP" \
        --name "$AZURE_POSTGRES_SERVER" \
        --query fullyQualifiedDomainName \
        -o tsv
    )"
  fi

  local public_network_access
  public_network_access="$(
    az postgres flexible-server show \
      --resource-group "$AZURE_RESOURCE_GROUP" \
      --name "$AZURE_POSTGRES_SERVER" \
      --query "network.publicNetworkAccess" \
      -o tsv
  )"

  if [[ "$public_network_access" == "Disabled" ]]; then
    echo "Enabling PostgreSQL public network access so App Service can use scoped firewall rules"
    az postgres flexible-server update \
      --resource-group "$AZURE_RESOURCE_GROUP" \
      --name "$AZURE_POSTGRES_SERVER" \
      --public-access Enabled \
      --yes >/dev/null
  fi

  local possible_outbound_ips
  possible_outbound_ips="$(
    az webapp show \
      --name "$AZURE_WEBAPP_NAME" \
      --resource-group "$AZURE_RESOURCE_GROUP" \
      --query possibleOutboundIpAddresses \
      -o tsv
  )"

  if [[ -z "$possible_outbound_ips" ]]; then
    echo "Warning: no App Service outbound IPs available; PostgreSQL firewall was not updated." >&2
    return
  fi

  local existing_rules
  existing_rules="$(
    az postgres flexible-server firewall-rule list \
      --resource-group "$AZURE_RESOURCE_GROUP" \
      --server-name "$AZURE_POSTGRES_SERVER" \
      --query "[?starts_with(name, 'appservice-')].name" \
      -o tsv
  )"
  if [[ -n "$existing_rules" ]]; then
    while IFS= read -r rule_name; do
      [[ -n "$rule_name" ]] || continue
      az postgres flexible-server firewall-rule delete \
        --resource-group "$AZURE_RESOURCE_GROUP" \
        --server-name "$AZURE_POSTGRES_SERVER" \
        --name "$rule_name" \
        --yes >/dev/null
    done <<<"$existing_rules"
  fi

  IFS=',' read -r -a ip_list <<<"$possible_outbound_ips"
  local index=1
  for ip in "${ip_list[@]}"; do
    [[ -n "$ip" ]] || continue
    az postgres flexible-server firewall-rule create \
      --resource-group "$AZURE_RESOURCE_GROUP" \
      --server-name "$AZURE_POSTGRES_SERVER" \
      --name "appservice-${index}" \
      --start-ip-address "$ip" \
      --end-ip-address "$ip" >/dev/null
    index=$((index + 1))
  done
}

wait_for_readiness() {
  local app_host attempt
  app_host="${AZURE_WEBAPP_NAME}.azurewebsites.net"
  echo "Waiting for ${app_host} to become ready"

  for attempt in $(seq 1 30); do
    if curl -fsS "https://${app_host}/api/v1/health/readiness" >/dev/null 2>&1; then
      APP_HOST="$app_host"
      return
    fi
    sleep 10
  done

  echo "App Service did not become ready in time. Check Azure logs for ${AZURE_WEBAPP_NAME}." >&2
  exit 1
}

run_smoke_checks() {
  python3 "$repo_root/scripts/smoke_demo.py" \
    --base-url "https://${APP_HOST}/api/v1"
}

ensure_resource_group
ensure_acr
ensure_app_service_plan
ensure_database_url
build_and_push_image
ensure_webapp
configure_container
configure_app_settings
sync_postgres_firewall_rules
az webapp restart --name "$AZURE_WEBAPP_NAME" --resource-group "$AZURE_RESOURCE_GROUP" >/dev/null
wait_for_readiness
run_smoke_checks

echo "Deployment complete"
echo "Backend URL: https://${APP_HOST}"
echo "Image tag: ${IMAGE_TAG}"
if [[ -n "$IMAGE_ALIAS_TAG" ]]; then
  echo "Image alias tag: ${IMAGE_ALIAS_TAG}"
fi
echo "Readiness: https://${APP_HOST}/api/v1/health/readiness"
echo "Liveness: https://${APP_HOST}/api/v1/health/live"
echo "Set NEXT_PUBLIC_API_URL in Vercel to: https://${APP_HOST}/api/v1"
