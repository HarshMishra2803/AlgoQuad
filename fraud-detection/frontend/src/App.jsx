import { useEffect, useMemo, useState } from 'react'

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

const apiBase = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const presetPayloads = {
  baseline: samplePayload,
  low: {
    features: {
      ...samplePayload.features,
      V4: -0.3,
      V7: -0.15,
      V10: -0.2,
      Amount: 32.5
    }
  },
  high: {
    features: {
      ...samplePayload.features,
      V4: 1.8,
      V7: 2.1,
      V10: 1.6,
      V14: -2.2,
      Amount: 1240.0
    }
  }
}

const sampleCsv = `Time,V1,V2,V3,V4,V5,V6,V7,V8,V9,V10,V11,V12,V13,V14,V15,V16,V17,V18,V19,V20,V21,V22,V23,V24,V25,V26,V27,V28,Amount
0,-0.4,0.2,-1.1,0.9,0.1,-0.2,0.7,-0.1,0.2,-0.3,0.4,-0.6,0.1,-1.7,0.3,-0.2,0.5,-0.1,0.1,0.1,-0.2,0.4,-0.1,0.2,-0.3,0.1,0.0,-0.1,280.5`

const onePager = `
Title: Realtime Fraud Risk Scoring
Problem: Manual review is slow and expensive at scale.
Solution: XGBoost model scores every transaction in milliseconds.
Impact: Prioritize analyst time and reduce chargeback losses.
Tech: FastAPI + XGBoost + React dashboard.
Demo: Upload or edit features, score instantly, adjust threshold.
Roadmap: Model monitoring, drift alerts, rule layer, analyst feedback loop.
`.trim()

const tourSteps = [
  {
    id: 'intro',
    title: 'Start here',
    hint: 'Use a preset or load a CSV to fill features.'
  },
  {
    id: 'inputs',
    title: 'Input data',
    hint: 'Switch between JSON and form editing.'
  },
  {
    id: 'output',
    title: 'Read results',
    hint: 'Risk score, fraud flag, and latency appear here.'
  },
  {
    id: 'controls',
    title: 'Controls',
    hint: 'Toggle live scoring or presentation mode.'
  }
]

