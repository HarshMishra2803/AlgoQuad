from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import xgboost as xgb

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "model"
MODEL_PATH = MODEL_DIR / "fraud_xgb.json"
FEATURE_PATH = MODEL_DIR / "feature_order.json"

app = FastAPI(title="Fraud Detection API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"]
    ,
    allow_headers=["*"]
)


class ScoreRequest(BaseModel):
    features: Dict[str, float]


class ScoreResponse(BaseModel):
    risk_score: float
    is_fraud: bool


_model = None
_feature_order: List[str] | None = None


def _load_model() -> xgb.Booster:
    global _model, _feature_order
    if _model is None:
        if not MODEL_PATH.exists() or not FEATURE_PATH.exists():
            raise FileNotFoundError("Model files not found. Run train.py first.")
        booster = xgb.Booster()
        booster.load_model(str(MODEL_PATH))
        _model = booster
        _feature_order = json.loads(FEATURE_PATH.read_text())
    return _model


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/score", response_model=ScoreResponse)
async def score(payload: ScoreRequest) -> ScoreResponse:
    try:
        booster = _load_model()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if _feature_order is None:
        raise HTTPException(status_code=500, detail="Feature order missing")

    missing = [f for f in _feature_order if f not in payload.features]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing features: {missing}")

    row = np.array([[payload.features[f] for f in _feature_order]], dtype=np.float32)
    dmatrix = xgb.DMatrix(row, feature_names=_feature_order)
    proba = float(booster.predict(dmatrix)[0])
    return ScoreResponse(risk_score=proba, is_fraud=proba >= 0.5)
