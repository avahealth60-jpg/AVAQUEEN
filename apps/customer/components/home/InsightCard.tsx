// apps/customer/components/home/InsightCard.tsx — insight AI harian (gelap, aksen).
import React from 'react';

export function InsightCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="insight">
      <span className="insight__tag">AI</span>
      <div className="insight__title">Insight Hari Ini</div>
      <div className="insight__head">{title}</div>
      <div className="insight__body">{body}</div>
      <div className="insight__glow" aria-hidden>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9">
          <circle cx="12" cy="12" r="9" /><circle cx="9" cy="10" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="10" r="1.3" fill="currentColor" stroke="none" /><path d="M9 15c1 1 5 1 6 0" />
        </svg>
      </div>
    </div>
  );
}
