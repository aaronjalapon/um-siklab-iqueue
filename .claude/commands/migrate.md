# /migrate — Run Database Migrations

Apply pending Alembic migrations to the IQueue PostgreSQL database.

## Steps

1. Check that `DATABASE_URL` is set in `.env`. If missing, stop and tell the user.

2. Check PostgreSQL is reachable:
   ```bash
   pg_isready -h localhost -p 5432
   ```

3. From the `backend/` directory, show current migration state:
   ```bash
   cd backend && alembic current
   ```

4. Show the user what migrations are pending:
   ```bash
   alembic history --verbose
   ```

5. Ask the user to confirm before applying: "Apply all pending migrations? (yes/no)"

6. On confirmation, run:
   ```bash
   alembic upgrade head
   ```

7. Confirm the applied revision:
   ```bash
   alembic current
   ```

## Creating a New Migration

If the user says they want to **create** a migration (e.g. after changing SQLAlchemy models), run:
```bash
cd backend && alembic revision --autogenerate -m "<description-from-user>"
```
Then open the generated file and show the user the `upgrade()` and `downgrade()` functions for review before they commit it.
