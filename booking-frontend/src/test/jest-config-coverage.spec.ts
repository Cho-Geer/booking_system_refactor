/**
 * Test: jest.config.js coverageThreshold validation
 *
 * Verifies that the Jest coverage thresholds match the v2.0 specification
 * from TEST-ARCH-V2/coverage-threshold-matrix.md.
 *
 * [RED] Phase: These tests will FAIL because the current jest.config.js
 * uses global thresholds of 70% instead of the required 85%.
 */

import * as fs from 'fs';
import * as path from 'path';

const CONFIG_PATH = path.resolve(__dirname, '../../jest.config.js');

describe('jest.config.js — coverageThreshold v2.0', () => {
  let configContent: string;

  beforeAll(() => {
    configContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
  });

  describe('Global thresholds', () => {
    it('should have global lines threshold >= 85 (was 70)', () => {
      expect(configContent).toContain('lines: 85');
    });

    it('should have global branches threshold >= 80 (was 70)', () => {
      expect(configContent).toContain('branches: 80');
    });

    it('should have global functions threshold >= 85 (was 70)', () => {
      expect(configContent).toContain('functions: 85');
    });

    it('should have global statements threshold >= 85 (was 70)', () => {
      expect(configContent).toContain('statements: 85');
    });
  });

  describe('Features module (P0 core — 95/90/95)', () => {
    it('should have features glob pattern', () => {
      expect(configContent).toContain("'./src/app/features/**/*.ts'");
    });

    it('should have features lines threshold >= 95', () => {
      const match = configContent.match(
        /'\.\/src\/app\/features\/\*\*\/\*\.ts'[\s\S]*?\{[\s\S]*?lines:\s*(\d+)/,
      );
      expect(match).not.toBeNull();
      if (match) {
        expect(Number(match[1])).toBeGreaterThanOrEqual(95);
      }
    });

    it('should have features branches threshold >= 90', () => {
      const match = configContent.match(
        /'\.\/src\/app\/features\/\*\*\/\*\.ts'[\s\S]*?\{[\s\S]*?branches:\s*(\d+)/,
      );
      expect(match).not.toBeNull();
      if (match) {
        expect(Number(match[1])).toBeGreaterThanOrEqual(90);
      }
    });
  });

  describe('Shared module thresholds (85/80)', () => {
    it('should have shared glob pattern', () => {
      expect(configContent).toContain("'./src/app/shared/**/*.ts'");
    });

    it('should have shared lines threshold >= 85', () => {
      const match = configContent.match(
        /'\.\/src\/app\/shared\/\*\*\/\*\.ts'[\s\S]*?\{[\s\S]*?lines:\s*(\d+)/,
      );
      expect(match).not.toBeNull();
      if (match) {
        expect(Number(match[1])).toBeGreaterThanOrEqual(85);
      }
    });

    it('should have shared branches threshold >= 80', () => {
      const match = configContent.match(
        /'\.\/src\/app\/shared\/\*\*\/\*\.ts'[\s\S]*?\{[\s\S]*?branches:\s*(\d+)/,
      );
      expect(match).not.toBeNull();
      if (match) {
        expect(Number(match[1])).toBeGreaterThanOrEqual(80);
      }
    });
  });

  describe('Stores module thresholds (95/90)', () => {
    it('should have stores glob pattern', () => {
      expect(configContent).toContain("'./src/app/stores/**/*.ts'");
    });

    it('should have stores lines threshold >= 95', () => {
      const match = configContent.match(
        /'\.\/src\/app\/stores\/\*\*\/\*\.ts'[\s\S]*?\{[\s\S]*?lines:\s*(\d+)/,
      );
      expect(match).not.toBeNull();
      if (match) {
        expect(Number(match[1])).toBeGreaterThanOrEqual(95);
      }
    });

    it('should have stores branches threshold >= 90', () => {
      const match = configContent.match(
        /'\.\/src\/app\/stores\/\*\*\/\*\.ts'[\s\S]*?\{[\s\S]*?branches:\s*(\d+)/,
      );
      expect(match).not.toBeNull();
      if (match) {
        expect(Number(match[1])).toBeGreaterThanOrEqual(90);
      }
    });
  });

  describe('Core module thresholds (90/85)', () => {
    it('should have core glob pattern', () => {
      expect(configContent).toContain("'./src/app/core/**/*.ts'");
    });

    it('should have core lines threshold >= 90', () => {
      const match = configContent.match(
        /'\.\/src\/app\/core\/\*\*\/\*\.ts'[\s\S]*?\{[\s\S]*?lines:\s*(\d+)/,
      );
      expect(match).not.toBeNull();
      if (match) {
        expect(Number(match[1])).toBeGreaterThanOrEqual(90);
      }
    });

    it('should have core branches threshold >= 85', () => {
      const match = configContent.match(
        /'\.\/src\/app\/core\/\*\*\/\*\.ts'[\s\S]*?\{[\s\S]*?branches:\s*(\d+)/,
      );
      expect(match).not.toBeNull();
      if (match) {
        expect(Number(match[1])).toBeGreaterThanOrEqual(85);
      }
    });
  });

  describe('Exclusion patterns', () => {
    it('should exclude .module.ts files', () => {
      expect(configContent).toContain("'!src/**/*.module.ts'");
    });

    it('should exclude main.ts', () => {
      expect(configContent).toContain("'!src/main.ts'");
    });

    it('should exclude index.ts', () => {
      expect(configContent).toContain("'!src/**/index.ts'");
    });

    it('should exclude environments', () => {
      expect(configContent).toContain("'!src/environments/*'");
    });
  });
});
