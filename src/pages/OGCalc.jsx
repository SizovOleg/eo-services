import { useState } from 'react';

const R_EARTH = 6371000.0;
const MU = 398600.4418e9;
const OMEGA = 7.2921159e-5;
const T_SID = 86164.0905;

function InputField({ label, value, onChange, unit, step }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-gray-600">{label}</label>
      <div className="flex gap-2 items-center">
        <input
          type="number"
          step={step || "any"}
          value={value}
          onChange={function(e) { onChange(parseFloat(e.target.value) || 0); }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {unit && <span className="text-sm text-gray-500 w-16">{unit}</span>}
      </div>
    </div>
  );
}

function ResultRow({ label, value, unit }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value} <span className="text-gray-500 text-sm">{unit}</span></span>
    </div>
  );
}

function calcSunAltitude(lat_deg, lng_deg, time_minutes, dateStr) {
  var hour = Math.floor(time_minutes / 60);
  var minute = Math.floor(time_minutes % 60);
  var parts = dateStr.split('-');
  var year = parseInt(parts[0]);
  var month = parseInt(parts[1]) - 1;
  var day = parseInt(parts[2]);
  var date = new Date(year, month, day, hour, minute, 0);
  var rad = Math.PI / 180;
  var dayMs = 1000 * 60 * 60 * 24;
  var J1970 = 2440588;
  var J2000 = 2451545;
  var julian = date.valueOf() / dayMs - 0.5 + J1970;
  var d = julian - J2000;
  var e = rad * 23.4397;
  var M = rad * (357.5291 + 0.98560028 * d);
  var C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  var P = rad * 102.9372;
  var L = M + C + P + Math.PI;
  var dec = Math.asin(Math.sin(L) * Math.sin(e));
  var ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
  var lw = rad * (-lng_deg);
  var siderealTime = rad * (280.16 + 360.9856235 * d) - lw;
  var H = siderealTime - ra;
  var phi = rad * lat_deg;
  var sinAlt = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H);
  return Math.asin(sinAlt) / rad;
}

function formatTime(minutes) {
  var h = Math.floor(minutes / 60);
  var m = Math.floor(minutes % 60);
  var s = Math.floor((minutes % 1) * 60);
  return h.toString().padStart(2,'0') + ':' + m.toString().padStart(2,'0') + ':' + s.toString().padStart(2,'0');
}

function calcOPArray(n_op, rasst) {
  var rasst_min = rasst * 1440 / 360;
  var n_op_1 = 720;
  if (n_op === 1) return [n_op_1];
  var n_op_levo_array = [];
  var n_op_pravo_array = [];
  if (n_op % 2 !== 0) {
    var n_op_2 = n_op / 2 - 0.5;
    for (var i = 1; i <= n_op_2; i++) {
      n_op_pravo_array.push(n_op_1 + rasst_min * i);
      n_op_levo_array.push(n_op_1 - rasst_min * i);
    }
  } else {
    var n_op_2 = n_op / 2;
    for (var i = 1; i <= n_op_2; i++) {
      n_op_pravo_array.push(n_op_1 + rasst_min * i);
      n_op_levo_array.push(n_op_1 - rasst_min * i);
    }
    n_op_levo_array.pop();
  }
  n_op_levo_array.reverse();
  return n_op_levo_array.concat([n_op_1], n_op_pravo_array);
}

function calcRepeatCycle(H) {
  var a = R_EARTH + H * 1000;
  var T = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / MU);
  var r = T / T_SID;
  var lastN = 1, lastM = 1;
  for (var N = 1; N <= 200; N++) {
    var M = Math.round(N * r);
    if (M === 0) continue;
    lastN = N;
    lastM = M;
    var drift = Math.abs(N * T - M * T_SID) / T_SID * 360;
    if (drift < 0.05) return [N, M, N * T / 86400];
  }
  return [lastN, lastM, lastN * T / 86400];
}

