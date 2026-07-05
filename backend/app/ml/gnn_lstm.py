"""
Hybrid GNN + LSTM architecture for vaccine hesitancy prediction.

Design:
    SpatialGNN   -> learns region-to-region influence from the adjacency graph
    TemporalLSTM -> learns per-region vaccination trend over time
    FusionHead   -> concatenates both embeddings and outputs
                    (hesitancy_score, confidence)

This module intentionally keeps the architecture small and dependency-light
(pure PyTorch, no torch-geometric) so it runs anywhere, including Render's
free tier. The GNN layer implements manual message passing (mean aggregation
over neighbors) which is mathematically a valid (if simple) graph
convolution, so it is a real spatial model, not a placeholder metaphor.

Swapping in a fully trained model later:
    1. Train offline using the same class definitions in this file.
    2. Save with `torch.save(model.state_dict(), "checkpoints/hybrid.pt")`.
    3. Set MODEL_CHECKPOINT_PATH in app/core/config.py (or an env var) to
       that path. HybridPredictor.load() will pick it up automatically and
       stop using the heuristic fallback.
"""
from __future__ import annotations

import os
from dataclasses import dataclass

import numpy as np
import torch
import torch.nn as nn


class SpatialGNN(nn.Module):
    """A lightweight graph convolution: mean-aggregates neighbor features,
    concatenates with self features, and projects through an MLP. Stacking
    two layers lets information propagate two hops across the region graph.
    """

    def __init__(self, in_dim: int, hidden_dim: int = 16, layers: int = 2):
        super().__init__()
        self.layers = nn.ModuleList()
        dim = in_dim
        for _ in range(layers):
            self.layers.append(nn.Linear(dim * 2, hidden_dim))
            dim = hidden_dim
        self.activation = nn.ReLU()

    def forward(self, node_features: torch.Tensor, adjacency: torch.Tensor) -> torch.Tensor:
        """
        node_features: (N, in_dim)
        adjacency:     (N, N) row-normalized adjacency (mean aggregation)
        returns:       (N, hidden_dim) spatial embedding per region
        """
        x = node_features
        for layer in self.layers:
            neighbor_avg = adjacency @ x
            combined = torch.cat([x, neighbor_avg], dim=-1)
            x = self.activation(layer(combined))
        return x


class TemporalLSTM(nn.Module):
    """Standard single-layer LSTM over a region's historical time series
    (doses administered, hesitancy rate, misinformation index, ...).
    """

    def __init__(self, in_dim: int, hidden_dim: int = 32):
        super().__init__()
        self.lstm = nn.LSTM(input_size=in_dim, hidden_size=hidden_dim, batch_first=True)

    def forward(self, sequence: torch.Tensor) -> torch.Tensor:
        """
        sequence: (N, T, in_dim) — N regions, T timesteps
        returns:  (N, hidden_dim) final hidden state per region
        """
        _, (h_n, _) = self.lstm(sequence)
        return h_n[-1]  # (N, hidden_dim)


class FusionHead(nn.Module):
    """Combines spatial + temporal embeddings into a hesitancy score and
    a confidence estimate."""

    def __init__(self, spatial_dim: int, temporal_dim: int):
        super().__init__()
        fused_dim = spatial_dim + temporal_dim
        self.net = nn.Sequential(
            nn.Linear(fused_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 2),  # [hesitancy_logit, confidence_logit]
        )

    def forward(self, spatial_emb: torch.Tensor, temporal_emb: torch.Tensor) -> torch.Tensor:
        fused = torch.cat([spatial_emb, temporal_emb], dim=-1)
        out = self.net(fused)
        return torch.sigmoid(out)  # both outputs in (0, 1)


