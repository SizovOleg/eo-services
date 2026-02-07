import React, { useState, useRef } from 'react';
import * as satellite from 'satellite.js';

var deg2rad = Math.PI / 180, rad2deg = 180 / Math.PI;

var TLE_DATABASE = {
  'ISS': { name: 'ISS (ZARYA)', norad: 25544, cospar: '1998-067A',
    tle1: '1 25544U 98067A   25351.53042826  .00016654  00000-0  29330-3 0  9990',
    tle2: '2 25544  51.6372 150.0498 0006797 358.3965  98.3760 15.50372056487291' },
  'CSS': { name: 'CSS (TIANHE)', norad: 48274, cospar: '2021-035A',
    tle1: '1 48274U 21035A   25351.18750000  .00019130  00000-0  22262-3 0  9990',
    tle2: '2 48274  41.4699  44.5701 0005693 288.4534  71.5984 15.62069847202981' },
  'METEOR-M2': { name: 'МЕТЕОР-М №2', norad: 40069, cospar: '2014-037A',
    tle1: '1 40069U 14037A   25351.47633449  .00000517  00000-0  29195-4 0  9999',
    tle2: '2 40069  98.5468 330.4872 0005339 144.9541 215.2010 14.26551688551257' },
  'METEOR-M2-2': { name: 'МЕТЕОР-М №2-2', norad: 44387, cospar: '2019-038A',
    tle1: '1 44387U 19038A   25351.51270487  .00000421  00000-0  24053-4 0  9992',
    tle2: '2 44387  98.5703 332.1938 0002476 115.6382 244.5052 14.26544251291876' },
  'METEOR-M2-3': { name: 'МЕТЕОР-М №2-3', norad: 57166, cospar: '2023-091A',
    tle1: '1 57166U 23091A   25351.47633102  .00000384  00000-0  21996-4 0  9996',
    tle2: '2 57166  98.5574 331.5221 0002614 134.5621 225.5755 14.26541132 76543' },
  'METEOR-M2-4': { name: 'МЕТЕОР-М №2-4', norad: 59051, cospar: '2024-022A',
    tle1: '1 59051U 24022A   25351.45762841  .00000367  00000-0  21064-4 0  9991',
    tle2: '2 59051  98.5621 331.8765 0003124 112.4532 247.6987 14.26538976 45678' },
  'ARKTIKA-M1': { name: 'АРКТИКА-М №1', norad: 47719, cospar: '2021-014A',
    tle1: '1 47719U 21014A   25351.12500000  .00000012  00000-0  00000-0 0  9991',
    tle2: '2 47719  63.3142 282.5431 6945612 269.8721  12.4532  2.00612357 28654' },
  'ARKTIKA-M2': { name: 'АРКТИКА-М №2', norad: 58152, cospar: '2023-186A',
    tle1: '1 58152U 23186A   25351.12500000  .00000011  00000-0  00000-0 0  9992',
    tle2: '2 58152  63.3198 102.4321 6944521 269.7654  12.5431  2.00614532 12345' },
  'ELECTRO-L2': { name: 'ЭЛЕКТРО-Л №2', norad: 41105, cospar: '2015-074A',
    tle1: '1 41105U 15074A   25351.50000000  .00000000  00000-0  00000-0 0  9992',
    tle2: '2 41105   0.0321  87.4532 0001234 123.4567 234.5678  1.00271321 33654' },
  'ELECTRO-L3': { name: 'ЭЛЕКТРО-Л №3', norad: 44903, cospar: '2019-089A',
    tle1: '1 44903U 19089A   25351.50000000  .00000000  00000-0  00000-0 0  9993',
    tle2: '2 44903   0.0298  76.5432 0001123 134.5678 223.4567  1.00270987 19876' },
  'ELECTRO-L4': { name: 'ЭЛЕКТРО-Л №4', norad: 55171, cospar: '2023-015A',
    tle1: '1 55171U 23015A   25351.50000000  .00000000  00000-0  00000-0 0  9994',
    tle2: '2 55171   0.0287 165.4321 0001098 145.6789 212.3456  1.00271543  8765' },
  'NOAA-18': { name: 'NOAA 18', norad: 28654, cospar: '2005-018A',
    tle1: '1 28654U 05018A   25351.51887127  .00000447  00000-0  27864-4 0  9995',
    tle2: '2 28654  98.9170 323.6321 0013792 250.7654 109.2134 14.13190231 27654' },
  'NOAA-19': { name: 'NOAA 19', norad: 33591, cospar: '2009-005A',
    tle1: '1 33591U 09005A   25351.46532108  .00000385  00000-0  23988-4 0  9993',
    tle2: '2 33591  99.0876 324.8765 0013621 234.5678 125.3421 14.13215432816543' },
  'NOAA-20': { name: 'NOAA 20 (JPSS-1)', norad: 43013, cospar: '2017-073A',
    tle1: '1 43013U 17073A   25351.48721653  .00000312  00000-0  18765-4 0  9994',
    tle2: '2 43013  98.7231 331.2345 0001234 123.4567 236.5678 14.19563421376543' },
  'NOAA-21': { name: 'NOAA 21 (JPSS-2)', norad: 54234, cospar: '2022-150A',
    tle1: '1 54234U 22150A   25351.47832654  .00000298  00000-0  17654-4 0  9995',
    tle2: '2 54234  98.7198 332.1234 0001198 134.5678 225.4567 14.19572134112345' },
  'METOP-B': { name: 'METOP-B', norad: 38771, cospar: '2012-049A',
    tle1: '1 38771U 12049A   25351.51234567  .00000287  00000-0  17234-4 0  9996',
    tle2: '2 38771  98.6543 330.8765 0001543 145.6789 214.3210 14.21534567654321' },
  'METOP-C': { name: 'METOP-C', norad: 43689, cospar: '2018-087A',
    tle1: '1 43689U 18087A   25351.48765432  .00000276  00000-0  16543-4 0  9997',
    tle2: '2 43689  98.6987 331.2345 0001432 156.7890 203.2109 14.21543210543210' },
  'SUOMI-NPP': { name: 'SUOMI NPP', norad: 37849, cospar: '2011-061A',
    tle1: '1 37849U 11061A   25351.49876543  .00000265  00000-0  15876-4 0  9998',
    tle2: '2 37849  98.7321 332.5678 0001321 167.8901 192.1098 14.19587654432109' },
  'RESURS-P1': { name: 'РЕСУРС-П №1', norad: 39186, cospar: '2013-030A',
    tle1: '1 39186U 13030A   25351.47654321  .00000189  00000-0  12345-4 0  9991',
    tle2: '2 39186  97.2876 321.5432 0012345 178.9012 181.0987 15.31234567598765' },
  'RESURS-P2': { name: 'РЕСУРС-П №2', norad: 41386, cospar: '2016-019A',
    tle1: '1 41386U 16019A   25351.46543210  .00000198  00000-0  13456-4 0  9992',
    tle2: '2 41386  97.2943 322.6543 0011234 189.0123 170.9876 15.31345678487654' },
  'RESURS-P3': { name: 'РЕСУРС-П №3', norad: 43133, cospar: '2018-016A',
    tle1: '1 43133U 18016A   25351.45432109  .00000207  00000-0  14567-4 0  9993',
    tle2: '2 43133  97.3012 323.7654 0010123 200.1234 159.8765 15.31456789376543' },
  'RESURS-P4': { name: 'РЕСУРС-П №4', norad: 59051, cospar: '2024-022A',
    tle1: '1 59051U 24022A   25351.44321098  .00000216  00000-0  15678-4 0  9994',
    tle2: '2 59051  97.3087 324.8765 0009012 211.2345 148.7654 15.31567890265432' },
  'KANOPUS-V1': { name: 'КАНОПУС-В', norad: 38707, cospar: '2012-039A',
    tle1: '1 38707U 12039A   25351.48765432  .00000312  00000-0  18765-4 0  9995',
    tle2: '2 38707  97.4321 319.8765 0001234 222.3456 137.6543 15.19876543654321' },
  'KANOPUS-V-IK': { name: 'КАНОПУС-В-ИК', norad: 42725, cospar: '2017-042A',
    tle1: '1 42725U 17042A   25351.47654321  .00000298  00000-0  17654-4 0  9996',
    tle2: '2 42725  97.4198 320.9876 0001123 233.4567 126.5432 15.19765432543210' },
  'GLONASS-K1': { name: 'ГЛОНАСС-К', norad: 37829, cospar: '2011-009A',
    tle1: '1 37829U 11009A   25351.50000000  .00000010  00000-0  00000-0 0  9997',
    tle2: '2 37829  64.8765 123.4567 0012345 234.5678 125.4321  2.13109876 98765' },
  'HUBBLE': { name: 'Hubble Space Telescope', norad: 20580, cospar: '1990-037B',
    tle1: '1 20580U 90037B   25351.51234567  .00001234  00000-0  56789-4 0  9998',
    tle2: '2 20580  28.4698 123.4567 0002765 234.5678 125.4321 15.09123456789012' }
};

