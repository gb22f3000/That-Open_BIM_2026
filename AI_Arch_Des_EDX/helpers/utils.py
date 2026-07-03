"""Utility helpers for floor plan graph tutorials."""
import pickle


def load_pickle(path):
    """Load a pickle file from disk."""
    with open(path, "rb") as f:
        return pickle.load(f)
