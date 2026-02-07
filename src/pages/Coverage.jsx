import React, { useState, useMemo, useRef, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

var MU = 398600.4418, RE = 6378.137, J2 = 1.08263e-3, OMEGA_EARTH = 7.2921159e-5;

var REGION_POLYGONS = {
  'moscow_obl': { name: 'Московская обл.', polygons: [[[35.14,56.85],[35.6,56.65],[36.1,56.55],[36.8,56.45],[37.3,56.55],[37.9,56.45],[38.4,56.35],[38.9,56.15],[39.5,55.95],[39.8,55.65],[39.9,55.35],[39.7,55.05],[39.5,54.85],[39.1,54.65],[38.6,54.55],[38.0,54.45],[37.3,54.35],[36.7,54.45],[36.1,54.65],[35.5,54.95],[35.2,55.35],[35.0,55.75],[35.0,56.25],[35.14,56.85]]] },
  'spb': { name: 'СПб и ЛО', polygons: [[[27.8,61.2],[28.5,61.1],[29.5,61.15],[30.5,61.0],[31.5,60.7],[32.5,60.4],[33.5,60.1],[34.5,59.8],[35.0,59.4],[34.5,59.0],[33.5,58.7],[32.5,58.5],[31.5,58.5],[30.5,58.6],[29.5,58.8],[28.5,59.2],[27.8,59.8],[27.8,61.2]]] },
  'krasnodar': { name: 'Краснодарский край', polygons: [[[36.6,46.7],[37.5,46.8],[38.5,46.4],[39.5,46.0],[40.5,45.5],[41.0,45.0],[41.5,44.5],[41.0,44.0],[40.0,43.7],[39.0,43.5],[38.0,43.8],[37.0,44.2],[36.5,44.8],[36.6,45.5],[36.6,46.7]]] },
  'sverdlovsk': { name: 'Свердловская обл.', polygons: [[[57.2,61.8],[58.5,61.9],[60.0,61.7],[61.5,61.3],[63.0,60.8],[64.5,60.2],[65.5,59.5],[66.0,58.5],[65.5,57.5],[65.0,56.8],[64.0,56.3],[62.5,56.1],[61.0,56.2],[59.5,56.5],[58.0,57.0],[57.2,58.0],[57.2,59.5],[57.2,61.8]]] },
  'novosibirsk': { name: 'Новосибирская обл.', polygons: [[[75.2,57.0],[76.5,57.1],[78.0,56.9],[80.0,56.5],[82.0,55.8],[84.0,55.2],[85.0,54.5],[84.5,53.8],[83.0,53.4],[81.0,53.5],[79.0,54.0],[77.0,54.5],[75.5,55.2],[75.2,56.0],[75.2,57.0]]] },
  'yakutia': { name: 'Якутия', polygons: [[[105.5,76.5],[110,76.8],[120,76.5],[130,75],[140,73],[150,71],[160,70],[163,68],[162,65],[158,62],[150,60],[145,58],[140,57],[135,56.5],[130,56],[125,56.5],[120,58],[115,60],[110,63],[107,66],[105.5,70],[105.5,76.5]]] },
  'khmao': { name: 'ХМАО-Югра', polygons: [[[59.5,63.8],[62,63.9],[65,63.5],[68,63],[72,62.5],[76,62],[80,61.5],[83,61],[85,60.2],[84,59],[82,58.5],[78,58.2],[74,58.3],[70,58.5],[66,59],[62,59.5],[59.5,60.5],[59.5,63.8]]] },
  'yamalo': { name: 'ЯНАО', polygons: [[[66,73.4],[70,73.5],[75,73],[80,72],[84,71],[87,70],[89,69],[88,67.5],[85,66],[80,65],[75,64.5],[70,64.5],[67,65],[66,66.5],[66,68],[67,70],[66,73.4]]] },
  'murmansk': { name: 'Мурманская обл.', polygons: [[[28.4,69.9],[30,70],[32,69.8],[35,69.5],[38,69.2],[40,68.8],[41.4,68.2],[41,67.5],[39,67],[37,66.5],[35,66.2],[32,66.5],[30,67],[28.5,67.8],[28.4,69.9]]] },
  'kamchatka': { name: 'Камчатка', polygons: [[[155.5,64.5],[158,65],[162,64.5],[166,63],[170,61],[173,59],[174,57],[173,55],[170,53],[167,51.5],[163,51],[159,52],[156,54],[155.5,57],[156,60],[155.5,64.5]]] },
  'crimea': { name: 'Крым', polygons: [[[32.5,46.1],[33.5,46.2],[34.5,46.0],[35.5,45.6],[36.5,45.2],[36.6,44.8],[36.2,44.4],[35.5,44.4],[34.5,44.6],[33.5,44.8],[32.8,45.0],[32.5,45.5],[32.5,46.1]]] },
  'russia': { name: 'Россия', polygons: [[[27,70],[40,68],[50,67],[60,68],[70,73],[80,75],[90,76],[100,77],[110,77],[120,76],[130,73],[140,70],[150,68],[160,66],[170,64],[180,65],[180,55],[170,53],[160,50],[150,45],[140,43],[130,43],[120,50],[110,52],[100,50],[90,50],[80,55],[70,55],[60,55],[50,52],[45,48],[40,46],[35,45],[30,46],[28,50],[27,55],[27,60],[27,70]]] }
};

var CITIES = [
  { name: 'Москва', lat: 55.75, lon: 37.62 },
  { name: 'СПб', lat: 59.93, lon: 30.31 },
  { name: 'Новосибирск', lat: 55.03, lon: 82.92 },
  { name: 'Мурманск', lat: 68.97, lon: 33.09 },
  { name: 'Владивосток', lat: 43.12, lon: 131.89 },
];

var CONFIGS = { 'single': 'Одна плоскость', 'multi': 'Разные плоскости', 'walker': 'Walker Delta', 'auto': 'Автоподбор' };

function pointInPolygon(lat, lon, polygon) {
  var inside = false;
  for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    var xi = polygon[i][0], yi = polygon[i][1], xj = polygon[j][0], yj = polygon[j][1];
    if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

function pointInRegion(lat, lon, regionKey) {
  var region = REGION_POLYGONS[regionKey];
  return region ? region.polygons.some(function(poly) { return pointInPolygon(lat, lon, poly); }) : false;
}

function getBounds(regionKey) {
  var region = REGION_POLYGONS[regionKey];
  if (!region) return [40, 20, 80, 170];
  var minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  region.polygons.forEach(function(poly) { poly.forEach(function(c) {
    minLat = Math.min(minLat, c[1]); maxLat = Math.max(maxLat, c[1]);
    minLon = Math.min(minLon, c[0]); maxLon = Math.max(maxLon, c[0]);
  }); });
  return [minLat - 0.5, minLon - 0.5, maxLat + 0.5, maxLon + 0.5];
}

function calcOrbit(a, e, inc_deg) {
  var inc = inc_deg * Math.PI / 180, n = Math.sqrt(MU / (a * a * a)), p = a * (1 - e * e);
  return { n: n, T: 2 * Math.PI / n, dOmega: -1.5 * n * J2 * Math.pow(RE / p, 2) * Math.cos(inc), dw: 0.75 * n * J2 * Math.pow(RE / p, 2) * (5 * Math.cos(inc) * Math.cos(inc) - 1), inc: inc };
}

function normLon(lon) { var l = lon % 360; if (l > 180) l -= 360; if (l < -180) l += 360; return l; }

function calcSubsat(a, e, inc, raan, argp, M0, t, dOmega, dw, n) {
  var raan_t = raan + dOmega * t, argp_t = argp + dw * t, M_t = M0 + n * t;
  var E = M_t; for (var j = 0; j < 8; j++) E = M_t + e * Math.sin(E);
  var nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  var u = argp_t + nu, lat = Math.asin(Math.sin(inc) * Math.sin(u));
  return { lat: lat * 180 / Math.PI, lon: normLon((raan_t + Math.atan2(Math.cos(inc) * Math.sin(u), Math.cos(u)) - OMEGA_EARTH * t) * 180 / Math.PI) };
}

function haversine(lat1, lon1, lat2, lon2) {
  var toRad = function(x) { return x * Math.PI / 180; }, dLat = toRad(lat2 - lat1);
  var dLon = toRad(lon2 - lon1); if (dLon > Math.PI) dLon -= 2 * Math.PI; if (dLon < -Math.PI) dLon += 2 * Math.PI;
  return 2 * RE * Math.asin(Math.sqrt(Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)*Math.sin(dLon/2)));
}

function calcAccessWidth(h, swath, offNadir) { return swath + 2 * h * Math.tan(offNadir * Math.PI / 180); }

function generateSatConfig(numSats, configType, numPlanes) {
  var sats = [];
  if (configType === 'single') for (var s = 0; s < numSats; s++) sats.push({ raanOffset: 0, maOffset: (360 / numSats) * s });
  else if (configType === 'multi') for (var s = 0; s < numSats; s++) sats.push({ raanOffset: (360 / numSats) * s, maOffset: 0 });
  else if (configType === 'walker') {
    var P = Math.min(numPlanes, numSats), satsPerPlane = Math.ceil(numSats / P), idx = 0;
    for (var p = 0; p < P && idx < numSats; p++) for (var s = 0; s < satsPerPlane && idx < numSats; s++, idx++)
      sats.push({ raanOffset: (360 / P) * p, maOffset: ((360 / satsPerPlane) * s + (360 / numSats) * p) % 360 });
  }
  return sats;
}

function runSimulation(params, region, numSats, durationDays, configType, numPlanes, targetPoint, abortRef) {
  var altitude = params.altitude, swath_km = params.swath_km, off_nadir_deg = params.off_nadir_deg, e = params.e, i_deg = params.i_deg, raan_deg = params.raan_deg, argp_deg = params.argp_deg, ma_deg = params.ma_deg;
  var a = RE + altitude, bounds = getBounds(region);
  var orb = calcOrbit(a, e, i_deg), n = orb.n, T = orb.T, dOmega = orb.dOmega, dw = orb.dw, inc = orb.inc;
  var accessWidth = calcAccessWidth(altitude, swath_km, off_nadir_deg);
  var halfSwath = swath_km / 2, halfAccess = accessWidth / 2;
  var minLat = bounds[0], minLon = bounds[1], maxLat = bounds[2], maxLon = bounds[3];
  var regionSize = Math.max(maxLat - minLat, maxLon - minLon);
  var gridRes = regionSize > 50 ? 2.0 : regionSize > 20 ? 1.0 : regionSize > 10 ? 0.5 : 0.3;
  var grid = [];
  for (var lat = minLat; lat <= maxLat; lat += gridRes) {
    var lonStep = gridRes / Math.max(0.1, Math.cos(lat * Math.PI / 180));
    for (var lon = minLon; lon <= maxLon; lon += lonStep) if (pointInRegion(lat, lon, region)) grid.push({ lat: lat, lon: lon, covered: false });
  }
  var satConfigs = generateSatConfig(numSats, configType, numPlanes);
  var allSegments = [];
  var step = regionSize > 50 ? 60 : regionSize > 20 ? 45 : 30;
  var totalSec = durationDays * 86400;
  var positions = [];
  for (var si = 0; si < satConfigs.length; si++) {
    if (abortRef && abortRef.current) return null;
    var cfg = satConfigs[si];
    var raan = (raan_deg + cfg.raanOffset) * Math.PI / 180, argp = argp_deg * Math.PI / 180, M0 = (ma_deg + cfg.maOffset) * Math.PI / 180;
    var seg = [], prevLon = null;
    for (var t = 0; t <= totalSec; t += step) {
      var pt = calcSubsat(a, e, inc, raan, argp, M0, t, dOmega, dw, n);
      positions.push({ t: t, lat: pt.lat, lon: pt.lon, satIdx: si });
      if (prevLon !== null && Math.abs(pt.lon - prevLon) > 180) { if (seg.length > 1) allSegments.push({ pts: seg, sat: si }); seg = []; }
      seg.push([pt.lat, pt.lon]); prevLon = pt.lon;
    }
    if (seg.length > 1) allSegments.push({ pts: seg, sat: si });
  }
  if (abortRef && abortRef.current) return null;
  positions.sort(function(a, b) { return a.t - b.t; });
  var coverageByHour = new Map(), passes = [];
  var coveredCount = 0, currentPass = null;
  for (var i = 0; i < positions.length; i++) {
    if (abortRef && abortRef.current) return null;
    var pos = positions[i];
    for (var ci = 0; ci < grid.length; ci++) { var cell = grid[ci]; if (!cell.covered && haversine(pos.lat, pos.lon, cell.lat, cell.lon) <= halfSwath) { cell.covered = true; coveredCount++; } }
    if (targetPoint) {
      var dist = haversine(pos.lat, pos.lon, targetPoint.lat, targetPoint.lon);
      if (dist <= halfAccess) { if (!currentPass) currentPass = { start: pos.t, end: pos.t, minDist: dist, satIdx: pos.satIdx }; else { currentPass.end = pos.t; currentPass.minDist = Math.min(currentPass.minDist, dist); } }
      else if (currentPass) { passes.push(currentPass); currentPass = null; }
    }
    var hour = Math.floor(pos.t / 3600);
    if (!coverageByHour.has(hour)) coverageByHour.set(hour, coveredCount);
  }
  if (currentPass) passes.push(currentPass);
  var intervals = passes.slice(1).map(function(p, i) { return (p.start - passes[i].start) / 3600; });
  var coverageData = Array.from(coverageByHour.entries()).sort(function(a, b) { return a[0] - b[0]; }).map(function(e) { return { hour: e[0], coverage: grid.length ? Math.round(e[1] / grid.length * 100) : 0 }; });
  if (!coverageData.length || coverageData[0].hour !== 0) coverageData.unshift({ hour: 0, coverage: 0 });
  var hourlyDist = Array.from({length: 24}, function(_, h) { return { hour: h, count: 0 }; });
  passes.forEach(function(p) { hourlyDist[Math.floor((p.start % 86400) / 3600)].count++; });
  return {
    segments: allSegments, coverageData: coverageData, grid: grid, accessWidth: accessWidth, T: T,
    finalCoverage: grid.length ? coveredCount / grid.length * 100 : 0,
    totalArea: grid.length, coveredCount: coveredCount, passes: passes, intervals: intervals, hourlyDist: hourlyDist, configType: configType, numPlanes: numPlanes,
    periodStats: intervals.length ? { min: Math.min.apply(null, intervals), max: Math.max.apply(null, intervals), avg: intervals.reduce(function(s, v) { return s + v; }, 0) / intervals.length, count: passes.length } : null
  };
}

function findOptimalConfig(params, region, numSats, durationDays, targetPoint, criterion, abortRef) {
  var configs = ['single', 'multi'];
  if (numSats >= 2) for (var p = 2; p <= Math.min(numSats, 4); p++) configs.push('walker_' + p);
  var best = null, bestScore = criterion === 'coverage' ? -1 : Infinity;
  for (var ci = 0; ci < configs.length; ci++) {
    if (abortRef && abortRef.current) return null;
    var cfg = configs[ci], isWalker = cfg.indexOf('walker') === 0;
    var configType = isWalker ? 'walker' : cfg, numPlanes = isWalker ? parseInt(cfg.split('_')[1]) : numSats;
    var result = runSimulation(params, region, numSats, durationDays, configType, numPlanes, targetPoint, abortRef);
    if (!result) return null;
    var score = criterion === 'coverage' ? result.finalCoverage : (result.periodStats ? result.periodStats.avg : Infinity);
    if ((criterion === 'coverage' && score > bestScore) || (criterion !== 'coverage' && score < bestScore)) { bestScore = score; best = result; }
  }
  return best;
}

var SAT_COLORS = ['#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ef4444', '#06b6d4'];

function MapView(props) {
  var segments = props.segments, region = props.region, targetPoint = props.targetPoint, accessWidth = props.accessWidth, swathKm = props.swathKm;
  var bounds = getBounds(region), minLat = bounds[0], minLon = bounds[1], maxLat = bounds[2], maxLon = bounds[3];
  var w = 480, h = 260, avgLat = (maxLat + minLat) / 2;
  var lonScale = w / (maxLon - minLon), degToKm = 111 * Math.cos(avgLat * Math.PI / 180);
  var accessPx = (accessWidth / degToKm) * lonScale, swathPx = (swathKm / degToKm) * lonScale;
  var toSvg = function(lat, lon) { return { x: (lon - minLon) / (maxLon - minLon) * w, y: (maxLat - lat) / (maxLat - minLat) * h }; };
  var regionData = REGION_POLYGONS[region];
  var polyPaths = regionData ? regionData.polygons.map(function(poly) { return poly.map(function(c) { var p = toSvg(c[1], c[0]); return p.x + ',' + p.y; }).join(' '); }) : [];
  return (
    <svg viewBox={'0 0 ' + w + ' ' + h} style={{width:'100%',borderRadius:8,background:'#e8edf3'}}>
      <defs><clipPath id="rc">{polyPaths.map(function(p, i) { return <polygon key={i} points={p} />; })}</clipPath></defs>
      <rect width={w} height={h} fill="#e8edf3"/>
      {polyPaths.map(function(p, i) { return <polygon key={i} points={p} fill="#0077cc" fillOpacity="0.2" stroke="#3b82f6" strokeWidth="1.5"/>; })}
      <g clipPath="url(#rc)">
        {segments.map(function(s, i) { return <polyline key={'a'+i} points={s.pts.map(function(c){var p=toSvg(c[0],c[1]);return p.x+','+p.y;}).join(' ')} fill="none" stroke="#3b82f6" strokeWidth={Math.max(accessPx,4)} opacity="0.15" strokeLinecap="round"/>; })}
        {segments.map(function(s, i) { return <polyline key={'s'+i} points={s.pts.map(function(c){var p=toSvg(c[0],c[1]);return p.x+','+p.y;}).join(' ')} fill="none" stroke="#22c55e" strokeWidth={Math.max(swathPx,2)} opacity="0.5" strokeLinecap="round"/>; })}
      </g>
      {segments.map(function(s, i) { return <polyline key={i} points={s.pts.filter(function(c){var p=toSvg(c[0],c[1]);return p.x>=-50&&p.x<=w+50&&p.y>=-50&&p.y<=h+50;}).map(function(c){var p=toSvg(c[0],c[1]);return p.x+','+p.y;}).join(' ')} fill="none" stroke={SAT_COLORS[s.sat%6]} strokeWidth="1" opacity="0.9"/>; })}
      {polyPaths.map(function(p, i) { return <polygon key={'b'+i} points={p} fill="none" stroke="#3b82f6" strokeWidth="1.5"/>; })}
      {targetPoint && (function() { var p = toSvg(targetPoint.lat, targetPoint.lon); return <><circle cx={p.x} cy={p.y} r="8" fill="#ef4444" opacity="0.3"/><circle cx={p.x} cy={p.y} r="4" fill="#ef4444"/></>; })()}
      <text x="8" y="16" fill="#8892a4" fontSize="10">{regionData ? regionData.name : ''}</text>
    </svg>
  );
}

var formatTime = function(sec) { var d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60); return d > 0 ? d + 'д ' + h + 'ч' : h + 'ч ' + m + 'м'; };

