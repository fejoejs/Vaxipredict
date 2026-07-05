"""
Preprocessing + graph construction + inference orchestration.

This is the layer between raw DB rows and the HybridPredictor's tensor
contract. Keeping it separate from app/ml/gnn_lstm.py means the model
architecture can change without touching how data is assembled, and vice
versa (single responsibility).
"""
from __future__ import annotations

import numpy as np
import networkx as nx
from sqlalchemy.orm import Session

from app.models.region import Region, RegionEdge
from app.models.dataset import VaccinationRecord
from app.ml.gnn_lstm import predictor, PredictionOutput


def build_region_graph(db: Session) -> tuple[list[Region], np.ndarray]:
    """Builds a row-normalized adjacency matrix from RegionEdge rows using
    networkx, matching the graph-construction approach already used in the
    original Streamlit prototype (networkx-based community graph)."""
    regions = db.query(Region).all()
    if not regions:
        return [], np.zeros((0, 0))

    index = {r.id: i for i, r in enumerate(regions)}
    g = nx.Graph()
    g.add_nodes_from(range(len(regions)))

    edges = db.query(RegionEdge).all()
    for e in edges:
        if e.source_id in index and e.target_id in index:
            g.add_edge(index[e.source_id], index[e.target_id], weight=e.weight)

    adj = nx.to_numpy_array(g, nodelist=range(len(regions)), weight="weight")
    row_sums = adj.sum(axis=1, keepdims=True)
    row_sums[row_sums == 0] = 1.0
    adj_normalized = adj / row_sums
    return regions, adj_normalized


def build_node_features(db: Session, regions: list[Region]) -> np.ndarray:
    features = []
    for r in regions:
        latest = (
            db.query(VaccinationRecord)
            .filter(VaccinationRecord.region_id == r.id)
            .order_by(VaccinationRecord.period.desc())
            .first()
        )
        pop_norm = min(r.population / 200_000_000, 1.0) if r.population else 0.0
        coverage = 0.0
        misinfo = 0.0
        prior_hesitancy = 0.0
        if latest and latest.eligible_population:
            coverage = min(latest.doses_administered / max(latest.eligible_population, 1), 1.0)
            misinfo = latest.misinformation_index
            prior_hesitancy = latest.hesitancy_rate
        features.append([pop_norm, coverage, misinfo, prior_hesitancy])
    return np.array(features, dtype=np.float32) if features else np.zeros((0, 4), dtype=np.float32)


def build_sequences(db: Session, regions: list[Region], timesteps: int = 6) -> np.ndarray:
    sequences = []
    for r in regions:
        records = (
            db.query(VaccinationRecord)
            .filter(VaccinationRecord.region_id == r.id)
            .order_by(VaccinationRecord.period.asc())
            .all()
        )
        seq = []
        for rec in records[-timesteps:]:
            doses_norm = min(rec.doses_administered / max(rec.eligible_population, 1), 1.0) if rec.eligible_population else 0.0
            seq.append([doses_norm, rec.hesitancy_rate, rec.misinformation_index])
        # left-pad with zeros so every region has equal-length sequences
        while len(seq) < timesteps:
            seq.insert(0, [0.0, 0.0, 0.0])
        sequences.append(seq)
    return np.array(sequences, dtype=np.float32) if sequences else np.zeros((0, timesteps, 3), dtype=np.float32)


def run_hybrid_prediction(db: Session) -> list[tuple[Region, PredictionOutput]]:
    regions, adjacency = build_region_graph(db)
    if not regions:
        return []
    node_features = build_node_features(db, regions)
    sequences = build_sequences(db, regions)
    outputs = predictor.predict(node_features, adjacency, sequences)
    return list(zip(regions, outputs))
