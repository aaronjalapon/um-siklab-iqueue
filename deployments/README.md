# Legacy Deployment Notes

This folder keeps the earlier standalone chatbot deployment notes. The active deployment target is the unified backend on Azure App Service, and the script filename is retained for backward compatibility.

## What the deployed app does

- Loads the FastAPI backend plus the chatbot and forecasting services in one container.
- Serves the API under `/api/v1/`.
- Uses `/api/v1/health/live` and `/api/v1/health/readiness` for checks.

## Build and run locally

```bash
docker build -f Dockerfile -t iqueue-backend .
docker run --rm -p 8000:8000 iqueue-backend
```

## Azure App Service checklist

1. Fill in the Azure App Service variables in `.env.example` and copy them into your local `.env`.
2. Make the deployment script executable once with `chmod +x scripts/deploy-chatbot-azure.sh`.
3. Run `scripts/deploy-chatbot-azure.sh` from the repo root.
4. The script will create the resource group, ACR, App Service plan, and Web App if they do not already exist.
5. It will push the backend image, configure the registry credentials, and set the model paths and health check.
6. It will then print the live and readiness URLs for the App Service.

## Notes

- The current release packages the model artifacts directly into the image for reproducibility.
- If image size or cold start time becomes a problem, move the artifacts to Azure Blob Storage in a later revision.