function calculateAll(params) {
  var n_op = params.n_op, n_sats = params.n_sats, rasst = params.rasst, H = params.H;
  var lat_deg = params.lat_deg, W = params.W, alpha = params.alpha, sun_angle = params.sun_angle;
  var startDate = params.startDate || '2025-03-21';
  var T = 2 * Math.PI * Math.sqrt(Math.pow(R_EARTH + H * 1000, 3) / MU);
  var dLambda = OMEGA * T;
  var d_eq = (R_EARTH / 1000) * dLambda;
  var d_lat = d_eq * Math.cos(lat_deg * Math.PI / 180);
  var L = R_EARTH * 2 * Math.PI;
  var l_OP = (rasst * L) / 360 / 1000;
  var l_lat_OP = 111.3 * Math.cos(lat_deg * Math.PI / 180) * rasst;
  var W_obzor = alpha === 0 ? W : 2 * H * Math.tan(alpha * Math.PI / 180);
  var rep_cycle = calcRepeatCycle(H);
  var op_array = calcOPArray(n_op, rasst);
  var op_info = [];
  for (var i = 0; i < op_array.length; i++) {
    var time = op_array[i];
    var sunAlt = calcSunAltitude(lat_deg, 40.0, time, startDate);
    var DOL_sun;
    if (sun_angle === -90) DOL_sun = 1;
    else if (sunAlt > sun_angle) DOL_sun = 0.5;
    else DOL_sun = 0;
    op_info.push({ num: i + 1, time: time, sunAlt: sunAlt, DOL_sun: DOL_sun });
  }
  var ZERO = 0;
  for (var i = 0; i < op_info.length; i++) { if (op_info[i].DOL_sun === 0) ZERO++; }
  var W_summ = n_op * n_sats * W;
  var POKR_display = '';
  if (ZERO === n_op) {
    POKR_display = '0 сут';
  } else if (ZERO === 0) {
    var POKR_0 = (d_lat / W_summ) / 0.5;
    if (POKR_0 < rep_cycle[1]) POKR_display = POKR_0.toFixed(2) + ' сут';
    else if (POKR_0 < 2 * rep_cycle[1]) POKR_display = ((rep_cycle[1] * 100) / POKR_0).toFixed(2) + '%';
    else POKR_display = ((2 * rep_cycle[1] * 100) / POKR_0).toFixed(2) + '%';
  } else {
    var POKR_0 = (d_lat / (n_sats * W * (n_op - ZERO))) / 0.5;
    if (POKR_0 < rep_cycle[1]) POKR_display = POKR_0.toFixed(2) + ' сут';
    else if (POKR_0 < 2 * rep_cycle[1]) POKR_display = ((rep_cycle[1] * 100) / POKR_0).toFixed(2) + '%';
    else POKR_display = ((2 * rep_cycle[1] * 100) / POKR_0).toFixed(2) + '%';
  }
  var OPER_base = (2 * W_obzor * n_sats * n_op) / d_lat;
  var OPER = 0;
  for (var i = 0; i < op_info.length; i++) { OPER += (OPER_base / n_op) * op_info[i].DOL_sun; }
  return { T: (T/60).toFixed(2), d_lat: d_lat.toFixed(2), d_lat_eq: d_eq.toFixed(2), l_lat_OP: l_lat_OP.toFixed(2), l_OP: l_OP.toFixed(2), W_obzor: W_obzor.toFixed(1), rep_cycle: rep_cycle[1], POKR: POKR_display, OPER: OPER.toFixed(2), op_info: op_info, ZERO: ZERO };
}

