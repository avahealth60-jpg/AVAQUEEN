-- 0008_analysis_write.sql
-- Customer boleh menyimpan hasil analisis UNTUK reading miliknya sendiri.
-- Aman karena kepemilikan reading diverifikasi; invariant SaMD (is_educational,
-- disclaimer) tetap dijaga CHECK di tabel analysis_results.
-- Triase dihitung @ava/domain (deterministik, teruji) lalu disimpan lewat ini.

create policy "customer writes analysis for own readings" on analysis_results
  for insert with check (
    exists (
      select 1 from health_readings r
      where r.id = analysis_results.reading_id
        and r.customer_id = auth.uid()
    )
  );
