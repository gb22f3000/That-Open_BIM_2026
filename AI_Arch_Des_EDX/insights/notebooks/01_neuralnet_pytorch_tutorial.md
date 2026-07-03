# Notebook Guide: Building Energy Efficiency Classification (Tutorial)

**Notebook:** `notebooks/01_neuralnet_pytorch_tutorial.ipynb`  
**Source:** `Coding Tutorial_NeuralNetByPyTorch.docx` (Ungraded Tutorial)

## What This Notebook Teaches

This tutorial walks through a complete supervised learning pipeline in PyTorch. The task is **binary classification**: given a 384-dimensional embedding vector extracted from an aerial image of a building, predict whether the building is **energy-efficient** (class 1) or **inefficient** (class 0).

The embeddings come from approximately **6,000 buildings in Rotterdam**. A prior computer-vision model has already converted each aerial image into a fixed-length vector, so this notebook focuses on the **classifier head**, not image preprocessing.

## Pipeline Overview

```
Aerial Image  -->  Pre-trained Encoder  -->  384-dim Embedding  -->  Neural Network  -->  Class (0/1)
```

## Section-by-Section Explanation

### 0. Load Modules
- `gzip` / `pickle`: Decompress and deserialize precomputed embedding tensors stored as `.pkl.gz` files.
- `pandas`: Read CSV label files mapping image filenames to class labels.
- `torch`, `nn`, `optim`, `DataLoader`: Core PyTorch building blocks for model definition, loss, optimization, and batching.

### 1. Torch Dataset
The custom `Buildings` class inherits from `torch.utils.data.Dataset`. It pairs each embedding row with its label and implements:
- `__len__()`: Returns dataset size for the DataLoader.
- `__getitem__(idx)`: Returns one `(embedding, label)` sample.

**Why a Dataset class?** PyTorch's `DataLoader` expects this interface for shuffling, batching, and parallel loading.

**Expected shapes:**
| Split | Embeddings | Labels |
|-------|------------|--------|
| Train | `[4499, 384]` | 4499 |
| Test  | `[1500, 384]` | 1500 |

### 2. Neural Net Definition
A feedforward network with **3 linear layers** and **ReLU** activations:

| Layer | Input | Output | Role |
|-------|-------|--------|------|
| `fc1` | 384 | 256 | First hidden layer |
| `fc2` | 256 | 256 | Second hidden layer |
| `fc3` | 256 | 2 | Output logits for 2 classes |

**ReLU** introduces non-linearity so the model can learn complex decision boundaries. Without activation functions, stacked linear layers would collapse into a single linear transformation.

### 3. Training Loop
**Hyperparameters:**
- `num_epochs = 40`
- `batch_size = 32`
- `learning_rate = 0.0001`
- `optimizer = Adam`
- `loss = CrossEntropyLoss`

Each epoch has two phases:
1. **Training** — forward pass, loss computation, backpropagation, weight update.
2. **Evaluation** — no gradients; compute accuracy, precision, recall, and F1 on the held-out test set.

**Metrics explained:**
- **Accuracy**: Fraction of correct predictions overall.
- **Precision**: Of buildings predicted efficient, how many truly are?
- **Recall**: Of truly efficient buildings, how many did we find?
- **F1**: Harmonic mean of precision and recall; balances both.

## Expected Results

On the real Rotterdam dataset, the tutorial reaches roughly **~80% test accuracy** after 40 epochs. With synthetic random embeddings (used when course data is unavailable), accuracy stays near **50%** because labels are not correlated with features.

## Key Takeaways

1. PyTorch separates **data** (Dataset/DataLoader), **model** (nn.Module), and **training** (optimizer + loss loop).
2. Hidden layers + ReLU allow learning non-linear patterns in embedding space.
3. Always evaluate on a **separate test set** the model never trained on.
4. Classification metrics beyond accuracy matter when classes are imbalanced.

## How to Run

```bash
pip install -r requirements.txt
python scripts/generate_sample_data.py   # if course data not available
jupyter lab notebooks/01_neuralnet_pytorch_tutorial.ipynb
```

## Data Location

```
data/beec_dataset/
├── embeddings/embeddings_train.pkl.gz
├── embeddings/embeddings_test.pkl.gz
├── labels/train.csv
└── labels/test.csv
```