function calculateCoverage(params) {
  var baseResults = calculateAll(params);
  var startDate = params.startDate || '2025-03-21';
  var n_op = params.n_op, n_sats = params.n_sats, W = params.W, H = params.H;
  var alpha = params.alpha, sun_angle = params.sun_angle, lat_deg = params.lat_deg, rasst = params.rasst;
  var T = 2 * Math.PI * Math.sqrt(Math.pow(R_EARTH + H * 1000, 3) / MU);
  var dLambda = OMEGA * T;
  var d_eq = (R_EARTH / 1000) * dLambda;
  var d_lat = d_eq * Math.cos(lat_deg * Math.PI / 180);
  var W_obzor = alpha === 0 ? W : 2 * H * Math.tan(alpha * Math.PI / 180);
  var rep_cycle = calcRepeatCycle(H);
  var W_summ = n_op * n_sats * W;
  var W_obzor_summ = n_op * n_sats * W_obzor;
  var ZERO = baseResults.ZERO;
  var op_info = baseResults.op_info;
  var op_array = calcOPArray(n_op, rasst);
  var parts = startDate.split('-');
  var year = parseInt(parts[0]), month = parseInt(parts[1]) - 1, day = parseInt(parts[2]);
  var DOL_sun_array_prikidka = [];
  for (var j = 0; j < 10; j++) {
    var daysToAdd = Math.round((j + 1) * rep_cycle[1]);
    var futureDate = new Date(year, month, day);
    futureDate.setDate(futureDate.getDate() + daysToAdd);
    var futureDateStr = futureDate.getFullYear() + '-' + String(futureDate.getMonth() + 1).padStart(2, '0') + '-' + String(futureDate.getDate()).padStart(2, '0');
    for (var i = 0; i < op_array.length; i++) {
      var sunAlt = calcSunAltitude(lat_deg, 40.0, op_array[i], futureDateStr);
      var DOL_sun;
      if (sun_angle === -90) DOL_sun = 1;
      else if (sunAlt > sun_angle) DOL_sun = 0.5;
      else DOL_sun = 0;
      DOL_sun_array_prikidka.push(DOL_sun);
    }
  }
  var DOL_sun_future = DOL_sun_array_prikidka.length > 0 ? DOL_sun_array_prikidka[0] : 0;
  var POKR_display = '';
  var additionalInfo = [];
  if (ZERO === n_op) {
    POKR_display = '0 сут';
  } else {
    var POKR_0;
    if (n_op === 1) POKR_0 = (d_lat / W_summ) / op_info[0].DOL_sun;
    else if (ZERO === 0) POKR_0 = (d_lat / W_summ) / 0.5;
    else POKR_0 = (d_lat / (n_sats * W * (n_op - ZERO))) / 0.5;
    if (POKR_0 < rep_cycle[1]) {
      POKR_display = POKR_0.toFixed(2) + ' сут';
    } else {
      var POKR_percent;
      if (POKR_0 < 2 * rep_cycle[1]) POKR_percent = (rep_cycle[1] * 100) / POKR_0;
      else POKR_percent = (2 * rep_cycle[1] * 100) / POKR_0;
      POKR_display = POKR_percent.toFixed(2) + '%';
      var Svobodn_plosh = d_lat - (POKR_percent / 100) * d_lat;
      additionalInfo.push('Осталось покрыть на заданной широте: ' + Svobodn_plosh.toFixed(2) + ' км');
      if (alpha !== 0 && DOL_sun_future !== 0) {
        var prim_dn = Math.floor(Svobodn_plosh / W_summ / rep_cycle[1]);
        var prim_dn_ost = (Svobodn_plosh / W_summ) - prim_dn * rep_cycle[1];
        var fragm = DOL_sun_array_prikidka.slice(0, Math.min(prim_dn + 1, DOL_sun_array_prikidka.length));
        var index_of_zero = -1;
        for (var k = 0; k < fragm.length; k++) { if (fragm[k] === 0) { index_of_zero = k; break; } }
        if (Svobodn_plosh / W_obzor_summ <= 1) {
          additionalInfo.push('Возможно достижение полного покрытия');
          if (index_of_zero === -1) { additionalInfo.push('Полное покрытие ещё за ' + (rep_cycle[1] * prim_dn + prim_dn_ost).toFixed(2) + ' сут'); }
          else { additionalInfo.push('Солнце ушло через ' + index_of_zero + ' периода кратности'); }
        } else {
          additionalInfo.push('Полное покрытие не может быть достигнуто');
          var max_proc = 100 - (((Svobodn_plosh - W_obzor_summ) / d_lat) * 100);
          additionalInfo.push('Макс. покрытие: ' + max_proc.toFixed(2) + '%');
          if (index_of_zero === -1) { additionalInfo.push('Макс. покрытие ещё за ' + (rep_cycle[1] * prim_dn + prim_dn_ost).toFixed(2) + ' сут'); }
          else { additionalInfo.push('Солнце ушло через ' + index_of_zero + ' периода кратности'); }
        }
      } else if (alpha === 0) {
        additionalInfo.push('Нет отклонения по углу визирования');
        additionalInfo.push('Полное покрытие невозможно');
      } else {
        additionalInfo.push('Солнце ниже заявленной границы');
        additionalInfo.push('Дальнейшее покрытие невозможно');
      }
    }
  }
  return { T: baseResults.T, d_lat: baseResults.d_lat, d_lat_eq: baseResults.d_lat_eq, l_lat_OP: baseResults.l_lat_OP, l_OP: baseResults.l_OP, W_obzor: baseResults.W_obzor, rep_cycle: baseResults.rep_cycle, OPER: baseResults.OPER, op_info: baseResults.op_info, ZERO: baseResults.ZERO, POKR: POKR_display, additionalInfo: additionalInfo };
}

