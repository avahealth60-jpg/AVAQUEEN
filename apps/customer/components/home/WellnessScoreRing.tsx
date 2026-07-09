// apps/customer/components/home/WellnessScoreRing.tsx — kartu skor wellness (hero gelap).
import React from 'react';
import Link from 'next/link';

export function WellnessScoreRing({ score, label }: { score: number; label: string }) {
  const r = 46;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, score)) / 100);

  return (
    <div className="score-card">
      <div className="score-card__left">
        <div className="score-card__title">Wellness Score</div>
        <div className="score-card__num">{score}</div>
        <div className="score-card__label"><span className="score-card__dot" />{label}</div>
        <Link href="/riwayat" className="score-card__detail">Detail →</Link>
      </div>
      <div className="score-card__ring">
        <svg viewBox="0 0 120 120" width="112" height="112" role="img" aria-label={`Skor ${score}`}>
          <defs>
            <linearGradient id="wsGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6EE7C7" />
              <stop offset="100%" stopColor="#14B89A" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="11" />
          <circle cx="60" cy="60" r={r} fill="none" stroke="url(#wsGrad)" strokeWidth="11" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.2,0,0,1)' }} />
          <g transform="translate(60 60)" fill="none" stroke="#FF7A9A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M0 5.5c-6-4-9-7.2-9-11a4.6 4.6 0 0 1 9-1.6 4.6 4.6 0 0 1 9 1.6c0 3.8-3 7-9 11z" transform="translate(0 -1)" fill="#FF7A9A" stroke="none" />
          </g>
        </svg>
      </div>
    </div>
  );
}
