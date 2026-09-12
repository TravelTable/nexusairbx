# Production API 503 incident — 2026-09-11

## Cause and evidence

The API process remained healthy (`GET /health` returned 200), but authenticated requests failed with `RATE_LIMIT_STORE_UNAVAILABLE` and HTTP 503. Railway Redis logs reported permission-denied errors creating temporary RDB files in `/data`.

Redis 8.10.1 ran as UID/GID 999 (`redis`), while `/data` was owned by `root:root` with mode 755. The attached volume is named `postgres-volume` and contains `certs` and `pgdata`. The installed Redis entrypoint skips automatic ownership correction when unexpected files are present. This left the Redis data directory unwritable. Redis reported more than 16,000 consecutive failed background saves.

## Production repair

Changed ownership of `/data` only to `redis:redis`, leaving directory contents untouched, then requested `BGSAVE`. Verified `rdb_last_bgsave_status:ok`, zero consecutive save failures, and a successful diagnostic SET with a 60-second expiry.

Updated the Railway Redis start command to:

```sh
/bin/sh -c 'test "$RAILWAY_VOLUME_MOUNT_PATH" = /data && chown redis:redis /data && exec docker-entrypoint.sh redis-server --requirepass "$REDIS_PASSWORD" --save 60 1 --dir /data'
```

The command checks the expected mount, repairs only its directory ownership, and preserves authentication and snapshot configuration. It replaces the old startup command that deleted `lost+found` without repairing the mount ownership. No data directories were deleted or moved.

Railway deployment `503ce8d1-5175-4585-b785-6b84cb8c7f64` completed successfully. The new Redis instance loaded the saved RDB and accepted connections at 05:18:43 UTC.

## Verification

After redeployment, a fresh authenticated production browser session returned HTTP 200 for Studio status, MCP status, onboarding, active agents, support unread count, UI design listing/detail/preview manifest, project bindings, user settings, and billing entitlements. The backend recovered without an application deployment.

The historical task ID from the original report was not individually replayed. No AI generation was submitted as part of verification.