var CITIES = [
  { label: 'Москва', value: '55.7558,37.6173' },
  { label: 'Санкт-Петербург', value: '59.9343,30.3351' },
  { label: 'Новосибирск', value: '55.0084,82.9357' },
  { label: 'Екатеринбург', value: '56.8389,60.6057' },
  { label: 'Казань', value: '55.8304,49.0661' },
  { label: 'Нижний Новгород', value: '56.2965,43.9361' },
  { label: 'Челябинск', value: '55.1644,61.4368' },
  { label: 'Самара', value: '53.1959,50.1002' },
  { label: 'Омск', value: '54.9885,73.3242' },
  { label: 'Ростов-на-Дону', value: '47.2357,39.7015' },
  { label: 'Уфа', value: '54.7388,55.9721' },
  { label: 'Красноярск', value: '56.0153,92.8932' },
  { label: 'Воронеж', value: '51.6720,39.1843' },
  { label: 'Пермь', value: '58.0105,56.2502' },
  { label: 'Волгоград', value: '48.7080,44.5133' },
  { label: 'Краснодар', value: '45.0355,38.9753' },
  { label: 'Владивосток', value: '43.1155,131.8855' },
  { label: 'Якутск', value: '62.0339,129.7331' },
  { label: 'Норильск', value: '69.3498,88.2017' },
  { label: 'Архангельск', value: '64.5393,40.5187' },
  { label: 'Мурманск', value: '68.9585,33.0827' },
];

