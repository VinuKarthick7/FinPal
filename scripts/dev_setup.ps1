# Dev setup: create venv and install backend deps
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r backend\requirements.txt
cd frontend
npm install
