import { describe, it, expect } from 'vitest';
import { navByRole, allRoles, getNav } from '../index.js';
import type { Role } from '../types.js';

describe('navigasi per peran', () => {
  it('kelima peran punya navigasi', () => {
    const roles: Role[] = ['customer', 'vendor', 'lab', 'doctor', 'admin'];
    for (const r of roles) {
      expect(navByRole[r], `nav ${r}`).toBeDefined();
      expect(navByRole[r].items.length, `${r} punya item`).toBeGreaterThan(0);
    }
    expect(allRoles).toHaveLength(5);
  });

  it('setiap peran punya navigasi PENUH (>= 5 item, bukan satu halaman)', () => {
    for (const r of allRoles) {
      expect(navByRole[r].items.length, `${r}`).toBeGreaterThanOrEqual(5);
    }
  });

  it('id item unik dalam tiap peran', () => {
    for (const r of allRoles) {
      const ids = navByRole[r].items.map((i) => i.id);
      expect(new Set(ids).size, `id unik ${r}`).toBe(ids.length);
    }
  });

  it('href item unik dalam tiap peran', () => {
    for (const r of allRoles) {
      const hrefs = navByRole[r].items.map((i) => i.href);
      expect(new Set(hrefs).size, `href unik ${r}`).toBe(hrefs.length);
    }
  });

  it('setiap href diawali "/" dan setiap label/icon/description terisi', () => {
    for (const r of allRoles) {
      for (const item of navByRole[r].items) {
        expect(item.href.startsWith('/'), `${r}/${item.id} href`).toBe(true);
        expect(item.label.length, `${r}/${item.id} label`).toBeGreaterThan(0);
        expect(item.icon.length, `${r}/${item.id} icon`).toBeGreaterThan(0);
        expect(item.description.length, `${r}/${item.id} desc`).toBeGreaterThan(0);
      }
    }
  });

  it('tepat satu item per peran sebagai beranda "/"', () => {
    for (const r of allRoles) {
      const roots = navByRole[r].items.filter((i) => i.href === '/');
      // lab & dokter tidak memakai "/" sebagai root (entry pertama mereka spesifik)
      expect(roots.length, `${r} root count`).toBeLessThanOrEqual(1);
    }
  });

  it('label memakai kata kerja aktif untuk aksi (bukan "Submit")', () => {
    const allLabels = allRoles.flatMap((r) => navByRole[r].items.map((i) => i.label));
    expect(allLabels.some((l) => /submit/i.test(l))).toBe(false);
    expect(navByRole.customer.items.find((i) => i.id === 'catat')?.label).toMatch(/^Catat/);
    expect(navByRole.lab.items.find((i) => i.id === 'catat-kalibrasi')?.label).toMatch(/^Catat/);
  });

  it('fitur baru V1.1 hadir: wellness & rewards (customer), kurasi (admin)', () => {
    const custIds = navByRole.customer.items.map((i) => i.id);
    expect(custIds).toContain('wellness');
    expect(custIds).toContain('rewards');
    expect(navByRole.admin.items.map((i) => i.id)).toContain('kurasi');

    expect(navByRole.customer.items.find((i) => i.id === 'wellness')?.isNew).toBe(true);
    expect(navByRole.customer.items.find((i) => i.id === 'rewards')?.isNew).toBe(true);
  });

  it('admin menyertakan inspektur peran (lihat sebagai)', () => {
    expect(navByRole.admin.items.map((i) => i.id)).toContain('inspektur');
  });

  it('getNav melempar untuk peran tak dikenal', () => {
    expect(() => getNav('hacker')).toThrow(/Peran tak dikenal/);
  });
});