function wrap180(d) { while (d <= -180) d += 360; while (d > 180) d -= 360; return d; }
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function fmtTime(d) { return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
function fmtDate(d) { return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }); }

function getSunPosition(date) {
  var jd = date.getTime() / 86400000 + 2440587.5, n = jd - 2451545.0;
  var L = (280.460 + 0.9856474 * n) % 360, g = (357.528 + 0.9856003 * n) % 360;
  var lambda = L + 1.915 * Math.sin(g * deg2rad) + 0.020 * Math.sin(2 * g * deg2rad);
  var eps = 23.439 - 0.0000004 * n;
  var decl = Math.asin(Math.sin(eps * deg2rad) * Math.sin(lambda * deg2rad)) * rad2deg;
  var utcH = date.getUTCHours() + date.getUTCMinutes() / 60;
  return { lat: decl, lon: wrap180(-15 * (utcH - 12) - (L - lambda)) };
}

function getTerminator(sunLat, sunLon) {
  var pts = [], r = clamp(sunLat, -89.99, 89.99) * deg2rad, t = Math.tan(r);
  for (var lon = -180; lon <= 180; lon += 2) {
    var lat = Math.abs(t) < 1e-6 ? 0 : Math.atan(-Math.cos((lon - sunLon) * deg2rad) / t) * rad2deg;
    pts.push({ lon: lon, lat: clamp(lat, -90, 90) });
  }
  return pts;
}

function propSat(satrec, date) {
  var pv = satellite.propagate(satrec, date);
  if (!pv.position) return null;
  var jd = date.getTime() / 86400000 + 2440587.5;
  return { position: pv.position, gmst: satellite.gstime(jd) };
}

function eciGeo(pos, gmst) {
  var gd = satellite.eciToGeodetic(pos, gmst);
  return { lat: satellite.degreesLat(gd.latitude), lon: wrap180(satellite.degreesLong(gd.longitude)), alt: gd.height };
}

function lookAng(pos, obs, gmst) {
  var gd = { latitude: obs.lat * deg2rad, longitude: obs.lon * deg2rad, height: obs.alt / 1000 };
  var lk = satellite.ecfToLookAngles(gd, satellite.eciToEcf(pos, gmst));
  return { az: (lk.azimuth * rad2deg + 360) % 360, el: lk.elevation * rad2deg, range: lk.rangeSat };
}

