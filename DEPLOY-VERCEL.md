# Deploying keepsake to Vercel

keepsake is a standard Next.js app, so Vercel hosts the UI + API routes with no
code changes. Vercel doesn't provide a database or object storage, so you pair
it with a managed Postgres and any S3-compatible bucket. The app is
storage-agnostic — it only needs a `DATABASE_URL` and S3 credentials.

## 1. Pick your Postgres + bucket

- **Postgres**: Neon, Supabase, or Railway's Postgres (use its *public* URL).
  Use a **pooled / transaction-mode** connection string if offered — the app
  already sets `max: 1` and `prepare: false` on Vercel for pooler compatibility.
- **Bucket** (S3-compatible, private): Cloudflare R2, AWS S3, or the Railway
  Bucket. You need an endpoint, region, bucket name, and access key/secret.

## 2. Import the project into Vercel

1. Push this repo to GitHub (already at `origin`).
2. In Vercel: **New Project → import the repo**. Framework auto-detects as
   Next.js; build command `next build`, output handled automatically.
3. Add the environment variables below (Project → Settings → Environment
   Variables), for Production (and Preview if you want).

## 3. Environment variables

Same set as [.env.example](.env.example):

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Pooled Postgres URL (SSL). |
| `S3_ENDPOINT` `S3_REGION` `S3_BUCKET` `S3_ACCESS_KEY_ID` `S3_SECRET_ACCESS_KEY` | Your bucket. |
| `CONTRIBUTOR_PASSPHRASE` | Shared posting secret. |
| `COOKIE_SECRET` | 32+ random bytes: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ANTHROPIC_API_KEY` | Optional; unused in v1. |

Do **not** set `KEEPSAKE_DEMO` in production — with a real `DATABASE_URL` it's
inert anyway, but leave it unset.

## 4. Run the migration

Vercel doesn't run migrations for you. From your machine, point at the same
Postgres and run once:

```bash
DATABASE_URL="<your prod url>" npm run db:migrate
```

## 5. Bucket CORS

Uploads/views go **browser ↔ bucket** via presigned URLs, so set the bucket's
CORS to allow `GET`/`PUT` from your Vercel domain(s). Edit
[bucket-cors.json](bucket-cors.json) to include:

```
https://<your-project>.vercel.app
https://<your-custom-domain>        # if any
http://localhost:3000               # local dev
```

Then apply it with your bucket's S3 API (see [SETUP.md](SETUP.md) §5).

## 6. Bulk-load existing photos (optional)

To push a local folder of photos straight into the bucket + DB (bypassing the
manual composer):

```bash
# with prod DATABASE_URL + S3_* in your shell or .env.local
npm run import:photos -- --dir "../pic + vid/photos" --author "The group"
```

It re-encodes each photo (display + thumbnail, EXIF/GPS stripped), uploads both,
and inserts the row. It's idempotent — re-runs skip already-imported files via
`scripts/.import-state.json`. Add `--dry-run` to preview without writing.

## Serverless notes

- **Uploads never hit the function.** Image bytes go directly to the bucket via
  presigned URLs, so Vercel's request body limit doesn't apply.
- **Rate limiting is in-memory**, so on serverless it's per-instance (best
  effort). For strict limits across instances, move `lib/rate-limit.ts` to
  Postgres or a KV store.
- **DB connections**: the app uses 1 pooled connection per instance on Vercel.
  Prefer a pooled connection string to avoid exhausting Postgres under load.

## Railway alternative

Prefer a single provider? [SETUP.md](SETUP.md) covers running app + Postgres +
Bucket all on Railway. The app code is identical either way.
