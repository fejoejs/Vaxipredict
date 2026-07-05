import os
import csv
import torch
import torch.nn as nn
import numpy as np

# Add parent path to import app correctly
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.ml.gnn_lstm import HybridGNNLSTM

# Define 20 Indian States and their base properties (State, Population, Lat, Lon, Base Hesitancy)
STATES_METADATA = [
    ("Uttar Pradesh", 200000000, 26.8467, 80.9462, 0.15),
    ("Maharashtra", 112000000, 19.7515, 75.7139, 0.12),
    ("Bihar", 104000000, 25.0961, 85.3131, 0.22),
    ("West Bengal", 91000000, 22.9868, 87.8550, 0.10),
    ("Madhya Pradesh", 72000000, 22.9734, 78.6569, 0.18),
    ("Tamil Nadu", 72000000, 11.1271, 78.6569, 0.11),
    ("Rajasthan", 68000000, 27.0238, 74.2179, 0.19),
    ("Karnataka", 61000000, 15.3173, 75.7139, 0.12),
    ("Gujarat", 60000000, 22.2587, 71.1924, 0.16),
    ("Andhra Pradesh", 49000000, 15.9129, 79.7400, 0.13),
    ("Odisha", 41000000, 20.9517, 85.0985, 0.14),
    ("Telangana", 35000000, 18.1124, 79.0193, 0.15),
    ("Kerala", 33000000, 10.8505, 76.2711, 0.08),
    ("Jharkhand", 32000000, 23.6102, 85.2799, 0.20),
    ("Assam", 31000000, 26.2006, 92.9376, 0.16),
    ("Punjab", 27000000, 31.1471, 75.3412, 0.14),
    ("Haryana", 25000000, 29.0588, 76.0856, 0.17),
    ("Chhattisgarh", 25000000, 21.2787, 81.8661, 0.18),
    ("Delhi", 19000000, 28.6139, 77.2090, 0.09),
    ("Jammu & Kashmir", 12000000, 33.7782, 76.5762, 0.21),
]

# Set up edges representing geographical proximity between Indian states
EDGES = [
    ("Jammu & Kashmir", "Punjab"),
    ("Punjab", "Haryana"),
    ("Punjab", "Rajasthan"),
    ("Haryana", "Delhi"),
    ("Haryana", "Rajasthan"),
    ("Haryana", "Uttar Pradesh"),
    ("Delhi", "Uttar Pradesh"),
    ("Rajasthan", "Gujarat"),
    ("Rajasthan", "Madhya Pradesh"),
    ("Gujarat", "Maharashtra"),
    ("Gujarat", "Madhya Pradesh"),
    ("Madhya Pradesh", "Uttar Pradesh"),
    ("Madhya Pradesh", "Chhattisgarh"),
    ("Madhya Pradesh", "Maharashtra"),
    ("Uttar Pradesh", "Bihar"),
    ("Bihar", "Jharkhand"),
    ("Bihar", "West Bengal"),
    ("Jharkhand", "West Bengal"),
    ("Jharkhand", "Odisha"),
    ("Jharkhand", "Chhattisgarh"),
    ("Chhattisgarh", "Odisha"),
    ("Chhattisgarh", "Maharashtra"),
    ("Chhattisgarh", "Andhra Pradesh"),
    ("Odisha", "Andhra Pradesh"),
    ("Odisha", "West Bengal"),
    ("Maharashtra", "Karnataka"),
    ("Maharashtra", "Telangana"),
    ("Karnataka", "Telangana"),
    ("Karnataka", "Andhra Pradesh"),
    ("Karnataka", "Tamil Nadu"),
    ("Karnataka", "Kerala"),
    ("Andhra Pradesh", "Telangana"),
    ("Andhra Pradesh", "Tamil Nadu"),
    ("Tamil Nadu", "Kerala"),
    ("Assam", "West Bengal"),
]

PERIODS = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"]


def generate_cdc_dataset():
    """Generates the CSV file modeling CDC Vaccine Hesitancy data."""
    uploads_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads"
    )
    os.makedirs(uploads_dir, exist_ok=True)
    csv_path = os.path.join(uploads_dir, "cdc_vaccine_hesitancy.csv")

    with open(csv_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "region",
            "state",
            "population",
            "period",
            "doses_administered",
            "eligible_population",
            "hesitancy_rate",
            "misinformation_index",
        ])

        for state, pop, lat, lon, base_hes in STATES_METADATA:
            # Let eligible population grow slightly over time
            for i, period in enumerate(PERIODS):
                eligible = int(pop * 0.85)  # 85% eligible
                # Doses administered increase over time (e.g. cumulative doses starting from 60% of eligible)
                base_cov = 0.60 + (i * 0.04)  # 60% -> 80% coverage
                doses = int(eligible * base_cov)

                # Hesitancy fluctuates depending on misinformation index
                # Misinformation index can fluctuate between 0.1 and 0.4
                misinfo = round(
                    0.15
                    + 0.1 * np.sin(i / 1.5)
                    + (0.1 if base_hes > 0.20 else 0.0)
                    + float(np.random.normal(0, 0.02)),
                    4,
                )
                misinfo = min(max(misinfo, 0.05), 0.95)

                hes = round(
                    base_hes
                    + 0.15 * misinfo
                    - 0.005 * i
                    + float(np.random.normal(0, 0.01)),
                    4,
                )
                hes = min(max(hes, 0.02), 0.95)

                writer.writerow([
                    state,
                    state,
                    pop,
                    period,
                    doses,
                    eligible,
                    hes,
                    misinfo,
                ])

    print(f"Generated CDC vaccine hesitancy dataset at {csv_path}")
    return csv_path