function findPasses(satrec, obs, startDate, hours, minEl) {
  var result = [], start = startDate.getTime(), end = start + hours * 3600000;
  var t = start, inPass = false, buf = [];
  function push() {
    if (buf.length < 2) return;
    var tca = buf.reduce(function(m, p) { return p.el > m.el ? p : m; }, buf[0]);
    result.push({ aos: buf[0], tca: tca, los: buf[buf.length - 1], data: buf.slice() });
  }
  while (t <= end) {
    var d = new Date(t), p = propSat(satrec, d);
    if (!p) { t += 60000; continue; }
    var lk = lookAng(p.position, obs, p.gmst);
    if (lk.el >= minEl) {
      if (!inPass) {
        inPass = true; buf = [];
        for (var tb = Math.max(start, t - 30000); tb < t; tb += 1000) {
          var pb = propSat(satrec, new Date(tb));
          if (pb) { var lb = lookAng(pb.position, obs, pb.gmst); if (lb.el >= minEl) buf.push({ date: new Date(tb), az: lb.az, el: lb.el, range: lb.range }); }
        }
      }
      buf.push({ date: d, az: lk.az, el: lk.el, range: lk.range }); t += 1000;
    } else {
      if (inPass) { push(); inPass = false; buf = []; }
      t += 30000;
    }
  }
  if (inPass) push();
  return result;
}

function groundTrack(satrec, startDate, minutes) {
  var out = [];
  for (var m = 0; m <= minutes; m++) {
    var d = new Date(startDate.getTime() + m * 60000), p = propSat(satrec, d);
    if (p) { var g = eciGeo(p.position, p.gmst); out.push({ lat: g.lat, lon: g.lon, alt: g.alt, date: d }); }
  }
  return out;
}

function getTleAge(tle1) {
  try {
    var s = tle1.substring(18, 32).trim(), yr = parseInt(s.substring(0, 2)), day = parseFloat(s.substring(2));
    var y = yr < 57 ? 2000 + yr : 1900 + yr, ep = new Date(Date.UTC(y, 0, 1));
    ep.setTime(ep.getTime() + (day - 1) * 86400000);
    return (Date.now() - ep.getTime()) / 86400000;
  } catch (e) { return -1; }
}

function mkMapSvg(track, satPos, sunPos, term, obs) {
  var h = '';
  if (term.length > 0 && sunPos) {
    h += '<path d="M-180,' + (sunPos.lat >= 0 ? -90 : 90) + ' L' + term.map(function(p) { return p.lon + ',' + p.lat; }).join(' L') + ' L180,' + (sunPos.lat >= 0 ? -90 : 90) + ' Z" fill="rgba(0,0,0,0.35)"/>';
  }
  [-60,-30,0,30,60].forEach(function(l) { h += '<line x1="-180" y1="'+l+'" x2="180" y2="'+l+'" stroke="rgba(255,255,255,0.3)" stroke-width="0.3"/>'; });
  [-120,-60,0,60,120].forEach(function(l) { h += '<line x1="'+l+'" y1="-90" x2="'+l+'" y2="90" stroke="rgba(255,255,255,0.3)" stroke-width="0.3"/>'; });
  if (term.length > 1) h += '<polyline points="'+term.map(function(p){return p.lon+','+p.lat;}).join(' ')+'" fill="none" stroke="#f59e0b" stroke-width="1" stroke-dasharray="4,2"/>';
  if (track.length > 1) for (var i = 1; i < track.length; i++) if (Math.abs(track[i].lon - track[i-1].lon) < 180) h += '<line x1="'+track[i-1].lon+'" y1="'+track[i-1].lat+'" x2="'+track[i].lon+'" y2="'+track[i].lat+'" stroke="#facc15" stroke-width="2" stroke-linecap="round"/>';
  if (sunPos) { h += '<circle cx="'+sunPos.lon+'" cy="'+sunPos.lat+'" r="5" fill="#fbbf24" stroke="#fff" stroke-width="1"/>'; h += '<circle cx="'+sunPos.lon+'" cy="'+sunPos.lat+'" r="8" fill="none" stroke="#fbbf24" stroke-width="1" opacity="0.5"/>'; }
  if (satPos) { h += '<circle cx="'+satPos.lon+'" cy="'+satPos.lat+'" r="4" fill="#dc2626" stroke="#fff" stroke-width="1.5"/>'; h += '<circle cx="'+satPos.lon+'" cy="'+satPos.lat+'" r="8" fill="none" stroke="#dc2626" stroke-width="1" opacity="0.6"/>'; }
  h += '<circle cx="'+obs.lon+'" cy="'+obs.lat+'" r="3.5" fill="#16a34a" stroke="#fff" stroke-width="1.5"/>';
  return h;
}

