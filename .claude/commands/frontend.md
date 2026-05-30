# /frontend — Start Next.js Frontend Development Server

Run the IQueue passenger booking UI and operator dashboard in development mode.

## Steps

1. Navigate to the `frontend/` directory and check that `node_modules` exists:
   ```bash
   ls frontend/node_modules
   ```
   If it does not exist, install dependencies first:
   ```bash
   cd frontend && npm install
   ```

2. Check that the backend API is reachable at `http://localhost:8000/api/v1/health`. If it is not running, remind the user to start it first with `/dev`.

3. Start the Next.js development server:
   ```bash
   cd frontend && npm run dev
   ```

4. Confirm to the user:
   - Passenger booking UI: http://localhost:3000
   - Operator dashboard: http://localhost:3000/operator

## Environment Note

If the frontend cannot connect to the backend, check that `NEXT_PUBLIC_API_URL` is set in `frontend/.env.local`. It should be:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```
Create this file if it does not exist.
