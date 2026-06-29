"""
resolute-truenicks-api — FastAPI backend for TrueNicks / pedigree analytics.

Tables (RESOLUTE_MIND.RACING_DATA):
  HORSES, PEDIGREE_LINKS, RACES, RACE_RESULTS, STARTERS,
  NICK_RATINGS, SPEED_FIGURES, WORKOUTS, SCRAPER_LOG
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from database import check_db_health, db_cursor, start_keep_warm
from models import (
    DateRange,
    HealthResponse,
    MatingResponse,
    NickRatingItem,
    NickRatingsListResponse,
    PedigreeNode,
    PedigreeResponse,
    RaceItem,
    RacesListResponse,
    RecentRace,
    SpeedFigureItem,
    SpeedFiguresResponse,
    StallionListResponse,
    StallionProfile,
    StallionSummary,
    StatsResponse,
    TopNickRating,
    WorkoutItem,
    WorkoutsResponse,
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start background keep-warm task on startup."""
    task = start_keep_warm()
    logger.info("Keep-warm task started")
    yield
    task.cancel()
    logger.info("Keep-warm task stopped")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="resolute-truenicks-api",
    version="1.0.0",
    description="TrueNicks pedigree and nick-rating analytics for Resolute Farm",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _row_to_dict(row) -> dict:
    """DictCursor rows are already dicts; ensure keys are lowercase."""
    if isinstance(row, dict):
        return {k.lower(): v for k, v in row.items()}
    return {}


def _safe_date(val):
    """Return date from datetime or date object; None if absent."""
    if val is None:
        return None
    if hasattr(val, "date"):
        return val.date()
    return val


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health():
    """Liveness probe."""
    db_ok = check_db_health()
    return HealthResponse(status="ok", db_connected=db_ok)


# ---------------------------------------------------------------------------
# GET /api/stats
# ---------------------------------------------------------------------------


@app.get("/api/stats", response_model=StatsResponse, tags=["stats"])
def stats():
    """Aggregate counts and quick-view data for the dashboard."""
    try:
        with db_cursor() as cur:
            counts_sql = """
                SELECT
                    (SELECT COUNT(*) FROM HORSES)                 AS horses,
                    (SELECT COUNT(*) FROM PEDIGREE_LINKS)         AS pedigree_links,
                    (SELECT COUNT(*) FROM RACES)                  AS races,
                    (SELECT COUNT(*) FROM STARTERS)               AS starters,
                    (SELECT COUNT(*) FROM NICK_RATINGS)           AS nick_ratings,
                    (SELECT COUNT(*) FROM SPEED_FIGURES)          AS speed_figures,
                    (SELECT COUNT(*) FROM WORKOUTS)               AS workouts,
                    (SELECT COUNT(*) FROM SCRAPER_LOG)            AS scraper_runs,
                    (SELECT MIN(RACE_DATE) FROM RACES)            AS earliest_race,
                    (SELECT MAX(RACE_DATE) FROM RACES)            AS latest_race
            """
            cur.execute(counts_sql)
            row = _row_to_dict(cur.fetchone())

            # Recent races
            cur.execute(
                """
                SELECT RACE_ID, TRACK_CODE, RACE_DATE, RACE_NUMBER,
                       RACE_NAME, GRADE, SURFACE, DISTANCE_FURLONGS, PURSE
                FROM RACES
                ORDER BY RACE_DATE DESC
                LIMIT 10
                """
            )
            recent_races = [
                RecentRace(
                    race_id=str(r.get("race_id") or ""),
                    track_code=r.get("track_code"),
                    race_date=_safe_date(r.get("race_date")),
                    race_number=r.get("race_number"),
                    race_name=r.get("race_name"),
                    grade=r.get("grade"),
                    surface=r.get("surface"),
                    distance_furlongs=r.get("distance_furlongs"),
                    purse=r.get("purse"),
                )
                for r in [_row_to_dict(x) for x in cur.fetchall()]
            ]

            # Top nick ratings
            cur.execute(
                """
                SELECT SIRE_ID, SIRE_NAME, BMS_ID, BMS_NAME,
                       NICK_GRADE, SII, BSII, SAMPLE_SIZE_STARTERS, SOURCE
                FROM NICK_RATINGS
                ORDER BY SII DESC NULLS LAST
                LIMIT 10
                """
            )
            top_nicks = [
                TopNickRating(
                    sire_id=str(r.get("sire_id") or ""),
                    sire_name=r.get("sire_name"),
                    bms_id=str(r.get("bms_id") or ""),
                    bms_name=r.get("bms_name"),
                    nick_grade=r.get("nick_grade"),
                    sii=r.get("sii"),
                    bsii=r.get("bsii"),
                    sample_size_starters=r.get("sample_size_starters"),
                    source=r.get("source"),
                )
                for r in [_row_to_dict(x) for x in cur.fetchall()]
            ]

        return StatsResponse(
            horses=row.get("horses", 0) or 0,
            pedigree_links=row.get("pedigree_links", 0) or 0,
            races=row.get("races", 0) or 0,
            starters=row.get("starters", 0) or 0,
            nick_ratings=row.get("nick_ratings", 0) or 0,
            speed_figures=row.get("speed_figures", 0) or 0,
            workouts=row.get("workouts", 0) or 0,
            scraper_runs=row.get("scraper_runs", 0) or 0,
            date_range=DateRange(
                earliest=_safe_date(row.get("earliest_race")),
                latest=_safe_date(row.get("latest_race")),
            ),
            recent_races=recent_races,
            top_nick_ratings=top_nicks,
        )
    except Exception as exc:
        logger.error("stats error: %s", exc)
        raise HTTPException(status_code=503, detail=f"Database error: {exc}") from exc


