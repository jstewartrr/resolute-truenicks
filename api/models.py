"""
Pydantic response models for resolute-truenicks-api.
All models use pydantic v2 syntax.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


class HealthResponse(BaseModel):
    status: str
    db_connected: bool


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------


class RecentRace(BaseModel):
    race_id: Optional[str] = None
    track_code: Optional[str] = None
    race_date: Optional[date] = None
    race_number: Optional[int] = None
    race_name: Optional[str] = None
    grade: Optional[str] = None
    surface: Optional[str] = None
    distance_furlongs: Optional[float] = None
    purse: Optional[float] = None


class TopNickRating(BaseModel):
    sire_id: Optional[str] = None
    sire_name: Optional[str] = None
    bms_id: Optional[str] = None
    bms_name: Optional[str] = None
    nick_grade: Optional[str] = None
    sii: Optional[float] = None
    bsii: Optional[float] = None
    sample_size_starters: Optional[int] = None
    source: Optional[str] = None


class DateRange(BaseModel):
    earliest: Optional[date] = None
    latest: Optional[date] = None


class StatsResponse(BaseModel):
    horses: int = 0
    pedigree_links: int = 0
    races: int = 0
    starters: int = 0
    nick_ratings: int = 0
    speed_figures: int = 0
    workouts: int = 0
    scraper_runs: int = 0
    date_range: DateRange = Field(default_factory=DateRange)
    recent_races: list[RecentRace] = Field(default_factory=list)
    top_nick_ratings: list[TopNickRating] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Stallions / Horses
# ---------------------------------------------------------------------------


class StallionSummary(BaseModel):
    horse_id: str
    name: Optional[str] = None
    sire: Optional[str] = None
    dam: Optional[str] = None
    breed: Optional[str] = None
    sex: Optional[str] = None
    color: Optional[str] = None
    foaling_date: Optional[date] = None
    owner: Optional[str] = None
    breeder: Optional[str] = None
    source_site: Optional[str] = None


class StallionListResponse(BaseModel):
    total: int
    offset: int
    limit: int
    items: list[StallionSummary]


class StallionProfile(BaseModel):
    horse_id: str
    name: Optional[str] = None
    breed: Optional[str] = None
    sex: Optional[str] = None
    color: Optional[str] = None
    foaling_date: Optional[date] = None
    sire: Optional[str] = None
    dam: Optional[str] = None
    dams_sire: Optional[str] = None
    sires_sire: Optional[str] = None
    owner: Optional[str] = None
    breeder: Optional[str] = None
    source_site: Optional[str] = None
    nick_ratings: list[TopNickRating] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Mating / Nick Ratings
# ---------------------------------------------------------------------------


class MatingResponse(BaseModel):
    sire_name: Optional[str] = None
    bms_name: Optional[str] = None
    nick_grade: Optional[str] = None
    sii: Optional[float] = None
    bsii: Optional[float] = None
    sample_size_starters: Optional[int] = None
    source: Optional[str] = None
    message: Optional[str] = None


class NickRatingItem(BaseModel):
    sire_id: Optional[str] = None
    sire_name: Optional[str] = None
    bms_id: Optional[str] = None
    bms_name: Optional[str] = None
    nick_grade: Optional[str] = None
    sii: Optional[float] = None
    bsii: Optional[float] = None
    sample_size_starters: Optional[int] = None
    source: Optional[str] = None


class NickRatingsListResponse(BaseModel):
    total: int
    limit: int
    items: list[NickRatingItem]


# ---------------------------------------------------------------------------
# Pedigree
# ---------------------------------------------------------------------------


class PedigreeNode(BaseModel):
    horse_id: Optional[str] = None
    name: Optional[str] = None
    birth_year: Optional[int] = None
    country_born: Optional[str] = None
    sire: Optional["PedigreeNode"] = None
    dam: Optional["PedigreeNode"] = None


class PedigreeResponse(BaseModel):
    horse_id: str
    name: Optional[str] = None
    generations: int
    tree: PedigreeNode


# ---------------------------------------------------------------------------
# Races
# ---------------------------------------------------------------------------


class RaceItem(BaseModel):
    race_id: Optional[str] = None
    track_code: Optional[str] = None
    race_date: Optional[date] = None
    race_number: Optional[int] = None
    race_name: Optional[str] = None
    grade: Optional[str] = None
    surface: Optional[str] = None
    distance_furlongs: Optional[float] = None
    purse: Optional[float] = None
    conditions: Optional[str] = None


class RacesListResponse(BaseModel):
    total: int
    offset: int
    limit: int
    items: list[RaceItem]


# ---------------------------------------------------------------------------
# Speed Figures
# ---------------------------------------------------------------------------


class SpeedFigureItem(BaseModel):
    horse_id: Optional[str] = None
    race_id: Optional[str] = None
    figure_type: Optional[str] = None
    figure_value: Optional[float] = None
    race_date: Optional[date] = None


class SpeedFiguresResponse(BaseModel):
    horse_id: str
    count: int
    items: list[SpeedFigureItem]


# ---------------------------------------------------------------------------
# Workouts
# ---------------------------------------------------------------------------


class WorkoutItem(BaseModel):
    horse_id: Optional[str] = None
    workout_date: Optional[date] = None
    track_name: Optional[str] = None
    distance_furlongs: Optional[float] = None
    time_seconds: Optional[float] = None
    surface: Optional[str] = None
    work_rank: Optional[int] = None
    bullet: Optional[bool] = None


class WorkoutsResponse(BaseModel):
    horse_id: str
    count: int
    items: list[WorkoutItem]


# Allow self-referential PedigreeNode
PedigreeNode.model_rebuild()
