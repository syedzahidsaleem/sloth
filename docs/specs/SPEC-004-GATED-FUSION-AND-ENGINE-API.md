# SPEC-004: Gated Fusion Recommender Pipeline & High-Performance Engine API

## 1. Objective

Integrate the disparate algorithmic modules developed in SPEC-003 into a unified, low-latency, end-to-end recommendation and generative music synthesis pipeline (`server/engine/`). 
Expose a production-grade async FastAPI surface and a Nuclear-inspired Settings UI toggle panel for local/persistent engine lifecycle control.

---

## 2. Capability Map & Components

| Module | Location | Primary Class / Function | Functional Specification |
| :--- | :--- | :--- | :--- |
| **Gated Fusion** | `server/engine/fusion.py` | `GatingNetwork`, `FusionContext` | 2-layer MLP `Linear(6 -> 32) -> ReLU -> Linear(32 -> 6) -> Softmax`. Dynamically weights 6 candidate scoring signals conditioned on `[is_new_user, mode_code, context_code]`. |
| **SLOTH Recommender** | `server/engine/recommender.py` | `SLOTHRecommender` | Unified orchestrator executing the 6-stage pipeline: FAISS candidate recall (top 500) -> 6-layer score extraction -> Gating fusion -> IPS debiasing -> MMR diversity re-ranking -> Diffusion latent ordering. Also exposes `generate_playlist()`. |
| **Feedback Loop** | `server/engine/feedback.py` | `FeedbackDispatcher`, `FeedbackEvent` | Real-time reward computation: `listen_through` (+1.0), `early_skip` (-0.5), `save` (+2.0). Asynchronously updates Thompson Sampling bandit priors, records BPR preference pairs, and appends to mood history. |
| **Engine API** | `server/engine/api.py` | FastAPI `APIRouter` | High-concurrency endpoints: `GET /recommend`, `POST /feedback`, `POST /playlist/generate`, `GET /status`, `POST /reindex` (and `GET /reindex`). |
| **Settings UI** | `src/app/settings/page.tsx` | Nuclear-style Engine card | Toggle row indicating "Engine status: Running on localhost:8001", model version display (`v0.1.0-hybrid`), and a live Re-Index trigger. |

---

## 3. Detailed Architectural Specifications

### 3.1 Gated Fusion (`fusion.py`)
- **Input Dimension**: 6 features representing user/session conditions:
  1. `is_new_user` ($\{0.0, 1.0\}$)
  2. `mode` (one-hot or normalized scalar representing active mode: Focus, Workout, Chill, Commute, Party, None)
  3. `context_type` (normalized time-of-day, day-of-week, energy level, or activity)
  4. `session_depth` (number of tracks played in current session, normalized)
  5. `device_type` (mobile, desktop, web)
  6. `exploration_intent` (user discovery propensity)
- **Architecture**:
  - Layer 1: $\mathbf{h}_1 = \text{ReLU}(\mathbf{W}_1 \mathbf{x} + \mathbf{b}_1)$, where $\mathbf{W}_1 \in \mathbb{R}^{32 \times 6}$
  - Layer 2: $\mathbf{w} = \text{Softmax}(\mathbf{W}_2 \mathbf{h}_1 + \mathbf{b}_2)$, where $\mathbf{W}_2 \in \mathbb{R}^{6 \times 32}$
- **Output Weights $\mathbf{w} \in \Delta^5$ (sum to 1.0)** for the 6 scoring signals:
  1. `w_graph`: LightHGCN collaborative hypergraph score
  2. `w_sequential`: BERT4Rec sequence transition score
  3. `w_memory`: ACT-R cognitive activation score
  4. `w_acoustic`: MERT/CLAP acoustic-semantic similarity score
  5. `w_meld`: Meld source/artist affinity heuristic score
  6. `w_bandit`: Thompson Sampling exploration score

### 3.2 SLOTH Recommender Orchestrator (`recommender.py`)
1. **Candidate Retrieval**:
   - Query FAISS index (`IndexFlatIP` with L2-normalized MERT/CLAP embeddings) for top 500 candidates. Fallback to SQLite catalogue when vectors are unindexed.
2. **6-Layer Scoring**:
   - Compute normalized scores $[0.0, 1.0]$ for each of the 6 signals across retrieved candidates.
3. **Gating Fusion**:
   - Compute dynamic weights $\mathbf{w}$ via `GatingNetwork(context)`.
   - Raw score: $S_{\text{fused}}(i) = \sum_{k=1}^6 w_k S_k(i)$.
