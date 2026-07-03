"""Download freely available research papers for AI Architecture applications."""
import os
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "papers&journals", "open_access")
os.makedirs(OUT, exist_ok=True)

PAPERS = [
    ("01_Nauata_HouseGAN_FloorPlan_2020.pdf", "https://arxiv.org/pdf/2003.06988"),
    ("02_Hu_Graph2Plan_FloorPlan_2020.pdf", "https://arxiv.org/pdf/2004.13204"),
    ("03_Wang_LUCGAN_UrbanPlanning_GCN_GAN_2020.pdf", "https://arxiv.org/pdf/2008.09912"),
    ("04_Khan_Related_DeepLearningArchitect_2018.pdf", "https://arxiv.org/pdf/1812.01714"),
    ("05_FurnitureLayout_RL_DiYu_2021.pdf", "https://arxiv.org/pdf/2101.07462"),
    ("06_FrankenGAN_GenerativeFacade_2018.pdf", "https://arxiv.org/pdf/1806.07179"),
    ("07_GenerativeLayout_ConstraintGraphs_2020.pdf", "https://arxiv.org/pdf/2011.13417"),
    ("08_AI_Architecture_Survey_2023.pdf", "https://arxiv.org/pdf/2305.00510"),
    ("09_Wang_LUCGAN_SIGSPATIAL_2020.pdf", "https://people.cs.vt.edu/~clu/Publication/2020/GIS-2020-Wang.pdf"),
    ("10_GlobalMapper_UrbanLayout_ICCV2023.pdf", "https://openaccess.thecvf.com/content/ICCV2023/papers/He_GlobalMapper_Arbitrary-Shaped_Urban_Layout_Generation_ICCV_2023_paper.pdf"),
]

if __name__ == "__main__":
    for filename, url in PAPERS:
        path = os.path.join(OUT, filename)
        print(f"Downloading {filename}...")
        urllib.request.urlretrieve(url, path)
        size_kb = os.path.getsize(path) / 1024
        print(f"  Saved {size_kb:.0f} KB")
    print(f"\nDone. Papers saved to {OUT}")
