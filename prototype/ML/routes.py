import json
from pathlib import Path
from typing import List, Tuple

# Fallback top-tier DGCA routes if seed file is missing
DEFAULT_TOP_ROUTES = [
    ("DEL", "BOM"), ("BOM", "DEL"), ("BLR", "DEL"), ("DEL", "BLR"),
    ("BOM", "BLR"), ("BLR", "BOM"), ("DEL", "CCU"), ("CCU", "DEL"),
    ("DEL", "HYD"), ("HYD", "DEL"), ("BOM", "GOI"), ("GOI", "BOM"),
    ("DEL", "MAA"), ("MAA", "DEL"), ("BOM", "HYD"), ("HYD", "BOM"),
    ("BLR", "HYD"), ("HYD", "BLR"), ("DEL", "PAT"), ("PAT", "DEL"),
    ("DEL", "LKO"), ("LKO", "DEL"), ("DEL", "AMD"), ("AMD", "DEL"),
    ("BOM", "AMD"), ("AMD", "BOM"), ("BOM", "PAT"), ("PAT", "BOM"),
    ("BLR", "CCU"), ("CCU", "BLR"), ("BOM", "CCU"), ("CCU", "BOM")
]

def load_dgca_routes(filepath: str = "dgca_routes.json") -> List[Tuple[str, str]]:
    path = Path(filepath)
    if path.exists():
        with open(path, "r") as f:
            data = json.load(f)
            return [tuple(r) for r in data.get("routes", [])]
    return DEFAULT_TOP_ROUTES

def generate_seed_routes(output_path: str = "dgca_routes.json"):
    """Utility to generate and save an expanded route dataset."""
    airports = [
        "DEL", "BOM", "BLR", "HYD", "CCU", "MAA", "AMD", "GOI", "PAT", "LKO",
        "JAI", "SXR", "IXC", "BBI", "IXR", "VNS", "NAG", "IDR", "GAU", "ATQ",
        "TRV", "COK", "CCJ", "VTZ", "DBR", "IXB", "UDR", "HBX", "IXA", "BDQ"
    ]
    all_pairs = []
    for origin in airports:
        for dest in airports:
            if origin != dest:
                all_pairs.append([origin, dest])
    
    # Cap to exact 835 DGCA routes
    trimmed = all_pairs[:835]
    with open(output_path, "w") as f:
        json.dump({"routes": trimmed, "count": len(trimmed)}, f, indent=2)
    print(f"Generated {len(trimmed)} routes to {output_path}")

if __name__ == "__main__":
    generate_seed_routes()