def train_model():
    """Trains the GNN+LSTM model on generated data and saves checkpoints."""
    N = len(STATES_METADATA)
    T = len(PERIODS)

    # 1. Prepare Adjacency Matrix
    state_to_idx = {name: i for i, (name, *_) in enumerate(STATES_METADATA)}
    adj = np.zeros((N, N))
    for u, v in EDGES:
        if u in state_to_idx and v in state_to_idx:
            idx_u = state_to_idx[u]
            idx_v = state_to_idx[v]
            adj[idx_u, idx_v] = 1.0
            adj[idx_v, idx_u] = 1.0

    # Row normalize adjacency matrix
    row_sums = adj.sum(axis=1, keepdims=True)
    row_sums[row_sums == 0] = 1.0
    adj_norm = adj / row_sums

    # 2. Build Tensors for training
    # Node features: [population_norm, coverage_rate, misinfo_index, prior_hesitancy]
    # We use the final timestep (period 6) as the current state, and periods 1-6 as sequences.
    node_features = np.zeros((N, 4))
    sequences = np.zeros((N, T, 3))
    targets = np.zeros((N, 2))  # [hesitancy_score, confidence_score]

    # Temporary dataset parsing to feed into NumPy arrays
    uploads_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads"
    )
    csv_path = os.path.join(uploads_dir, "cdc_vaccine_hesitancy.csv")

    records_by_state = {name: [] for name, *_ in STATES_METADATA}
    with open(csv_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row["region"]
            if name in records_by_state:
                records_by_state[name].append(row)

    for name, idx in state_to_idx.items():
        recs = sorted(records_by_state[name], key=lambda x: x["period"])
        pop = float(recs[-1]["population"])
        pop_norm = min(pop / 200000000.0, 1.0)

        # Sequences
        for t in range(T):
            rec = recs[t]
            doses = float(rec["doses_administered"])
            elig = float(rec["eligible_population"])
            cov = doses / max(elig, 1.0)
            hes = float(rec["hesitancy_rate"])
            mis = float(rec["misinformation_index"])

            sequences[idx, t] = [cov, hes, mis]

        # Final node features
        last_rec = recs[-1]
        last_doses = float(last_rec["doses_administered"])
        last_elig = float(last_rec["eligible_population"])
        last_cov = last_doses / max(last_elig, 1.0)
        last_hes = float(last_rec["hesitancy_rate"])
        last_mis = float(last_rec["misinformation_index"])

        node_features[idx] = [pop_norm, last_cov, last_mis, last_hes]

        # Targets: Target hesitancy score is the final hesitancy rate.
        # Confidence score is modeled as higher when hesitancy is low or misinformation is stable.
        target_hes = last_hes
        target_conf = max(1.0 - (last_mis * 0.5 + last_hes * 0.5), 0.1)
        targets[idx] = [target_hes, target_conf]

    # Convert to PyTorch tensors
    x = torch.tensor(node_features, dtype=torch.float32)
    a = torch.tensor(adj_norm, dtype=torch.float32)
    seq = torch.tensor(sequences, dtype=torch.float32)
    y = torch.tensor(targets, dtype=torch.float32)

    # Instantiate model
    model = HybridGNNLSTM(
        node_in_dim=4, seq_in_dim=3, gnn_hidden=16, lstm_hidden=32
    )
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
    criterion = nn.MSELoss()

    # Simple training loop
    model.train()
    print("Training GNN-LSTM model on CDC dataset...")
    for epoch in range(300):
        optimizer.zero_grad()
        out, _, _ = model(x, a, seq)
        loss = criterion(out, y)
        loss.backward()
        optimizer.step()
        if (epoch + 1) % 20 == 0:
            print(f"Epoch {epoch+1}/100 - Loss: {loss.item():.6f}")

    # Save model checkpoint
    checkpoints_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "checkpoints",
    )
    os.makedirs(checkpoints_dir, exist_ok=True)
    checkpoint_path = os.path.join(checkpoints_dir, "hybrid.pt")
    torch.save(model.state_dict(), checkpoint_path)
    print(f"Trained model checkpoint saved successfully at {checkpoint_path}")


if __name__ == "__main__":
    generate_cdc_dataset()
    train_model()
