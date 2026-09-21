"""Copy the public website into dist for static hosting; no dependencies."""
from pathlib import Path
import shutil

root = Path(__file__).resolve().parent
output = root / 'dist'
output.mkdir(exist_ok=True)
for name in ['index.html', 'styles.css', 'responsive.css', 'app.js']:
    shutil.copy2(root / name, output / name)
shutil.copytree(root / 'assets', output / 'assets', dirs_exist_ok=True)
print('Website ready in dist/')
