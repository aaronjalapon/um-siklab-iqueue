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

if [[ -n "${AZURE_SUBSCRIPTION_ID:-}" ]]; then
  az account set --subscription "$AZURE_SUBSCRIPTION_ID"
fi

: "${AZURE_RESOURCE_GROUP:?Set AZURE_RESOURCE_GROUP}"
: "${AZURE_ACR_NAME:?Set AZURE_ACR_NAME}"
: "${AZURE_WEBAPP_NAME:?Set AZURE_WEBAPP_NAME}"
: "${AZURE_IMAGE_NAME:?Set AZURE_IMAGE_NAME}"

ROLLBACK_TAG="${1:-${AZURE_ROLLBACK_IMAGE_TAG:-}}"
: "${ROLLBACK_TAG:?Pass the image tag to roll back to, or set AZURE_ROLLBACK_IMAGE_TAG}"

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
image_ref="${acr_login_server}/${AZURE_IMAGE_NAME}:${ROLLBACK_TAG}"

echo "Rolling back ${AZURE_WEBAPP_NAME} to ${image_ref}"
az webapp config container set \
  --name "$AZURE_WEBAPP_NAME" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --container-image-name "$image_ref" \
  --container-registry-url "https://${acr_login_server}" \
  --container-registry-user "$acr_username" \
  --container-registry-password "$acr_password" >/dev/null

az webapp restart --name "$AZURE_WEBAPP_NAME" --resource-group "$AZURE_RESOURCE_GROUP" >/dev/null

app_host="${AZURE_WEBAPP_NAME}.azurewebsites.net"
for _ in $(seq 1 30); do
  if curl -fsS "https://${app_host}/api/v1/health/readiness" >/dev/null 2>&1; then
    echo "Rollback complete: https://${app_host}"
    exit 0
  fi
  sleep 10
done

echo "Rollback image deployed, but readiness did not recover in time. Check Azure logs." >&2
exit 1
