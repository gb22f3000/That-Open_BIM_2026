# Notebook Guide: Linear Classifier Assignment

**Notebook:** `notebooks/02_neuralnet_linear_classifier_assignment.ipynb`  
**Source:** `Coding Tutorial_NeuralNetByPyTorch.docx` (Graded Assignment)

## What This Notebook Teaches

This is the **graded follow-up** to the neural network tutorial. You repeat the same building energy efficiency task, but with a deliberately simpler model: a **linear classifier** with only one `nn.Linear` layer.

The pedagogical goal is to compare how much performance comes from **model complexity** versus **data quality**.

## Difference from the Tutorial

| Aspect | Tutorial (01) | Assignment (02) |
|--------|---------------|-----------------|
| Model | 3 linear layers + 2 ReLU | 1 linear layer only |
| Parameters | ~164K+ | ~770 |
| Non-linearity | Yes (ReLU) | No |
| Class name | `NeuralNet` | `LinearClassifier` |

## Pipeline

Same data loading and `Buildings` dataset class as the tutorial. The only architectural change:

```python
class LinearClassifier(nn.Module):
    def __init__(self, input_size, num_classes=2):
        super().__init__()
        self.linear = nn.Linear(input_size, num_classes)

    def forward(self, x):
        return self.linear(x)
```

This is equivalent to **logistic regression** when `num_classes=2` (softmax over two logits).

## Training Configuration

Identical hyperparameters to the tutorial:
- 40 epochs, batch size 32, learning rate 0.0001
- Adam optimizer, CrossEntropyLoss
- Same train/test split and metrics

## Expected Results

On real Rotterdam embeddings:
- Linear classifier: typically **slightly lower** accuracy than the 3-layer network (~75–78% vs ~80%).
- The gap shows that a non-linear hidden representation helps, but a linear model still captures useful structure in the embedding space.

On synthetic data: both models perform near chance (~50%).

## Grading Note (Original Course)

The original Vocareum assignment required:
1. Defining `self.linear = nn.Linear(...)` in the model class.
2. Instantiating the model as `model = LinearClassifier(...)`.
3. Returning final `accuracy` from `train_classifier()` for the autograder.

This recreated notebook implements the **correct linear classifier** (the original Word export still contained the 3-layer network by mistake).

## Key Takeaways

1. A linear layer maps 384 features directly to 2 class scores — fast and interpretable but limited.
2. Comparing linear vs. deep models is a standard way to justify model complexity.
3. Pre-trained embeddings are powerful: even a linear head can achieve reasonable accuracy on real data.

## How to Run

```bash
python scripts/generate_sample_data.py
jupyter lab notebooks/02_neuralnet_linear_classifier_assignment.ipynb
```
