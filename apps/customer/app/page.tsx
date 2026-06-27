import { EDU_DISCLAIMER } from '@ava/ui';
export default function Home() {
  return (<main style={{fontFamily:'system-ui',padding:24}}>
    <h1>AVA Health — Beranda</h1>
    <p>Input hasil pemeriksaan untuk mendapat penjelasan edukatif.</p>
    <p style={{fontSize:12,color:'#64748B'}}>{EDU_DISCLAIMER}</p>
  </main>);
}
