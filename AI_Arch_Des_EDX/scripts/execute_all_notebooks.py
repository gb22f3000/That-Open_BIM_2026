"""Execute all course notebooks and save outputs in-place."""
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NOTEBOOKS = [
    "01_neuralnet_pytorch_tutorial.ipynb",
    "02_neuralnet_linear_classifier_assignment.ipynb",
    "03_sketchpad_part1_python_basics.ipynb",
    "04_sketchpad_part2_elements_of_layout.ipynb",
    "05_graphing_floor_plans.ipynb",
]

# Ensure sample data exists
subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "generate_sample_data.py")], check=True)

os.environ["MPLBACKEND"] = "Agg"  # non-interactive plots

for nb in NOTEBOOKS:
    path = os.path.join(ROOT, "notebooks", nb)
    print(f"\n=== Executing {nb} ===")
    result = subprocess.run(
        [
            sys.executable, "-m", "jupyter", "nbconvert",
            "--to", "notebook",
            "--execute",
            "--inplace",
            "--ExecutePreprocessor.timeout=600",
            path,
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr, file=sys.stderr)
        raise SystemExit(f"Failed: {nb}")
    print(f"OK: {nb}")

print("\nAll notebooks executed successfully.")
