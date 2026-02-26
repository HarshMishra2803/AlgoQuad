# Fraud Detection (React + FastAPI + XGBoost)

## Structure
- `backend/` FastAPI service serving model inference
- `frontend/` React dashboard (Vite)

## Prereqs
- Python 3.10+
- Node 18+

## Backend
```bash
cd /Users/harsh/Downloads/AlgoQuad-main/fraud-detection/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Frontend
```bash
cd /Users/harsh/Downloads/AlgoQuad-main/fraud-detection/frontend
npm install
npm run dev
```

## Train / Load Model
Place `creditcard.csv` in `backend/data/` and run:
```bash
cd /Users/harsh/Downloads/AlgoQuad-main/fraud-detection/backend
python train.py
```
This writes `backend/model/fraud_xgb.json` and a `feature_order.json`.

## API
- `GET /health`
- `POST /score` with JSON payload matching the features.

Example:
```bash
curl -X POST http://localhost:8000/score \
  -H 'Content-Type: application/json' \
  -d @sample_payload.json
```

## Notes
- Update CORS origins in `backend/main.py` if needed.
