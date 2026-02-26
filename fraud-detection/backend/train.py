from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "creditcard.csv"
MODEL_DIR = BASE_DIR / "model"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = MODEL_DIR / "fraud_xgb.json"
FEATURE_PATH = MODEL_DIR / "feature_order.json"


def main() -> None:
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Missing {DATA_PATH}. Put creditcard.csv in backend/data/")

    df = pd.read_csv(DATA_PATH)
    if "Class" not in df.columns:
        raise ValueError("Expected 'Class' column in creditcard.csv")

    feature_cols = [c for c in df.columns if c != "Class"]
    X = df[feature_cols]
    y = df["Class"].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    dtrain = xgb.DMatrix(X_train, label=y_train, feature_names=feature_cols)
    dtest = xgb.DMatrix(X_test, label=y_test, feature_names=feature_cols)

    params = {
        "objective": "binary:logistic",
        "eval_metric": "auc",
        "max_depth": 5,
        "eta": 0.1,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "seed": 42,
    }

    booster = xgb.train(
        params,
        dtrain,
        num_boost_round=300,
        evals=[(dtest, "test")],
        early_stopping_rounds=30,
        verbose_eval=25,
    )

    preds = booster.predict(dtest)
    auc = roc_auc_score(y_test, preds)
    print(f"Test AUC: {auc:.4f}")

    booster.save_model(str(MODEL_PATH))
    FEATURE_PATH.write_text(json.dumps(feature_cols))
    print(f"Saved model to {MODEL_PATH}")


if __name__ == "__main__":
    main()
