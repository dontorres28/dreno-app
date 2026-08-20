import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import CoachCard from '../components/CoachCard';
import { supabase } from '../lib/supabase';

export default function Landing() {
  const { t } = useTranslation();
  const [coaches, setCoaches] = useState<any[]>([]);

  const STEPS = [
    { n: '01', title: t('landing.step1Title'), body: t('landing.step1Body') },
    { n: '02', title: t('landing.step2Title'), body: t('landing.step2Body') },
    { n: '03', title: t('landing.step3Title'), body: t('landing.step3Body') },
    { n: '04', title: t('landing.step4Title'), body: t('landing.step4Body') },
  ];

  useEffect(() => {
    supabase
      .from('coaches')
      .select('*, profiles(name)')
      .eq('verified_status', 'verified')
      .limit(3)
      .then(({ data }) => setCoaches(data ?? []));
  }, []);

  return (
    <Layout>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section
        style={{
          minHeight: 'calc(100vh - 60px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '0 6vw 10vh',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(4.5rem, 13vw, 12rem)',
            lineHeight: 0.92,
            letterSpacing: '-0.03em',
            marginBottom: '2.5rem',
          }}
        >
          {t('landing.heroLine1')}<br />
          <span style={{ color: 'var(--red)' }}>{t('landing.heroLine2')}</span>
        </h1>

        <div style={{ maxWidth: 480, marginBottom: '3rem' }}>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: 'var(--w60)', fontWeight: 400 }}>
            {t('landing.heroSub')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: '4rem' }}>
          <Link to="/coaches" className="btn-primary">{t('landing.findCoach')}</Link>
          <Link to="/signup" className="btn-ghost">{t('landing.signUpFree')}</Link>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '2.5rem',
            flexWrap: 'wrap',
            paddingTop: '2rem',
            borderTop: '0.5px solid var(--line)',
          }}
        >
          {[
            { v: '40+', l: t('landing.verifiedCoaches') },
            { v: '12', l: t('landing.sports') },
            { v: '4.9', l: t('landing.avgRating') },
          ].map(s => (
            <div key={s.l}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.v}</p>
              <p style={{ fontSize: 13, color: 'var(--w40)', marginTop: 4, fontWeight: 500 }}>{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section style={{ padding: '10rem 6vw' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--w40)', marginBottom: '1.25rem' }}>
          {t('landing.howItWorks')}
        </p>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
            letterSpacing: '-0.03em',
            lineHeight: 0.95,
            marginBottom: '5rem',
          }}
        >
          {t('landing.fourSteps')}<br />{t('landing.noNoise')}
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.5px',
            background: 'var(--line)',
            borderRadius: 20,
            overflow: 'hidden',
          }}
        >
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              style={{
                background: 'var(--bg-1)',
                padding: '2.5rem 2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 48,
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                  color: 'var(--red)',
                }}
              >
                {s.n}
              </span>
              <p style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>{s.title}</p>
              <p style={{ fontSize: 14, color: 'var(--w60)', lineHeight: 1.6 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>


      {/* ── CTA ──────────────────────────────────────────── */}
      <section
        style={{
          padding: '10rem 6vw 12rem',
          textAlign: 'center',
          borderTop: '0.5px solid var(--line)',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(3rem, 9vw, 8rem)',
            letterSpacing: '-0.03em',
            lineHeight: 0.92,
            marginBottom: '2.5rem',
          }}
        >
          {t('landing.ctaLine1')}<br />
          <span style={{ color: 'var(--red)' }}>{t('landing.ctaLine2')}</span>
        </h2>
        <p style={{ fontSize: 18, color: 'var(--w60)', marginBottom: '2.5rem' }}>
          {t('landing.ctaSub')}
        </p>
        <Link to="/signup" className="btn-primary" style={{ fontSize: 16, padding: '16px 40px' }}>
          {t('landing.getStarted')}
        </Link>
      </section>

    </Layout>
  );
}
