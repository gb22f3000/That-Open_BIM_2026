"""Generate synthetic datasets so notebooks can run without external downloads."""
import gzip
import os
import pickle
import random

import numpy as np
import pandas as pd
import torch
import networkx as nx

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def make_beec_dataset():
    """Synthetic BEEC embeddings matching Rotterdam tutorial dimensions."""
    rng = np.random.default_rng(42)
    base = os.path.join(ROOT, "data", "beec_dataset")

    for split, n in [("train", 4499), ("test", 1500)]:
        embeddings = torch.tensor(rng.normal(0, 1, (n, 384)).astype(np.float32))
        buf = pickle.dumps(embeddings)
        path = os.path.join(base, "embeddings", f"embeddings_{split}.pkl.gz")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(gzip.compress(buf))

        labels = rng.integers(0, 2, n)
        df = pd.DataFrame({"image": [f"{i:05d}.jpg" for i in range(n)], "label": labels})
        label_path = os.path.join(base, "labels", f"{split}.csv")
        os.makedirs(os.path.dirname(label_path), exist_ok=True)
        df.to_csv(label_path, index=False)

    print("BEEC synthetic dataset created.")


def _rectangle(cx, cy, w, h):
    return [
        (cx - w / 2, cy - h / 2),
        (cx + w / 2, cy - h / 2),
        (cx + w / 2, cy + h / 2),
        (cx - w / 2, cy + h / 2),
        (cx - w / 2, cy - h / 2),
    ]


def make_msd_graphs(n=12):
    """Create sample MSD-style NetworkX graphs for visualization notebook."""
    out_dir = os.path.join(ROOT, "data", "msd_graphs")
    os.makedirs(out_dir, exist_ok=True)

    layouts = [
        [(0, 0, 4, 3, 1), (4, 0, 3, 3, 2), (0, 3, 4, 2.5, 0), (4, 3, 3, 2.5, 7)],
        [(0, 0, 3, 3, 1), (3, 0, 3, 3, 2), (6, 0, 2.5, 3, 4), (0, 3, 5, 2, 0), (5, 3, 3.5, 2, 7)],
        [(1, 1, 5, 4, 1), (6, 1, 3, 2, 2), (6, 3, 3, 2, 7), (1, 5, 8, 2.5, 0)],
    ]

    for i in range(n):
        G = nx.Graph()
        spec = layouts[i % len(layouts)]
        for node_id, (cx, cy, w, h, room_type) in enumerate(spec):
            geom = _rectangle(cx, cy, w, h)
            arr = np.array(geom)
            G.add_node(
                node_id,
                geometry=geom,
                room_type=room_type,
                centroid=torch.tensor(arr.mean(axis=0), dtype=torch.float64),
            )
        edges = [(j, j + 1) for j in range(len(spec) - 1)]
        if len(spec) > 2:
            edges.append((0, 2))
        G.add_edges_from(edges)

        with open(os.path.join(out_dir, f"sample_{i:04d}.pickle"), "wb") as f:
            pickle.dump(G, f)

    print(f"MSD synthetic graphs created: {n} files.")


if __name__ == "__main__":
    make_beec_dataset()
    make_msd_graphs()
