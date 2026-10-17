"""
feedback.py — Feedback Dispatcher & Reinforcement State Updates for Sloth Engine

Processes real-time user playback events:
- listen_through -> +1.0 reward
- early_skip     -> -0.5 reward
- save/favorite  -> +2.0 reward
- dislike        -> -1.5 reward

Updates:
1. Thompson Sampling bandit posterior (Beta parameters alpha, beta per genre/cluster arm)
2. Bayesian Personalized Ranking (BPR) preference pairs (u, i_pos, j_neg)
3. User mood history window (recent valence & arousal trajectory)

SLA Target: /feedback latency < 20ms
"""

from __future__ import annotations

import logging
import os
import sqlite3
import time
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .coldstart import ThompsonBandit, BanditArm

logger = logging.getLogger("sloth-engine-feedback")

DEFAULT_DB_PATH = os.environ.get("SLOTH_DB_PATH", "sloth.db")


class FeedbackEventType(str, Enum):
    LISTEN_THROUGH = "listen_through"
    EARLY_SKIP = "early_skip"
    SAVE = "save"
    FAVORITE = "favorite"
    DISLIKE = "dislike"
    SEEK = "seek"
    NORMAL_SKIP = "normal_skip"


EVENT_REWARDS: Dict[FeedbackEventType, float] = {
    FeedbackEventType.LISTEN_THROUGH: 1.0,
    FeedbackEventType.EARLY_SKIP: -0.5,
    FeedbackEventType.SAVE: 2.0,
    FeedbackEventType.FAVORITE: 2.0,
    FeedbackEventType.DISLIKE: -1.5,
    FeedbackEventType.NORMAL_SKIP: -0.1,
    FeedbackEventType.SEEK: 0.0,
}


@dataclass
class FeedbackEvent:
    user_id: str
    track_id: str
    event_type: Union[FeedbackEventType, str]
    duration_ms: Optional[int] = None
    position_ms: Optional[int] = None
    genre: Optional[str] = None
    valence: Optional[float] = None
    arousal: Optional[float] = None
    timestamp: float = field(default_factory=time.time)

    def calculate_reward(self) -> float:
        """
        Determines the scalar reward for this feedback event.
        Calculates proportionally if position and duration are provided.
        """
        ev_str = str(self.event_type).lower()
        try:
            ev_enum = FeedbackEventType(ev_str)
        except ValueError:
            ev_enum = FeedbackEventType.NORMAL_SKIP

        if ev_enum == FeedbackEventType.EARLY_SKIP:
            return -0.5
        elif ev_enum in (FeedbackEventType.SAVE, FeedbackEventType.FAVORITE):
            return 2.0
        elif ev_enum == FeedbackEventType.DISLIKE:
            return -1.5
        elif ev_enum == FeedbackEventType.LISTEN_THROUGH:
            return 1.0

        # If normal playback or duration available
        if self.duration_ms and self.duration_ms > 0 and self.position_ms is not None:
            ratio = float(self.position_ms) / float(self.duration_ms)
            if ratio >= 0.8:
                return 1.0
            elif ratio < 0.2:
                return -0.5
            else:
                return float(round(ratio * 0.8, 2))

        return EVENT_REWARDS.get(ev_enum, 0.0)


@dataclass
class MoodHistoryEntry:
    track_id: str
    valence: float
    arousal: float
    timestamp: float


