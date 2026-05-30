# /docker — Run Full Stack with Docker Compose

Start the entire IQueue stack (PostgreSQL, FastAPI backend, Next.js frontend) using Docker Compose.

## Steps

1. Check that Docker is running:
   ```bash
   docker info
   ```
   If Docker is not running, stop and tell the user to start Docker Desktop or the Docker daemon.

2. Check that `.env` exists in the project root. If not, copy from `.env.example` and list which variables need values.

3. Ask the user: "Start in **dev mode** (with hot reload and exposed ports) or **production-like mode**?"
   - Dev mode: `docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build`
   - Production-like: `docker-compose up --build`

4. Run the chosen command. Stream the output so the user can see container startup.

5. Once all services are healthy, confirm:
   - API: http://localhost:8000/docs
   - Frontend: http://localhost:3000
   - Database: localhost:5432 (user/password from `.env`)

6. Run migrations inside the backend container after first startup:
   ```bash
   docker-compose exec backend alembic upgrade head
   ```

## Useful Docker Commands

- Stop all containers: `docker-compose down`
- Stop and remove volumes (fresh DB): `docker-compose down -v`
- View logs for one service: `docker-compose logs -f backend`
- Rebuild a single service: `docker-compose up --build backend`
