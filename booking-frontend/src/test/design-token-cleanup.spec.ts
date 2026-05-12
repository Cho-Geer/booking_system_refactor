/**
 * Phase 1 — Design Token Cleanup Verification Tests
 *
 * TDD RED → GREEN
 * These tests verify that all 4 Design Token Cleanup tasks
 * from the Admin Dashboard Implementation Plan are completed.
 *
 * P1.1: No `bg-opacity-*` Tailwind utility classes remain anywhere
 * P1.2: `particles.js` is absent from all dependency lists and imports
 * P1.3: No Font Awesome `fa-*` icon classes remain (esp. in admin services)
 * P1.4: `.skeleton` shimmer animation class exists in global styles
 */

import * as fs from 'fs';
import * as path from 'path';

// This file is at booking-frontend/src/test/design-token-cleanup.spec.ts
// __dirname resolves to .../booking-frontend/src/test/
const SRC_ROOT = path.resolve(__dirname, '..');             // → .../booking-frontend/src/
const FRONTEND_ROOT = path.resolve(__dirname, '../..');     // → .../booking-frontend/

// ─── P1.1: bg-opacity-* → /10 syntax ──────────────────────────────────────

describe('P1.1 — bg-opacity-* → /10 syntax', () => {
  const sourceExtensions = ['.html', '.scss', '.css', '.ts'];
  const excludeDirs = ['node_modules', '.angular', 'coverage', 'dist'];

  /**
   * Recursively walk source files and collect those matching bg-opacity-*.
   */
  function findBgOpacityUsage(): { file: string; lines: string[] }[] {
    const results: { file: string; lines: string[] }[] = [];

    function walkDir(dir: string) {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (excludeDirs.includes(entry.name) || entry.name.startsWith('.')) continue;
          walkDir(path.join(dir, entry.name));
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (!sourceExtensions.includes(ext)) continue;
          const filePath = path.join(dir, entry.name);
          const content = fs.readFileSync(filePath, 'utf-8');
          const lines = content.split('\n');
          const matchedLines = lines.filter((l) => l.includes('bg-opacity-'));
          if (matchedLines.length > 0) {
            results.push({ file: filePath, lines: matchedLines });
          }
        }
      }
    }

    walkDir(path.join(SRC_ROOT, 'app'));
    walkDir(path.join(SRC_ROOT, 'environments'));
    walkDir(path.join(SRC_ROOT, 'styles.scss'));
    return results;
  }

  it('[RED] should have zero bg-opacity-* usages in any source file', () => {
    const violations = findBgOpacityUsage();
    if (violations.length > 0) {
      const detail = violations
        .map((v) => `  ${v.file}:\n${v.lines.map((l) => `    - ${l.trim()}`).join('\n')}`)
        .join('\n');
      expect(violations).toHaveLength(0);
    }
    expect(violations).toHaveLength(0);
  });

  it('[RED] should use /10 syntax instead of bg-opacity-* (spot check)', () => {
    // Verify the codebase uses the modern syntax in known locations
    const dashboardHtml = fs.readFileSync(
      path.join(SRC_ROOT, 'app', 'features', 'admin', 'pages', 'dashboard', 'dashboard.component.html'),
      'utf-8'
    );
    // The dashboard should have /30 style opacity modifiers
    const hasModernOpacity = /\w+\/[0-9]{2}/.test(dashboardHtml);
    expect(hasModernOpacity).toBe(true);
  });
});

// ─── P1.2: Remove particles.js ────────────────────────────────────────────

describe('P1.2 — Remove particles.js from dependencies', () => {
  it('[RED] should have no particles.js dependency in package.json', () => {
    const pkgJsonPath = path.join(FRONTEND_ROOT, 'package.json');
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));

    const allDeps = {
      ...(pkgJson.dependencies || {}),
      ...(pkgJson.devDependencies || {}),
      ...(pkgJson.optionalDependencies || {}),
    };

    const particleKeys = Object.keys(allDeps).filter(
      (key) => key.includes('particles') || key.includes('tsparticles') || key.includes('ngx-particles')
    );

    expect(particleKeys).toHaveLength(0);
  });

  it('[RED] should have no particles.js imports in any source file', () => {
    // Check a broad set of source files for "particles" references
    const sourceExtensions = ['.ts', '.html', '.js'];
    const excludeDirs = ['node_modules', '.angular', 'coverage', 'dist'];
    const results: string[] = [];

    function walkDir(dir: string) {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (excludeDirs.includes(entry.name) || entry.name.startsWith('.')) continue;
          walkDir(path.join(dir, entry.name));
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (!sourceExtensions.includes(ext)) continue;
          const content = fs.readFileSync(path.join(dir, entry.name), 'utf-8');
          if (/particles|tsparticles|ngx-particles/i.test(content)) {
            results.push(path.join(dir, entry.name));
          }
        }
      }
    }

    walkDir(path.join(SRC_ROOT, 'app'));

    if (results.length > 0) {
      expect(results).toHaveLength(0);
    }
    expect(results).toHaveLength(0);
  });
});

