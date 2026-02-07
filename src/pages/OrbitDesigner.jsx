import React, { useState, useMemo, useRef, useEffect } from 'react';

const MU = 398600.4418;
const RE = 6371;

function keplerToECI(a, e, i, raan, argp, nu) {
  const iRad = i * Math.PI / 180, raanRad = raan * Math.PI / 180;
  const argpRad = argp * Math.PI / 180, nuRad = nu * Math.PI / 180;
  const p = a * (1 - e * e), r = p / (1 + e * Math.cos(nuRad));
  const xOrb = r * Math.cos(nuRad), yOrb = r * Math.sin(nuRad);
  const h = Math.sqrt(MU * p);
  const vxOrb = -MU / h * Math.sin(nuRad), vyOrb = MU / h * (e + Math.cos(nuRad));
  const cosR = Math.cos(raanRad), sinR = Math.sin(raanRad);
  const cosA = Math.cos(argpRad), sinA = Math.sin(argpRad);
  const cosI = Math.cos(iRad), sinI = Math.sin(iRad);
  const R = [
    [cosR*cosA - sinR*sinA*cosI, -cosR*sinA - sinR*cosA*cosI, sinR*sinI],
    [sinR*cosA + cosR*sinA*cosI, -sinR*sinA + cosR*cosA*cosI, -cosR*sinI],
    [sinA*sinI, cosA*sinI, cosI]
  ];
  return {
    x: R[0][0]*xOrb + R[0][1]*yOrb, y: R[2][0]*xOrb + R[2][1]*yOrb, z: R[1][0]*xOrb + R[1][1]*yOrb,
    vx: R[0][0]*vxOrb + R[0][1]*vyOrb, vy: R[2][0]*vxOrb + R[2][1]*vyOrb, vz: R[1][0]*vxOrb + R[1][1]*vyOrb, r
  };
}

function generateTLE(sat, epoch, satNum) {
  const year = epoch.getUTCFullYear() % 100;
  const startOfYear = new Date(Date.UTC(epoch.getUTCFullYear(), 0, 1));
  const dayOfYear = (epoch - startOfYear) / 86400000 + 1;
  const epochStr = year.toString().padStart(2, '0') + dayOfYear.toFixed(8).padStart(12, '0');
  const n = Math.sqrt(MU / Math.pow(sat.a, 3)) * 86400 / (2 * Math.PI);
  const line1 = `1 ${String(satNum).padStart(5,'0')}U 24001A   ${epochStr}  .00000000  00000-0  00000-0 0  9990`;
  const line2 = `2 ${String(satNum).padStart(5,'0')} ${sat.i.toFixed(4).padStart(8)} ${(sat.raan%360).toFixed(4).padStart(8)} ${sat.e.toFixed(7).substring(2)} ${(sat.argp%360).toFixed(4).padStart(8)} ${(sat.ma%360).toFixed(4).padStart(8)} ${n.toFixed(8).padStart(11)}    0`;
  return { line1, line2 };
}

function generateSTK(satellites, epoch) {
  let output = `stk.v.12.0\nBEGIN Ephemeris\nNumberOfEphemerisPoints ${satellites.length}\nScenarioEpoch ${epoch.toISOString()}\nInterpolationMethod Lagrange\nInterpolationOrder 5\nCentralBody Earth\nCoordinateSystem J2000\nEphemerisTimePosVel\n\n`;
  satellites.forEach((sat) => { output += `0.0 ${sat.eci.x*1000} ${sat.eci.y*1000} ${sat.eci.z*1000} ${sat.eci.vx*1000} ${sat.eci.vy*1000} ${sat.eci.vz*1000}\n`; });
  return output + `\nEND Ephemeris`;
}

const PLANE_COLORS = ['#ff6b6b','#4ecdc4','#45b7d1','#96ceb4','#ffeaa7','#fd79a8','#a29bfe','#00b894','#e17055','#0984e3'];

function calcOrbitalVelocity(a) { return Math.sqrt(MU / a); }
function calcOrbitalPeriod(a) { return 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / MU); }