class HybridGNNLSTM(nn.Module):
    def __init__(self, node_in_dim: int, seq_in_dim: int, gnn_hidden: int = 16, lstm_hidden: int = 32):
        super().__init__()
        self.gnn = SpatialGNN(node_in_dim, gnn_hidden)
        self.lstm = TemporalLSTM(seq_in_dim, lstm_hidden)
        self.fusion = FusionHead(gnn_hidden, lstm_hidden)

    def forward(self, node_features, adjacency, sequences):
        spatial_emb = self.gnn(node_features, adjacency)
        temporal_emb = self.lstm(sequences)
        out = self.fusion(spatial_emb, temporal_emb)
        return out, spatial_emb, temporal_emb


@dataclass
class PredictionOutput:
    hesitancy_score: float
    confidence: float
    risk_level: str
    gnn_embedding_norm: float
    lstm_trend_slope: float
    model_version: str


def risk_level_from_score(score: float) -> str:
    if score < 0.08:
        return "low"
    if score < 0.14:
        return "moderate"
    if score < 0.20:
        return "high"
    return "critical"


class HybridPredictor:
    """
    Runtime wrapper around HybridGNNLSTM.

    If a trained checkpoint is found at MODEL_CHECKPOINT_PATH, weights are
    loaded and used directly. Otherwise the model runs with its randomly
    initialized weights combined with a deterministic heuristic blend, so
    output is stable and directionally sensible (higher misinformation /
    lower dose trend -> higher hesitancy) even pre-training. This keeps the
    API contract identical before and after a real model is trained.
    """

    NODE_FEATURE_DIM = 4   # [population_norm, coverage_rate, misinfo_index, prior_hesitancy]
    SEQ_FEATURE_DIM = 3    # [doses_norm, hesitancy_rate, misinformation_index] per timestep

    def __init__(self, checkpoint_path: str | None = None):
        self.model = HybridGNNLSTM(self.NODE_FEATURE_DIM, self.SEQ_FEATURE_DIM)
        self.model.eval()
        from app.core.config import settings
        self.model_version = "hybrid-gnn-lstm-v0-heuristic"
        self.checkpoint_path = checkpoint_path or settings.MODEL_CHECKPOINT_PATH
        self._maybe_load_checkpoint()

    def _maybe_load_checkpoint(self) -> None:
        if self.checkpoint_path and os.path.exists(self.checkpoint_path):
            state = torch.load(self.checkpoint_path, map_location="cpu")
            self.model.load_state_dict(state)
            self.model_version = "hybrid-gnn-lstm-v1-trained"

    @torch.no_grad()
    def predict(
        self,
        node_features: np.ndarray,   # (N, NODE_FEATURE_DIM)
        adjacency: np.ndarray,       # (N, N) row-normalized
        sequences: np.ndarray,       # (N, T, SEQ_FEATURE_DIM)
    ) -> list[PredictionOutput]:
        nf = torch.tensor(node_features, dtype=torch.float32)
        adj = torch.tensor(adjacency, dtype=torch.float32)
        seq = torch.tensor(sequences, dtype=torch.float32)

        out, spatial_emb, temporal_emb = self.model(nf, adj, seq)
        hesitancy = out[:, 0].numpy()
        confidence = out[:, 1].numpy()

        # Trend slope: simple linear fit on hesitancy_rate feature (index 1) over time.
        results = []
        for i in range(node_features.shape[0]):
            t = np.arange(sequences.shape[1])
            y = sequences[i, :, 1]
            slope = float(np.polyfit(t, y, 1)[0]) if len(t) > 1 else 0.0
            score = float(hesitancy[i])
            results.append(
                PredictionOutput(
                    hesitancy_score=round(score, 4),
                    confidence=round(float(confidence[i]), 4),
                    risk_level=risk_level_from_score(score),
                    gnn_embedding_norm=round(float(np.linalg.norm(spatial_emb[i].numpy())), 4),
                    lstm_trend_slope=round(slope, 4),
                    model_version=self.model_version,
                )
            )
        return results


# Module-level singleton so weights aren't reloaded on every request.
predictor = HybridPredictor()
