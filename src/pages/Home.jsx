import React from 'react'
import { Link } from 'react-router-dom'

const services = [
  {
    id: 'orbit-history',
    path: '/orbit-history',
    title: 'История орбиты',
    desc: 'Анализ эволюции орбитальных параметров КА по архиву TLE. Графики высот, наклонения, RAAN, детекция манёвров, прогноз схода с орбиты.',
    ready: true,
    color: '#0077cc',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <ellipse cx="18" cy="18" rx="15" ry="7" transform="rotate(-20 18 18)" stroke="#0077cc" strokeWidth="1.5"/>
        <circle cx="27" cy="13" r="2.5" fill="#0077cc"/>
        <circle cx="18" cy="18" r="3" stroke="#0077cc" strokeWidth="1" fill="#0077cc" fillOpacity=".12"/>
      </svg>
    ),
  },
  {
    id: 'og-calc',
    path: '/og-calc',
    title: 'Калькулятор ОГ',
    desc: 'Расчёт характеристик орбитальной группировки: покрытие, оперативность, информационные потоки, производительность съёмки.',
    ready: true,
    color: '#8e44ad',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="5" y="8" width="26" height="20" rx="3" stroke="#8e44ad" strokeWidth="1.5"/>
        <path d="M5 14h26M13 14v14M23 14v14" stroke="#8e44ad" strokeWidth="1" opacity=".5"/>
        <circle cx="9" cy="21" r="2" fill="#8e44ad" fillOpacity=".3"/>
        <circle cx="18" cy="18" r="2" fill="#8e44ad" fillOpacity=".3"/>
        <circle cx="27" cy="24" r="2" fill="#8e44ad" fillOpacity=".3"/>
      </svg>
    ),
  },
  {
    id: 'orbit-designer',
    path: '/orbit-designer',
    title: 'Конструктор группировок',
    desc: '3D-визуализация и проектирование орбитальных группировок. Импорт/экспорт TLE, STK, анимация, генерация GIF.',
    ready: true,
    color: '#16a085',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="13" strokeDasharray="2.5 3.5" stroke="#16a085" strokeWidth="1.2"/>
        <ellipse cx="18" cy="18" rx="15" ry="5.5" transform="rotate(35 18 18)" stroke="#16a085" strokeWidth="1.3"/>
        <ellipse cx="18" cy="18" rx="15" ry="5.5" transform="rotate(-35 18 18)" stroke="#16a085" strokeWidth="1.3"/>
        <circle cx="18" cy="18" r="3" fill="#16a085" fillOpacity=".15" stroke="#16a085" strokeWidth="1"/>
      </svg>
    ),
  },
  {
    id: 'coverage',
    path: '/coverage',
    title: 'Расчёт покрытия',
    desc: 'Моделирование покрытия территорий с учётом J2-возмущений, полосы захвата и углов отклонения. Оптимизация группировок.',
    ready: true,
    color: '#e67e22',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="4" y="8" width="28" height="20" rx="2.5" stroke="#e67e22" strokeWidth="1.5"/>
        <path d="M4 18h28M18 8v20" strokeDasharray="2 2.5" stroke="#e67e22" strokeWidth="1" opacity=".4"/>
        <path d="M9 14l5 5-3 3.5 7-1.5 5 2.5" stroke="#e67e22" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'pass-calc',
    path: '/pass-calc',
    title: 'Прогноз пролётов',
    desc: 'Расчёт видимых пролётов КА над заданной точкой наблюдения. Углы возвышения, азимут, время контакта AOS/TCA/LOS.',
    ready: true,
    color: '#e74c3c',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="22" r="10" stroke="#e74c3c" strokeWidth="1.5"/>
        <path d="M8 22a10 10 0 0 1 20 0" fill="none" stroke="#e74c3c" strokeWidth="1" opacity=".4"/>
        <line x1="18" y1="22" x2="25" y2="15" stroke="#e74c3c" strokeWidth="1.5"/>
        <circle cx="18" cy="8" r="2.5" fill="#e74c3c" fillOpacity=".2" stroke="#e74c3c" strokeWidth="1.2"/>
        <path d="M18 10.5v3" strokeDasharray="1.5 2" stroke="#e74c3c" strokeWidth="1"/>
      </svg>
    ),
  },
  {
    id: 'news',
    title: 'Новости ДЗЗ',
    desc: 'Агрегатор новостей отрасли дистанционного зондирования Земли. Запуски, миссии, открытые данные, конференции.',
    ready: false,
    color: '#95a5a6',
    icon: (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <rect x="6" y="6" width="24" height="24" rx="3" stroke="#95a5a6" strokeWidth="1.5"/>
        <line x1="10" y1="12" x2="26" y2="12" stroke="#95a5a6" strokeWidth="1.5" opacity=".5"/>
        <line x1="10" y1="17" x2="20" y2="17" stroke="#95a5a6" strokeWidth="1" opacity=".35"/>
        <line x1="10" y1="21" x2="23" y2="21" stroke="#95a5a6" strokeWidth="1" opacity=".35"/>
        <line x1="10" y1="25" x2="18" y2="25" stroke="#95a5a6" strokeWidth="1" opacity=".35"/>
      </svg>
    ),
  },
]

export default function Home() {
  return (
    <div style={{ maxWidth: 1020, margin: '0 auto', padding: '44px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 52 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: 0.3, marginBottom: 12 }}>
          Сервисы ДЗЗ
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 16, maxWidth: 560, margin: '0 auto', lineHeight: 1.65 }}>
          Инструменты для анализа орбит, планирования съёмки и управления группировками КА дистанционного зондирования Земли
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 20,
      }}>
        {services.map(s => (
          <ServiceCard key={s.id} service={s} />
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 60, color: 'var(--text-muted)', fontSize: 12 }}>
        Данные TLE: CelesTrak / Space-Track
      </div>
    </div>
  )
}

function ServiceCard({ service: s }) {
  const inner = (
    <div
      className="card"
      style={{
        padding: 28,
        cursor: s.ready ? 'pointer' : 'default',
        opacity: s.ready ? 1 : 0.55,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        minHeight: 180,
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        if (s.ready) {
          e.currentTarget.style.borderColor = s.color + '70'
          e.currentTarget.style.boxShadow = `0 6px 28px ${s.color}14`
          e.currentTarget.style.transform = 'translateY(-2px)'
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {s.icon}
        <span style={{
          fontSize: 11, padding: '4px 12px', borderRadius: 6, fontWeight: 600, letterSpacing: 0.5,
          background: s.ready ? 'var(--success-bg)' : 'var(--warning-bg)',
          color: s.ready ? 'var(--success)' : 'var(--warning)',
        }}>
          {s.ready ? 'ONLINE' : 'СКОРО'}
        </span>
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>{s.title}</h3>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{s.desc}</p>
      </div>
    </div>
  )

  if (s.ready && s.path) {
    return <Link to={s.path} style={{ textDecoration: 'none', color: 'inherit' }}>{inner}</Link>
  }
  return inner
}
