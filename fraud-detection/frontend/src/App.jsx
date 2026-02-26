import { useMemo, useState } from 'react'

const samplePayload = {
  features: {
    Time: 0.0,
    V1: 0.0,
    V2: 0.0,
    V3: 0.0,
    V4: 0.0,
    V5: 0.0,
    V6: 0.0,
    V7: 0.0,
    V8: 0.0,
    V9: 0.0,
    V10: 0.0,
    V11: 0.0,
    V12: 0.0,
    V13: 0.0,
    V14: 0.0,
    V15: 0.0,
    V16: 0.0,
    V17: 0.0,
    V18: 0.0,
    V19: 0.0,
    V20: 0.0,
    V21: 0.0,
    V22: 0.0,
    V23: 0.0,
    V24: 0.0,
    V25: 0.0,
    V26: 0.0,
    V27: 0.0,
    V28: 0.0,
    Amount: 0.0
  }
}

const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export default function App() {
  const [jsonText, setJsonText] = useState(
    JSON.stringify(samplePayload, null, 2)
  )
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const prettyResult = useMemo(() => {
    if (!result) return ''
    return JSON.stringify(result, null, 2)
  }, [result])

  const handleScore = async () => {
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const payload = JSON.parse(jsonText)
      const res = await fetch(`${apiBase}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text)
      }

      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">FinTech Behavioral Fraud Detection</p>
          <h1>Real-time risk scoring powered by XGBoost</h1>
          <p className="sub">
            Paste a transaction feature payload, score it instantly, and visualize fraud risk.
          </p>
        </div>
        <div className="status">
          <span className="dot" />
          <span>API: {apiBase}</span>
        </div>
      </header>

      <main className="grid">
        <section className="card">
          <div className="card-head">
            <h2>Transaction Features (JSON)</h2>
            <button
              className="ghost"
              onClick={() => setJsonText(JSON.stringify(samplePayload, null, 2))}
            >
              Reset sample
            </button>
          </div>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
          />
          <div className="actions">
            <button className="primary" onClick={handleScore} disabled={loading}>
              {loading ? 'Scoring...' : 'Score Risk'}
            </button>
          </div>
          {error && <div className="error">{error}</div>}
        </section>

        <section className="card">
          <h2>Risk Output</h2>
          <div className="result">
            {result ? (
              <>
                <div className={`score ${result.is_fraud ? 'high' : 'low'}`}>
                  <span className="label">Risk Score</span>
                  <span className="value">{result.risk_score.toFixed(4)}</span>
                </div>
                <div className="flag">
                  {result.is_fraud ? 'Flagged as Fraud' : 'Likely Legit'}
                </div>
                <pre>{prettyResult}</pre>
              </>
            ) : (
              <div className="placeholder">Run a score to see results.</div>
            )}
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>Model: XGBoost binary classifier</span>
        <span>API: FastAPI</span>
      </footer>
    </div>
  )
}