function CommonInputs({ params, setParams }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <InputField label="Число ОП" value={params.n_op} onChange={function(v) { setParams(Object.assign({}, params, {n_op: v})); }} unit="шт" step="1" />
      <InputField label="Число КА в ОП" value={params.n_sats} onChange={function(v) { setParams(Object.assign({}, params, {n_sats: v})); }} unit="шт" step="1" />
      <InputField label="Разнесение ОП" value={params.rasst} onChange={function(v) { setParams(Object.assign({}, params, {rasst: v})); }} unit="°" />
      <InputField label="Высота орбиты" value={params.H} onChange={function(v) { setParams(Object.assign({}, params, {H: v})); }} unit="км" />
      <InputField label="Широта съёмки" value={params.lat_deg} onChange={function(v) { setParams(Object.assign({}, params, {lat_deg: v})); }} unit="°" />
      <InputField label="Полоса захвата" value={params.W} onChange={function(v) { setParams(Object.assign({}, params, {W: v})); }} unit="км" />
      <InputField label="Угол визирования" value={params.alpha} onChange={function(v) { setParams(Object.assign({}, params, {alpha: v})); }} unit="°" />
      <InputField label="Мин. высота Солнца" value={params.sun_angle} onChange={function(v) { setParams(Object.assign({}, params, {sun_angle: v})); }} unit="°" />
    </div>
  );
}