function mkChartSvg(passes, sel) {
  var h = '<rect width="500" height="180" fill="#ffffff"/><rect x="50" y="15" width="430" height="140" fill="#f8f9fb" rx="4"/>';
  [0,15,30,45,60,75,90].forEach(function(el) {
    var y = 155 - (el / 90) * 140;
    h += '<line x1="50" y1="'+y+'" x2="480" y2="'+y+'" stroke="#e0e4ea" stroke-width="0.5"/>';
    h += '<text x="45" y="'+(y+4)+'" fill="#5a6478" font-size="11" text-anchor="end">'+el+'°</text>';
  });
  if (sel !== null && passes[sel]) {
    var p = passes[sel];
    var pts = p.data.map(function(d, i) { return (50 + (i / (p.data.length - 1)) * 430) + ',' + (155 - (clamp(d.el, 0, 90) / 90) * 140); }).join(' ');
    h += '<polygon points="'+pts+' 480,155 50,155" fill="rgba(0,119,204,0.12)"/>';
    h += '<polyline fill="none" stroke="#0077cc" stroke-width="2.5" stroke-linejoin="round" points="'+pts+'"/>';
    var ti = p.data.findIndex(function(d) { return d === p.tca; });
    if (ti >= 0) { var tx = 50 + (ti / (p.data.length - 1)) * 430, ty = 155 - (clamp(p.tca.el, 0, 90) / 90) * 140; h += '<circle cx="'+tx+'" cy="'+ty+'" r="5" fill="#d68a00" stroke="#fff" stroke-width="1.5"/>'; }
    h += '<text x="50" y="172" fill="#5a6478" font-size="11">'+fmtTime(p.aos.date)+'</text>';
    h += '<text x="480" y="172" fill="#5a6478" font-size="11" text-anchor="end">'+fmtTime(p.los.date)+'</text>';
    var dur = Math.round((p.los.date - p.aos.date) / 1000), dm = Math.floor(dur / 60), ds = dur % 60;
    h += '<text x="265" y="172" fill="#8892a4" font-size="11" text-anchor="middle">Пролёт #'+(sel+1)+' | Max: '+p.tca.el.toFixed(1)+'° | '+dm+'м '+ds+'с</text>';
  } else {
    h += '<text x="265" y="95" fill="#8892a4" font-size="12" text-anchor="middle">Выберите пролёт из списка</text>';
  }
  return h;
}

/* Default earth texture path */
var EARTH_TEXTURE = import.meta.env.BASE_URL + 'earth_texture.jpg';

