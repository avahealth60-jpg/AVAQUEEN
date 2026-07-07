// apps/customer/components/Skeleton.tsx — placeholder saat halaman dimuat (G3).
import React from 'react';

function Bar({ w, h = 12 }: { w: string; h?: number }) {
  return <div className="sk" style={{ width: w, height: h, margin: '8px 0' }} />;
}

export function Skeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="screen" aria-busy="true" aria-live="polite">
      <div className="sk" style={{ width: '55%', height: 26, margin: '10px 0 22px' }} />
      {Array.from({ length: cards }).map((_, i) => (
        <div className="card" key={i}>
          <Bar w="42%" />
          <Bar w="85%" />
          <Bar w="65%" />
        </div>
      ))}
    </div>
  );
}
