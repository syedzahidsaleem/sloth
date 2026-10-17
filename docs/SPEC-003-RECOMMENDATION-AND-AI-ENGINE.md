# SPEC-003: SLOTH Recommendation & AI Core Algorithms

## 1. Objective

Extract and adapt 8 state-of-the-art recommendation, cognitive memory, diffusion, causal debiasing, and audio feature extraction algorithms from peer-reviewed literature into Sloth's backend engine (`server/engine/`).

---

## 2. Capability Map

| Module ID | Target File | Source Paper & Reference | Core Functionality |
|---|---|---|---|
| `light_hgcn` | `server/engine/graph/light_hgcn.py` | LightGCN (SIGIR 2020) & HEMR; `gusye1234/LightGCN-PyTorch` | 5-node heterogeneous hypergraph convolution (`User`, `Track`, `Artist`, `Album`, `Playlist`) with normalized incidence message passing |
| `bert4rec` | `server/engine/sequential/bert4rec.py` | BERT4Rec (CIKM 2019); `jaywonchung/BERT4Rec-VAE-Pytorch` | Bidirectional Transformer sequential recommendation with Cloze masking, outputting 256-dim sequence representation |
| `actr_memory` | `server/engine/sequential/actr_memory.py` | "Transformers Meet ACT-R" (ACM RecSys 2024); `deezer/recsys24-pisa` | Cognitive memory decay: Base-level activation $B(t) = \ln(n) - d \ln(\Delta t)$, spreading activation, and partial matching |
| `playlist_diff`| `server/engine/generator/playlist_diffusion.py` | DiffRec / L-DiffRec (SIGIR 2023); `YiyanXu/DiffRec` | Latent diffusion generative model over 768-dim MERT embeddings conditioned on Sloth 6-signal context vector |
| `ips_debias` | `server/engine/coldstart/ips_debiasing.py` | Recommendations as Treatments (ICML 2016); `jiawei-chen/RecDebiasing` | Inverse Propensity Scoring (IPS) & SNIPS loss reweighting derived from SQLite `play_count` distribution |
| `thompson_bandit` | `server/engine/coldstart/thompson_bandit.py` | Agrawal & Goyal (COLT 2012); Chapelle & Li (NeurIPS 2011) | Multi-armed bandit Beta distribution ($\alpha, \beta$) sampler for exploration-exploitation in cold start |
| `mert_extract` | `server/engine/audio/mert_extractor.py` | MERT (ICLR 2024); `yizhilll/MERT` (`m-a-p/MERT-v1-95M`) | 24kHz audio processing, layer hidden state extraction, and 768-dim acoustic embedding generation |
| `clap_extract` | `server/engine/audio/clap_extractor.py` | CLAP (ICASSP 2023); `LAION-AI/CLAP` | 48kHz audio and text joint multimodal embedding (512-dim) for natural language semantic track search |

---

## 3. Mathematical Foundations & Adaptations

### 3.1 LightHGCN (Hypergraph Convolution)
- **Heterogeneous Nodes**:
  $V = V_{\text{user}} \cup V_{\text{track}} \cup V_{\text{artist}} \cup V_{\text{album}} \cup V_{\text{playlist}}$.
- **Hypergraph Incidence Matrix**: $\mathbf{H} \in \mathbb{R}^{|V| \times |E|}$, where $H_{ve} = 1$ if node $v$ participates in hyperedge $e$.
- **Degree Matrices**:
  - Vertex degree: $D_{v, ii} = \sum_{e} H_{ie} W_e$
  - Edge degree: $D_{e, ee} = \sum_{v} H_{ve}$
- **Propagation Rule**:
  $$\mathbf{E}^{(k+1)} = \mathbf{D}_v^{-1/2} \mathbf{H} \mathbf{W}_e \mathbf{D}_e^{-1} \mathbf{H}^T \mathbf{D}_v^{-1/2} \mathbf{E}^{(k)}$$
- **Final Readout**:
  $$\mathbf{E}^* = \sum_{k=0}^{K} \alpha_k \mathbf{E}^{(k)}, \quad \alpha_k = \frac{1}{K+1}$$

### 3.2 BERT4Rec Sequential Recommendation
- Sequence of track IDs $S = (v_1, v_2, \dots, v_T)$ where $v_t \in \mathcal{V}_{\text{track}}$.
- Position-aware self-attention with Cloze masking probability $p = 0.15$:
  $$\text{Attention}(\mathbf{Q}, \mathbf{K}, \mathbf{V}) = \text{softmax}\left(\frac{\mathbf{Q}\mathbf{K}^T}{\sqrt{d_k}}\right)\mathbf{V}$$
- Feedforward projection outputs a 256-dimensional dense session embedding.