function CommonResults({ results }) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-semibold mb-2 text-gray-800">Орбитальные плоскости</h3>
        <div className="space-y-1 text-sm">
          {results.op_info.map(function(op) {
            return (
              <div key={op.num} className="flex justify-between">
                <span>ОП {op.num}: {formatTime(op.time)}</span>
                <span className={op.DOL_sun === 0 ? 'text-red-600' : 'text-green-600'}>
                  Солнце: {op.sunAlt.toFixed(2)}°
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="bg-gray-50 rounded-lg p-4 space-y-1">
        <h3 className="font-semibold mb-3 text-gray-800">Параметры</h3>
        <ResultRow label="Межвиток на широте" value={results.d_lat} unit="км" />
        <ResultRow label="Межвиток на экваторе" value={results.d_lat_eq} unit="км" />
        <ResultRow label="Расстояние между ОП (широта)" value={results.l_lat_OP} unit="км" />
        <ResultRow label="Расстояние между ОП (экватор)" value={results.l_OP} unit="км" />
        <ResultRow label="Полоса обзора" value={results.W_obzor} unit="км" />
        <ResultRow label="Кратность орбиты" value={results.rep_cycle} unit="" />
        <ResultRow label="ОП ниже угла Солнца" value={results.ZERO} unit="шт" />
      </div>
    </div>
  );
}

function TabCoverage() {
  var stateArr = useState({ n_op: 2, n_sats: 4, rasst: 10, H: 500, lat_deg: 55, W: 20, alpha: 0, sun_angle: 10, startDate: '2025-03-21' });
  var params = stateArr[0], setParams = stateArr[1];
  var resultsArr = useState(null);
  var results = resultsArr[0], setResults = resultsArr[1];
  function calculate() { setResults(calculateCoverage(params)); }
  return (
    <div className="space-y-6">
      <CommonInputs params={params} setParams={setParams} />
      <div className="flex flex-col gap-1">
        <label className="text-sm text-gray-600">Дата начала съёмки</label>
        <input type="date" value={params.startDate} onChange={function(e) { setParams(Object.assign({}, params, {startDate: e.target.value})); }} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>
      <button onClick={calculate} style={{width:"100%",padding:"12px",background:"#2563eb",color:"white",borderRadius:8,border:"none",cursor:"pointer",fontWeight:600,fontSize:15}}>Рассчитать</button>
      {results && (
        <div className="space-y-4">
          <CommonResults results={results} />
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-semibold mb-3 text-gray-800">Результат</h3>
            <ResultRow label="Итоговое покрытие" value={results.POKR} unit="" />
            {results.additionalInfo && results.additionalInfo.length > 0 && (
              <div className="mt-3 pt-3 border-t border-green-200">
                {results.additionalInfo.map(function(info, i) { return <p key={i} className="text-sm text-gray-600 py-1">{info}</p>; })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TabOperativity() {
  var stateArr = useState({ n_op: 2, n_sats: 4, rasst: 10, H: 500, lat_deg: 55, W: 20, alpha: 0, sun_angle: 10, startDate: '2025-03-21' });
  var params = stateArr[0], setParams = stateArr[1];
  var resultsArr = useState(null);
  var results = resultsArr[0], setResults = resultsArr[1];
  function calculate() { setResults(calculateAll(params)); }
  return (
    <div className="space-y-6">
      <CommonInputs params={params} setParams={setParams} />
      <div className="flex flex-col gap-1">
        <label className="text-sm text-gray-600">Дата съёмки</label>
        <input type="date" value={params.startDate} onChange={function(e) { setParams(Object.assign({}, params, {startDate: e.target.value})); }} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>
      <button onClick={calculate} style={{width:"100%",padding:"12px",background:"#4f46e5",color:"white",borderRadius:8,border:"none",cursor:"pointer",fontWeight:600,fontSize:15}}>Рассчитать</button>
      {results && (
        <div className="space-y-4">
          <CommonResults results={results} />
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="font-semibold mb-3 text-gray-800">Результат</h3>
            <ResultRow label="Оперативность на широте" value={results.OPER} unit="раз/сут" />
          </div>
        </div>
      )}
    </div>
  );
}

function TabInfoFlows() {
  var stateArr = useState({ n_sats: 4, H: 500, v_zapis: 2, n_vitkov_work: 7, t_vitok: 10, VRL: 300, t_sbros_dlit: 8 });
  var params = stateArr[0], setParams = stateArr[1];
  var resultsArr = useState(null);
  var results = resultsArr[0], setResults = resultsArr[1];
  function calculate() {
    var T = 2 * Math.PI * Math.sqrt(Math.pow(R_EARTH + params.H * 1000, 3) / MU);
    var V = params.t_vitok * params.v_zapis * params.n_sats * params.n_vitkov_work;
    var t_sbros = (V * 1000) / (params.VRL * 60);
    var n_sbros = t_sbros / params.t_sbros_dlit;
    setResults({ T: (T / 60).toFixed(2), V: (V / 8).toFixed(2), t_sbros: t_sbros.toFixed(2), n_sbros: n_sbros.toFixed(2) });
  }
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <InputField label="Число КА в ОГ" value={params.n_sats} onChange={function(v) { setParams(Object.assign({}, params, {n_sats: v})); }} unit="шт" step="1" />
        <InputField label="Высота орбиты" value={params.H} onChange={function(v) { setParams(Object.assign({}, params, {H: v})); }} unit="км" />
        <InputField label="Скорость записи в БЗУ" value={params.v_zapis} onChange={function(v) { setParams(Object.assign({}, params, {v_zapis: v})); }} unit="Гбит/с" />
        <InputField label="Рабочих витков в сутки" value={params.n_vitkov_work} onChange={function(v) { setParams(Object.assign({}, params, {n_vitkov_work: v})); }} unit="шт" step="1" />
        <InputField label="Время работы на витке" value={params.t_vitok} onChange={function(v) { setParams(Object.assign({}, params, {t_vitok: v})); }} unit="мин" />
        <InputField label="Скорость ВРЛ" value={params.VRL} onChange={function(v) { setParams(Object.assign({}, params, {VRL: v})); }} unit="Мбит/с" />
        <InputField label="Длительность сброса" value={params.t_sbros_dlit} onChange={function(v) { setParams(Object.assign({}, params, {t_sbros_dlit: v})); }} unit="мин" />
      </div>
      <button onClick={calculate} style={{width:"100%",padding:"12px",background:"#16a34a",color:"white",borderRadius:8,border:"none",cursor:"pointer",fontWeight:600,fontSize:15}}>Рассчитать</button>
      {results && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-1">
          <h3 className="font-semibold mb-3 text-gray-800">Результаты</h3>
          <ResultRow label="Период обращения" value={results.T} unit="мин" />
          <ResultRow label="Объём данных за сутки" value={results.V} unit="Гбайт" />
          <ResultRow label="Время сброса за сутки" value={results.t_sbros} unit="мин" />
          <ResultRow label="Число сеансов сброса" value={results.n_sbros} unit="шт" />
        </div>
      )}
    </div>
  );
}

function TabProductivity() {
  var stateArr = useState({ n_sats: 4, H: 500, W: 20, N_vit: 7, t_vitok: 10, days: 30 });
  var params = stateArr[0], setParams = stateArr[1];
  var resultsArr = useState(null);
  var results = resultsArr[0], setResults = resultsArr[1];
  function calculate() {
    var T = 2 * Math.PI * Math.sqrt(Math.pow(R_EARTH + params.H * 1000, 3) / MU);
    var n_vitkov = 86400 / T;
    var v_orbit = Math.sqrt(MU / (R_EARTH + params.H * 1000));
    var v_podsputnik = (v_orbit / 1000 * R_EARTH / 1000) / (R_EARTH / 1000 + params.H);
    var actualVit = Math.min(params.N_vit, n_vitkov);
    var actualTime = Math.min(params.t_vitok, T / 60);
    var L = v_podsputnik * actualTime * 60 * actualVit;
    var km2 = L * params.n_sats * params.W * params.days;
    setResults({ T: (T / 60).toFixed(2), v_podsputnik: v_podsputnik.toFixed(2), n_vitkov: n_vitkov.toFixed(2), km2: Math.round(km2).toLocaleString('ru-RU') });
  }
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <InputField label="Число КА в ОГ" value={params.n_sats} onChange={function(v) { setParams(Object.assign({}, params, {n_sats: v})); }} unit="шт" step="1" />
        <InputField label="Высота орбиты" value={params.H} onChange={function(v) { setParams(Object.assign({}, params, {H: v})); }} unit="км" />
        <InputField label="Полоса захвата" value={params.W} onChange={function(v) { setParams(Object.assign({}, params, {W: v})); }} unit="км" />
        <InputField label="Число витков съёмки" value={params.N_vit} onChange={function(v) { setParams(Object.assign({}, params, {N_vit: v})); }} unit="шт" step="1" />
        <InputField label="Время съёмки на витке" value={params.t_vitok} onChange={function(v) { setParams(Object.assign({}, params, {t_vitok: v})); }} unit="мин" />
        <InputField label="Период съёмки" value={params.days} onChange={function(v) { setParams(Object.assign({}, params, {days: v})); }} unit="сут" step="1" />
      </div>
      <button onClick={calculate} style={{width:'100%',padding:'12px',background:'#7c3aed',color:'white',borderRadius:8,border:'none',cursor:'pointer',fontWeight:600,fontSize:15}}>Рассчитать</button>
      {results && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-1">
          <h3 className="font-semibold mb-3 text-gray-800">Результаты</h3>
          <ResultRow label="Период обращения" value={results.T} unit="мин" />
          <ResultRow label="Скорость подспутниковой точки" value={results.v_podsputnik} unit="км/с" />
          <ResultRow label="Витков в сутки" value={results.n_vitkov} unit="шт" />
          <ResultRow label="Производительность" value={results.km2} unit="км²" />
        </div>
      )}
    </div>
  );
}

export default function OGCalc() {
  var tabState = useState(0);
  var tab = tabState[0], setTab = tabState[1];
  var tabs = ['Покрытие', 'Оперативн.', 'Инф. потоки', 'Производит.'];
  return (
    <div className="page-content" style={{ maxWidth: 640 }}>
      <div className="service-header">
        <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
          <circle cx="18" cy="18" r="14" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4 3" />
          <circle cx="18" cy="18" r="3" fill="var(--accent)" />
          <circle cx="18" cy="6" r="2" fill="var(--accent)" />
          <circle cx="18" cy="30" r="2" fill="var(--accent)" />
        </svg>
        <h1>Калькулятор ОГ</h1>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="flex border-b">
          {tabs.map(function(t, i) {
            return (
              <button key={i} onClick={function() { setTab(i); }}
                className={'flex-1 py-3 text-xs font-medium transition ' + (tab === i ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700')}
              >{t}</button>
            );
          })}
        </div>
        <div className="p-5">
          {tab === 0 && <TabCoverage />}
          {tab === 1 && <TabOperativity />}
          {tab === 2 && <TabInfoFlows />}
          {tab === 3 && <TabProductivity />}
        </div>
      </div>
    </div>
  );
}
