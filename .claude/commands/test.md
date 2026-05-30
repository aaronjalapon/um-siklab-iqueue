# /test — Run Test Suite

Run unit tests, integration tests, and optionally load tests for IQueue.

## Unit + Integration Tests (pytest)

1. Activate the backend virtual environment and run pytest with coverage:
   ```bash
   cd backend && pytest tests/ -v --cov=app --cov-report=term-missing
   ```

2. Report:
   - Total tests passed / failed / skipped
   - Overall code coverage percentage
   - Any failing tests with their full error output

3. If any tests fail, analyze the failure and suggest a fix. Do not just report the error — explain the likely cause.

## ML Model Tests

4. Run forecasting evaluation to verify model performance hasn't regressed:
   ```bash
   cd ml/forecasting && python evaluate.py --artifacts artifacts/
   ```
   Flag if surge recall drops below the 70% threshold.

## Load Testing (Locust) — Optional

5. Ask the user: "Do you want to run load tests against the live server? This requires the backend to be running."

6. If yes, run Locust in headless mode for a 60-second burst:
   ```bash
   cd backend && locust -f tests/load/locustfile.py --headless -u 50 -r 5 --run-time 60s --host http://localhost:8000
   ```
   Report P50, P95, and P99 response times for the booking endpoint.

## Postman Collections

7. If Newman (Postman CLI) is installed, run the API collection:
   ```bash
   newman run tests/postman/iqueue_api.postman_collection.json --env-var "baseUrl=http://localhost:8000"
   ```
   If Newman is not installed: `npm install -g newman`