function parseTLE(tleText) {
  const lines = tleText.trim().split('\n').map(l => l.trim()).filter(l => l);
  const satellites = [];
  let i = 0;
  while (i < lines.length) {
    let name = 'SAT', line1, line2;
    if (lines[i] && !lines[i].startsWith('1 ') && !lines[i].startsWith('2 ')) { name = lines[i]; i++; }
    if (i < lines.length && lines[i].startsWith('1 ')) { line1 = lines[i]; i++; }
    if (i < lines.length && lines[i].startsWith('2 ')) { line2 = lines[i]; i++; }
    if (line1 && line2) {
      try {
        const inc = parseFloat(line2.substring(8, 16).trim());
        const raan = parseFloat(line2.substring(17, 25).trim());
        const ecc = parseFloat('0.' + line2.substring(26, 33).trim());
        const argp = parseFloat(line2.substring(34, 42).trim());
        const ma = parseFloat(line2.substring(43, 51).trim());
        const n = parseFloat(line2.substring(52, 63).trim());
        const nRadSec = n * 2 * Math.PI / 86400;
        const a = Math.pow(MU / (nRadSec * nRadSec), 1/3);
        satellites.push({ name, hp: a*(1-ecc)-RE, ha: a*(1+ecc)-RE, inc, raan, argp, ecc, ma, a });
      } catch (e) { console.error('TLE parse error:', e); }
    }
  }
  return satellites;
}

function createProceduralTexture() {
  const texW = 2048, texH = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = texW; canvas.height = texH;
  const ctx = canvas.getContext('2d');
  const oceanGrd = ctx.createLinearGradient(0, 0, 0, texH);
  oceanGrd.addColorStop(0, '#0a3d62'); oceanGrd.addColorStop(0.3, '#2980b9'); oceanGrd.addColorStop(0.5, '#3498db'); oceanGrd.addColorStop(0.7, '#2980b9'); oceanGrd.addColorStop(1, '#0a3d62');
  ctx.fillStyle = oceanGrd; ctx.fillRect(0, 0, texW, texH);
  return ctx.getImageData(0, 0, texW, texH);
}

