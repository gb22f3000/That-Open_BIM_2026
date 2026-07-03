"""Floor plan graph plotting helpers."""
import numpy as np
import matplotlib.pyplot as plt
import networkx as nx

from constants import CMAP_ROOMTYPE


def _get_centroid(geometry):
    arr = np.array(geometry)
    return arr.mean(axis=0)


def plot_floor(G, ax, fs=10):
    """Plot floor plan polygons and access graph on the given axis."""
    pos = {}
    for node, data in G.nodes(data=True):
        if "centroid" in data:
            c = data["centroid"]
            if hasattr(c, "numpy"):
                pos[node] = c.numpy()
            elif hasattr(c, "tolist"):
                pos[node] = np.array(c.tolist())
            else:
                pos[node] = np.array(c)
        elif "geometry" in data:
            pos[node] = _get_centroid(data["geometry"])
        else:
            pos[node] = np.array([0.0, 0.0])

        if "geometry" in data:
            poly = np.array(data["geometry"])
            color = CMAP_ROOMTYPE.get(data.get("room_type", 0), "#CCCCCC")
            ax.fill(poly[:, 0], poly[:, 1], color=color, alpha=0.6, edgecolor="black", linewidth=0.5)

    nx.draw_networkx_edges(G, pos, ax=ax, edge_color="black", width=1.5, alpha=0.8)
    nx.draw_networkx_nodes(G, pos, ax=ax, node_color="white", edgecolors="black", node_size=fs * 15)
