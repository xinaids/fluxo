'use client'

import { useRouter } from 'next/navigation'
import { useLanguage } from '@/i18n/LanguageContext'
import { LanguageToggle } from '@/components/ui/LanguageToggle'

export default function LandingPage() {
  const router = useRouter()
  const { t } = useLanguage()

  const steps = [
    { step: '01', title: t.landing_step1_title, desc: t.landing_step1_desc },
    { step: '02', title: t.landing_step2_title, desc: t.landing_step2_desc },
    { step: '03', title: t.landing_step3_title, desc: t.landing_step3_desc },
  ]

  const features = [
    { icon: '🌐', title: t.landing_why_nobank, desc: t.landing_why_nobank_desc },
    { icon: '🌎', title: t.landing_why_global, desc: t.landing_why_global_desc },
    { icon: '⚡', title: t.landing_why_nofee, desc: t.landing_why_nofee_desc },
    { icon: '🚀', title: t.landing_why_instant, desc: t.landing_why_instant_desc },
  ]

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#fff', minHeight: '100vh' }}>

      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '0.5px solid #f0f0f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo.svg" alt="Fluxo" style={{ width: 32, height: 32, borderRadius: 10 }} />
          <span style={{ fontWeight: 600, fontSize: 16, color: '#111' }}>Fluxo</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LanguageToggle />
          <button
            onClick={() => router.push('/cobrar')}
            style={{ padding: '8px 18px', background: '#000', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            {t.open_app}
          </button>
        </div>
      </nav>

      <section style={{ textAlign: 'center', padding: '72px 24px 56px', maxWidth: 560, margin: '0 auto' }}>
        <div style={{ display: 'inline-block', background: '#f4f4f4', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 500, color: '#666', marginBottom: 24 }}>
          {t.landing_badge}
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 8vw, 52px)', fontWeight: 700, lineHeight: 1.15, color: '#111', margin: '0 0 20px', letterSpacing: '-0.02em' }}>
          {t.landing_title_1}<br />
          <span style={{ color: '#888' }}>{t.landing_title_2}</span>
        </h1>
        <p style={{ fontSize: 17, color: '#666', lineHeight: 1.7, margin: '0 0 36px' }}>
          {t.landing_subtitle}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => router.push('/cobrar')}
            style={{ padding: '14px 28px', background: '#000', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
          >
            {t.landing_cta}
          </button>
          <button
            onClick={() => router.push('/onboarding')}
            style={{ padding: '14px 28px', background: '#fff', color: '#111', border: '1px solid #e5e5e5', borderRadius: 14, fontSize: 15, fontWeight: 500, cursor: 'pointer' }}
          >
            {t.landing_how}
          </button>
        </div>
      </section>

      <section style={{ background: '#fafafa', borderTop: '0.5px solid #f0f0f0', borderBottom: '0.5px solid #f0f0f0', padding: '40px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 0, maxWidth: 700, margin: '0 auto' }}>
          {[
            { num: '150M+', label: t.landing_stat_users },
            { num: '< 2s', label: t.landing_stat_confirm },
            { num: '$0.001', label: t.landing_stat_fee },
            { num: '24/7', label: t.landing_stat_24 },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '20px 16px', borderRight: i < 3 ? '0.5px solid #ebebeb' : 'none' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#111', letterSpacing: '-0.02em' }}>{s.num}</div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '72px 24px', maxWidth: 640, margin: '0 auto' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111', textAlign: 'center', marginBottom: 48, letterSpacing: '-0.01em' }}>
          {t.landing_steps_title}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {steps.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {item.step}
              </div>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: '#111' }}>{item.title}</p>
                <p style={{ margin: 0, fontSize: 14, color: '#777', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: '#fafafa', borderTop: '0.5px solid #f0f0f0', padding: '64px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111', textAlign: 'center', marginBottom: 16, letterSpacing: '-0.01em' }}>
            {t.landing_why_title}
          </h2>
          <p style={{ textAlign: 'center', color: '#888', fontSize: 15, marginBottom: 40 }}>
            {t.landing_why_subtitle}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {features.map((f, i) => (
              <div key={i} style={{ background: '#fff', border: '0.5px solid #ebebeb', borderRadius: 16, padding: '20px 18px' }}>
                <div style={{ fontSize: 24, marginBottom: 12 }}>{f.icon}</div>
                <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: '#111' }}>{f.title}</p>
                <p style={{ margin: 0, fontSize: 13, color: '#888', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, color: '#111', marginBottom: 16, letterSpacing: '-0.02em' }}>
            {t.landing_ready_title}
          </h2>
          <p style={{ fontSize: 15, color: '#888', marginBottom: 32, lineHeight: 1.7 }}>
            {t.landing_ready_desc}
          </p>
          <button
            onClick={() => router.push('/onboarding')}
            style={{ padding: '16px 36px', background: '#000', color: '#fff', border: 'none', borderRadius: 16, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}
          >
            {t.landing_ready_cta}
          </button>
          <p style={{ fontSize: 12, color: '#bbb', marginTop: 16 }}>
            {t.landing_ready_note}
          </p>
        </div>
      </section>

      <footer style={{ borderTop: '0.5px solid #f0f0f0', padding: '24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <img src="/logo.svg" alt="Fluxo" style={{ width: 24, height: 24, borderRadius: 7 }} />
          <span style={{ fontWeight: 600, fontSize: 14, color: '#111' }}>Fluxo</span>
        </div>
        <p style={{ fontSize: 12, color: '#bbb', margin: 0 }}>
          {t.landing_footer}
        </p>
      </footer>

    </div>
  )
}
