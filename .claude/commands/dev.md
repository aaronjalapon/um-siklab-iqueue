# /dev — Start FastAPI Development Server

Run the IQueue FastAPI backend in development mode with hot reload.

## Steps

1. Check that a `.env` file exists in the project root. If it does not exist, copy `.env.example` to `.env` and tell the user which variables need to be filled in before proceeding.

2. Check that PostgreSQL is reachable:
   ```bash
   pg_isready -h localhost -p 5432
   ```
   If it is not ready, print a clear message telling the user to start PostgreSQL (e.g. `docker-compose up -d db`) and stop.

3. Activate the Python virtual environment if it exists:
   ```bash
   source backend/.venv/bin/activate
   ```
   If no virtual environment exists, create one first:
   ```bash
   python -m venv backend/.venv && source backend/.venv/bin/activate && pip install -r backend/requirements.txt
   ```

4. Start the server:
   ```bash
   cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

5. Confirm to the user that the server is running at http://localhost:8000 and that interactive API docs are available at http://localhost:8000/docs.
