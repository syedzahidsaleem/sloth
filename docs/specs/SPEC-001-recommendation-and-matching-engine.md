# SPEC-001: Recommendation, Matching & Cache Engine (Ported from Meld)

## Status: ACCEPTED
**Initiative**: Sloth Audio Engine Baseline  
**Ported From**: Meld (GPL-3.0) by Francesco Grazioso  
**Destination**: `server/engine/`

---

## 1. Context & Motivation
Sloth requires a battle-tested baseline scoring engine for track recommendations, an accurate fuzzy & ISRC cross-matching pipeline across streaming backends (YouTube Music, Qobuz, Spotify), and a resilient multi-tier cache. Meld solves Spotify's deprecated recommendations API by deriving collaborative filtering from user listening history and genre networks, combined with high-precision Bigram Dice title/artist matching and ISRC lookups.

This specification documents the exact mathematical formulas, data structures, and verification tests ported from Meld to Python.

---

## 2. Module Capability Map

| Module ID | Target File | Responsibility | Upstream Meld Source |
| :--- | :--- | :--- | :--- |
| `scoring-engine` | `server/engine/scoring/meld_scorer.py` | 4-signal candidate scoring, genre neighbor graph, diversification | `SpotifyRecommendationEngine.kt` |
| `matching-engine` | `server/engine/scoring/meld_matcher.py` | Bigram Dice similarity, 7-regex title normalization, duration thresholds, ISRC + override pipeline | `SpotifyMapper.kt`, `QobuzAudioProvider.kt`, `QobuzMatchOverride.kt` |
| `cache-engine` | `server/engine/cache.py` | Multi-tier LRU memory cache, generation concurrency, persistent TTL store | `StreamUrlCache.kt`, `SpotifyProfileCache.kt` |

---

## 3. Algorithm Specifications

### 3.1. Recommendation Scorer (`meld_scorer.py`)
**Candidate Buckets & Base Weights**:
- `SEED_ARTIST`: `1.0`
- `SAME_ALBUM`: `0.85`
- `GENRE_NEIGHBOR`: `0.65`
- `USER_TOP`: `0.45`

**Scoring Weights** (Sum = 1.0):
$$W_{\text{source}} = 0.28$$
$$W_{\text{affinity}} = 0.33$$
$$W_{\text{genre}} = 0.22$$
$$W_{\text{recency}} = 0.17$$

$$\text{FinalScore} = (0.28 \times \text{SourceScore}) + (0.33 \times \text{ArtistAffinity}) + (0.22 \times \text{GenreOverlap}) + (0.17 \times \text{RecencyBoost})$$

**Signal Formulations**:
1. **Artist Affinity**:
   - Ranked artist in user profile: $\text{positionScore} = 1.0 - \frac{\text{index}}{N}$, weighted $\times 2.0$.
   - Artist in top track list: $\text{positionScore} \times 1.0$.
   - Normalized to $[0.0, 1.0]$ by $\max(\text{affinity})$.
2. **Genre Overlap**: Jaccard similarity between seed artist genres and candidate artist genres:
   $$J(A, B) = \frac{|A \cap B|}{|A \cup B|}$$
3. **Recency Boost**: $1.0$ if candidate artist is within the user's top 10 short-term artists, else $0.0$.
4. **Genre Neighbor Graph**: Derived from user listening history:
   $$\text{NeighborScore} = (J(\text{SeedGenres}, \text{ArtistGenres}) \times 0.6) + (\text{Affinity} \times 0.4)$$
   Threshold $> 0.05$, top 6 neighbors selected.
5. **Diversification**:
   - Cap of maximum 3 tracks per artist (`MAX_TRACKS_PER_ARTIST = 3`).
   - Bucket interleaving: If 3 consecutive tracks are from the same bucket, force selection from an alternate bucket.

---

### 3.2. Track Matcher (`meld_matcher.py`)
**Normalization**:
- Lowercase string.
- Strip `(feat.*)`, `(ft.*)`, `\[.*\]`, `(.*remaster.*)`, `(.*remix.*)`.
- Strip all non-alphanumeric characters: `[^a-z0-9\s]`.
- Collapse multiple whitespace to single space.

**Similarity Function**:
Bigram Dice coefficient:
$$S(A, B) = \frac{2 \times |B(A) \cap B(B)|}{|B(A)| + |B(B)|}$$
where $B(X)$ is the set of 2-character character windows.

**Composite Match Score**:
$$\text{MatchScore} = (\text{TitleScore} \times 0.45) + (\text{ArtistScore} \times 0.35) + (\text{DurationScore} \times 0.20)$$

**Duration Score Step Function**:
- $| \Delta t | \le 2\text{s} \implies 1.0$
- $| \Delta t | \le 5\text{s} \implies 0.8$
- $| \Delta t | \le 10\text{s} \implies 0.5$
- $| \Delta t | \le 30\text{s} \implies 0.2$
- $| \Delta t | > 30\text{s} \implies 0.0$
- Missing / Null duration $\implies 0.5$ (neutral)

**Decision Thresholds**:
- `EARLY_EXIT_THRESHOLD = 0.95`
- `ISRC_EXACT_MATCH_BONUS = +1000` (guaranteed top priority)

**Qobuz Candidate Multi-Feature Scoring**:
- Title exact: $+360$, Title+Version: $+340$, Substring: $+180$, Word overlap $\ge 3$: $+110$, Else: $-120$.
- Title token recall/precision penalties: $-180$ to $+180$.
- Album match: $+160$ exact, $+60$ substring, $+35$ overlap $\ge 2$, $-50$ mismatch.
- Artist match: Exact $+260 + (k-1) \times 55$; Partial $+120 + (k-1) \times 40$; No match $\implies$ REJECT $(-1,000,000)$.
- Hi-Res flag bonus: $+15$.

---

### 3.3. Cache Engine (`cache.py`)
**TTLs**:
- Full User Profile: 6 hours (`21,600s`)
- Degraded GQL Profile: 30 minutes (`1,800s`)
- Audio Stream URL: 5 minutes (`300s`)
- Followed Artists: 12 hours (`43,200s`)
- Related Artists: 24 hours (`86,400s`)
- Rate-limit 429 Cooldown: 60 seconds
- Host / Captcha Cooldown: 180 - 300 seconds

**Architecture**:
- Access-ordered L1 LRU memory cache with thread-safe synchronized access.
- Generation counter per key to protect against concurrent stale writes.
- File-persisted L2 fallback layer with automatic expiry validation.
