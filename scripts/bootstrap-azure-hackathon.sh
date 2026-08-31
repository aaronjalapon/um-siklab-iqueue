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

if [[ -n "${AZURE_SUBSCRIPTION_ID:-}" ]]; then
  az account set --subscription "$AZURE_SUBSCRIPTION_ID"
fi

: "${AZURE_RESOURCE_GROUP:?Set AZURE_RESOURCE_GROUP}"
: "${AZURE_LOCATION:?Set AZURE_LOCATION}"
: "${AZURE_ACR_NAME:?Set AZURE_ACR_NAME}"
: "${AZURE_APP_SERVICE_PLAN:?Set AZURE_APP_SERVICE_PLAN}"
: "${AZURE_STORAGE_ACCOUNT:?Set AZURE_STORAGE_ACCOUNT}"
: "${AZURE_STORAGE_CONTAINER:?Set AZURE_STORAGE_CONTAINER}"
: "${AZURE_POSTGRES_SERVER:?Set AZURE_POSTGRES_SERVER}"
: "${AZURE_POSTGRES_DB:?Set AZURE_POSTGRES_DB}"
: "${AZURE_POSTGRES_ADMIN:?Set AZURE_POSTGRES_ADMIN}"
: "${AZURE_POSTGRES_PASSWORD:?Set AZURE_POSTGRES_PASSWORD}"

AZURE_APP_SERVICE_SKU="${AZURE_APP_SERVICE_SKU:-B2}"
AZURE_STORAGE_SKU="${AZURE_STORAGE_SKU:-Standard_LRS}"
AZURE_POSTGRES_SKU="${AZURE_POSTGRES_SKU:-Standard_B1ms}"
AZURE_POSTGRES_TIER="${AZURE_POSTGRES_TIER:-}"
AZURE_POSTGRES_VERSION="${AZURE_POSTGRES_VERSION:-16}"
AZURE_POSTGRES_STORAGE_GB="${AZURE_POSTGRES_STORAGE_GB:-32}"
AZURE_POSTGRES_PUBLIC_ACCESS="${AZURE_POSTGRES_PUBLIC_ACCESS:-Enabled}"

if [[ -z "$AZURE_POSTGRES_TIER" ]]; then
  postgres_sku_lower="$(printf '%s' "$AZURE_POSTGRES_SKU" | tr '[:upper:]' '[:lower:]')"
  case "$postgres_sku_lower" in
    standard_b*)
      AZURE_POSTGRES_TIER="Burstable"
      ;;
    standard_e*)
      AZURE_POSTGRES_TIER="MemoryOptimized"
      ;;
    *)
      AZURE_POSTGRES_TIER="GeneralPurpose"
      ;;
  esac
fi

az config set extension.use_dynamic_install=yes_without_prompt >/dev/null

if ! az group show --name "$AZURE_RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Creating resource group ${AZURE_RESOURCE_GROUP} in ${AZURE_LOCATION}"
  az group create \
    --name "$AZURE_RESOURCE_GROUP" \
    --location "$AZURE_LOCATION" >/dev/null
fi

if ! az acr show --name "$AZURE_ACR_NAME" --resource-group "$AZURE_RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Creating Azure Container Registry ${AZURE_ACR_NAME}"
  az acr create \
    --name "$AZURE_ACR_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --sku Basic \
    --admin-enabled true >/dev/null
fi

if ! az appservice plan show --name "$AZURE_APP_SERVICE_PLAN" --resource-group "$AZURE_RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Creating Linux App Service plan ${AZURE_APP_SERVICE_PLAN}"
  az appservice plan create \
    --name "$AZURE_APP_SERVICE_PLAN" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --location "$AZURE_LOCATION" \
    --is-linux \
    --sku "$AZURE_APP_SERVICE_SKU" >/dev/null
fi

if ! az storage account show --name "$AZURE_STORAGE_ACCOUNT" --resource-group "$AZURE_RESOURCE_GROUP" >/dev/null 2>&1; then
  echo "Creating Storage Account ${AZURE_STORAGE_ACCOUNT}"
  az storage account create \
    --name "$AZURE_STORAGE_ACCOUNT" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --location "$AZURE_LOCATION" \
    --sku "$AZURE_STORAGE_SKU" \
    --kind StorageV2 >/dev/null
fi

storage_conn="$(
  az storage account show-connection-string \
    --name "$AZURE_STORAGE_ACCOUNT" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --query connectionString \
    -o tsv
)"