class FeedbackDispatcher:
    """
    High-throughput feedback processor.
    Applies in-memory state updates synchronously in < 1ms,
    then executes asynchronous SQLite transactions for BPR pairs and event logs.
    """
    def __init__(
        self,
        db_path: Optional[str] = None,
        bandit: Optional[ThompsonBandit] = None,
    ):
        self.db_path = db_path or DEFAULT_DB_PATH
        self.bandit = bandit or ThompsonBandit()
        # In-memory fast cache of user mood history: user_id -> List[MoodHistoryEntry]
        self._user_mood_history: Dict[str, List[MoodHistoryEntry]] = {}
        # In-memory recent BPR pairs queue: List[Tuple[user_id, pos_track, neg_track]]
        self._bpr_pairs_queue: List[Tuple[str, str, str, float]] = []
        self._init_tables()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_tables(self) -> None:
        """
        Initializes feedback, BPR triplets, and mood history tables if absent.
        """
        conn = None
        try:
            conn = self._get_connection()
            with conn:
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS user_feedback_events (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT NOT NULL,
                        track_id TEXT NOT NULL,
                        event_type TEXT NOT NULL,
                        reward REAL NOT NULL,
                        genre TEXT,
                        valence REAL,
                        arousal REAL,
                        created_at REAL NOT NULL
                    )
                    """
                )
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS bpr_triplets (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT NOT NULL,
                        pos_track_id TEXT NOT NULL,
                        neg_track_id TEXT NOT NULL,
                        weight REAL NOT NULL,
                        created_at REAL NOT NULL
                    )
                    """
                )
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS user_mood_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id TEXT NOT NULL,
                        track_id TEXT NOT NULL,
                        valence REAL NOT NULL,
                        arousal REAL NOT NULL,
                        created_at REAL NOT NULL
                    )
                    """
                )
        except Exception as e:
            logger.warning(f"Could not initialize feedback SQLite schema: {e}")
        finally:
            if conn is not None:
                try:
                    conn.close()
                except Exception:
                    pass

    def process_feedback_sync(self, event: FeedbackEvent) -> Dict[str, Any]:
        """
        Fast synchronous update (execution time < 5ms).
        Updates bandit posteriors, user mood window, and samples BPR negative candidate.
        """
        start_t = time.perf_counter()
        reward = event.calculate_reward()

        # 1. Update Thompson Bandit posterior for the genre/cluster arm
        arm_id = (event.genre or "general").lower()
        self.bandit.update_arm(arm_id=arm_id, reward=max(0.0, reward), decay=0.99)

        # 2. Update user mood history
        if event.valence is not None and event.arousal is not None:
            entry = MoodHistoryEntry(
                track_id=event.track_id,
                valence=float(event.valence),
                arousal=float(event.arousal),
                timestamp=event.timestamp,
            )
            history = self._user_mood_history.setdefault(event.user_id, [])
            history.append(entry)
            if len(history) > 50:  # Keep last 50 tracks
                self._user_mood_history[event.user_id] = history[-50:]

        # 3. Generate BPR pair if reward is positive
        neg_track_id = None
        if reward > 0.0:
            neg_track_id = f"rnd_neg_{int(time.time() * 1000) % 9999}"
            self._bpr_pairs_queue.append((event.user_id, event.track_id, neg_track_id, reward))
            if len(self._bpr_pairs_queue) > 200:
                self._bpr_pairs_queue = self._bpr_pairs_queue[-200:]

        elapsed_ms = (time.perf_counter() - start_t) * 1000.0

        return {
            "status": "processed",
            "user_id": event.user_id,
            "track_id": event.track_id,
            "reward": reward,
            "bandit_arm": arm_id,
            "latency_ms": round(elapsed_ms, 3),
        }

    def persist_feedback_background(self, event: FeedbackEvent, reward: float) -> None:
        """
        Asynchronous background task called by FastAPI BackgroundTasks to write records to SQLite.
        Runs off the request hot-path.
        """
        conn = None
        try:
            conn = self._get_connection()
            with conn:
                conn.execute(
                    """
                    INSERT INTO user_feedback_events (user_id, track_id, event_type, reward, genre, valence, arousal, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        event.user_id,
                        event.track_id,
                        str(event.event_type),
                        reward,
                        event.genre,
                        event.valence,
                        event.arousal,
                        event.timestamp,
                    ),
                )
                if reward > 0.0 and self._bpr_pairs_queue:
                    u, pos, neg, w = self._bpr_pairs_queue[-1]
                    conn.execute(
                        """
                        INSERT INTO bpr_triplets (user_id, pos_track_id, neg_track_id, weight, created_at)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                        (u, pos, neg, w, event.timestamp),
                    )
                if event.valence is not None and event.arousal is not None:
                    conn.execute(
                        """
                        INSERT INTO user_mood_history (user_id, track_id, valence, arousal, created_at)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                        (event.user_id, event.track_id, event.valence, event.arousal, event.timestamp),
                    )
        except Exception as e:
            logger.error(f"Error persisting feedback to SQLite: {e}")
        finally:
            if conn is not None:
                try:
                    conn.close()
                except Exception:
                    pass

    def get_user_recent_moods(self, user_id: str, count: int = 10) -> List[MoodHistoryEntry]:
        """
        Returns recent mood trajectory for user from memory or SQLite.
        """
        if user_id in self._user_mood_history:
            return self._user_mood_history[user_id][-count:]

        # Query SQLite fallback
        results = []
        conn = None
        try:
            conn = self._get_connection()
            cur = conn.execute(
                """
                SELECT track_id, valence, arousal, created_at
                FROM user_mood_history
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (user_id, count),
            )
            for row in cur.fetchall():
                results.append(
                    MoodHistoryEntry(
                        track_id=row["track_id"],
                        valence=row["valence"],
                        arousal=row["arousal"],
                        timestamp=row["created_at"],
                    )
                )
        except Exception:
            pass
        finally:
            if conn is not None:
                try:
                    conn.close()
                except Exception:
                    pass

        return list(reversed(results))