4. **IPS Debiasing**:
   - $S_{\text{debiased}}(i) = \frac{S_{\text{fused}}(i)}{(\text{play\_count}(i) / \max_j \text{play\_count}(j) + \epsilon)^\alpha}$, respecting user setting `discoveryAlpha` ($\alpha$).
5. **Maximal Marginal Relevance (MMR) Diversification**:
   - Iterative selection balancing relevance and novelty against already-selected tracks:
     $$\arg\max_{i \in \mathcal{R} \setminus \mathcal{S}} \left[\lambda S_{\text{debiased}}(i) - (1 - \lambda) \max_{j \in \mathcal{S}} \text{Sim}(i, j)\right]$$
6. **Diffusion Ordering / Conditioning**:
   - Pass sequence through `PlaylistDiffusionGenerator` or order by smooth mood valence/energy continuity.

### 3.3 Feedback System (`feedback.py`)
- **Reward Schema**:
  - `listen_through` ($\ge 80\%$ duration): $+1.0$ reward
  - `early_skip` ($< 30\text{s}$ or $< 20\%$ duration): $-0.5$ reward
  - `save` / `favorite`: $+2.0$ reward
  - `dislike` / `explicit_skip`: $-1.5$ reward
- **Asynchronous Side Effects** (via FastAPI BackgroundTasks):
  1. Thompson Sampling update: $\alpha_{c} \leftarrow \alpha_{c} + \max(r, 0)$, $\beta_{c} \leftarrow \beta_{c} + \max(-r, 0)$.
  2. BPR Preference Pair logged to SQLite (`bpr_triplets` or `user_feedback` table): positive interaction $(u, i)$ vs random unplayed $(u, j)$.
  3. User mood trajectory updated: appends valence/arousal coordinate of consumed track to recent history window.

### 3.4 API Endpoints (`api.py`)
- `GET /recommend`:
  - Query params: `user_id: str`, `count: int = 20`, `mode: Optional[str]`, `alpha: Optional[float]`
  - Latency Target: $< 200\text{ms}$ p95
- `POST /feedback`:
  - Request body: `{user_id: str, track_id: str, event_type: str, duration_ms: Optional[int], position_ms: Optional[int]}`
  - Latency Target: $< 20\text{ms}$
- `POST /playlist/generate`:
  - Request body: `{preset?: str, start_mood?: {valence, arousal}, target_mood?: {valence, arousal}, track_count?: int}`
  - Latency Target: $< 2000\text{ms}$ p95
- `GET /status`:
  - Returns engine uptime, memory usage, indexed track count, model version, and active device.
- `GET /reindex` and `POST /reindex`:
  - Schedules background re-indexing of FAISS vector store from SQLite database and returns immediate acknowledgment.

---

## 4. UI Implementation (Settings -> Integrations)

- **Surface**: `src/app/settings/page.tsx` under `activeCategory === 'integrations'`.
- **Nuclear Visual Style**:
  - Tactile panel with 1px border (`border-[var(--border)]`), background `bg-[var(--surface)]`.
  - Status badge: Green "ONLINE" when engine responds on `localhost:8001`, Yellow "STANDBY" / Gray "OFFLINE" fallback.
  - Text: `"Engine status: Running on localhost:8001"`
  - Model Version: `"v0.1.0-hybrid (LightHGCN + BERT4Rec + L-DiffRec + Gated Fusion)"`
  - Re-Index Button: `"Re-Index Vector Store"` with spinner during async task execution.

---

## 5. Performance Budgets & SLA Verification

1. `/recommend` latency: $< 200\text{ms}$ p95 on warm FAISS index with 1,000+ tracks.
2. `/feedback` latency: $< 20\text{ms}$ (non-blocking async background persistence).
3. `/playlist/generate` latency: $< 2.0\text{s}$ p95 for 20-track conditional diffusion arc.

---

## 6. Testing Strategy

- `server/tests/test_fusion_recommender.py`:
  - Unit tests for `GatingNetwork` forward pass, softmax weight normalization, and conditioning dimensions.
  - End-to-end recommendation flow in `SLOTHRecommender` (FAISS recall -> 6-layer scoring -> Gating -> IPS -> MMR -> Diffusion).
  - Feedback dispatcher reward math and background task execution.
  - FastAPI endpoint testing via `TestClient`.
- `src/tests/settings-engine-ui.test.ts`:
  - Vitest test asserting presence of engine status row, version badge, and re-index action.