echo "Ensuring Blob container ${AZURE_STORAGE_CONTAINER}"
az storage container create \
  --name "$AZURE_STORAGE_CONTAINER" \
  --connection-string "$storage_conn" >/dev/null

# Ensure the Microsoft.DBforPostgreSQL resource provider is registered
postgres_provider_ns="Microsoft.DBforPostgreSQL"
reg_state="$(az provider show --namespace "$postgres_provider_ns" --query registrationState -o tsv 2>/dev/null || echo "NotRegistered")"
if [[ "$reg_state" != "Registered" ]]; then
  echo "Registering resource provider $postgres_provider_ns..."
  # Allow the register command to run even if it temporarily fails; we'll poll for completion
  set +e
  az provider register --namespace "$postgres_provider_ns" >/dev/null 2>&1
  set -e

  tries=0
  while true; do
    reg_state="$(az provider show --namespace "$postgres_provider_ns" --query registrationState -o tsv 2>/dev/null || echo "NotRegistered")"
    if [[ "$reg_state" == "Registered" ]]; then
      echo "Provider $postgres_provider_ns registered."
      break
    fi
    if [[ $tries -ge 60 ]]; then
      echo "Timed out waiting for $postgres_provider_ns to be registered.\nYou may lack permission to register providers. Run: az provider register --namespace $postgres_provider_ns or ask your subscription admin to register it." >&2
      exit 1
    fi
    tries=$((tries+1))
    echo "Waiting for provider registration (${tries}/60)... current state: $reg_state"
    sleep 5
  done
fi

if ! az postgres flexible-server show --resource-group "$AZURE_RESOURCE_GROUP" --name "$AZURE_POSTGRES_SERVER" >/dev/null 2>&1; then
  echo "Creating PostgreSQL Flexible Server ${AZURE_POSTGRES_SERVER}"
  az postgres flexible-server create \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --name "$AZURE_POSTGRES_SERVER" \
    --location "$AZURE_LOCATION" \
    --admin-user "$AZURE_POSTGRES_ADMIN" \
    --admin-password "$AZURE_POSTGRES_PASSWORD" \
    --tier "$AZURE_POSTGRES_TIER" \
    --sku-name "$AZURE_POSTGRES_SKU" \
    --version "$AZURE_POSTGRES_VERSION" \
    --storage-size "$AZURE_POSTGRES_STORAGE_GB" \
    --public-access "$AZURE_POSTGRES_PUBLIC_ACCESS" \
    --yes >/dev/null
fi

if ! az postgres flexible-server db show --resource-group "$AZURE_RESOURCE_GROUP" --server-name "$AZURE_POSTGRES_SERVER" --name "$AZURE_POSTGRES_DB" >/dev/null 2>&1; then
  echo "Creating PostgreSQL database ${AZURE_POSTGRES_DB}"
  az postgres flexible-server db create \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --server-name "$AZURE_POSTGRES_SERVER" \
    --name "$AZURE_POSTGRES_DB" >/dev/null
fi

postgres_fqdn="$(
  az postgres flexible-server show \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --name "$AZURE_POSTGRES_SERVER" \
    --query fullyQualifiedDomainName \
    -o tsv
)"

cat <<EOF

Azure hackathon infrastructure is ready.

Resource group:      ${AZURE_RESOURCE_GROUP}
Location:            ${AZURE_LOCATION}
Container registry:  ${AZURE_ACR_NAME}
App Service plan:    ${AZURE_APP_SERVICE_PLAN} (${AZURE_APP_SERVICE_SKU})
Storage account:     ${AZURE_STORAGE_ACCOUNT}
Blob container:      ${AZURE_STORAGE_CONTAINER}
PostgreSQL server:   ${AZURE_POSTGRES_SERVER}
PostgreSQL host:     ${postgres_fqdn}
PostgreSQL database: ${AZURE_POSTGRES_DB}
PostgreSQL tier:     ${AZURE_POSTGRES_TIER}

Recommended .env values:
DATABASE_URL=postgresql+asyncpg://${AZURE_POSTGRES_ADMIN}:${AZURE_POSTGRES_PASSWORD}@${postgres_fqdn}:5432/${AZURE_POSTGRES_DB}?ssl=require
AZURE_STORAGE_CONNECTION_STRING=${storage_conn}

Next steps:
1. Save DATABASE_URL in .env.
2. Keep AZURE_STORAGE_CONNECTION_STRING outside Git and use it for DVC push/pull.
3. Run scripts/deploy-chatbot-azure.sh for the first backend release.
4. Set NEXT_PUBLIC_API_URL in Vercel after the backend is live.
EOF
