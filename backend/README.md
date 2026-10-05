# SketchFlow backend

1. Create a PostgreSQL database and copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to the database connection string.
3. From the repository root, run `pnpm --filter @sketchflow/backend db:migrate`.
4. Start the API and Socket.IO server with `pnpm dev:backend`.

The API creates shareable boards at `POST /api/boards` and loads them from
`GET /api/boards/:boardId`. Canvas changes received through Socket.IO are saved
to the board document. No board data is created implicitly for a missing URL.
