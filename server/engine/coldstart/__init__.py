"""
Sloth Coldstart & Debiasing Engine
Includes Inverse Propensity Scoring (IPS), Thompson Sampling Bandits,
Maximal Marginal Relevance (MMR) Diversification, Discovery Slots,
Cultural Affinity Scoring, and Onboarding Feedback API.
"""

from .ips_debiasing import IPSDebiaser, IPSLossConfig
from .thompson_bandit import ThompsonBandit, BanditArm
from .mmr_reranker import MMRReranker
from .discovery_slots import DiscoverySlotInjector, QueueTrackItem
from .cultural_affinity import CulturalAffinityScorer, LocaleProfile, LOCALE_PROFILES
from .onboarding_api import router as onboarding_router

__all__ = [
    "IPSDebiaser",
    "IPSLossConfig",
    "ThompsonBandit",
    "BanditArm",
    "MMRReranker",
    "DiscoverySlotInjector",
    "QueueTrackItem",
    "CulturalAffinityScorer",
    "LocaleProfile",
    "LOCALE_PROFILES",
    "onboarding_router",
]
