import React, { useState, useCallback, useRef } from 'react'
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Brush
} from 'recharts'
import * as satellite from 'satellite.js'

const RE = 6371

function parseTLERecord(line1, line2) {
  const satrec = satellite.twoline2satrec(line1, line2)
  if (!satrec || satrec.error) return null

  const epochYear = satrec.epochyr < 57 ? 2000 + satrec.epochyr : 1900 + satrec.epochyr
  const epoch = new Date(Date.UTC(epochYear, 0, 1))
  epoch.setTime(epoch.getTime() + (satrec.epochdays - 1) * 86400000)

  const nRevPerDay = satrec.no * 1440 / (2 * Math.PI)
  const nRadSec = satrec.no / 60 // rad/min -> rad/s
  const a = Math.pow(398600.4418 / (nRadSec * nRadSec), 1 / 3)
  const e = satrec.ecco
  const i = satrec.inclo * 180 / Math.PI
  const raan = satrec.nodeo * 180 / Math.PI
  const argp = satrec.argpo * 180 / Math.PI
  const perigee = a * (1 - e) - RE
  const apogee = a * (1 + e) - RE
  const period = 1440 / nRevPerDay

  return { epoch, a, e, i, raan, argp, perigee, apogee, period, nRevPerDay, bstar: satrec.bstar }
}

function detectManeuvers(records, threshold = 1.0) {
  const maneuvers = []
  for (let j = 1; j < records.length; j++) {
    const prev = records[j - 1], curr = records[j]
    const dP = Math.abs(curr.perigee - prev.perigee)
    const dA = Math.abs(curr.apogee - prev.apogee)
    const dI = Math.abs(curr.i - prev.i)
    if (dP > threshold || dA > threshold || dI > 0.02) {
      maneuvers.push({
        date: curr.epoch,
        dateStr: curr.epoch.toISOString().slice(0, 10),
        dPerigee: (curr.perigee - prev.perigee).toFixed(2),
        dApogee: (curr.apogee - prev.apogee).toFixed(2),
        dInc: (curr.i - prev.i).toFixed(4),
        type: dI > 0.02 ? 'plane' : 'altitude',
      })
    }
  }
  return maneuvers
}