export default function App() {
  const [jsonText, setJsonText] = useState(
    JSON.stringify(samplePayload, null, 2)
  )
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [threshold, setThreshold] = useState(0.5)
  const [mode, setMode] = useState('simple')
  const [latency, setLatency] = useState(null)
  const [health, setHealth] = useState({ status: 'checking', latency: null })
  const [meta, setMeta] = useState({
    merchant: 'Nimbus Mart',
    channel: 'Card present',
    region: 'US-W'
  })
  const [csvStatus, setCsvStatus] = useState('')
  const [presentation, setPresentation] = useState(false)
  const [liveScore, setLiveScore] = useState(false)
  const [tourOn, setTourOn] = useState(false)
  const [tourIndex, setTourIndex] = useState(0)
  const [storyOn, setStoryOn] = useState(false)
  const [scoreHistory, setScoreHistory] = useState([])
  const [batchRows, setBatchRows] = useState([])
  const [batchResults, setBatchResults] = useState([])
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchError, setBatchError] = useState('')
  const [simpleInputs, setSimpleInputs] = useState({
    amount: 250,
    time: '10:00',
    locationMismatch: 20,
    newDevice: 10,
    oddTime: 10
  })
  const [developerMode, setDeveloperMode] = useState(false)
  const [displayScore, setDisplayScore] = useState(0)
  const [displayPercent, setDisplayPercent] = useState(0)
  const [showExplain, setShowExplain] = useState(false)
  const [autoPlay, setAutoPlay] = useState(false)
  const [autoProgress, setAutoProgress] = useState(0)
  const [savedScenario, setSavedScenario] = useState(null)
  const [theme, setTheme] = useState('dark')
  const [tip, setTip] = useState(null)
  const [demoOverlay, setDemoOverlay] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [caseQueue, setCaseQueue] = useState([])
  const [analystNote, setAnalystNote] = useState('')

  const parsedPayload = useMemo(() => {
    try {
      return JSON.parse(jsonText)
    } catch (err) {
      return null
    }
  }, [jsonText])

  const expectedKeys = useMemo(() => Object.keys(samplePayload.features), [])

  const featureKeys = useMemo(() => {
    const source = parsedPayload?.features || samplePayload.features
    return Object.keys(source)
  }, [parsedPayload])

  const { missingKeys, extraKeys } = useMemo(() => {
    if (!parsedPayload?.features) {
      return { missingKeys: [], extraKeys: [] }
    }
    const currentKeys = Object.keys(parsedPayload.features)
    const missing = expectedKeys.filter((key) => !currentKeys.includes(key))
    const extra = currentKeys.filter((key) => !expectedKeys.includes(key))
    return { missingKeys: missing, extraKeys: extra }
  }, [parsedPayload, expectedKeys])

  const prettyResult = useMemo(() => {
    if (!result) return ''
    return JSON.stringify(result, null, 2)
  }, [result])

  const uiFlag = result ? result.risk_score >= threshold : null

  const refreshHealth = async () => {
    const started = performance.now()
    try {
      const res = await fetch(`${apiBase}/health`)
      if (!res.ok) throw new Error('API unavailable')
      const data = await res.json()
      const elapsed = Math.round(performance.now() - started)
      setHealth({ status: data.status || 'ok', latency: elapsed })
    } catch (err) {
      setHealth({ status: 'down', latency: null })
    }
  }

  useEffect(() => {
    refreshHealth()
  }, [])

  const handleScore = async () => {
    setError('')
    setResult(null)
    setLoading(true)
    setLatency(null)
    try {
      const payload = JSON.parse(jsonText)
      const started = performance.now()
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
      const elapsed = Math.round(performance.now() - started)
      setLatency(elapsed)
      setResult(data)
      setScoreHistory((prev) => [...prev, data.risk_score].slice(-10))
    } catch (err) {
      setError(err.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const updateFeature = (key, value) => {
    const base = parsedPayload || samplePayload
    const next = {
      ...base,
      features: {
        ...base.features,
        [key]: Number.isFinite(value) ? value : 0
      }
    }
    setJsonText(JSON.stringify(next, null, 2))
  }

  const updateFromSimpleInputs = (next) => {
    const features = { ...samplePayload.features }
    features.Amount = Number(next.amount) || 0
    const [hh, mm] = String(next.time || '00:00').split(':')
    const seconds = (Number(hh) || 0) * 3600 + (Number(mm) || 0) * 60
    features.Time = seconds
    // Map easy sliders to a few model features
    features.V4 = (Number(next.locationMismatch) || 0) / 20 - 2.5
    features.V7 = (Number(next.newDevice) || 0) / 25 - 2
    features.V14 = -((Number(next.oddTime) || 0) / 18)
    setJsonText(JSON.stringify({ features }, null, 2))
  }

  const handleSimpleChange = (field, value) => {
    const next = { ...simpleInputs, [field]: value }
    setSimpleInputs(next)
    updateFromSimpleInputs(next)
  }

  const randomizePayload = () => {
    const base = parsedPayload || samplePayload
    const next = { ...base, features: { ...base.features } }
    featureKeys.forEach((key) => {
      const current = Number(next.features[key]) || 0
      const jitter = (Math.random() - 0.5) * 0.8
      next.features[key] = Number((current + jitter).toFixed(4))
    })
    setJsonText(JSON.stringify(next, null, 2))
  }

  const formatJson = () => {
    if (!parsedPayload) return
    setJsonText(JSON.stringify(parsedPayload, null, 2))
  }

  const loadPreset = (preset) => {
    setJsonText(JSON.stringify(presetPayloads[preset], null, 2))
    if (preset === 'baseline') {
      const next = { amount: 250, time: '10:00', locationMismatch: 20, newDevice: 10, oddTime: 10 }
      setSimpleInputs(next)
    }
    if (preset === 'low') {
      const next = { amount: 75, time: '08:20', locationMismatch: 5, newDevice: 5, oddTime: 5 }
      setSimpleInputs(next)
    }
    if (preset === 'high') {
      const next = { amount: 1200, time: '23:00', locationMismatch: 90, newDevice: 80, oddTime: 70 }
      setSimpleInputs(next)
    }
  }

  const copyResult = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(prettyResult)
    } catch (err) {
      setError('Could not copy result to clipboard')
    }
  }

  const copyOnePager = async () => {
    try {
      await navigator.clipboard.writeText(onePager)
      setCsvStatus('One-page summary copied')
    } catch (err) {
      setCsvStatus('Could not copy summary')
    }
  }

  const parseCsvLine = (line) => line.split(',').map((value) => value.trim())

  const parseCsvText = (text) => {
    const lines = text.trim().split(/\r?\n/)
    if (lines.length < 2) {
      throw new Error('CSV needs a header row and at least one data row')
    }
    const headers = parseCsvLine(lines[0])
    const values = parseCsvLine(lines[1])
    if (headers.length !== values.length) {
      throw new Error('CSV header/value length mismatch')
    }
    const features = { ...samplePayload.features }
    headers.forEach((header, index) => {
      if (header in features) {
        const num = Number(values[index])
        features[header] = Number.isFinite(num) ? num : 0
      }
    })
    setJsonText(JSON.stringify({ features }, null, 2))
  }

  const parseCsvRows = (text, maxRows = 5) => {
    const lines = text.trim().split(/\r?\n/)
    if (lines.length < 2) {
      throw new Error('CSV needs a header row and at least one data row')
    }
    const headers = parseCsvLine(lines[0])
    const rows = lines.slice(1, 1 + maxRows)
    const parsed = rows.map((row) => {
      const values = parseCsvLine(row)
      const features = { ...samplePayload.features }
      headers.forEach((header, index) => {
        if (header in features) {
          const num = Number(values[index])
          features[header] = Number.isFinite(num) ? num : 0
        }
      })
      return features
    })
    return parsed
  }

  const handleCsvUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setCsvStatus('Reading CSV...')
    try {
      const text = await file.text()
      parseCsvText(text)
      setCsvStatus('CSV loaded into features')
    } catch (err) {
      setCsvStatus(err.message || 'Failed to parse CSV')
    } finally {
      event.target.value = ''
    }
  }

  const handleBatchUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setBatchError('')
    setBatchLoading(true)
    setBatchResults([])
    try {
      const text = await file.text()
      const rows = parseCsvRows(text, 5)
      setBatchRows(rows)
      const results = []
      for (let i = 0; i < rows.length; i += 1) {
        const res = await fetch(`${apiBase}/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ features: rows[i] })
        })
        if (!res.ok) {
          const textErr = await res.text()
          throw new Error(textErr)
        }
        const data = await res.json()
        results.push(data)
      }
      setBatchResults(results)
    } catch (err) {
      setBatchError(err.message || 'Batch scoring failed')
    } finally {
      setBatchLoading(false)
      event.target.value = ''
    }
  }

  const setThresholdPreset = (preset) => {
    if (preset === 'strict') setThreshold(0.35)
    if (preset === 'normal') setThreshold(0.5)
    if (preset === 'relaxed') setThreshold(0.7)
  }

  const downloadReport = () => {
    const reportHtml = `
      <html>
        <head><title>Fraud Check Report</title></head>
        <body style="font-family: Arial, sans-serif; padding: 24px;">
          <h2>Fraud Check Report</h2>
          <p><strong>Risk score:</strong> ${result ? result.risk_score.toFixed(4) : 'N/A'}</p>
          <p><strong>Decision:</strong> ${result ? (result.is_fraud ? 'Risky' : 'Safe') : 'N/A'}</p>
          <p><strong>UI threshold:</strong> ${threshold.toFixed(2)}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <hr />
          <p>${explainLine}</p>
          <pre>${prettyResult || ''}</pre>
        </body>
      </html>
    `
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(reportHtml)
    win.document.close()
    win.focus()
    win.print()
  }

  const saveScenario = () => {
    setSavedScenario({ jsonText, simpleInputs })
  }

  const loadScenario = () => {
    if (!savedScenario) return
    setJsonText(savedScenario.jsonText)
    setSimpleInputs(savedScenario.simpleInputs)
  }

  const downloadBatchCsv = () => {
    if (!batchResults.length) return
    const header = 'row,amount,risk_score,result\n'
    const rows = batchResults.map((item, index) => {
      const amount = batchRows[index]?.Amount ?? ''
      const resultText = item.is_fraud ? 'Risky' : 'Safe'
      return `${index + 1},${amount},${item.risk_score.toFixed(4)},${resultText}`
    })
    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'fraud_results.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetAll = () => {
    setJsonText(JSON.stringify(samplePayload, null, 2))
    setResult(null)
    setError('')
    setLatency(null)
    setThreshold(0.5)
    setScoreHistory([])
    setBatchRows([])
    setBatchResults([])
    setBatchError('')
    setSimpleInputs({
      amount: 250,
      time: '10:00',
      locationMismatch: 20,
      newDevice: 10,
      oddTime: 10
    })
  }

  const speakExplanation = () => {
    if (!result || !window.speechSynthesis) return
    const utter = new SpeechSynthesisUtterance(explainLine)
    utter.rate = 0.95
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utter)
  }

  const exportSnapshot = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 630
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = theme === 'light' ? '#f5f7fb' : '#0b121a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = theme === 'light' ? '#0f172a' : '#f0f4f8'
    ctx.font = '700 36px Sora, sans-serif'
    ctx.fillText('Fraud Check Result', 50, 80)
    ctx.font = '600 28px Sora, sans-serif'
    ctx.fillText(`Status: ${riskBadge}`, 50, 140)
    ctx.font = '500 22px Sora, sans-serif'
    ctx.fillText(`Risk: ${displayPercent.toFixed(1)}%`, 50, 190)
    ctx.font = '400 18px Sora, sans-serif'
    ctx.fillText(explainLine, 50, 240)
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = 'fraud_result.png'
    a.click()
  }

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
    } catch (err) {
      setError('Could not copy share link')
    }
  }


  const loadSampleCsv = () => {
    try {
      parseCsvText(sampleCsv)
      setCsvStatus('Sample CSV loaded')
    } catch (err) {
      setCsvStatus('Sample CSV failed')
    }
  }

  const togglePresentation = async () => {
    const next = !presentation
    setPresentation(next)
    if (next) {
      if (document.documentElement.requestFullscreen) {
        try {
          await document.documentElement.requestFullscreen()
        } catch (err) {
          // ignore fullscreen failures
        }
      }
    } else if (document.fullscreenElement) {
      await document.exitFullscreen()
    }
  }

  const riskPercent = result ? clamp(result.risk_score * 100, 0, 100) : 0
  const riskLabel = riskPercent >= 70 ? 'High' : riskPercent >= 40 ? 'Medium' : 'Low'
  const riskBadge = result ? (riskPercent >= 60 ? 'RISKY' : 'SAFE') : '—'
  const driftLabel = riskPercent >= 70 ? 'High' : riskPercent >= 40 ? 'Medium' : 'Low'
  const explainLine = result
    ? result.is_fraud
      ? 'This payment looks risky because the risk score is high.'
      : 'This payment looks safe because the risk score is low.'
    : 'Run a score to see the result.'
  const avgRisk =
    scoreHistory.length > 0
      ? scoreHistory.reduce((sum, value) => sum + value, 0) / scoreHistory.length
      : null
  const sparkPoints = scoreHistory
    .map((value, index) => {
      const x = (index / Math.max(scoreHistory.length - 1, 1)) * 100
      const y = 100 - clamp(value * 100, 0, 100)
      return `${x},${y}`
    })
    .join(' ')
  const canScore = Boolean(parsedPayload) && missingKeys.length === 0 && !loading

  useEffect(() => {
    if (!liveScore || !canScore) return
    const timer = setTimeout(() => {
      handleScore()
    }, 450)
    return () => clearTimeout(timer)
  }, [jsonText, liveScore])

  useEffect(() => {
    if (!result) return
    const start = performance.now()
    const fromScore = displayScore
    const fromPercent = displayPercent
    const toScore = result.risk_score
    const toPercent = riskPercent
    const duration = 800

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const ease = 1 - Math.pow(1 - t, 3)
      setDisplayScore(fromScore + (toScore - fromScore) * ease)
      setDisplayPercent(fromPercent + (toPercent - fromPercent) * ease)
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [result, riskPercent])

  useEffect(() => {
    if (!result) return
    setCaseQueue((prev) => {
      const entry = {
        time: new Date().toLocaleTimeString(),
        amount: simpleInputs.amount,
        risk: result.risk_score,
        status: result.is_fraud ? 'Risky' : 'Safe'
      }
      return [entry, ...prev].slice(0, 5)
    })
  }, [result])

  useEffect(() => {
    const params = new URLSearchParams()
    params.set('amount', String(simpleInputs.amount))
    params.set('time', String(simpleInputs.time))
    params.set('loc', String(simpleInputs.locationMismatch))
    params.set('dev', String(simpleInputs.newDevice))
    params.set('odd', String(simpleInputs.oddTime))
    setShareLink(`${window.location.origin}${window.location.pathname}?${params.toString()}`)
  }, [simpleInputs])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.has('amount')) return
    const next = {
      amount: Number(params.get('amount')) || 0,
      time: params.get('time') || '10:00',
      locationMismatch: Number(params.get('loc')) || 0,
      newDevice: Number(params.get('dev')) || 0,
      oddTime: Number(params.get('odd')) || 0
    }
    setSimpleInputs(next)
    updateFromSimpleInputs(next)
  }, [])

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('theme-light')
    } else {
      document.body.classList.remove('theme-light')
    }
  }, [theme])

  useEffect(() => {
    if (!autoPlay) return
    let step = 0
    const steps = [
      () => loadPreset('baseline'),
      () => handleScore(),
      () => loadPreset('high'),
      () => handleScore(),
      () => setThresholdPreset('relaxed')
    ]
    setAutoProgress(0)
    const interval = setInterval(() => {
      steps[step]()
      step += 1
      setAutoProgress((step / steps.length) * 100)
      if (step >= steps.length) {
        step = 0
      }
    }, 2200)
    return () => clearInterval(interval)
  }, [autoPlay])

  useEffect(() => {
    setDemoOverlay(autoPlay)
  }, [autoPlay])

  useEffect(() => {
    if (!tip) return
    const timer = setTimeout(() => setTip(null), 3500)
    return () => clearTimeout(timer)
  }, [tip])

  useEffect(() => {
    if (!storyOn) return
    const steps = [
      () => loadPreset('baseline'),
      () => handleScore(),
      () => loadPreset('high'),
      () => handleScore(),
      () => setThreshold(0.7)
    ]
    let index = 0
    const run = () => {
      steps[index]()
      index += 1
      if (index >= steps.length) {
        setStoryOn(false)
        return
      }
      setTimeout(run, 1400)
    }
    run()
  }, [storyOn])

  const nextTour = () => setTourIndex((i) => Math.min(i + 1, tourSteps.length - 1))
  const prevTour = () => setTourIndex((i) => Math.max(i - 1, 0))

  const activeTour = tourOn ? tourSteps[tourIndex].id : ''

  return (
    <div className={`page ${presentation ? 'presentation' : ''}`}>
      <header className={`hero ${activeTour === 'intro' ? 'tour-active' : ''}`}>
        <div>
          <div className="chip-row">
            <span className="chip">Hackathon Demo</span>
            <span className="chip light">Live Scoring</span>
            <span className="chip light">ML Model</span>
          </div>
          <h1>Quick check for risky payments.</h1>
          <p className="sub">
            Enter payment data, get risk score and a clear result.
          </p>
          <div className="hero-stats">
            <div className="stat">
              <span>Model quality</span>
              <strong>0.986</strong>
            </div>
            <div className="stat">
              <span>Avg time</span>
              <strong>{latency ? `${latency} ms` : '—'}</strong>
            </div>
            <div className="stat">
              <span>Current flag</span>
              <strong>{uiFlag == null ? '—' : uiFlag ? 'High' : 'Low'}</strong>
            </div>
          </div>
        </div>
        <div className="status">
          <div className="status-row">
            <span className={`pulse ${health.status === 'ok' ? 'ok' : 'down'}`} />
            <span className="status-label">API {health.status}</span>
          </div>
          <div className="status-meta">{apiBase}</div>
          <div className="status-meta">
            {health.latency ? `${health.latency} ms` : 'Latency n/a'}
          </div>
          <button className="ghost" onClick={refreshHealth}>
            Check API
          </button>
        </div>
      </header>

      <section
        className={`intro ${activeTour === 'intro' ? 'tour-active' : ''}`}
        title="Start here: load a sample and click Score Risk."
      >
        <div className="intro-copy">
          <h2>First time? Start in 30 seconds.</h2>
          <p>
            This app checks if a payment is risky or safe. You can load a sample,
            upload one CSV row, or edit JSON. Click “Score Risk” to see the result.
          </p>
          <div className="intro-actions">
            <button className="primary" onClick={() => loadPreset('baseline')}>
              Load simple sample
            </button>
            <button className="ghost" onClick={() => setStoryOn(true)} title="Auto-run demo steps">
              Start demo
            </button>
            <button className="ghost" onClick={() => loadPreset('high')} title="Load a risky example">
              Show risky case
            </button>
            <button className="ghost" onClick={loadSampleCsv} title="Load a sample CSV row">
              Load CSV sample
            </button>
          </div>
        </div>
        <div className="intro-steps">
          <div className="step">
            <span>1</span>
            <div>
              <strong>Pick input</strong>
              <p>Choose sample or type values.</p>
            </div>
          </div>
          <div className="step">
            <span>2</span>
            <div>
              <strong>Get result</strong>
              <p>See risk score and safe/risky result.</p>
            </div>
          </div>
          <div className="step">
            <span>3</span>
            <div>
              <strong>Adjust level</strong>
              <p>Move slider to make checks strict or relaxed.</p>
            </div>
          </div>
          <div className="step start-here">
            <span>★</span>
            <div>
              <strong>Start here</strong>
              <p>Click “Load simple sample” and then “Score Risk”.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="stepper">
        <div className="stepper-item active">
          <span>1</span>
          <p>Input</p>
        </div>
        <div className={`stepper-item ${result ? 'active' : ''}`}>
          <span>2</span>
          <p>Score</p>
        </div>
        <div className={`stepper-item ${result ? 'active' : ''}`}>
          <span>3</span>
          <p>Result</p>
        </div>
      </section>
      {autoPlay && (
        <div className="progress">
          <div className="progress-bar" style={{ width: `${autoProgress}%` }} />
        </div>
      )}
      {demoOverlay && (
        <div className="demo-overlay">Live Demo Mode ON</div>
      )}

      <section
        className={`meta-bar ${activeTour === 'controls' ? 'tour-active' : ''}`}
        title="Extra details like merchant, channel, and region."
      >
        <div className="meta-card">
          <span>Shop name</span>
          <input
            value={meta.merchant}
            onChange={(e) => setMeta((prev) => ({ ...prev, merchant: e.target.value }))}
          />
        </div>
        <div className="meta-card">
          <span>Payment type</span>
          <select
            value={meta.channel}
            onChange={(e) => setMeta((prev) => ({ ...prev, channel: e.target.value }))}
          >
            <option>Card present</option>
            <option>Card not present</option>
            <option>Online wallet</option>
          </select>
        </div>
        <div className="meta-card">
          <span>Region</span>
          <select
            value={meta.region}
            onChange={(e) => setMeta((prev) => ({ ...prev, region: e.target.value }))}
          >
            <option>US-W</option>
            <option>US-E</option>
            <option>EU</option>
            <option>APAC</option>
          </select>
        </div>
        <div className="meta-card">
          <span>CSV upload</span>
          <label className="file-input">
            <input type="file" accept=".csv" onChange={handleCsvUpload} />
            <span>Load CSV</span>
          </label>
          <button className="ghost" onClick={loadSampleCsv}>
            Load sample CSV
          </button>
          {csvStatus && <div className="file-status">{csvStatus}</div>}
        </div>
        <div className="meta-card">
          <span>Presentation</span>
          <button className="ghost" onClick={togglePresentation}>
            {presentation ? 'Exit presentation' : 'Enter presentation'}
          </button>
          <label className="toggle">
            <input
              type="checkbox"
              checked={liveScore}
              onChange={(e) => setLiveScore(e.target.checked)}
            />
            <span>Auto score</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={tourOn}
              onChange={(e) => setTourOn(e.target.checked)}
            />
            <span>Guided tour</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={storyOn}
              onChange={(e) => setStoryOn(e.target.checked)}
            />
            <span>Story mode</span>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={autoPlay}
              onChange={(e) => setAutoPlay(e.target.checked)}
            />
            <span>Auto demo</span>
          </label>
          <div className="toggle">
            <span>Theme</span>
            <select value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
          <button className="ghost" onClick={copyShareLink} title="Copy a link with current inputs">
            Copy share link
          </button>
        </div>
      </section>

      {tourOn && (
        <section className="tour-panel">
          <div>
            <strong>{tourSteps[tourIndex].title}</strong>
            <p>{tourSteps[tourIndex].hint}</p>
          </div>
          <div className="tour-actions">
            <button className="ghost" onClick={prevTour} disabled={tourIndex === 0}>
              Back
            </button>
            <button className="primary" onClick={nextTour} disabled={tourIndex === tourSteps.length - 1}>
              Next
            </button>
          </div>
        </section>
      )}

      <main className="grid">
        <section
          className={`card ${activeTour === 'inputs' ? 'tour-active' : ''}`}
          title="Edit payment values here. Use sample buttons if you are new."
        >
          <div className="card-head">
            <h2>Payment Inputs</h2>
            <div className="button-row">
              <button className="ghost" onClick={() => loadPreset('baseline')}>
                Simple
              </button>
              <button className="ghost" onClick={() => loadPreset('low')}>
                Low risk
              </button>
              <button className="ghost" onClick={() => loadPreset('high')}>
                High risk
              </button>
              <button className="ghost" onClick={randomizePayload}>
                Randomize
              </button>
              <button className="ghost" onClick={formatJson}>
                Format JSON
              </button>
            </div>
          </div>

          <div className="mode-toggle" title="Simple view for normal users. Advanced view for full data.">
            <button
              className={mode === 'simple' ? 'active' : ''}
              onClick={() => setMode('simple')}
            >
              Simple
            </button>
            {developerMode && (
              <button
                className={mode === 'advanced' ? 'active' : ''}
                onClick={() => setMode('advanced')}
              >
                Advanced
              </button>
            )}
          </div>

          <div className="inputs-layout">
            <div className="inputs-main">
              {mode === 'advanced' && developerMode ? (
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  spellCheck={false}
                />
              ) : (
                <div className="simple-grid">
                  <label>
                    <span>Amount (₹)</span>
                    <input
                      type="number"
                      value={simpleInputs.amount}
                      onChange={(e) => handleSimpleChange('amount', Number(e.target.value))}
                    />
                  </label>
                  <label>
                    <span>
                      Time of day
                      <span className="tip" title="Choose the payment time. Late night can be risky.">?</span>
                    </span>
                    <input
                      type="time"
                      value={simpleInputs.time}
                      onChange={(e) => handleSimpleChange('time', e.target.value)}
                    />
                  </label>
                  <label>
                    <span>
                      Location mismatch (%)
                      <span className="tip" title="High means location is far from usual.">?</span>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={simpleInputs.locationMismatch}
                      onChange={(e) => handleSimpleChange('locationMismatch', Number(e.target.value))}
                    />
                  </label>
                  <label>
                    <span>
                      New device risk (%)
                      <span className="tip" title="High means using a new or unknown device.">?</span>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={simpleInputs.newDevice}
                      onChange={(e) => handleSimpleChange('newDevice', Number(e.target.value))}
                    />
                  </label>
                  <label>
                    <span>
                      Odd time risk (%)
                      <span className="tip" title="High means payment time is unusual.">?</span>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={simpleInputs.oddTime}
                      onChange={(e) => handleSimpleChange('oddTime', Number(e.target.value))}
                    />
                  </label>
                </div>
              )}
            </div>
            <div className="inputs-help">
              <div className="helper-card">
                <h3>What is this data?</h3>
                <p>
                  This project uses a real credit‑card fraud dataset. It has many hidden
                  fields (V1–V28) created by banks to protect customer data. We show simple
                  inputs here and convert them into those hidden fields.
                </p>
                <ul className="helper-list">
                  <li><strong>Amount</strong>: payment value</li>
                  <li><strong>Time</strong>: time of day in seconds</li>
                  <li><strong>Risk sliders</strong>: simple signals (location, device, timing)</li>
                </ul>
                <p className="helper-note">
                  For advanced users, turn on Developer Mode to see the full data.
                </p>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={developerMode}
                    onChange={(e) => {
                      setDeveloperMode(e.target.checked)
                      if (!e.target.checked) setMode('simple')
                    }}
                  />
                  <span>Developer mode</span>
                </label>
              </div>
            </div>
          </div>

        <div className="batch-card">
          <div className="batch-head">
            <h3>Score CSV (up to 5 rows)</h3>
            <label className="file-input">
              <input type="file" accept=".csv" onChange={handleBatchUpload} />
              <span>{batchLoading ? 'Scoring...' : 'Upload CSV'}</span>
            </label>
            <button className="ghost" onClick={downloadBatchCsv} disabled={!batchResults.length}>
              Download CSV
            </button>
          </div>
            {batchError && <div className="error">{batchError}</div>}
            {batchResults.length > 0 && (
              <div className="batch-table">
                <div className="batch-row head">
                  <span>Row</span>
                  <span>Amount</span>
                  <span>Risk</span>
                  <span>Result</span>
                </div>
                {batchResults.map((item, index) => (
                  <div className="batch-row" key={`row-${index}`}>
                    <span>#{index + 1}</span>
                    <span>
                      {batchRows[index]?.Amount?.toFixed
                        ? batchRows[index].Amount.toFixed(2)
                        : batchRows[index]?.Amount ?? '—'}
                    </span>
                    <span>{item.risk_score.toFixed(3)}</span>
                    <span>{item.is_fraud ? 'Risky' : 'Safe'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="strict-card">
            <div className="panel-row">
              <span>Strict level</span>
              <span className="tip" title="Lower = strict, higher = relaxed.">?</span>
              <span>{threshold.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
            <div className="pill-row">
              <button className="pill" onClick={() => setThresholdPreset('strict')}>
                Strict
              </button>
              <button className="pill" onClick={() => setThresholdPreset('normal')}>
                Normal
              </button>
              <button className="pill" onClick={() => setThresholdPreset('relaxed')}>
                Relaxed
              </button>
            </div>
          </div>

          <div className="actions">
            <button className="primary" onClick={handleScore} disabled={!canScore}>
              {loading ? 'Scoring...' : 'Score Risk'}
            </button>
          </div>
          {error && <div className="error">{error}</div>}
          {!parsedPayload && (
            <div className="error">Invalid JSON. Fix the payload to continue.</div>
          )}
          {missingKeys.length > 0 && (
            <div className="warning">
              Missing features: {missingKeys.join(', ')}
            </div>
          )}
          {extraKeys.length > 0 && (
            <div className="warning">
              Extra features will be ignored by the model: {extraKeys.join(', ')}
            </div>
          )}
        </section>

        <section
          className={`card ${activeTour === 'output' ? 'tour-active' : ''}`}
          title="Result of the fraud check."
        >
          <div className="card-head">
            <h2>Result</h2>
            <div className="button-row">
              <button className="ghost" onClick={copyResult} title="Copy raw result JSON">
                Copy JSON
              </button>
              <button className="ghost" onClick={downloadReport} title="Download a PDF report">
                Download report (PDF)
              </button>
              <button className="ghost" onClick={exportSnapshot} title="Export result image">
                Export image
              </button>
              <button className="ghost" onClick={speakExplanation} title="Play voice explanation">
                Play explanation
              </button>
              <button className="ghost" onClick={resetAll} title="Reset all inputs and results">
                Reset all
              </button>
            </div>
          </div>
          {result?.is_fraud && (
            <div className="alert danger">
              Alert: This payment looks risky. Please review before approving.
            </div>
          )}
          {result && riskPercent >= 75 && (
            <div className="alert banner">
              High risk detected. Immediate review suggested.
            </div>
          )}
          <div className={`result-banner ${riskBadge === 'RISKY' ? 'bad' : 'good'}`}>
            <div className="banner-title">{riskBadge}</div>
            <div className="banner-text">{explainLine}</div>
          </div>
          <div className="explain-actions">
            <button className="ghost" onClick={() => setShowExplain((prev) => !prev)} title="Show simple reasons">
              Explain this score
            </button>
            <button className="ghost" onClick={saveScenario} title="Save current input values">
              Save scenario
            </button>
            <button className="ghost" onClick={loadScenario} disabled={!savedScenario} title="Load saved inputs">
              Load scenario
            </button>
          </div>
          {showExplain && (
            <div className="explain-card">
              <p>
                1) Location mismatch is high.
                <button className="tip-btn" onClick={() => setTip('Payment happened far from the usual city.')}>
                  ?
                </button>
              </p>
              <p>
                2) New device risk is high.
                <button className="tip-btn" onClick={() => setTip('Payment made from a new or unknown device.')}>
                  ?
                </button>
              </p>
              <p>
                3) Odd time risk is high.
                <button className="tip-btn" onClick={() => setTip('Payment time is unusual for this user.')}>
                  ?
                </button>
              </p>
            </div>
          )}
          {tip && (
            <div className="tip-pop">
              <span>{tip}</span>
              <button className="ghost" onClick={() => setTip(null)}>Close</button>
            </div>
          )}
          <div className="before-after">
            <div>
              <span>Before</span>
              <p>Payment not checked yet.</p>
            </div>
            <div>
              <span>After</span>
              <p>{result ? (result.is_fraud ? 'Marked risky, send to review.' : 'Marked safe, can proceed.') : 'Run score to see result.'}</p>
            </div>
          </div>
          <div className="result">
            <div className="chart-grid">
              <div className="chart-card">
                <span className="chart-title">Risk donut</span>
                <div className="donut">
                  <svg viewBox="0 0 120 120">
                    <circle className="donut-track" cx="60" cy="60" r="48" />
                    <circle
                      className="donut-value"
                      cx="60"
                      cy="60"
                      r="48"
                      style={{
                        strokeDasharray: `${(displayPercent / 100) * 301.6} 301.6`
                      }}
                    />
                  </svg>
                  <div className="donut-label">
                    <strong>{result ? `${displayPercent.toFixed(1)}%` : '—'}</strong>
                    <span>Risk</span>
                  </div>
                </div>
              </div>
              <div className="chart-card">
                <span className="chart-title">Confidence</span>
                <div className="confidence">
                  <div className={`confidence-pill ${riskPercent >= 70 ? 'high' : riskPercent >= 40 ? 'medium' : 'low'}`}>
                    {result ? (riskPercent >= 70 ? 'High' : riskPercent >= 40 ? 'Medium' : 'Low') : '—'}
                  </div>
                  <p className="chart-note">Higher confidence = stronger signal.</p>
                </div>
              </div>
              <div className="chart-card">
                <span className="chart-title">Drift monitor</span>
                <div className="confidence">
                  <div className={`confidence-pill ${driftLabel === 'High' ? 'high' : driftLabel === 'Medium' ? 'medium' : 'low'}`}>
                    {result ? driftLabel : '—'}
                  </div>
                  <p className="chart-note">Low drift = model is stable.</p>
                </div>
              </div>
            </div>

            {!result && <div className="placeholder">Run a score to see results.</div>}
          </div>
        </section>
      </main>

      <section className="demo-grid">
        <div className="card">
          <div className="card-head">
            <h2>Quick Summary</h2>
            <button className="ghost" onClick={copyOnePager}>
              Copy Summary
            </button>
          </div>
          <div className="summary-block">
            <p><strong>Problem:</strong> Manual checking is slow and costly.</p>
            <p><strong>Solution:</strong> ML model gives risk in milliseconds.</p>
            <p><strong>Impact:</strong> Review only risky payments, save time.</p>
            <p><strong>Demo:</strong> Load sample, score, adjust strict level.</p>
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <h2>Why it matters</h2>
          </div>
          <div className="summary-block">
            <p><strong>Save time:</strong> Only risky payments go to review.</p>
            <p><strong>Stop fraud:</strong> Catch bad payments early.</p>
            <p><strong>Faster approvals:</strong> Safe payments go through quickly.</p>
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <h2>FAQ</h2>
          </div>
          <div className="summary-block">
            <p><strong>What is risk score?</strong> A number from 0 to 1. Higher means more risk.</p>
            <p><strong>Why is it useful?</strong> It helps teams check only risky payments.</p>
            <p><strong>Is data safe?</strong> Real data is masked; sensitive info is hidden.</p>
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <h2>Case queue</h2>
          </div>
          <div className="queue">
            {caseQueue.length === 0 && <p className="chart-note">No cases yet.</p>}
            {caseQueue.map((item, index) => (
              <div key={`case-${index}`} className="queue-row">
                <span>{item.time}</span>
                <span>₹{item.amount}</span>
                <span>{item.risk.toFixed(3)}</span>
                <span>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <h2>Analyst notes</h2>
          </div>
          <textarea
            className="note-box"
            placeholder="Write a short note about this case..."
            value={analystNote}
            onChange={(e) => setAnalystNote(e.target.value)}
          />
        </div>
        <div className="card">
          <div className="card-head">
            <h2>Compare two payments</h2>
          </div>
          <div className="summary-block">
            <p>Left: Low risk sample. Right: High risk sample.</p>
          </div>
          <div className="compare">
            <button className="ghost" onClick={() => loadPreset('low')}>Load Low</button>
            <button className="ghost" onClick={() => loadPreset('high')}>Load High</button>
            <button className="ghost" onClick={handleScore}>Score Current</button>
          </div>
        </div>
      </section>

      <footer className="footer">
        <span>Model: XGBoost binary classifier</span>
        <span>API: FastAPI</span>
        <span>Dataset: Credit Card Fraud (sampled)</span>
      </footer>
    </div>
  )
}