// ─── P1.3: fa-cutlery → pi-briefcase ──────────────────────────────────────

describe('P1.3 — Font Awesome to PrimeIcons migration', () => {
  const adminPages = [
    'dashboard/dashboard.component.html',
    'service-management/service-management.component.html',
    'appointment-management/appointment-management.component.html',
    'user-management/user-management.component.html',
  ];

  it('[RED] should have no fa-* icon classes in admin page templates', () => {
    for (const page of adminPages) {
      const filePath = path.join(SRC_ROOT, 'app', 'features', 'admin', 'pages', page);
      const content = fs.readFileSync(filePath, 'utf-8');
      // Look for Font Awesome icon patterns like class="fa ..." or class="fa-..."
      const faMatches = content.match(/fa-[a-z0-9-]+/gi);
      if (faMatches && faMatches.length > 0) {
        expect({ file: page, matches: faMatches }).toEqual({ file: page, matches: null });
      }
      expect(faMatches).toBeNull();
    }
  });

  it('[RED] should use PrimeIcons (pi pi-*) in the services section', () => {
    const serviceMgmtPath = path.join(
      SRC_ROOT,
      'app',
      'features',
      'admin',
      'pages',
      'service-management',
      'service-management.component.html'
    );
    const content = fs.readFileSync(serviceMgmtPath, 'utf-8');
    // Verify PrimeIcons are used in service cards and stat boxes
    const piWrenchCount = (content.match(/pi pi-wrench/g) || []).length;
    expect(piWrenchCount).toBeGreaterThan(0);
  });
});

// ─── P1.4: .skeleton shimmer animation class ──────────────────────────────

describe('P1.4 — .skeleton shimmer animation class in global styles', () => {
  const stylesScssPath = path.join(SRC_ROOT, 'styles.scss');

  it('[RED] should find styles.scss', () => {
    expect(fs.existsSync(stylesScssPath)).toBe(true);
  });

  it('[RED] should have @keyframes shimmer defined', () => {
    const content = fs.readFileSync(stylesScssPath, 'utf-8');
    expect(content).toContain('@keyframes shimmer');
    // Verify it has a proper animation with position change
    expect(content).toContain('background-position');
  });

  it('[RED] should have .skeleton class with shimmer animation', () => {
    const content = fs.readFileSync(stylesScssPath, 'utf-8');
    expect(content).toContain('.skeleton');

    // Extract the .skeleton class block and verify animation property
    const skeletonMatch = content.match(/\.skeleton\s*\{[^}]+\}/);
    expect(skeletonMatch).not.toBeNull();

    if (skeletonMatch) {
      const skeletonBlock = skeletonMatch[0];
      expect(skeletonBlock).toContain('animation');
      expect(skeletonBlock).toContain('shimmer');
      expect(skeletonBlock).toContain('background');
      expect(skeletonBlock).toContain('linear-gradient');
    }
  });

  it('[RED] should have --animate-shimmer CSS variable', () => {
    const content = fs.readFileSync(stylesScssPath, 'utf-8');
    expect(content).toContain('--animate-shimmer');
  });

  it('[RED] should use the .skeleton class in loading states across the app', () => {
    // Verify loading skeletons in key components
    const skeletonFiles = [
      'app/features/booking/time-slot-picker/time-slot-picker.component.html',
      'app/features/booking/service-selection/service-selection.component.html',
      'app/features/profile/profile.component.html',
      'app/features/my-bookings/my-bookings.component.html',
    ];

    for (const filePath of skeletonFiles) {
      const fullPath = path.join(SRC_ROOT, ...filePath.split('/'));
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        expect(content).toContain('skeleton');
      }
    }
  });
});