function fmtDate(ts) {
  const d = new Date(ts)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(2)}`
}

const PRESETS = [
  { label: 'МКС', norad: '25544' },
  { label: 'Ресурс-П №1', norad: '39186' },
  { label: 'Канопус-В', norad: '38707' },
  { label: 'Sentinel-2A', norad: '40697' },
  { label: 'Landsat 9', norad: '49260' },
  { label: 'Метеор-М 2-3', norad: '57166' },
]

const CHARTS = [
  { id: 'altitude', title: 'Высота орбиты', unit: 'км',
    lines: [{ key: 'apogee', name: 'Апогей', color: '#e74c3c' }, { key: 'perigee', name: 'Перигей', color: '#0077cc' }] },
  { id: 'inclination', title: 'Наклонение', unit: '°',
    lines: [{ key: 'i', name: 'i', color: '#16a085' }] },
  { id: 'raan', title: 'RAAN (Ω)', unit: '°',
    lines: [{ key: 'raan', name: 'Ω', color: '#e67e22' }] },
  { id: 'eccentricity', title: 'Эксцентриситет', unit: '',
    lines: [{ key: 'e', name: 'e', color: '#8e44ad' }] },
  { id: 'period', title: 'Период', unit: 'мин',
    lines: [{ key: 'period', name: 'T', color: '#e84393' }] },
]

export default function OrbitHistory() {
  const [noradId, setNoradId] = useState('25544')
  const [satName, setSatName] = useState('')
  const [records, setRecords] = useState([])
  const [maneuvers, setManeuvers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [source, setSource] = useState('')
  const [activeCharts, setActiveCharts] = useState(['altitude', 'inclination'])
  const [showPaste, setShowPaste] = useState(false)
  const [tleText, setTleText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const searchTimer = useRef(null)
  const fileRef = useRef(null)

  // Shared TLE processing
  const processTLELines = useCallback((lines, fallbackName) => {
    const parsed = []
    let idx = 0, name = ''
    while (idx < lines.length) {
      if (!lines[idx].startsWith('1 ') && !lines[idx].startsWith('2 ')) { name = lines[idx]; idx++ }
      if (idx + 1 < lines.length && lines[idx].startsWith('1 ') && lines[idx + 1].startsWith('2 ')) {
        const rec = parseTLERecord(lines[idx], lines[idx + 1])
        if (rec) { rec.name = name; parsed.push(rec) }
        idx += 2
      } else idx++
    }
    if (!parsed.length) throw new Error('Не удалось разобрать TLE')
    parsed.sort((a, b) => a.epoch - b.epoch)

    const mans = detectManeuvers(parsed)
    setManeuvers(mans)

    // Decimate to ~500 points, always keeping first, last, and maneuver neighbors
    const MAX_POINTS = 500
    let thinned = parsed
    if (parsed.length > MAX_POINTS) {
      const manDates = new Set(mans.map(m => m.date.getTime()))
      const keepIdx = new Set([0, parsed.length - 1])
      // Keep points near maneuvers (±1 index)
      for (let j = 0; j < parsed.length; j++) {
        if (manDates.has(parsed[j].epoch.getTime())) {
          if (j > 0) keepIdx.add(j - 1)
          keepIdx.add(j)
          if (j < parsed.length - 1) keepIdx.add(j + 1)
        }
      }
      // Evenly sample the rest
      const step = Math.ceil(parsed.length / MAX_POINTS)
      for (let j = 0; j < parsed.length; j += step) keepIdx.add(j)
      thinned = [...keepIdx].sort((a, b) => a - b).map(j => parsed[j])
    }

    setSatName(thinned[0].name || fallbackName || 'Unknown')
    setRecords(thinned.map(r => ({
      ts: r.epoch.getTime(),
      perigee: +r.perigee.toFixed(2), apogee: +r.apogee.toFixed(2),
      i: +r.i.toFixed(4), raan: +r.raan.toFixed(4), e: +r.e.toFixed(7),
      argp: +r.argp.toFixed(4), period: +r.period.toFixed(2), a: +r.a.toFixed(2),
    })))
  }, [])

  // Search satellites by name
  const doSearch = useCallback(async (q) => {
    if (q.length < 2) { setSearchResults([]); return }
    setSearching(true)
    try {
      const r = await fetch(`/api/spacetrack/search?q=${encodeURIComponent(q)}`)
      if (r.ok) {
        const data = await r.json()
        setSearchResults(data)
        setShowSearch(true)
      }
    } catch {}
    finally { setSearching(false) }
  }, [])

  const onSearchInput = (val) => {
    setSearchQuery(val)
    clearTimeout(searchTimer.current)
    if (val.length >= 2) {
      searchTimer.current = setTimeout(() => doSearch(val), 400)
    } else {
      setSearchResults([])
      setShowSearch(false)
    }
  }

  const selectSat = (sat) => {
    setNoradId(String(sat.norad_id))
    setSearchQuery(sat.name)
    setShowSearch(false)
  }

  const fetchTLE = useCallback(async () => {
    setLoading(true); setError(''); setRecords([]); setManeuvers([])
    try {
      let lines = []
      let source = ''

      // 1. Try Space-Track proxy (full history)
      try {
        const r = await fetch(`/api/spacetrack/tle/${noradId}`)
        if (r.ok) {
          const data = await r.json()
          const l = data.tle.trim().split('\n').map(s => s.trim()).filter(Boolean)
          if (l.length >= 2) { lines = l; source = 'Space-Track' }
        }
      } catch {}

      // 2. Fallback to CelesTrak
      if (lines.length < 2) {
        const urls = [
          `https://celestrak.org/NORAD/elements/gp.php?CATNR=${noradId}&FORMAT=tle`,
          `https://celestrak.org/NORAD/elements/supplemental/sup-gp.php?CATNR=${noradId}&FORMAT=tle`
        ]
        for (const url of urls) {
          try {
            const r = await fetch(url)
            if (!r.ok) continue
            const t = await r.text()
            const l = t.trim().split('\n').map(s => s.trim()).filter(Boolean)
            if (l.length > lines.length) { lines = l; source = 'CelesTrak' }
          } catch {}
        }
      }

      if (lines.length < 2) throw new Error('TLE не найден для NORAD ' + noradId)
      setSource(source)
      processTLELines(lines, `NORAD ${noradId}`)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [noradId, processTLELines])

  const exportCSV = () => {
    const h = 'Date,Perigee_km,Apogee_km,Incl_deg,RAAN_deg,Ecc,Period_min,SMA_km\n'
    const rows = records.map(r =>
      `${fmtDate(r.ts)},${r.perigee},${r.apogee},${r.i},${r.raan},${r.e},${r.period},${r.a}`
    ).join('\n')
    const blob = new Blob([h + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), { href: url, download: `orbit_${noradId}.csv` }).click()
  }

  const toggleChart = id => setActiveCharts(p => p.includes(id) ? p.filter(c => c !== id) : [...p, id])
  const last = records.length ? records[records.length - 1] : null

  return (
    <div className="page-content" style={{ maxWidth: 1080 }}>
      <div className="service-header">
        <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
          <ellipse cx="18" cy="18" rx="15" ry="7" transform="rotate(-20 18 18)" stroke="var(--accent)" strokeWidth="1.5" />
          <circle cx="27" cy="13" r="2.5" fill="var(--accent)" />
        </svg>
        <h1>История орбиты по TLE</h1>
        <span className="tag">{source || 'Space-Track / CelesTrak'}</span>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '0 0 160px' }}>
            <div className="label">NORAD ID</div>
            <input
              type="text" value={noradId}
              onChange={e => setNoradId(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && fetchTLE()}
              placeholder="25544"
            />
          </div>
          <div style={{ flex: '0 0 260px', position: 'relative' }}>
            <div className="label">Поиск по названию</div>
            <input
              type="text" value={searchQuery}
              onChange={e => onSearchInput(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowSearch(true)}
              placeholder="METEOR, LANDSAT, RESURS..."
              style={{ fontFamily: 'var(--font-body)' }}
            />
            {searching && <span style={{ position: 'absolute', right: 10, top: 30, fontSize: 12, color: 'var(--text-muted)' }}>⏳</span>}
            {showSearch && searchResults.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                background: 'var(--bg-white)', border: '1px solid var(--border)',
                borderRadius: 8, marginTop: 4, maxHeight: 260, overflowY: 'auto',
                boxShadow: '0 8px 24px rgba(0,0,0,.12)',
              }}>
                {searchResults.map(s => (
                  <div key={s.norad_id}
                    onClick={() => selectSat(s)}
                    style={{
                      padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                      borderBottom: '1px solid var(--border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <span style={{ fontWeight: 600 }}>{s.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8 }}>{s.intldes}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{s.norad_id}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="btn btn-primary" onClick={fetchTLE} disabled={loading || !noradId}>
            {loading ? '⏳ Загрузка...' : '🔍 Загрузить'}
          </button>
          {records.length > 0 && (
            <button className="btn" onClick={exportCSV}>📄 CSV</button>
          )}
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRESETS.map(p => (
              <button
                key={p.norad}
                className="btn btn-sm"
                style={noradId === p.norad ? { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-bg)' } : {}}
                onClick={() => setNoradId(p.norad)}
              >{p.label}</button>
            ))}
          </div>
        </div>
        {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10, fontWeight: 500 }}>⚠ {error}</div>}
      </div>

      {/* Summary */}
      {last && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: 20, fontWeight: 700 }}>{satName}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 10 }}>
                NORAD {noradId} · {records.length} TLE
              </span>
            </div>
            {maneuvers.length > 0 && (
              <span style={{
                fontSize: 11, padding: '4px 12px', borderRadius: 6,
                background: 'var(--danger-bg)', color: 'var(--danger)', fontWeight: 600,
              }}>
                {maneuvers.length} манёвр{maneuvers.length > 4 ? 'ов' : maneuvers.length > 1 ? 'а' : ''}
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: 12 }}>
            {[
              ['Перигей', `${last.perigee} км`], ['Апогей', `${last.apogee} км`],
              ['Наклонение', `${last.i}°`], ['Период', `${last.period} мин`],
              ['Эксцентриситет', last.e.toFixed(6)], ['ПБО', `${last.a} км`],
            ].map(([l, v]) => (
              <div key={l} style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '12px 14px',
              }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontWeight: 600 }}>{l}</div>
                <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart toggles */}
      {records.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {CHARTS.map(ch => (
            <button
              key={ch.id}
              className="btn btn-sm"
              style={activeCharts.includes(ch.id) ? {
                borderColor: ch.lines[0].color, color: ch.lines[0].color,
                background: ch.lines[0].color + '12',
              } : {}}
              onClick={() => toggleChart(ch.id)}
            >{ch.title}</button>
          ))}
        </div>
      )}

      {/* Charts */}
      {records.length > 0 && activeCharts.map(chartId => {
        const ch = CHARTS.find(c => c.id === chartId)
        if (!ch) return null
        return (
          <div key={chartId} className="card" style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{ch.title}</span>
              {ch.unit && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ch.unit}</span>}
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={records} margin={{ top: 5, right: 10, left: -5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="ts" type="number" domain={['dataMin', 'dataMax']}
                  tickFormatter={fmtDate} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} stroke="var(--border)" />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} stroke="var(--border)"
                  domain={chartId === 'eccentricity' ? [0, 'auto'] : ['auto', 'auto']}
                  tickFormatter={v => chartId === 'eccentricity' ? v.toFixed(4) : v} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-white)', border: '1px solid var(--border)',
                    borderRadius: 8, fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,.08)',
                  }}
                  labelFormatter={fmtDate}
                />
                {ch.lines.map(ln => (
                  <Line key={ln.key} type="monotone" dataKey={ln.key}
                    stroke={ln.color} strokeWidth={2} dot={false} name={ln.name} />
                ))}
                {chartId === 'altitude' && (
                  <Area type="monotone" dataKey="perigee" fill="var(--accent)" fillOpacity={0.06} stroke="none" />
                )}
                {maneuvers.map((m, idx) => (
                  <ReferenceLine key={idx} x={m.date.getTime()} stroke="var(--danger)" strokeDasharray="3 3" strokeWidth={0.8} />
                ))}
                <Brush dataKey="ts" height={24} fill="var(--bg)" stroke="var(--border)" tickFormatter={fmtDate} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )
      })}

      {/* Maneuver table */}
      {maneuvers.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Детектированные манёвры</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['Дата', 'Тип', 'ΔПеригей', 'ΔАпогей', 'ΔНакл.'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {maneuvers.slice(0, 30).map((m, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{m.dateStr}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                        background: m.type === 'plane' ? '#8e44ad18' : 'var(--accent-bg)',
                        color: m.type === 'plane' ? '#8e44ad' : 'var(--accent)',
                      }}>
                        {m.type === 'plane' ? 'Плоскость' : 'Высота'}
                      </span>
                    </td>
                    <td style={{
                      padding: '8px 12px', fontFamily: 'var(--font-mono)', fontWeight: 500,
                      color: Number(m.dPerigee) > 0 ? 'var(--success)' : 'var(--danger)',
                    }}>
                      {Number(m.dPerigee) > 0 ? '+' : ''}{m.dPerigee} км
                    </td>
                    <td style={{
                      padding: '8px 12px', fontFamily: 'var(--font-mono)', fontWeight: 500,
                      color: Number(m.dApogee) > 0 ? 'var(--success)' : 'var(--danger)',
                    }}>
                      {Number(m.dApogee) > 0 ? '+' : ''}{m.dApogee} км
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>{m.dInc}°</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {records.length === 0 && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text-muted)', fontSize: 14 }}>
          Введите NORAD ID и нажмите «Загрузить» для анализа орбиты
        </div>
      )}
    </div>
  )
}
