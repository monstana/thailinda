# ThaiLinda Rails API

Rails 8.1 API backend for accounts, classrooms, assignments, student progress, and Typhoon ASR evaluation.

## Local development

```powershell
bundle install
bin/rails db:prepare db:seed
bin/rails server -p 3000
```

Local development and tests use SQLite. Production uses PostgreSQL through `DATABASE_URL`.

Required environment variables:

```env
TYPHOON_API_KEY=your_key
FRONTEND_ORIGINS=http://localhost:4173
```

## Verification

```powershell
bin/rails test
bin/rubocop app config db test
bundle exec brakeman -q
```

Health check: `GET /up`