# ---------------------------------------------------------------------------
# GET /api/stallions
# ---------------------------------------------------------------------------


@app.get("/api/stallions", response_model=StallionListResponse, tags=["stallions"])
def list_stallions(
    q: Optional[str] = Query(default=None, description="Name search (case-insensitive)"),
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """
    Search stallions (SEX='S' OR appears as SIRE_ID in NICK_RATINGS).
    Optionally filter by name substring.
    """
    try:
        with db_cursor() as cur:
            base_where = """
                WHERE (h.SEX = 'S' OR h.HORSE_ID IN (SELECT SIRE_ID FROM NICK_RATINGS))
            """
            params: list = []

            if q:
                base_where += " AND UPPER(h.NAME) LIKE %s"
                params.append(f"%{q.upper()}%")

            count_sql = f"SELECT COUNT(*) AS cnt FROM HORSES h {base_where}"
            cur.execute(count_sql, params)
            total = _row_to_dict(cur.fetchone()).get("cnt", 0) or 0

            data_sql = f"""
                SELECT h.HORSE_ID, h.NAME, h.SIRE, h.DAM,
                       h.BREED, h.SEX, h.COLOR, h.FOALING_DATE,
                       h.OWNER, h.BREEDER, h.SOURCE_SITE
                FROM HORSES h
                {base_where}
                ORDER BY h.NAME
                LIMIT %s OFFSET %s
            """
            cur.execute(data_sql, params + [limit, offset])
            rows = [_row_to_dict(r) for r in cur.fetchall()]

        items = [
            StallionSummary(
                horse_id=str(r["horse_id"]),
                name=r.get("name"),
                sire=r.get("sire"),
                dam=r.get("dam"),
                breed=r.get("breed"),
                sex=r.get("sex"),
                color=r.get("color"),
                foaling_date=_safe_date(r.get("foaling_date")),
                owner=r.get("owner"),
                breeder=r.get("breeder"),
                source_site=r.get("source_site"),
            )
            for r in rows
        ]
        return StallionListResponse(total=total, offset=offset, limit=limit, items=items)

    except Exception as exc:
        logger.error("list_stallions error: %s", exc)
        raise HTTPException(status_code=503, detail=f"Database error: {exc}") from exc


# ---------------------------------------------------------------------------
# GET /api/stallions/{horse_id}
# ---------------------------------------------------------------------------


@app.get("/api/stallions/{horse_id}", response_model=StallionProfile, tags=["stallions"])
def get_stallion(horse_id: str):
    """Full stallion profile including nick ratings where this horse is the sire."""
    try:
        with db_cursor() as cur:
            cur.execute(
                """
                SELECT HORSE_ID, NAME, BREED, SEX, COLOR, FOALING_DATE,
                       SIRE, DAM, DAMS_SIRE, SIRES_SIRE,
                       OWNER, BREEDER, SOURCE_SITE
                FROM HORSES
                WHERE HORSE_ID = %s
                """,
                (horse_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail=f"Horse {horse_id!r} not found")
            h = _row_to_dict(row)

            cur.execute(
                """
                SELECT SIRE_ID, SIRE_NAME, BMS_ID, BMS_NAME,
                       NICK_GRADE, SII, BSII, SAMPLE_SIZE_STARTERS, SOURCE
                FROM NICK_RATINGS
                WHERE SIRE_ID = %s
                ORDER BY SII DESC NULLS LAST
                """,
                (horse_id,),
            )
            nick_rows = [_row_to_dict(r) for r in cur.fetchall()]

        nicks = [
            TopNickRating(
                sire_id=str(r.get("sire_id") or ""),
                sire_name=r.get("sire_name"),
                bms_id=str(r.get("bms_id") or ""),
                bms_name=r.get("bms_name"),
                nick_grade=r.get("nick_grade"),
                sii=r.get("sii"),
                bsii=r.get("bsii"),
                sample_size_starters=r.get("sample_size_starters"),
                source=r.get("source"),
            )
            for r in nick_rows
        ]

        return StallionProfile(
            horse_id=str(h["horse_id"]),
            name=h.get("name"),
            breed=h.get("breed"),
            sex=h.get("sex"),
            color=h.get("color"),
            foaling_date=_safe_date(h.get("foaling_date")),
            sire=h.get("sire"),
            dam=h.get("dam"),
            dams_sire=h.get("dams_sire"),
            sires_sire=h.get("sires_sire"),
            owner=h.get("owner"),
            breeder=h.get("breeder"),
            source_site=h.get("source_site"),
            nick_ratings=nicks,
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("get_stallion error: %s", exc)
        raise HTTPException(status_code=503, detail=f"Database error: {exc}") from exc


# ---------------------------------------------------------------------------
# GET /api/matings/hypothetical
# ---------------------------------------------------------------------------


@app.get("/api/matings/hypothetical", response_model=MatingResponse, tags=["matings"])
def hypothetical_mating(
    sire: str = Query(..., description="Sire name or HORSE_ID"),
    mare: str = Query(..., description="Mare name or HORSE_ID (used to look up broodmare sire)"),
):
    """
    Look up NICK_RATINGS for a sire x BMS cross.

    The 'sire' param is matched against NICK_RATINGS.SIRE_NAME or SIRE_ID.
    The 'mare' param is used to find the mare's sire (her dam's sire = BMS),
    then matched against NICK_RATINGS.BMS_NAME or BMS_ID.

    If no rating exists, returns {"nick_grade": "NR", "message": "..."}.
    """
    try:
        with db_cursor() as cur:
            # Resolve sire: try HORSE_ID first, then name match
            cur.execute(
                """
                SELECT NR.SIRE_ID, NR.SIRE_NAME, NR.BMS_ID, NR.BMS_NAME,
                       NR.NICK_GRADE, NR.SII, NR.BSII,
                       NR.SAMPLE_SIZE_STARTERS, NR.SOURCE
                FROM NICK_RATINGS NR
                WHERE (
                    NR.SIRE_ID = %s OR UPPER(NR.SIRE_NAME) = UPPER(%s)
                )
                AND (
                    NR.BMS_ID = %s OR UPPER(NR.BMS_NAME) = UPPER(%s)
                )
                ORDER BY NR.SII DESC NULLS LAST
                LIMIT 1
                """,
                (sire, sire, mare, mare),
            )
            row = cur.fetchone()
            if row:
                r = _row_to_dict(row)
                return MatingResponse(
                    sire_name=r.get("sire_name"),
                    bms_name=r.get("bms_name"),
                    nick_grade=r.get("nick_grade"),
                    sii=r.get("sii"),
                    bsii=r.get("bsii"),
                    sample_size_starters=r.get("sample_size_starters"),
                    source=r.get("source"),
                )

            # Try resolving mare -> broodmare sire via HORSES
            cur.execute(
                """
                SELECT DAMS_SIRE, SIRE AS DAM_SIRE
                FROM HORSES
                WHERE HORSE_ID = %s OR UPPER(NAME) = UPPER(%s)
                LIMIT 1
                """,
                (mare, mare),
            )
            mare_row = cur.fetchone()
            bms_name = None
            if mare_row:
                m = _row_to_dict(mare_row)
                bms_name = m.get("dams_sire") or m.get("dam_sire")

            if bms_name:
                cur.execute(
                    """
                    SELECT NR.SIRE_ID, NR.SIRE_NAME, NR.BMS_ID, NR.BMS_NAME,
                           NR.NICK_GRADE, NR.SII, NR.BSII,
                           NR.SAMPLE_SIZE_STARTERS, NR.SOURCE
                    FROM NICK_RATINGS NR
                    WHERE (NR.SIRE_ID = %s OR UPPER(NR.SIRE_NAME) = UPPER(%s))
                      AND UPPER(NR.BMS_NAME) = UPPER(%s)
                    ORDER BY NR.SII DESC NULLS LAST
                    LIMIT 1
                    """,
                    (sire, sire, bms_name),
                )
                row2 = cur.fetchone()
                if row2:
                    r = _row_to_dict(row2)
                    return MatingResponse(
                        sire_name=r.get("sire_name"),
                        bms_name=r.get("bms_name"),
                        nick_grade=r.get("nick_grade"),
                        sii=r.get("sii"),
                        bsii=r.get("bsii"),
                        sample_size_starters=r.get("sample_size_starters"),
                        source=r.get("source"),
                    )

        return MatingResponse(
            nick_grade="NR",
            sire_name=sire,
            bms_name=mare,
            message="No rating available for this cross",
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("hypothetical_mating error: %s", exc)
        raise HTTPException(status_code=503, detail=f"Database error: {exc}") from exc


# ---------------------------------------------------------------------------
# GET /api/horses/{horse_id}/pedigree
# ---------------------------------------------------------------------------


def _build_pedigree_tree(
    horse_id: str,
    all_links: dict[str, list[dict]],
    name_map: dict[str, str],
    current_gen: int,
    max_gens: int,
) -> Optional[PedigreeNode]:
    """
    Recursively build a pedigree tree from pre-fetched PEDIGREE_LINKS rows.

    all_links: horse_id -> list of parent rows (PARENT_TYPE in SIRE/DAM)
    name_map:  horse_id -> name (from HORSES)
    """
    if current_gen > max_gens or horse_id is None:
        return None

    node = PedigreeNode(
        horse_id=horse_id,
        name=name_map.get(horse_id),
    )

    parents = all_links.get(horse_id, [])
    for parent in parents:
        parent_id = str(parent.get("parent_id") or "")
        parent_name = parent.get("horse_name") or name_map.get(parent_id)
        birth_year = parent.get("birth_year")
        country = parent.get("country_born")
        ptype = (parent.get("parent_type") or "").upper()

        child_node = _build_pedigree_tree(
            parent_id, all_links, name_map, current_gen + 1, max_gens
        )
        if child_node is None:
            child_node = PedigreeNode(
                horse_id=parent_id,
                name=parent_name,
                birth_year=birth_year,
                country_born=country,
            )
        else:
            child_node.birth_year = birth_year
            child_node.country_born = country

        if ptype == "SIRE":
            node.sire = child_node
        elif ptype == "DAM":
            node.dam = child_node

    return node


@app.get("/api/horses/{horse_id}/pedigree", response_model=PedigreeResponse, tags=["pedigree"])
def get_pedigree(
    horse_id: str,
    gens: int = Query(default=5, ge=1, le=8, description="Number of generations to fetch"),
):
    """
    Return up to `gens` generations of pedigree for the given horse.
    Partial pedigree data is handled gracefully (missing ancestors = None nodes).
    """
    try:
        with db_cursor() as cur:
            # Verify horse exists
            cur.execute(
                "SELECT HORSE_ID, NAME FROM HORSES WHERE HORSE_ID = %s",
                (horse_id,),
            )
            base_row = cur.fetchone()
            if not base_row:
                raise HTTPException(status_code=404, detail=f"Horse {horse_id!r} not found")
            base = _row_to_dict(base_row)
            horse_name = base.get("name")

            # Fetch all PEDIGREE_LINKS for this horse up to gens levels.
            # We use a recursive CTE to pull all ancestors in one query.
            recursive_sql = """
                WITH RECURSIVE ancestor_cte (HORSE_ID, PARENT_ID, HORSE_NAME,
                                              PARENT_TYPE, BIRTH_YEAR, COUNTRY_BORN, DEPTH)
                AS (
                    -- Seed: direct parents of target horse
                    SELECT
                        PL.HORSE_ID,
                        PL.PARENT_ID,
                        PL.HORSE_NAME,
                        PL.PARENT_TYPE,
                        PL.BIRTH_YEAR,
                        PL.COUNTRY_BORN,
                        1 AS DEPTH
                    FROM PEDIGREE_LINKS PL
                    WHERE PL.HORSE_ID = %s

                    UNION ALL

                    -- Recurse: parents of parents
                    SELECT
                        PL.HORSE_ID,
                        PL.PARENT_ID,
                        PL.HORSE_NAME,
                        PL.PARENT_TYPE,
                        PL.BIRTH_YEAR,
                        PL.COUNTRY_BORN,
                        A.DEPTH + 1
                    FROM PEDIGREE_LINKS PL
                    JOIN ancestor_cte A ON PL.HORSE_ID = A.PARENT_ID
                    WHERE A.DEPTH < %s
                )
                SELECT * FROM ancestor_cte
            """
            cur.execute(recursive_sql, (horse_id, gens))
            link_rows = [_row_to_dict(r) for r in cur.fetchall()]

        # Build lookup structures
        all_links: dict[str, list[dict]] = {}
        name_map: dict[str, str] = {horse_id: horse_name or ""}

        for r in link_rows:
            hid = str(r.get("horse_id") or "")
            pid = str(r.get("parent_id") or "")
            if hid not in all_links:
                all_links[hid] = []
            all_links[hid].append(r)
            if pid and r.get("horse_name"):
                name_map[pid] = r["horse_name"]

        tree = _build_pedigree_tree(horse_id, all_links, name_map, 0, gens)
        if tree is None:
            tree = PedigreeNode(horse_id=horse_id, name=horse_name)

        return PedigreeResponse(
            horse_id=horse_id,
            name=horse_name,
            generations=gens,
            tree=tree,
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("get_pedigree error: %s", exc)
        raise HTTPException(status_code=503, detail=f"Database error: {exc}") from exc


# ---------------------------------------------------------------------------
# GET /api/races
# ---------------------------------------------------------------------------


@app.get("/api/races", response_model=RacesListResponse, tags=["races"])
def list_races(
    track: Optional[str] = Query(default=None, description="Track code filter"),
    date: Optional[str] = Query(default=None, description="Race date filter (YYYY-MM-DD)"),
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    """Query RACES ordered by RACE_DATE DESC with optional filters."""
    try:
        with db_cursor() as cur:
            where_clauses = []
            params: list = []

            if track:
                where_clauses.append("UPPER(TRACK_CODE) = UPPER(%s)")
                params.append(track)
            if date:
                where_clauses.append("RACE_DATE = %s")
                params.append(date)

            where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

            cur.execute(f"SELECT COUNT(*) AS cnt FROM RACES {where_sql}", params)
            total = _row_to_dict(cur.fetchone()).get("cnt", 0) or 0

            cur.execute(
                f"""
                SELECT RACE_ID, TRACK_CODE, RACE_DATE, RACE_NUMBER,
                       RACE_NAME, GRADE, SURFACE, DISTANCE_FURLONGS,
                       PURSE, CONDITIONS
                FROM RACES
                {where_sql}
                ORDER BY RACE_DATE DESC
                LIMIT %s OFFSET %s
                """,
                params + [limit, offset],
            )
            rows = [_row_to_dict(r) for r in cur.fetchall()]

        items = [
            RaceItem(
                race_id=str(r.get("race_id") or ""),
                track_code=r.get("track_code"),
                race_date=_safe_date(r.get("race_date")),
                race_number=r.get("race_number"),
                race_name=r.get("race_name"),
                grade=r.get("grade"),
                surface=r.get("surface"),
                distance_furlongs=r.get("distance_furlongs"),
                purse=r.get("purse"),
                conditions=r.get("conditions"),
            )
            for r in rows
        ]
        return RacesListResponse(total=total, offset=offset, limit=limit, items=items)

    except Exception as exc:
        logger.error("list_races error: %s", exc)
        raise HTTPException(status_code=503, detail=f"Database error: {exc}") from exc


# ---------------------------------------------------------------------------
# GET /api/horses/{horse_id}/speed-figures
# ---------------------------------------------------------------------------


@app.get("/api/horses/{horse_id}/speed-figures", response_model=SpeedFiguresResponse, tags=["horses"])
def get_speed_figures(horse_id: str):
    """Return all speed figures for a horse ordered by RACE_DATE DESC."""
    try:
        with db_cursor() as cur:
            # Confirm horse exists
            cur.execute("SELECT HORSE_ID FROM HORSES WHERE HORSE_ID = %s", (horse_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail=f"Horse {horse_id!r} not found")

            cur.execute(
                """
                SELECT HORSE_ID, RACE_ID, FIGURE_TYPE, FIGURE_VALUE, RACE_DATE
                FROM SPEED_FIGURES
                WHERE HORSE_ID = %s
                ORDER BY RACE_DATE DESC
                """,
                (horse_id,),
            )
            rows = [_row_to_dict(r) for r in cur.fetchall()]

        items = [
            SpeedFigureItem(
                horse_id=str(r.get("horse_id") or ""),
                race_id=str(r.get("race_id") or ""),
                figure_type=r.get("figure_type"),
                figure_value=r.get("figure_value"),
                race_date=_safe_date(r.get("race_date")),
            )
            for r in rows
        ]
        return SpeedFiguresResponse(horse_id=horse_id, count=len(items), items=items)

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("get_speed_figures error: %s", exc)
        raise HTTPException(status_code=503, detail=f"Database error: {exc}") from exc


# ---------------------------------------------------------------------------
# GET /api/horses/{horse_id}/workouts
# ---------------------------------------------------------------------------


@app.get("/api/horses/{horse_id}/workouts", response_model=WorkoutsResponse, tags=["horses"])
def get_workouts(horse_id: str):
    """Return all workouts for a horse ordered by WORKOUT_DATE DESC."""
    try:
        with db_cursor() as cur:
            cur.execute("SELECT HORSE_ID FROM HORSES WHERE HORSE_ID = %s", (horse_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail=f"Horse {horse_id!r} not found")

            cur.execute(
                """
                SELECT HORSE_ID, WORKOUT_DATE, TRACK_NAME, DISTANCE_FURLONGS,
                       TIME_SECONDS, SURFACE, WORK_RANK, BULLET
                FROM WORKOUTS
                WHERE HORSE_ID = %s
                ORDER BY WORKOUT_DATE DESC
                """,
                (horse_id,),
            )
            rows = [_row_to_dict(r) for r in cur.fetchall()]

        items = [
            WorkoutItem(
                horse_id=str(r.get("horse_id") or ""),
                workout_date=_safe_date(r.get("workout_date")),
                track_name=r.get("track_name"),
                distance_furlongs=r.get("distance_furlongs"),
                time_seconds=r.get("time_seconds"),
                surface=r.get("surface"),
                work_rank=r.get("work_rank"),
                bullet=r.get("bullet"),
            )
            for r in rows
        ]
        return WorkoutsResponse(horse_id=horse_id, count=len(items), items=items)

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("get_workouts error: %s", exc)
        raise HTTPException(status_code=503, detail=f"Database error: {exc}") from exc


# ---------------------------------------------------------------------------
# GET /api/nick-ratings
# ---------------------------------------------------------------------------


@app.get("/api/nick-ratings", response_model=NickRatingsListResponse, tags=["nick-ratings"])
def list_nick_ratings(
    limit: int = Query(default=20, ge=1, le=200),
    sort: str = Query(default="sii", description="Sort field: sii or bsii"),
):
    """Query NICK_RATINGS ordered by SII or BSII DESC."""
    sort_col = "BSII" if sort.lower() == "bsii" else "SII"

    try:
        with db_cursor() as cur:
            cur.execute("SELECT COUNT(*) AS cnt FROM NICK_RATINGS")
            total = _row_to_dict(cur.fetchone()).get("cnt", 0) or 0

            cur.execute(
                f"""
                SELECT SIRE_ID, SIRE_NAME, BMS_ID, BMS_NAME,
                       NICK_GRADE, SII, BSII, SAMPLE_SIZE_STARTERS, SOURCE
                FROM NICK_RATINGS
                ORDER BY {sort_col} DESC NULLS LAST
                LIMIT %s
                """,
                (limit,),
            )
            rows = [_row_to_dict(r) for r in cur.fetchall()]

        items = [
            NickRatingItem(
                sire_id=str(r.get("sire_id") or ""),
                sire_name=r.get("sire_name"),
                bms_id=str(r.get("bms_id") or ""),
                bms_name=r.get("bms_name"),
                nick_grade=r.get("nick_grade"),
                sii=r.get("sii"),
                bsii=r.get("bsii"),
                sample_size_starters=r.get("sample_size_starters"),
                source=r.get("source"),
            )
            for r in rows
        ]
        return NickRatingsListResponse(total=total, limit=limit, items=items)

    except Exception as exc:
        logger.error("list_nick_ratings error: %s", exc)
        raise HTTPException(status_code=503, detail=f"Database error: {exc}") from exc