function NumInput(props) {
  var label = props.label, value = props.value, onChange = props.onChange;
  var localState = useState(String(value));
  var local = localState[0], setLocal = localState[1];
  var apply = function() { var n = parseFloat(local); if (!isNaN(n)) onChange(n); else setLocal(String(value)); };
  React.useEffect(function() { setLocal(String(value)); }, [value]);
  return (
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      <span style={{fontSize:11,color:'#8892a4',width:80,flexShrink:0}}>{label}</span>
      <input value={local} onChange={function(e){setLocal(e.target.value);}} onBlur={apply} onKeyDown={function(e){if(e.key==='Enter')apply();}}
        style={{flex:1,background:'#f8f9fb',border:'1px solid #e0e4ea',borderRadius:4,padding:'4px 8px',fontSize:13,color:'#1a1f2e',minWidth:0}} />
    </div>
  );
}

export default function Coverage() {
  var paramsState = useState({ altitude: 500, swath_km: 100, off_nadir_deg: 30, e: 0.001, i_deg: 97.4, raan_deg: 0, argp_deg: 0, ma_deg: 0 });
  var params = paramsState[0], setParams = paramsState[1];
  var regionState = useState('moscow_obl'); var region = regionState[0], setRegion = regionState[1];
  var nsState = useState(3); var numSats = nsState[0], setNumSats = nsState[1];
  var npState = useState(3); var numPlanes = npState[0], setNumPlanes = npState[1];
  var durState = useState(3); var durationDays = durState[0], setDuration = durState[1];
  var cfgState = useState('auto'); var configType = cfgState[0], setConfigType = cfgState[1];
  var critState = useState('coverage'); var criterion = critState[0], setCriterion = critState[1];
  var tiState = useState({ lat: 55.75, lon: 37.62 }); var targetInput = tiState[0], setTargetInput = tiState[1];
  var resState = useState(null); var result = resState[0], setResult = resState[1];
  var compState = useState(false); var computing = compState[0], setComputing = compState[1];
  var advState = useState(false); var showAdv = advState[0], setShowAdv = advState[1];
  var tabState = useState('coverage'); var tab = tabState[0], setTab = tabState[1];
  var abortRef = useRef(false);
  var orbitInfo = useMemo(function() { return calcOrbit(RE + params.altitude, params.e, params.i_deg); }, [params.altitude, params.e, params.i_deg]);

  var calculate = useCallback(function() {
    abortRef.current = false; setComputing(true);
    setTimeout(function() {
      var tp = tab === 'point' ? targetInput : null;
      var r = configType === 'auto' ? findOptimalConfig(params, region, numSats, durationDays, tp, criterion, abortRef) : runSimulation(params, region, numSats, durationDays, configType, numPlanes, tp, abortRef);
      if (r) setResult(r); setComputing(false);
    }, 10);
  }, [params, region, numSats, durationDays, configType, numPlanes, targetInput, tab, criterion]);

  var configLabel = result ? (result.configType === 'single' ? 'Одна плоск.' : result.configType === 'multi' ? 'Разные плоск.' : 'Walker ' + result.numPlanes + 'P') : '';

  function Stat(p) {
    return (
      <div style={{padding:'4px 8px',borderRadius:4,background:p.hl?'#fef5e0':'#f8f9fb',border:p.hl?'1px solid #d68a00':'1px solid #e0e4ea'}}>
        <div style={{fontSize:11,color:'#8892a4'}}>{p.label}</div>
        <div style={{fontSize:13,fontWeight:600,color:p.hl?'#d68a00':'#1a1f2e'}}>{p.value}<span style={{fontSize:11,fontWeight:400,color:'#5a6478',marginLeft:4}}>{p.unit}</span></div>
      </div>
    );
  }

  var S = {
    root: { color: '#1a1f2e', padding: 8, fontSize: 13, minHeight: '80vh' },
    max: { maxWidth: 900, margin: '0 auto' },
    hdr: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
    icon: { width: 28, height: 28, borderRadius: 4, background: 'linear-gradient(135deg,#f59e0b,#ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 },
    grid: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 },
    panel: { background: '#ffffff', border: '1px solid #e0e4ea', borderRadius: 8, padding: 8 },
    label: { fontSize: 11, fontWeight: 600, color: '#5a6478', textTransform: 'uppercase', marginBottom: 6 },
    sel: { width: '100%', background: '#f8f9fb', border: '1px solid #e0e4ea', borderRadius: 4, padding: '4px 8px', fontSize: 13, color: '#1a1f2e' },
    btn: { padding: '6px 12px', borderRadius: 4, fontWeight: 500, fontSize: 12, cursor: 'pointer', border: 'none' },
    statsGrid: { display: 'grid', gap: 6 },
  };

  return (
    <div style={S.root}>
      <div style={S.max}>
        <div style={S.hdr}>
          <div style={S.icon}>🛰</div>
          <h1 style={{fontSize:14,fontWeight:700}}>Планировщик съёмки ДЗЗ</h1>
        </div>
        <div style={S.grid}>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <div style={S.panel}>
              <div style={S.label}>КА</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <NumInput label="Высота, км" value={params.altitude} onChange={function(v){setParams(function(p){return Object.assign({},p,{altitude:v});});}} />
                <NumInput label="Полоса, км" value={params.swath_km} onChange={function(v){setParams(function(p){return Object.assign({},p,{swath_km:v});});}} />
                <NumInput label="Откл., °" value={params.off_nadir_deg} onChange={function(v){setParams(function(p){return Object.assign({},p,{off_nadir_deg:Math.min(45,Math.max(0,v))});});}} />
                <NumInput label="Кол-во КА" value={numSats} onChange={function(v){setNumSats(Math.min(12,Math.max(1,v)));setNumPlanes(Math.min(numPlanes,v));}} />
                {showAdv && <>
                  <NumInput label="Эксцентр." value={params.e} onChange={function(v){setParams(function(p){return Object.assign({},p,{e:v});});}} />
                  <NumInput label="Наклон., °" value={params.i_deg} onChange={function(v){setParams(function(p){return Object.assign({},p,{i_deg:v});});}} />
                </>}
                <button onClick={function(){setShowAdv(!showAdv);}} style={{background:'none',border:'none',color:'#f59e0b',fontSize:12,cursor:'pointer',textAlign:'left',padding:0}}>{showAdv ? '▲' : '▼'} Ещё</button>
              </div>
            </div>
            <div style={S.panel}>
              <div style={S.label}>Конфигурация</div>
              <select value={configType} onChange={function(e){setConfigType(e.target.value);}} style={S.sel}>
                {Object.keys(CONFIGS).map(function(k){return <option key={k} value={k}>{CONFIGS[k]}</option>;})}
              </select>
              {configType === 'walker' && <div style={{marginTop:6}}><NumInput label="Плоскостей" value={numPlanes} onChange={function(v){setNumPlanes(Math.min(numSats,Math.max(1,v)));}} /></div>}
              {configType === 'auto' && <select value={criterion} onChange={function(e){setCriterion(e.target.value);}} style={{...S.sel,marginTop:6}}>
                <option value="coverage">Макс. покрытие</option>
                <option value="revisit">Мин. интервал</option>
              </select>}
            </div>
            <div style={S.panel}>
              <div style={S.label}>Территория</div>
              <select value={region} onChange={function(e){setRegion(e.target.value);}} style={S.sel}>
                {Object.keys(REGION_POLYGONS).map(function(k){return <option key={k} value={k}>{REGION_POLYGONS[k].name}</option>;})}
              </select>
              <div style={{marginTop:6}}><NumInput label="Период, сут" value={durationDays} onChange={function(v){setDuration(Math.min(30,Math.max(1,v)));}} /></div>
            </div>
            <div style={S.panel}>
              <div style={{display:'flex',gap:4}}>
                <button onClick={function(){setTab('coverage');}} style={{...S.btn,flex:1,background:tab==='coverage'?'#0077cc':'#f8f9fb',color:tab==='coverage'?'#ffffff':'#1a1f2e'}}>Покрытие</button>
                <button onClick={function(){setTab('point');}} style={{...S.btn,flex:1,background:tab==='point'?'#0077cc':'#f8f9fb',color:tab==='point'?'#ffffff':'#1a1f2e'}}>Точка</button>
              </div>
              {tab === 'point' && <div style={{marginTop:6}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
                  <NumInput label="Шир." value={targetInput.lat} onChange={function(v){setTargetInput(function(p){return Object.assign({},p,{lat:v});});}} />
                  <NumInput label="Долг." value={targetInput.lon} onChange={function(v){setTargetInput(function(p){return Object.assign({},p,{lon:v});});}} />
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:4}}>{CITIES.map(function(c){return <button key={c.name} onClick={function(){setTargetInput({lat:c.lat,lon:c.lon});}} style={{...S.btn,background:'#f0f4ff',color:'#1a1f2e',padding:'2px 6px',fontSize:11}}>{c.name}</button>;})}</div>
              </div>}
              <div style={{display:'flex',gap:4,marginTop:6}}>
                <button onClick={calculate} disabled={computing} style={{...S.btn,flex:1,background:'#0077cc',color:'#ffffff',opacity:computing?0.5:1}}>{computing ? 'Расчёт...' : '🚀 Рассчитать'}</button>
                {computing && <button onClick={function(){abortRef.current=true;}} style={{...S.btn,background:'#dc2626',color:'white',padding:'6px 12px'}}>✕</button>}
              </div>
            </div>
            <div style={S.panel}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2px 8px',fontSize:12}}>
                <span style={{color:'#5a6478'}}>Период</span><span style={{textAlign:'right'}}>{(orbitInfo.T/60).toFixed(1)} мин</span>
                <span style={{color:'#5a6478'}}>Витков/сут</span><span style={{textAlign:'right'}}>{(86400/orbitInfo.T).toFixed(1)}</span>
                <span style={{color:'#5a6478'}}>Прецессия</span><span style={{textAlign:'right'}}>{(orbitInfo.dOmega*180/Math.PI*86400).toFixed(2)}°/сут</span>
              </div>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {result ? <>
              <div style={{...S.statsGrid,gridTemplateColumns:tab==='coverage'?'1fr 1fr 1fr 1fr':'1fr 1fr 1fr 1fr 1fr'}}>
                {tab === 'coverage' ? <>
                  <Stat label="Покрытие" value={result.finalCoverage.toFixed(1)} unit="%" hl />
                  <Stat label="Ячеек" value={result.coveredCount+'/'+result.totalArea} unit="" />
                  <Stat label="Конфиг." value={configLabel} unit="" />
                  <Stat label="Зона дост." value={result.accessWidth.toFixed(0)} unit="км" />
                </> : <>
                  <Stat label="Проходов" value={result.periodStats?result.periodStats.count:0} unit="" hl />
                  <Stat label="Сред." value={result.periodStats?result.periodStats.avg.toFixed(1):'—'} unit="ч" hl />
                  <Stat label="Мин." value={result.periodStats?result.periodStats.min.toFixed(1):'—'} unit="ч" />
                  <Stat label="Макс." value={result.periodStats?result.periodStats.max.toFixed(1):'—'} unit="ч" />
                  <Stat label="Конфиг." value={configLabel} unit="" />
                </>}
              </div>
              <div style={S.panel}>
                <MapView segments={result.segments} region={region} targetPoint={tab==='point'?targetInput:null} accessWidth={result.accessWidth} swathKm={params.swath_km} />
                <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:6,fontSize:11}}>
                  {Array.from({length:numSats},function(_,i){return <div key={i} style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:8,height:8,borderRadius:'50%',backgroundColor:SAT_COLORS[i%6]}}/>КА-{i+1}</div>;})};
                  <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:12,height:4,borderRadius:2,background:'#22c55e',opacity:0.6}}/>Полоса</div>
                  <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:12,height:4,borderRadius:2,background:'#3b82f6',opacity:0.3}}/>Зона</div>
                </div>
              </div>
              {tab === 'coverage' ? (
                <div style={S.panel}>
                  <div style={{fontSize:11,color:'#5a6478',marginBottom:4}}>Динамика покрытия</div>
                  <ResponsiveContainer width="100%" height={100}>
                    <LineChart data={result.coverageData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e4ea" />
                      <XAxis dataKey="hour" stroke="#8892a4" fontSize={9} tickFormatter={function(v){return v%24===0?v/24+'д':'';}} />
                      <YAxis stroke="#8892a4" fontSize={9} domain={[0,100]} tickFormatter={function(v){return v+'%';}} />
                      <Tooltip contentStyle={{background:'#ffffff',border:'1px solid #e0e4ea',borderRadius:4,fontSize:10}} formatter={function(v){return [v+'%'];}} labelFormatter={function(v){return Math.floor(v/24)+'д '+v%24+'ч';}} />
                      <Line type="monotone" dataKey="coverage" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <div style={S.panel}>
                    <div style={{fontSize:11,color:'#5a6478',marginBottom:4}}>По часам UTC</div>
                    <ResponsiveContainer width="100%" height={90}>
                      <BarChart data={result.hourlyDist}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e4ea" />
                        <XAxis dataKey="hour" stroke="#8892a4" fontSize={8} interval={3} />
                        <YAxis stroke="#8892a4" fontSize={8} allowDecimals={false} />
                        <Tooltip contentStyle={{background:'#ffffff',border:'1px solid #e0e4ea',fontSize:10}} formatter={function(v){return [v,'Прох.'];}} labelFormatter={function(v){return v+':00';}} />
                        <Bar dataKey="count" fill="#22c55e" radius={[2,2,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{...S.panel,maxHeight:130,overflowY:'auto'}}>
                    <div style={{fontSize:11,color:'#5a6478',marginBottom:4}}>Проходы</div>
                    <table style={{width:'100%',fontSize:11}}>
                      <thead style={{color:'#5a6478'}}><tr><th style={{textAlign:'left'}}>#</th><th style={{textAlign:'left'}}>Время</th><th style={{textAlign:'left'}}>КА</th><th style={{textAlign:'left'}}>Инт.</th></tr></thead>
                      <tbody>{result.passes.slice(0,20).map(function(p,i){return <tr key={i} style={{borderTop:'1px solid #e0e4ea'}}><td>{i+1}</td><td>{formatTime(p.start)}</td><td><span style={{display:'inline-block',width:6,height:6,borderRadius:'50%',marginRight:4,backgroundColor:SAT_COLORS[p.satIdx%6]}}/>{p.satIdx+1}</td><td>{i>0?result.intervals[i-1].toFixed(1)+'ч':'—'}</td></tr>;})}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </> : (
              <div style={{...S.panel,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',paddingTop:64,paddingBottom:64}}>
                <div style={{fontSize:24,marginBottom:8}}>🛰️</div>
                <p style={{color:'#5a6478',fontSize:12}}>Настройте параметры и нажмите «Рассчитать»</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