### 3.3 ACT-R Cognitive Memory Decay
- **Base-level Activation**:
  $$B_i(t) = \ln\left(\sum_{k=1}^{n_i} (t - t_{i,k})^{-d}\right) \approx \ln(n_i) - d \ln(t - t_{i,\text{last}})$$
  where $d \approx 0.5$ is the memory decay parameter.
- **Spreading Activation**:
  $$S_i(t) = \sum_{j \in \mathcal{C}} W_j S_{ji}$$
  where $S_{ji} = \text{PMI}(i, j) = \ln\frac{P(i, j)}{P(i)P(j)}$ measures co-occurrence association.
- **Partial Matching**:
  $$P_i(t) = \sum_{k} M_{ik} \cdot \text{sim}(i, k)$$
- **Total Activation & Retrieval Probability**:
  $$A_i(t) = B_i(t) + S_i(t) + P_i(t), \quad P(\text{recall } i) = \frac{\exp(A_i(t) / \tau)}{\sum_m \exp(A_m(t) / \tau)}$$

### 3.4 L-DiffRec (Latent Diffusion Recommender)
- Forward Diffusion Gaussian transition:
  $$q(x_t | x_{t-1}) = \mathcal{N}(x_t; \sqrt{1 - \beta_t} x_{t-1}, \beta_t \mathbf{I})$$
- Reverse Denoising network conditioned on 6-signal context vector $\mathbf{c} \in \mathbb{R}^6$ (energy, danceability, valence, tempo, acousticness, mood):
  $$\hat{\epsilon}_\theta(x_t, t, \mathbf{c}) = \text{MLP}([x_t, \text{SinusoidalTimeEmb}(t), \mathbf{c}])$$
- Latent dimension: 768 (matching MERT feature vectors).

### 3.5 Inverse Propensity Scoring (IPS)
- Propensity estimation from item interaction frequencies:
  $$p_i = \left(\frac{\text{play\_count}_i + 1}{\max_j \text{play\_count}_j + 1}\right)^\gamma, \quad \hat{p}_i = \max(p_i, p_{\min})$$
- Reweighted Empirical Risk:
  $$\mathcal{L}_{\text{IPS}} = \frac{1}{|D|} \sum_{(u, i) \in D} \frac{\ell(y_{ui}, \hat{y}_{ui})}{\hat{p}_i}$$
  $$\mathcal{L}_{\text{SNIPS}} = \frac{\sum_{(u,i)} \frac{\ell(y_{ui}, \hat{y}_{ui})}{\hat{p}_i}}{\sum_{(u,i)} \frac{1}{\hat{p}_i}}$$

### 3.6 Thompson Sampling Bandit
- Beta conjugate prior per arm $i$: $\theta_i \sim \text{Beta}(\alpha_i, \beta_i)$.
- Action selection: $i^* = \arg\max_i \hat{\theta}_i$.
- State transition with decay $\gamma$:
  $$\alpha_i \leftarrow \gamma \alpha_i + r, \quad \beta_i \leftarrow \gamma \beta_i + (1 - r)$$

### 3.7 MERT Audio Feature Extraction
- Sample rate: 24,000 Hz.
- Hugging Face `m-a-p/MERT-v1-95M` architecture.
- 13 hidden layers -> temporal mean pooling -> 768-dim acoustic vector.

### 3.8 CLAP Joint Multimodal Embeddings
- Sample rate: 48,000 Hz.
- Dual encoders mapping audio waveform and natural language text prompt into a shared 512-dim metric space.

---

## 4. Implementation & Directory Hierarchy

```
server/engine/
├── graph/
│   ├── __init__.py
│   └── light_hgcn.py           # 5-node heterogeneous hypergraph convolution
├── sequential/
│   ├── __init__.py
│   ├── bert4rec.py             # Bidirectional sequential Transformer recommender
│   └── actr_memory.py          # Cognitive memory decay & spreading activation
├── generator/
│   ├── __init__.py
│   └── playlist_diffusion.py   # L-DiffRec conditional playlist diffusion denoiser
├── coldstart/
│   ├── __init__.py
│   ├── ips_debiasing.py        # IPS & SNIPS exposure debiasing loss from play counts
│   └── thompson_bandit.py      # Beta-Bernoulli Thompson Sampling bandit
└── audio/
    ├── __init__.py
    ├── mert_extractor.py       # MERT 768-dim music acoustic feature extractor
    └── clap_extractor.py       # CLAP 512-dim multimodal audio-text representation
```

---

## 5. Verification Plan
- Unit test suite for every algorithm in `server/tests/test_engine_algorithms.py`.
- Validation against synthetic and benchmark tensors.
- 100% test passing gate before atomic commit and push.
