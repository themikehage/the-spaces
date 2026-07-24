<!-- SPDX-License-Identifier: MIT -->

# Self-Hosting Guide for Spaces

This guide explains how to deploy and run **Spaces** on your own server or local machine.

---

## Requirements

- **Node.js**: `v20.x` or higher
- **Bun**: `v1.1` or higher (required for server execution)
- **pnpm**: `v9.x` or higher

---

## 1. Quick Start (Bare-Metal / Monorepo)

### Clone the Repository

```bash
git clone https://github.com/your-org/spaces.git
cd spaces
```

### Install Dependencies

```bash
pnpm install
```

### Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and set `SPACES_AUTH_SECRET` to a secure 32+ character random string:

```bash
SPACES_AUTH_SECRET=$(openssl rand -hex 32)
```

### Build All Workspaces

```bash
pnpm run build
```

### Run Server & Client

```bash
pnpm run start
```

The server will start listening at `http://localhost:3000`.

---

## 2. Docker & Docker Compose Deployment

If you prefer containerized deployment, use Docker Compose:

### Run with Docker Compose

```bash
docker compose up -d --build
```

### Check Logs

```bash
docker compose logs -f
```

---

## 3. Health Check & Diagnostics

Verify that your installation is running correctly by querying the health endpoint:

```bash
curl http://localhost:3000/api/health
```

Expected JSON response:

```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 42.12,
  "dataPath": "/home/spaces/.spaces-data",
  "timestamp": 1784803200000
}
```

---

## 4. Persistent Data & Backups

All database state, session logs, workspace files, and encrypted settings are stored in `SPACES_DATA_PATH` (defaults to `~/.spaces-data` or `%APPDATA%\spaces-data`).

To backup your installation:

1. Stop the server (`pnpm run stop` or `docker compose down`).
2. Archive the data directory: `tar -czvf spaces-backup.tar.gz ~/.spaces-data`.
