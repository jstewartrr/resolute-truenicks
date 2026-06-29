# resolute-truenicks

Open-source TrueNicks-style thoroughbred bloodline analysis and race data platform, built on Resolute Farm's racing database.

## Overview

`resolute-truenicks` is a full-stack web application for thoroughbred breeding intelligence. It provides:

- **Nick Ratings** - Statistical Impact Index (SII) and Broodmare SII (BSII) scores graded A++ through F for sire x broodmare-sire crosses
- **Hypothetical Mating Tool** - Look up the nick grade for any stallion x mare combination before breeding
- **Pedigree Viewer** - Recursive multi-generation pedigree trees with inbreeding detection
- **Stallion Directory** - Searchable database of stallions with full profiles and nick rating tables
- **Race Results** - Browse historical races with track, surface, grade, and purse data
- **Speed Figures** - Per-horse speed figure history grouped by figure type
- **Workout Tracker** - Training workout records with bullet workout indicators

The backend is a FastAPI service backed by a Snowflake data warehouse (`RESOLUTE_MIND.RACING_DATA`). The frontend is a Next.js 14 app styled with Tailwind CSS.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2
- A Snowflake account with an RSA key pair configured for key-pair authentication
- The `RESOLUTE_MIND.RACING_DATA` schema populated with the racing tables (see schema notes below)

**Snowflake tables expected:**

| Table | Description |
|---|---|
| `HORSES` | Horse registry (name, sex, color, foaling date, lineage) |
| `PEDIGREE_LINKS` | Parent-child relationships for recursive pedigree queries |
| `RACES` | Race metadata (track, date, grade, surface, distance, purse) |
| `RACE_RESULTS` | Finishing positions per race |
| `STARTERS` | Horses entered per race |
| `NICK_RATINGS` | Sire x BMS nick grades with SII/BSII scores |
| `SPEED_FIGURES` | Beyer/proprietary speed figures per horse per race |
| `WORKOUTS` | Training workout records |
| `SCRAPER_LOG` | Audit log for data ingestion runs |

## Environment Variables

Copy `.env.example` to `.env` and fill in the values before running.

| Variable | Description |
|---|---|
| `SF_RSA_KEY_B64` | Base64-encoded PEM private key for Snowflake RSA key-pair auth |
| `SF_ACCOUNT` | Snowflake account identifier (e.g. `mvsgjpv-resolute`) |
| `SF_USER` | Snowflake username |
| `SF_WAREHOUSE` | Snowflake virtual warehouse name |
| `SF_DATABASE` | Snowflake database name (default: `RESOLUTE_MIND`) |
| `SF_SCHEMA` | Snowflake schema name (default: `RACING_DATA`) |
| `NEXT_PUBLIC_API_URL` | Public URL of the FastAPI backend (used by browser-side calls) |
| `API_URL` | Internal URL of the FastAPI backend (used by Next.js server-side calls) |

**Generating `SF_RSA_KEY_B64`:**

```bash
# Generate a 2048-bit RSA private key (unencrypted)
openssl genrsa -out rsa_key.pem 2048

# Extract the public key and register it with your Snowflake user
openssl rsa -in rsa_key.pem -pubout -out rsa_key.pub
# Then in Snowflake: ALTER USER <user> SET RSA_PUBLIC_KEY='<contents of rsa_key.pub minus headers>';

# Base64-encode the private key for the env var
base64 < rsa_key.pem | tr -d '\n'
# Paste the output as SF_RSA_KEY_B64
```

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/jstewartrr/resolute-truenicks.git
cd resolute-truenicks

# 2. Configure environment
cp .env.example .env
# Edit .env with your Snowflake credentials

# 3. Build and start
docker compose up --build

# 4. Open the app
# Frontend:  http://localhost:3000
# API docs:  http://localhost:8000/docs
# Health:    http://localhost:8000/health
```

To run in the background:
```bash
docker compose up --build -d
docker compose logs -f          # stream logs
docker compose down             # stop
```

**Local development (without Docker):**

```bash
# Backend
cd api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env         # fill in credentials
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd web
npm install
cp ../.env.example .env.local   # fill in NEXT_PUBLIC_API_URL
npm run dev                     # http://localhost:3000
```

## Architecture

```
resolute-truenicks/
├── api/                    # FastAPI backend (Python 3.12)
│   ├── main.py             # Route handlers and app factory
│   ├── database.py         # Snowflake connection manager + keep-warm
│   ├── models.py           # Pydantic v2 response models
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile          # Multi-stage Python image
├── web/                    # Next.js 14 frontend (TypeScript)
│   ├── app/                # App Router pages
│   │   ├── page.tsx        # Dashboard (stats + recent races + top nicks)
│   │   ├── stallions/      # Stallion directory + per-horse profile
│   │   ├── mating/         # Hypothetical mating tool
│   │   ├── races/          # Race results browser
│   │   ├── pedigree/       # Recursive pedigree tree with inbreeding highlights
│   │   ├── figures/        # Speed figures per horse
│   │   └── workouts/       # Workout records per horse
│   ├── components/         # Shared UI components (GradeBadge, HorseTable)
│   ├── lib/api.ts          # Typed API client
│   ├── tailwind.config.js  # TrueNicks brand colors
│   └── Dockerfile          # Multi-stage Next.js standalone image
├── docker-compose.yml      # Orchestrates api + web services
├── .env.example            # Environment variable template
└── LICENSE                 # MIT License
```

**API endpoints:**

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness probe (checks DB connectivity) |
| GET | `/api/stats` | Dashboard aggregate counts + recent races + top nick ratings |
| GET | `/api/stallions` | Paginated stallion list with optional name search |
| GET | `/api/stallions/{id}` | Full stallion profile including nick ratings |
| GET | `/api/matings/hypothetical` | Nick grade lookup for a sire x mare cross |
| GET | `/api/horses/{id}/pedigree` | Recursive pedigree tree (1-8 generations) |
| GET | `/api/races` | Paginated race list with track/date filters |
| GET | `/api/horses/{id}/speed-figures` | Speed figure history for a horse |
| GET | `/api/horses/{id}/workouts` | Workout history for a horse |
| GET | `/api/nick-ratings` | Top nick ratings sorted by SII or BSII |

Interactive API documentation is available at `http://localhost:8000/docs` (Swagger UI) when the backend is running.
