# keepsake — setup & deploy

A shared, unlisted photo album. Public to view, passphrase to contribute.
Runs entirely on Railway: three services in one project — `app`, `postgres`, `bucket`.

Everything in this repo is code-complete. The steps below are the parts that
need live infrastructure (they can't be done from the codebase alone).

---

## 1. Local development

```bash
npm install
cp .env.example .env.local     # then fill in the values (see §3)
npm run db:migrate             # once DATABASE_URL points at a real Postgres
npm run dev                    # http://localhost:3000
```

Viewing works with an empty album immediately. Posting needs the passphrase +
a reachable Postgres and Bucket.

## 2. Provision Railway (one project, three services)

1. **Postgres** — add the Postgres plugin. It exposes `DATABASE_URL`.
2. **Bucket** — add a Railway Bucket (private, S3-compatible). It exposes an
   endpoint, region, bucket name, and access key/secret.
3. **app** — this Next.js service (deploy from the repo). Build: `npm run build`,
   start: `npm run start`.

## 3. Environment variables (`.env.local` locally, service variables on Railway)

See [.env.example](.env.example). Wire the Railway-injected values through
**variable references** so they populate automatically:

| Variable | Source |
| --- | --- |
| `DATABASE_URL` | Postgres service reference |
| `S3_ENDPOINT` `S3_REGION` `S3_BUCKET` `S3_ACCESS_KEY_ID` `S3_SECRET_ACCESS_KEY` | Bucket service (map its injected creds to these names) |
| `CONTRIBUTOR_PASSPHRASE` | you choose — the shared secret friends type |
| `COOKIE_SECRET` | generate 32 random bytes (below) |
| `ANTHROPIC_API_KEY` | unused in v1; leave blank until enrichment is enabled |

Generate a cookie secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> None of these are `NEXT_PUBLIC_` — they never reach the browser bundle.

## 4. Run the database migration

With `DATABASE_URL` set (locally in `.env.local`, or via `railway run`):

```bash
npm run db:migrate
```

This applies `drizzle/0000_*.sql` — the `photos`, `reactions`, and `comments`
tables. Use `npm run db:studio` to browse the data.

## 5. Configure Bucket CORS (required for uploads)

Uploads and views go **directly** browser ↔ bucket via presigned URLs, so the
bucket must allow `GET`/`PUT` from the app origin. Edit
[bucket-cors.json](bucket-cors.json) — replace the placeholder origin with your
real Railway app URL — then apply it with any S3 client, e.g.:

```bash
aws s3api put-bucket-cors \
  --endpoint-url "$S3_ENDPOINT" \
  --bucket "$S3_BUCKET" \
  --cors-configuration file://bucket-cors.json
```

Keep the origin list tight — only `localhost:3000` (dev) and your app URL (§10).

## 6. Verify (acceptance checklist, spec §12)

- [ ] A visitor with the link sees the wall without any passphrase.
- [ ] Posting prompts for passphrase + name; a wrong passphrase is rejected.
- [ ] An uploaded image appears as a print; the original opens in the lightbox;
      both are served via presigned URLs.
- [ ] Uploaded files carry no GPS EXIF (canvas re-encode strips it).
- [ ] One heart per person; contributors can delete only their own photos.
- [ ] Works on mobile; keyboard-navigable; respects reduced motion.
- [ ] App, Postgres, and Bucket are all in one Railway project; no external
      storage/auth.

## 7. Enrichment (off in v1)

`lib/enrich.ts` is a wired no-op. The `alt_text` and `tags` columns already
exist. To enable later: read the thumb from the bucket, ask a vision-capable
Anthropic model for alt-text + 3–6 tags as strict JSON, and update the row —
ideally from a background worker so upload latency is unaffected.