export default function OrbitDesigner() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState(800);
  const [rotation, setRotation] = useState({ x: 0.4, y: 0 });
  const [zoom, setZoom] = useState(1);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const textureRef = useRef(null);
  const [planes, setPlanes] = useState([{ hp: 550, ha: 550, inc: 53, raan: 0, argp: 0, ecc: 0, sats: 8, phaseOffset: 0, color: PLANE_COLORS[0], satNames: [], orbitWidth: 1, satSize: 4 }]);
  const [globalParams, setGlobalParams] = useState({ phaseF: 1, epoch: new Date().toISOString().slice(0,16) });
  const [activeTab, setActiveTab] = useState('view');
  const [selectedPlane, setSelectedPlane] = useState(0);
  const [customTexture, setCustomTexture] = useState(null);
  const [sunAngle, setSunAngle] = useState(45);
  const [sunElevation, setSunElevation] = useState(0);
  const [screenshotRes, setScreenshotRes] = useState(2048);
  const [showPanel, setShowPanel] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [showEquator, setShowEquator] = useState(true);
  const [showPrimeMeridian, setShowPrimeMeridian] = useState(false);
  const [showAxes, setShowAxes] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [animTime, setAnimTime] = useState(0);
  const [animSpeed, setAnimSpeed] = useState(1);
  const [earthRotation, setEarthRotation] = useState(0);
  const animFrameRef = useRef(null);
  const [tleInput, setTleInput] = useState('');
  const fileInputRef = useRef(null);
  const tleFileInputRef = useRef(null);

  // Load default texture from public folder
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      textureRef.current = ctx.getImageData(0, 0, img.width, img.height);
    };
    img.onerror = () => { textureRef.current = createProceduralTexture(); };
    img.src = import.meta.env.BASE_URL + 'earth_texture.jpg';
  }, []);

  // Responsive canvas size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = window.innerHeight - 120;
        setCanvasSize(Math.min(w, h, 900));
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = img.width; c.height = img.height;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          textureRef.current = ctx.getImageData(0, 0, img.width, img.height);
          setCustomTexture(ev.target.result);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onload = (ev) => importTLE(ev.target.result); reader.readAsText(file); }
  };

  const importTLE = (text) => {
    const parsed = parseTLE(text);
    if (parsed.length === 0) return;
    const grouped = {};
    parsed.forEach(sat => { const key = `${sat.inc.toFixed(1)}_${Math.round(sat.raan / 10) * 10}`; if (!grouped[key]) grouped[key] = []; grouped[key].push(sat); });
    const newPlanes = Object.values(grouped).map((sats, idx) => ({
      hp: Math.round(sats[0].hp), ha: Math.round(sats[0].ha), inc: sats[0].inc, raan: sats[0].raan, argp: sats[0].argp, ecc: sats[0].ecc,
      sats: sats.length, phaseOffset: 0, color: PLANE_COLORS[idx % PLANE_COLORS.length], satNames: sats.map(s => s.name), orbitWidth: 1, satSize: 4
    }));
    setPlanes(newPlanes); setSelectedPlane(0); setTleInput('');
  };

  const addPlane = () => {
    if (planes.length >= 10) return;
    const last = planes[planes.length-1];
    setPlanes([...planes, { ...last, raan: (last.raan + 360/(planes.length+1)) % 360, color: PLANE_COLORS[planes.length % PLANE_COLORS.length], satNames: [], orbitWidth: last.orbitWidth || 1, satSize: last.satSize || 4 }]);
  };
  const removePlane = idx => { if (planes.length <= 1) return; setPlanes(planes.filter((_,i) => i !== idx)); if (selectedPlane >= planes.length - 1) setSelectedPlane(Math.max(0, planes.length - 2)); };
  const updatePlane = (idx, key, val) => setPlanes(planes.map((p,i) => i === idx ? {...p, [key]: val} : p));
  const distributeRaan = () => setPlanes(planes.map((p, i) => ({ ...p, raan: (i * 360 / planes.length) % 360 })));

  const satellites = useMemo(() => {
    const sats = [];
    planes.forEach((plane, pIdx) => {
      const a = (plane.hp + plane.ha) / 2 + RE;
      const actualEcc = plane.ha !== plane.hp ? (plane.ha - plane.hp) / (plane.ha + plane.hp + 2*RE) : plane.ecc;
      const maSpacing = 360 / plane.sats;
      const period = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / MU);
      const angularVel = 360 / period;
      for (let s = 0; s < plane.sats; s++) {
        const baseMa = (s * maSpacing + plane.phaseOffset + pIdx * globalParams.phaseF * 360 / planes.reduce((sum,p)=>sum+p.sats,0)) % 360;
        const ma = (baseMa + animTime * angularVel) % 360;
        const nu = actualEcc < 0.01 ? ma : ma + 2*actualEcc*Math.sin(ma*Math.PI/180)*180/Math.PI;
        const eci = keplerToECI(a, actualEcc, plane.inc, plane.raan, plane.argp, nu);
        const name = plane.satNames?.[s] || `P${pIdx+1}-S${s+1}`;
        sats.push({ name, plane: pIdx, slot: s, a, e: actualEcc, i: plane.inc, raan: plane.raan, argp: plane.argp, ma: baseMa, nu, eci, period });
      }
    });
    return sats;
  }, [planes, globalParams, animTime]);

  const epochDate = new Date(globalParams.epoch);
  const totalSats = planes.reduce((s,p) => s + p.sats, 0);
  const tleData = useMemo(() => satellites.map((sat,idx) => generateTLE(sat, epochDate, 90000+idx)), [satellites, epochDate]);
  const stkData = useMemo(() => generateSTK(satellites, epochDate), [satellites, epochDate]);

  const render = (canvas, renderScale = 1, customEarthRot = earthRotation) => {
    if (!canvas || !textureRef.current) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const maxAlt = Math.max(...planes.map(p => p.ha), 550);
    const scale = zoom * Math.min(w, h) / (2.8 * (maxAlt + RE));
    ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, w, h);
    const cosX = Math.cos(-rotation.x), sinX = Math.sin(-rotation.x);
    const cosY = Math.cos(-rotation.y), sinY = Math.sin(-rotation.y);
    const earthRotRad = customEarthRot * Math.PI / 180;
    const project = (x, y, z) => {
      const x1 = x * cosY - z * sinY, z1 = x * sinY + z * cosY;
      const y1 = y * cosX - z1 * sinX, z2 = y * sinX + z1 * cosX;
      return { x: w/2 + x1 * scale, y: h/2 - y1 * scale, z: z2 };
    };
    const earthRadius = RE * scale;
    const tex = textureRef.current;
    const texW = tex.width, texH = tex.height, texData = tex.data;
    const sunAzRad = sunAngle * Math.PI / 180, sunElRad = sunElevation * Math.PI / 180;
    const cosEl = Math.cos(sunElRad);
    const sunDir = { x: Math.cos(sunAzRad)*cosEl, y: Math.sin(sunElRad), z: Math.sin(sunAzRad)*cosEl };
    const imageData = ctx.createImageData(w, h);
    const data = imageData.data;
    for (let py = -earthRadius; py < earthRadius; py += 1) {
      for (let px = -earthRadius; px < earthRadius; px += 1) {
        const dist2 = px*px + py*py;
        if (dist2 > earthRadius*earthRadius) continue;
        const pz = Math.sqrt(earthRadius*earthRadius - dist2);
        const x_cam = px/earthRadius, y_cam = -py/earthRadius, z_cam = pz/earthRadius;
        const y1 = y_cam * cosX + z_cam * sinX, z1 = -y_cam * sinX + z_cam * cosX;
        const x1 = x_cam * cosY + z1 * sinY, z2 = -x_cam * sinY + z1 * cosY;
        const lat = Math.asin(Math.max(-1, Math.min(1, y1)));
        const lon = Math.atan2(x1, z2) + earthRotRad;
        const u = (lon/Math.PI + 1)/2, v = 0.5 - lat/Math.PI;
        const texX = ((Math.floor(u*texW)%texW)+texW)%texW, texY = Math.floor(v*texH)%texH;
        const texIdx = (texY*texW + texX)*4;
        const dot = x1*sunDir.x + y1*sunDir.y + z2*sunDir.z;
        let lighting = dot > 0.1 ? 0.4 + 0.6*dot : dot > -0.1 ? 0.2 + (dot+0.1)*2 : 0.15;
        const canvasX = Math.floor(w/2 + px), canvasY = Math.floor(h/2 + py);
        if (canvasX >= 0 && canvasX < w && canvasY >= 0 && canvasY < h) {
          const idx = (canvasY * w + canvasX) * 4;
          data[idx] = Math.floor(texData[texIdx]*lighting);
          data[idx+1] = Math.floor(texData[texIdx+1]*lighting);
          data[idx+2] = Math.floor(texData[texIdx+2]*lighting);
          data[idx+3] = 255;
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
    // Sun
    const sunDist = RE * 2;
    const sunPos = project(sunDir.x*sunDist, sunDir.y*sunDist, sunDir.z*sunDist);
    ctx.beginPath(); ctx.arc(sunPos.x, sunPos.y, 8*renderScale, 0, 2*Math.PI);
    const sunGrd = ctx.createRadialGradient(sunPos.x, sunPos.y, 0, sunPos.x, sunPos.y, 12*renderScale);
    sunGrd.addColorStop(0, '#ffff88'); sunGrd.addColorStop(0.5, '#ffdd44'); sunGrd.addColorStop(1, 'transparent');
    ctx.fillStyle = sunGrd; ctx.fill();
    // Equator
    if (showEquator) {
      ctx.beginPath(); ctx.strokeStyle = '#ffff0066'; ctx.lineWidth = 1*renderScale;
      for (let lon = 0; lon <= 360; lon += 5) { const rad = lon*Math.PI/180; const p = project(RE*Math.cos(rad), 0, RE*Math.sin(rad)); if (lon === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }
      ctx.stroke();
    }
    if (showPrimeMeridian) {
      ctx.beginPath(); ctx.strokeStyle = '#ff444466'; ctx.lineWidth = 1*renderScale;
      for (let lat = -90; lat <= 90; lat += 5) { const latRad = lat*Math.PI/180; const p = project(0, RE*Math.sin(latRad), RE*Math.cos(latRad)); if (lat === -90) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }
      ctx.stroke();
    }
    if (showAxes) {
      const axisLen = RE * 1.8, center = project(0, 0, 0);
      [['#ff4444aa','X',axisLen,0,0],['#44ff44aa','Y',0,axisLen,0],['#4444ffaa','Z',0,0,axisLen]].forEach(([col,lbl,ax,ay,az]) => {
        const end = project(ax,ay,az);
        ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = 2*renderScale;
        ctx.moveTo(center.x, center.y); ctx.lineTo(end.x, end.y); ctx.stroke();
        ctx.fillStyle = col.slice(0,7); ctx.font = `${12*renderScale}px sans-serif`; ctx.fillText(lbl, end.x+5*renderScale, end.y);
      });
    }
    // Orbits
    const drawnOrbits = new Set();
    satellites.forEach(sat => {
      const orbitKey = `${sat.plane}-${sat.a.toFixed(0)}-${sat.i.toFixed(1)}-${sat.raan.toFixed(1)}`;
      if (drawnOrbits.has(orbitKey)) return;
      drawnOrbits.add(orbitKey);
      const plane = planes[sat.plane];
      const color = plane?.color || PLANE_COLORS[sat.plane % PLANE_COLORS.length];
      const oWidth = plane?.orbitWidth || 1;
      const orbitPoints = [];
      for (let nu = 0; nu <= 360; nu += 2) { const eci = keplerToECI(sat.a, sat.e, sat.i, sat.raan, sat.argp, nu); orbitPoints.push(project(eci.x, eci.y, eci.z)); }
      for (let i = 0; i < orbitPoints.length - 1; i++) {
        const p1 = orbitPoints[i], p2 = orbitPoints[i+1];
        const avgZ = (p1.z + p2.z) / 2;
        const behindEarth = avgZ < 0 && Math.sqrt((p1.x-w/2)**2 + (p1.y-h/2)**2) < earthRadius*1.1;
        let alpha = behindEarth ? 0.3+avgZ/(RE*scale)*0.1+0.1 : avgZ < 0 ? 0.5+avgZ/(sat.a*scale)*0.1+0.1 : 0.5+Math.min(avgZ/(sat.a*scale)*0.3, 0.4);
        const alphaHex = Math.floor(Math.max(0.05, Math.min(0.9, alpha))*255).toString(16).padStart(2,'0');
        ctx.beginPath(); ctx.strokeStyle = color + alphaHex; ctx.lineWidth = oWidth*renderScale;
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      }
    });
    // Satellites
    const satPoints = satellites.map(sat => {
      const p = project(sat.eci.x, sat.eci.y, sat.eci.z);
      const plane = planes[sat.plane];
      const distFromCenter = Math.sqrt((p.x-w/2)**2 + (p.y-h/2)**2);
      const behindEarth = p.z < 0 && distFromCenter < earthRadius*1.05;
      let alpha = behindEarth ? 0.3+p.z/(sat.a*scale)*0.1+0.1 : p.z < 0 ? 0.5+p.z/(sat.a*scale)*0.1+0.1 : 0.5+Math.min(p.z/(sat.a*scale)*0.3, 0.4);
      alpha = Math.max(0.3, Math.min(0.95, alpha));
      return { ...p, color: plane?.color || PLANE_COLORS[sat.plane % PLANE_COLORS.length], name: sat.name, size: plane?.satSize || 4, alpha, a: sat.a };
    }).sort((a,b) => a.z - b.z);
    satPoints.forEach(p => {
      const alphaHex = Math.floor(p.alpha*255).toString(16).padStart(2,'0');
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size*renderScale, 0, 2*Math.PI);
      ctx.fillStyle = p.color + alphaHex; ctx.fill();
      ctx.strokeStyle = '#ffffff' + alphaHex; ctx.lineWidth = 0.5*renderScale; ctx.stroke();
    });
    if (showLabels) {
      ctx.font = `${10*renderScale}px sans-serif`; ctx.textBaseline = 'middle';
      satPoints.forEach(p => { if (p.z > 0) { ctx.fillStyle = p.color + Math.floor(p.alpha*255).toString(16).padStart(2,'0'); ctx.fillText(p.name, p.x+(p.size+2)*renderScale, p.y); } });
    }
  };

  useEffect(() => { render(canvasRef.current, 1); }, [satellites, rotation, planes, sunAngle, sunElevation, zoom, showLabels, showEquator, showPrimeMeridian, showAxes, earthRotation, canvasSize]);

  useEffect(() => {
    if (!animating) { if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; } return; }
    let lastTime = performance.now();
    const animate = (currentTime) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      const simSecondsElapsed = delta * animSpeed * 60;
      setAnimTime(t => t + simSecondsElapsed);
      setEarthRotation(r => (r + simSecondsElapsed * (360 / 86400)) % 360);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [animating, animSpeed]);

  const takeScreenshot = () => {
    if (!textureRef.current) return;
    const c = document.createElement('canvas'); c.width = screenshotRes; c.height = screenshotRes;
    render(c, screenshotRes / 800);
    c.toBlob((blob) => { if (blob) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `earth_${screenshotRes}px.png`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); } }, 'image/png');
  };

  const handleMouseDown = (e) => { e.preventDefault(); isDragging.current = true; lastPos.current = { x: e.clientX, y: e.clientY }; };
  const handleMouseMove = (e) => { if (!isDragging.current) return; e.preventDefault(); const dx = e.clientX - lastPos.current.x; const dy = e.clientY - lastPos.current.y; setRotation(r => ({ x: Math.max(-Math.PI/2, Math.min(Math.PI/2, r.x - dy*0.005)), y: r.y + dx*0.005 })); lastPos.current = { x: e.clientX, y: e.clientY }; };
  const handleMouseUp = () => { isDragging.current = false; };
  const handleWheel = (e) => { e.preventDefault(); setZoom(z => Math.max(0.3, Math.min(5, z * (e.deltaY > 0 ? 0.9 : 1.1)))); };
  const handleTouchStart = (e) => { if (e.touches.length === 1) { isDragging.current = true; lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; } };
  const handleTouchMove = (e) => { if (!isDragging.current || e.touches.length !== 1) return; e.preventDefault(); const dx = e.touches[0].clientX - lastPos.current.x; const dy = e.touches[0].clientY - lastPos.current.y; setRotation(r => ({ x: Math.max(-Math.PI/2, Math.min(Math.PI/2, r.x - dy*0.005)), y: r.y + dx*0.005 })); lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const handleTouchEnd = () => { isDragging.current = false; };

  const downloadFile = (content, name, type='text/plain') => {
    const blob = new Blob([content], {type}); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const inp = "w-full px-1 py-0.5 bg-gray-800 border border-gray-600 rounded text-white text-xs";
  const lbl = "text-xs text-gray-400";
  const bt = "px-1.5 py-0.5 rounded text-xs";

  return (
    <div className="page-content" style={{ maxWidth: 1200, padding: 0 }}>
      <div style={{ display: 'flex', gap: 0, minHeight: 'calc(100vh - 64px)' }}>
        {/* Canvas area */}
        <div ref={containerRef} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a1a', position: 'relative', minHeight: 500 }}>
          <canvas ref={canvasRef} width={canvasSize} height={canvasSize}
            style={{ cursor: 'grab', maxWidth: '100%', maxHeight: '100%' }}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}
            onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} />
          <button onClick={() => setShowPanel(!showPanel)} style={{ position:'absolute', top:8, left:8, background:'rgba(0,0,0,0.5)', color:'white', border:'none', padding:'4px 8px', borderRadius:4, cursor:'pointer', fontSize:12 }}>
            {showPanel ? '◀' : '▶ Настройки'}
          </button>
          <div style={{ position:'absolute', bottom:8, right:8, color:'rgba(255,255,255,0.4)', fontSize:11 }}>Мышь: вращение | Колесо: масштаб</div>
        </div>

        {/* Side panel */}
        {showPanel && (
          <div style={{ width: 260, background: '#111827', color: 'white', padding: 8, overflowY: 'auto', maxHeight: 'calc(100vh - 64px)', fontSize: 12 }}>
            <div className="flex gap-1 mb-2">
              {['view','kepler','export','import'].map(t => (
                <button key={t} onClick={() => setActiveTab(t)} className={`${bt} flex-1 ${activeTab === t ? 'bg-blue-600' : 'bg-gray-700'}`}>
                  {t === 'view' ? '3D' : t === 'kepler' ? 'Табл.' : t === 'export' ? '📤' : '📥'}
                </button>
              ))}
            </div>

            {activeTab === 'view' && (<>
              <div className="mb-2">
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileUpload} className="hidden"/>
                <div className="flex gap-1">
                  <button onClick={() => fileInputRef.current?.click()} className={`${bt} bg-blue-600 flex-1`}>{customTexture ? '✓ Текстура' : '📁 Текстура'}</button>
                  {customTexture && <button onClick={() => { setCustomTexture(null); const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img,0,0); textureRef.current = c.getContext('2d').getImageData(0,0,img.width,img.height); }; img.src = import.meta.env.BASE_URL + 'earth_texture.jpg'; }} className={`${bt} bg-gray-600`}>✕</button>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1 mb-2">
                <div><label className={lbl}>☀️ {sunAngle}°</label><input type="range" min="0" max="360" value={sunAngle} onChange={e => setSunAngle(+e.target.value)} className="w-full"/></div>
                <div><label className={lbl}>↕ {sunElevation}°</label><input type="range" min="-90" max="90" value={sunElevation} onChange={e => setSunElevation(+e.target.value)} className="w-full"/></div>
              </div>
              <div className="flex gap-1 mb-2">
                <select value={screenshotRes} onChange={e => setScreenshotRes(+e.target.value)} className={`${inp} flex-1`}>
                  <option value={1024}>1K</option><option value={2048}>2K</option><option value={4096}>4K</option><option value={8192}>8K</option>
                </select>
                <button onClick={takeScreenshot} className={`${bt} bg-green-600`}>📷</button>
              </div>
              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input type="checkbox" checked={showLabels} onChange={e => setShowLabels(e.target.checked)} className="w-4 h-4"/>
                <span className={lbl}>Подписи КА</span>
              </label>
              <div className="grid grid-cols-3 gap-1 mb-2">
                <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={showEquator} onChange={e => setShowEquator(e.target.checked)} className="w-3 h-3"/><span className={lbl} style={{color:'#ffff00'}}>Экватор</span></label>
                <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={showPrimeMeridian} onChange={e => setShowPrimeMeridian(e.target.checked)} className="w-3 h-3"/><span className={lbl} style={{color:'#ff4444'}}>Меридиан</span></label>
                <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={showAxes} onChange={e => setShowAxes(e.target.checked)} className="w-3 h-3"/><span className={lbl}>Оси XYZ</span></label>
              </div>

              <div className="border-t border-gray-600 pt-2 mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-xs">Анимация</span>
                  <button onClick={() => setAnimating(!animating)} className={`${bt} ${animating ? 'bg-red-600' : 'bg-green-600'}`}>{animating ? '⏹' : '▶'}</button>
                  <button onClick={() => { setAnimTime(0); setEarthRotation(0); }} className={`${bt} bg-gray-600`}>↺</button>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={lbl}>Скорость:</span>
                  <input type="range" min="1" max="100" step="1" value={animSpeed} onChange={e => setAnimSpeed(+e.target.value)} className="flex-1"/>
                  <span className={lbl}>{animSpeed}x</span>
                </div>
                <div className={`${lbl} mt-1`}>T: {Math.floor(animTime/60)}мин | Земля: {earthRotation.toFixed(1)}°</div>
                {planes[selectedPlane] && (() => {
                  const a = (planes[selectedPlane].hp + planes[selectedPlane].ha) / 2 + RE;
                  return (<div className={`${lbl} mt-1 bg-black/30 p-1 rounded`}><div>v = {calcOrbitalVelocity(a).toFixed(2)} км/с</div><div>T = {(calcOrbitalPeriod(a)/60).toFixed(1)} мин</div></div>);
                })()}
              </div>

              <div className="border-t border-gray-600 pt-2 mb-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold">Плоскости ({planes.length})</span>
                  <div className="flex gap-0.5">
                    <button onClick={distributeRaan} className={`${bt} bg-gray-600`} title="Распределить RAAN">⟳</button>
                    <button onClick={addPlane} className={`${bt} bg-blue-600`}>+</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-0.5 mb-1">
                  {planes.map((p, i) => (<button key={i} onClick={() => setSelectedPlane(i)} className={`${bt} ${selectedPlane === i ? 'ring-1 ring-white' : ''}`} style={{ backgroundColor: p.color, minWidth: '24px' }}>{i+1}</button>))}
                </div>
                {planes[selectedPlane] && (
                  <div className="bg-black/30 p-1 rounded">
                    <div className="flex justify-between items-center mb-1">
                      <span>P{selectedPlane + 1}</span>
                      <div className="flex gap-1 items-center">
                        <input type="color" value={planes[selectedPlane].color} onChange={e => updatePlane(selectedPlane, 'color', e.target.value)} className="w-4 h-4 rounded cursor-pointer"/>
                        <button onClick={() => removePlane(selectedPlane)} className={`${bt} bg-red-600`}>✕</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 mb-1">
                      <div><label className={lbl}>Линия {planes[selectedPlane].orbitWidth||1}</label><input type="range" min="0.5" max="5" step="0.5" value={planes[selectedPlane].orbitWidth||1} onChange={e => updatePlane(selectedPlane,'orbitWidth',+e.target.value)} className="w-full"/></div>
                      <div><label className={lbl}>Точка {planes[selectedPlane].satSize||4}</label><input type="range" min="2" max="12" step="1" value={planes[selectedPlane].satSize||4} onChange={e => updatePlane(selectedPlane,'satSize',+e.target.value)} className="w-full"/></div>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      <div><label className={lbl}>Hp</label><input type="number" value={planes[selectedPlane].hp} onChange={e => updatePlane(selectedPlane,'hp',+e.target.value)} className={inp}/></div>
                      <div><label className={lbl}>Ha</label><input type="number" value={planes[selectedPlane].ha} onChange={e => updatePlane(selectedPlane,'ha',+e.target.value)} className={inp}/></div>
                      <div><label className={lbl}>i°</label><input type="number" value={planes[selectedPlane].inc} onChange={e => updatePlane(selectedPlane,'inc',+e.target.value)} className={inp}/></div>
                      <div><label className={lbl}>Ω°</label><input type="number" value={planes[selectedPlane].raan} onChange={e => updatePlane(selectedPlane,'raan',+e.target.value)} className={inp}/></div>
                      <div><label className={lbl}>ω°</label><input type="number" value={planes[selectedPlane].argp} onChange={e => updatePlane(selectedPlane,'argp',+e.target.value)} className={inp}/></div>
                      <div><label className={lbl}>e</label><input type="number" step="0.001" value={planes[selectedPlane].ecc} onChange={e => updatePlane(selectedPlane,'ecc',+e.target.value)} className={inp}/></div>
                      <div><label className={lbl}>N</label><input type="number" min="1" value={planes[selectedPlane].sats} onChange={e => updatePlane(selectedPlane,'sats',+e.target.value)} className={inp}/></div>
                      <div><label className={lbl}>φ°</label><input type="number" value={planes[selectedPlane].phaseOffset} onChange={e => updatePlane(selectedPlane,'phaseOffset',+e.target.value)} className={inp}/></div>
                    </div>
                    <div className="mt-1">
                      <label className={lbl}>Названия КА (через запятую)</label>
                      <input type="text" value={(planes[selectedPlane].satNames||[]).join(', ')} onChange={e => updatePlane(selectedPlane, 'satNames', e.target.value.split(',').map(s => s.trim()).filter(s => s))} placeholder="SAT-1, SAT-2..." className={inp}/>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div><label className={lbl}>F</label><input type="number" value={globalParams.phaseF} onChange={e => setGlobalParams({...globalParams, phaseF: +e.target.value})} className={inp}/></div>
                <div className="text-gray-400 flex items-end pb-1">КА: {totalSats}</div>
              </div>
            </>)}

            {activeTab === 'kepler' && (
              <div className="max-h-60 overflow-auto">
                <table className="w-full text-xs"><thead className="bg-gray-700 sticky top-0"><tr><th>КА</th><th>a</th><th>i</th><th>v км/с</th><th>T мин</th></tr></thead>
                <tbody>{satellites.map(sat => (<tr key={sat.name} className="border-b border-gray-700"><td style={{color:planes[sat.plane]?.color}}>{sat.name}</td><td>{sat.a.toFixed(0)}</td><td>{sat.i.toFixed(1)}</td><td>{calcOrbitalVelocity(sat.a).toFixed(2)}</td><td>{(calcOrbitalPeriod(sat.a)/60).toFixed(1)}</td></tr>))}</tbody></table>
              </div>
            )}

            {activeTab === 'export' && (
              <div>
                <div className="max-h-64 overflow-auto bg-black/30 p-1 rounded font-mono text-xs mb-2">
                  {tleData.map((tle, idx) => (<div key={idx} className="mb-1"><div style={{color:planes[satellites[idx]?.plane]?.color}}>{satellites[idx]?.name}</div><div className="text-gray-400 break-all">{tle.line1}</div><div className="text-gray-400 break-all">{tle.line2}</div></div>))}
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => downloadFile(tleData.map((t,i) => `${satellites[i].name}\n${t.line1}\n${t.line2}`).join('\n\n'), 'constellation.tle')} className={`${bt} bg-blue-600 w-full`}>📄 Скачать TLE</button>
                  <button onClick={() => downloadFile(stkData, 'constellation.e')} className={`${bt} bg-blue-600 w-full`}>📄 Скачать STK (.e)</button>
                  <button onClick={() => {
                    const csv = 'Name,a_km,e,i_deg,RAAN_deg,ArgP_deg,MA_deg,V_kms,T_min,X_km,Y_km,Z_km\n' + satellites.map(s => `${s.name},${s.a.toFixed(2)},${s.e.toFixed(6)},${s.i.toFixed(2)},${s.raan.toFixed(2)},${s.argp.toFixed(2)},${s.ma.toFixed(2)},${calcOrbitalVelocity(s.a).toFixed(3)},${(calcOrbitalPeriod(s.a)/60).toFixed(2)},${s.eci.x.toFixed(2)},${s.eci.y.toFixed(2)},${s.eci.z.toFixed(2)}`).join('\n');
                    downloadFile(csv, 'constellation.csv', 'text/csv');
                  }} className={`${bt} bg-blue-600 w-full`}>📄 Скачать CSV</button>
                </div>
              </div>
            )}

            {activeTab === 'import' && (
              <div>
                <div className="text-gray-400 mb-2 text-xs">Импорт TLE</div>
                <input type="file" ref={tleFileInputRef} accept=".tle,.txt" onChange={handleTleFileUpload} className="hidden"/>
                <button onClick={() => tleFileInputRef.current?.click()} className={`${bt} bg-blue-600 w-full mb-2`}>📁 Загрузить TLE файл</button>
                <div className="text-gray-400 mb-1 text-xs">или вставьте TLE:</div>
                <textarea value={tleInput} onChange={e => setTleInput(e.target.value)} placeholder="ISS (ZARYA)&#10;1 25544U 98067A...&#10;2 25544..." className="w-full h-32 bg-black/50 border border-gray-600 rounded p-1 text-xs font-mono text-white resize-none"/>
                <button onClick={() => importTLE(tleInput)} className={`${bt} bg-green-600 w-full mt-1`}>Импортировать</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