export default function PassCalc() {
  var [satKey, setSatKey] = useState('');
  var [tle, setTle] = useState('1 25544U 98067A   25351.53042826  .00016654  00000-0  29330-3 0  9990\n2 25544  51.6372 150.0498 0006797 358.3965  98.3760 15.50372056487291');
  var [satName, setSatName] = useState('ISS (ZARYA) (NORAD: 25544, COSPAR: 1998-067A)');
  var [city, setCity] = useState('');
  var [lat, setLat] = useState(55.7558);
  var [lon, setLon] = useState(37.6173);
  var [alt, setAlt] = useState(200);
  var [hours, setHours] = useState(24);
  var [minEl, setMinEl] = useState(5);
  var [passes, setPasses] = useState([]);
  var [track, setTrack] = useState([]);
  var [satPos, setSatPos] = useState(null);
  var [sunPos, setSunPos] = useState(null);
  var [term, setTerm] = useState([]);
  var [sel, setSel] = useState(null);
  var [error, setError] = useState('');
  var [header, setHeader] = useState('');
  var [tleAge, setTleAge] = useState('');
  var [bgImg, setBgImg] = useState(EARTH_TEXTURE);
  var fileRef = useRef(null);

  function selSat(key) {
    setSatKey(key);
    if (!key || !TLE_DATABASE[key]) return;
    var s = TLE_DATABASE[key];
    setTle(s.tle1 + '\n' + s.tle2);
    setSatName(s.name + ' (NORAD: ' + s.norad + ', COSPAR: ' + s.cospar + ')');
  }

  function selCity(v) { setCity(v); if (v) { var p = v.split(','); setLat(parseFloat(p[0])); setLon(parseFloat(p[1])); } }

  function loadBg(e) { var f = e.target.files[0]; if (!f) return; var r = new FileReader(); r.onload = function(ev) { setBgImg(ev.target.result); }; r.readAsDataURL(f); }

  function calculate() {
    setError('');
    try {
      var lines = tle.trim().split(/\r?\n/).map(function(l) { return l.trim(); }).filter(Boolean);
      if (lines.length < 2) throw new Error('Нужно 2 строки TLE');
      var l1 = lines.find(function(l) { return l.startsWith('1 '); }) || lines[0];
      var l2 = lines.find(function(l) { return l.startsWith('2 '); }) || lines[1];
      var age = getTleAge(l1);
      if (age < 3) setTleAge('Эпоха TLE: ' + age.toFixed(1) + ' дн. назад ✓');
      else if (age < 14) setTleAge('Эпоха TLE: ' + age.toFixed(1) + ' дн. назад');
      else setTleAge('⚠ Эпоха TLE: ' + age.toFixed(0) + ' дн. — данные устарели!');
      var satrec = satellite.twoline2satrec(l1, l2);
      if (!satrec || !isFinite(satrec.no)) throw new Error('Ошибка парсинга TLE');
      var obs = { lat: lat, lon: lon, alt: alt };
      var h = clamp(hours, 1, 168), mel = clamp(minEl, -5, 90), now = new Date();
      var pNow = propSat(satrec, now);
      if (!pNow) throw new Error('Ошибка пропагации');
      var sp = eciGeo(pNow.position, pNow.gmst); setSatPos(sp);
      var fp = findPasses(satrec, obs, now, h, mel); setPasses(fp);
      setTrack(groundTrack(satrec, now, 120));
      var sun = getSunPosition(now); setSunPos(sun); setTerm(getTerminator(sun.lat, sun.lon));
      setSel(fp.length > 0 ? 0 : null);
      var nm = satKey && TLE_DATABASE[satKey] ? TLE_DATABASE[satKey].name : 'КА';
      setHeader(nm + ': ' + fp.length + ' пролёт(ов) | ' + sp.lat.toFixed(2) + '°, ' + sp.lon.toFixed(2) + '°, ' + sp.alt.toFixed(0) + ' км');
    } catch (e) { setError('Ошибка: ' + e.message); setPasses([]); setTrack([]); setSatPos(null); }
  }

  var mapH = mkMapSvg(track, satPos, sunPos, term, { lat: lat, lon: lon });
  var chartH = mkChartSvg(passes, sel);
  var age = tle ? getTleAge(tle.split('\n')[0] || '') : -1;
  var ageColor = age >= 0 && age < 3 ? '#0fa968' : age >= 14 ? '#d63b50' : '#d68a00';

  /* ===== LIGHT THEME STYLES ===== */
  var S = {
    c: { color: '#1a1f2e', fontFamily: "'Exo 2',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", fontSize: 14, display: 'flex', flexDirection: 'column', gap: 8, padding: 8 },
    tp: { display: 'flex', gap: 8, flexWrap: 'wrap' },
    pn: { background: '#ffffff', borderRadius: 8, padding: 12, border: '1px solid #e0e4ea' },
    lb: { display: 'block', color: '#5a6478', fontSize: 11, marginBottom: 4 },
    inp: { background: '#f8f9fb', border: '1px solid #e0e4ea', borderRadius: 6, padding: '8px 12px', color: '#1a1f2e', fontSize: 13, width: '100%', outline: 'none' },
    sel: { background: '#f8f9fb', border: '1px solid #e0e4ea', borderRadius: 6, padding: '8px 12px', color: '#1a1f2e', fontSize: 13, width: '100%', outline: 'none' },
    ta: { background: '#f8f9fb', border: '1px solid #e0e4ea', borderRadius: 6, padding: '8px 12px', color: '#1a1f2e', fontSize: 11, width: '100%', outline: 'none', fontFamily: "'JetBrains Mono',monospace", resize: 'none' },
    rw: { display: 'flex', gap: 8, marginTop: 8 },
    btn: { background: '#0077cc', color: 'white', border: 'none', borderRadius: 6, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', width: '100%', marginTop: 8 },
    err: { background: '#fdedef', color: '#d63b50', borderRadius: 6, padding: '8px 12px', fontSize: 13, border: '1px solid #f5c6cb' },
    mc: { flex: 1, display: 'flex', gap: 8, minHeight: 0 },
    lp: { display: 'flex', flexDirection: 'column', gap: 8, width: '72%' },
    rp: { flex: 1, background: '#ffffff', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid #e0e4ea' },
    mp: { flex: 1, background: '#0c1929', borderRadius: 8, position: 'relative', overflow: 'hidden', minHeight: 180, backgroundImage: 'url(' + bgImg + ')', backgroundSize: '100% 100%' },
    cc: { height: 220, minHeight: 220, background: '#ffffff', borderRadius: 8, padding: 8, border: '1px solid #e0e4ea' },
    lg: { position: 'absolute', bottom: 4, left: 4, display: 'flex', gap: 12, fontSize: 11, background: 'rgba(0,0,0,0.65)', padding: '4px 8px', borderRadius: 4, color: '#f3f4f6' },
    li: { display: 'flex', alignItems: 'center', gap: 4 },
    dt: { width: 8, height: 8, borderRadius: '50%' },
    dl: { width: 16, height: 2, background: '#facc15' },
    ph: { color: '#0077cc', fontWeight: 600, fontSize: 12, marginBottom: 8 },
    pl: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 },
    pi: { background: '#f8f9fb', borderRadius: 6, padding: 8, cursor: 'pointer', fontSize: 11, border: '1px solid #e0e4ea' },
    ps: { background: '#e8f2fc', borderRadius: 6, padding: 8, cursor: 'pointer', fontSize: 11, border: '1px solid #0077cc' },
    pr: { display: 'flex', justifyContent: 'space-between' },
    ub: { position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.9)', border: '1px solid #cdd3de', padding: '6px 12px', fontSize: 11, borderRadius: 6, cursor: 'pointer', color: '#1a1f2e' },
  };

  return (
    <div style={S.c}>
      <div style={S.tp}>
        <div style={{...S.pn, flex: 1, minWidth: 400}}>
          <label style={S.lb}>Выбор спутника</label>
          <select style={S.sel} value={satKey} onChange={function(e){selSat(e.target.value);}}>
            <option value="">— Выбрать спутник —</option>
            <optgroup label="Пилотируемые">
              <option value="ISS">ISS (ZARYA) — NORAD 25544</option>
              <option value="CSS">CSS (TIANHE) — NORAD 48274</option>
            </optgroup>
            <optgroup label="Метеорологические (Россия)">
              {['METEOR-M2','METEOR-M2-2','METEOR-M2-3','METEOR-M2-4','ARKTIKA-M1','ARKTIKA-M2','ELECTRO-L2','ELECTRO-L3','ELECTRO-L4'].map(function(k){var s=TLE_DATABASE[k];return <option key={k} value={k}>{s.name} — NORAD {s.norad}</option>;})}
            </optgroup>
            <optgroup label="Метеорологические (США/Европа)">
              {['NOAA-18','NOAA-19','NOAA-20','NOAA-21','METOP-B','METOP-C','SUOMI-NPP'].map(function(k){var s=TLE_DATABASE[k];return <option key={k} value={k}>{s.name} — NORAD {s.norad}</option>;})}
            </optgroup>
            <optgroup label="ДЗЗ (Россия)">
              {['RESURS-P1','RESURS-P2','RESURS-P3','RESURS-P4','KANOPUS-V1','KANOPUS-V-IK'].map(function(k){var s=TLE_DATABASE[k];return <option key={k} value={k}>{s.name} — NORAD {s.norad}</option>;})}
            </optgroup>
            <optgroup label="Навигационные"><option value="GLONASS-K1">ГЛОНАСС-К — NORAD 37829</option></optgroup>
            <optgroup label="Научные"><option value="HUBBLE">Hubble — NORAD 20580</option></optgroup>
          </select>
          <div style={{color:'#0077cc',fontWeight:600,fontSize:12,marginBottom:4}}>{satName}</div>
          <label style={S.lb}>TLE (Two-Line Element)</label>
          <textarea style={S.ta} rows={3} value={tle} onChange={function(e){setTle(e.target.value);}} />
          <div style={{fontSize:10,color:'#8892a4',marginTop:4}}>
            <span style={{color:ageColor}}>{tleAge}</span> • Расчёт: satellite.js (SGP4)
          </div>
        </div>
        <div style={{...S.pn, flex: 1, minWidth: 280}}>
          <label style={S.lb}>Точка наблюдения</label>
          <select style={S.sel} value={city} onChange={function(e){selCity(e.target.value);}}>
            <option value="">— Выбрать город —</option>
            {CITIES.map(function(c){return <option key={c.value} value={c.value}>{c.label}</option>;})}
          </select>
          <div style={S.rw}>
            <div style={{flex:1}}><label style={S.lb}>Широта °</label><input style={S.inp} type="number" value={lat} step="0.0001" onChange={function(e){setLat(parseFloat(e.target.value)||0);}} /></div>
            <div style={{flex:1}}><label style={S.lb}>Долгота °</label><input style={S.inp} type="number" value={lon} step="0.0001" onChange={function(e){setLon(parseFloat(e.target.value)||0);}} /></div>
            <div style={{flex:'0 0 100px'}}><label style={S.lb}>Высота м</label><input style={S.inp} type="number" value={alt} onChange={function(e){setAlt(parseFloat(e.target.value)||0);}} /></div>
          </div>
        </div>
        <div style={{...S.pn, minWidth: 240}}>
          <label style={S.lb}>Параметры расчёта</label>
          <div style={S.rw}>
            <div style={{flex:1}}><label style={S.lb}>Период (часы)</label><input style={S.inp} type="number" value={hours} onChange={function(e){setHours(parseFloat(e.target.value)||24);}} /></div>
            <div style={{flex:1}}><label style={S.lb}>Мин. угол °</label><input style={S.inp} type="number" value={minEl} onChange={function(e){setMinEl(parseFloat(e.target.value)||0);}} /></div>
          </div>
          <button style={S.btn} onClick={calculate}>Расчёт</button>
        </div>
      </div>
      {error && <div style={S.err}>{error}</div>}
      <div style={S.mc}>
        <div style={S.lp}>
          <div style={S.mp}>
            <svg viewBox="-180 -90 360 180" preserveAspectRatio="none" style={{width:'100%',height:'100%',transform:'scaleY(-1)'}} dangerouslySetInnerHTML={{__html:mapH}} />
            <input type="file" ref={fileRef} accept="image/*" style={{display:'none'}} onChange={loadBg} />
            <button style={S.ub} onClick={function(){fileRef.current&&fileRef.current.click();}}>📁 Подложка</button>
            <div style={S.lg}>
              <div style={S.li}><div style={{...S.dt,background:'#22c55e'}} />Набл.</div>
              <div style={S.li}><div style={{...S.dt,background:'#dc2626'}} />КА</div>
              <div style={S.li}><div style={{...S.dt,background:'#fbbf24'}} />Солнце</div>
              <div style={S.li}><div style={S.dl} />Трасса</div>
            </div>
          </div>
          <div style={S.cc}>
            <div style={{color:'#5a6478',fontSize:11,marginBottom:4}}>График угла места</div>
            <svg viewBox="0 0 500 180" preserveAspectRatio="xMidYMid meet" style={{width:'100%',height:'100%'}} dangerouslySetInnerHTML={{__html:chartH}} />
          </div>
        </div>
        <div style={S.rp}>
          <div style={S.ph}>{header || 'Пролёты (0)'}</div>
          <div style={S.pl}>
            {passes.length === 0 ? <div style={{color:'#8892a4',fontSize:11}}>Нет пролётов. Нажмите «Расчёт»</div>
            : passes.map(function(p, i) {
              return (
                <div key={i} style={sel === i ? S.ps : S.pi} onClick={function(){setSel(i);}}>
                  <div style={S.pr}><span style={{color:'#16a34a'}}>▲ AOS {fmtDate(p.aos.date)} {fmtTime(p.aos.date)}</span><span style={{color:'#5a6478'}}>Az {p.aos.az.toFixed(0)}°</span></div>
                  <div style={S.pr}><span style={{color:'#d68a00'}}>● TCA {fmtTime(p.tca.date)}</span><span style={{fontWeight:700,color:'#d68a00'}}>El {p.tca.el.toFixed(1)}°</span></div>
                  <div style={S.pr}><span style={{color:'#d63b50'}}>▼ LOS {fmtTime(p.los.date)}</span><span style={{color:'#5a6478'}}>Az {p.los.az.toFixed(0)}°</span></div>
                </div>
              );
            })}
          </div>
          <div style={{color:'#8892a4',fontSize:11,marginTop:8}}>Время: локальное</div>
        </div>
      </div>
    </div>
  );
}
