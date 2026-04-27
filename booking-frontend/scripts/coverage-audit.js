#!/usr/bin/env node

/**
 * Coverage Audit Script for booking-frontend (Angular v21 + Jest)
 *
 * Purpose:
 *   - Runs Jest with --coverage
 *   - Parses the JSON coverage report (coverage/coverage-final.json)
 *   - Identifies files below threshold coverage
 *   - Outputs a formatted report listing all gaps
 *   - Returns exit code 1 if any file is below threshold
 *
 * Usage:
 *   npm run test:audit-coverage
 *   node scripts/coverage-audit.js
 *
 * Thresholds (per AGENTS.md "覆盖率阈值" table):
 *   - Overall coverage: >= 85% lines/statements/functions, >= 80% branches
 *   - Core modules (stores, services, guards, interceptors): >= 90%
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// -- Configuration -----------------------------------------------------------

const COVERAGE_DIR = path.resolve(__dirname, "..", "coverage");
const COVERAGE_JSON = path.join(COVERAGE_DIR, "coverage-final.json");
const COVERAGE_SUMMARY_JSON = path.join(COVERAGE_DIR, "coverage-summary.json");

// Thresholds (see AGENTS.md "覆盖率阈值" table)
const THRESHOLDS = {
  line: 85,       // Minimum line coverage percentage per file
  branch: 80,     // Minimum branch coverage percentage per file
  statement: 85,  // Minimum statement coverage percentage per file
  function: 85,   // Minimum function coverage percentage per file
};

// Core modules that require 90% coverage
const CORE_MODULE_PATTERNS = [
  /\.store\.ts$/,
  /\/services\//,
  /\/guards\//,
  /\/interceptors\//,
];

const CORE_THRESHOLD = 90; // Core modules require 90% coverage

// Files to exclude from coverage audit
const EXCLUDE_PATTERNS = [
  /\.d\.ts$/,
  /\/main\.ts$/,
  /\/environments\//,
  /\/node_modules\//,
];

// -- Helpers -----------------------------------------------------------------

function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some((pattern) => pattern.test(filePath));
}

function isCoreModule(filePath) {
  return CORE_MODULE_PATTERNS.some((pattern) => pattern.test(filePath));
}

function getThreshold(filePath) {
  if (isCoreModule(filePath)) {
    return CORE_THRESHOLD;
  }
  return THRESHOLDS.line;
}

function formatPercentage(value, threshold) {
  const pct = value.toFixed(1).padStart(6, " ");
  if (value >= threshold) {
    return `  ${pct}%  PASS`;
  } else if (value >= threshold * 0.85) {
    return `  ${pct}%  WARN`;
  }
  return `  ${pct}%  FAIL`;
}

function calcPct(covered, total) {
  if (total === 0) return 100;
  return (covered / total) * 100;
}

// -- Coverage Report Parser --------------------------------------------------

function parseCoverageReport() {
  if (!fs.existsSync(COVERAGE_JSON)) {
    if (fs.existsSync(COVERAGE_SUMMARY_JSON)) {
      const raw = fs.readFileSync(COVERAGE_SUMMARY_JSON, "utf-8");
      const summary = JSON.parse(raw);
      delete summary.total;

      const results = [];
      for (const [filePath, data] of Object.entries(summary)) {
        results.push({
          filePath,
          lines: {
            covered: data.lines.covered,
            total: data.lines.total,
            pct: calcPct(data.lines.covered, data.lines.total),
          },
          branches: {
            covered: data.branches.covered,
            total: data.branches.total,
            pct: calcPct(data.branches.covered, data.branches.total),
          },
          statements: {
            covered: data.statements.covered,
            total: data.statements.total,
            pct: calcPct(data.statements.covered, data.statements.total),
          },
          functions: {
            covered: data.functions.covered,
            total: data.functions.total,
            pct: calcPct(data.functions.covered, data.functions.total),
          },
        });
      }
      return results;
    }

    throw new Error(
      `Coverage report not found at ${COVERAGE_JSON} or ${COVERAGE_SUMMARY_JSON}.\n` +
        `Make sure "ng test --code-coverage --watch=false" ran successfully.`
    );
  }

  const raw = fs.readFileSync(COVERAGE_JSON, "utf-8");
  const coverageData = JSON.parse(raw);

  const results = [];
  for (const [filePath, fileCoverage] of Object.entries(coverageData)) {
    if (shouldExclude(filePath)) continue;

    const summary = fileCoverage.summary;
    results.push({
      filePath,
      lines: {
        covered: summary.lines.covered,
        total: summary.lines.total,
        pct: calcPct(summary.lines.covered, summary.lines.total),
      },
      branches: {
        covered: summary.branches.covered,
        total: summary.branches.total,
        pct: calcPct(summary.branches.covered, summary.branches.total),
      },
      statements: {
        covered: summary.statements.covered,
        total: summary.statements.total,
        pct: calcPct(summary.statements.covered, summary.statements.total),
      },
      functions: {
        covered: summary.functions.covered,
        total: summary.functions.total,
        pct: calcPct(summary.functions.covered, summary.functions.total),
      },
    });
  }

  return results;
}

// -- Untested File Scanner ---------------------------------------------------

function findUntestedFiles() {
  const srcDir = path.resolve(__dirname, "..", "src");
  const untested = [];

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && entry.name !== "environments") {
          scanDir(fullPath);
        }
      } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".spec.ts") && !entry.name.endsWith(".d.ts") && !entry.name.endsWith(".routes.ts")) {
        const specPath = fullPath.replace(/\.ts$/, ".spec.ts");
        if (!fs.existsSync(specPath)) {
          untested.push(fullPath);
        }
      }
    }
  }

  scanDir(srcDir);
  return untested;
}

// -- Report Generator --------------------------------------------------------

function generateReport(coverageResults, untestedFiles) {
  const lines = [];
  const separator = "-".repeat(80);
  const thinSep = "-".repeat(80);

  lines.push(separator);
  lines.push("  COVERAGE AUDIT REPORT -- booking-frontend");
  lines.push(`  Date: ${new Date().toISOString()}`);
  lines.push(`  Thresholds: ${THRESHOLDS.line}% line, ${THRESHOLDS.branch}% branch`);
  lines.push(`  Core modules (stores, services, guards): 90%`);
  lines.push(separator);

  // Section 1: Files Below Line Coverage Threshold
  const belowLineThreshold = coverageResults.filter(
    (f) => f.lines.pct < getThreshold(f.filePath)
  );

  lines.push("");
  lines.push("  LINE COVERAGE GAPS (below threshold)");
  lines.push(thinSep);

  if (belowLineThreshold.length === 0) {
    lines.push("  No files below line coverage threshold.  PASS");
  } else {
    for (const f of belowLineThreshold) {
      const threshold = getThreshold(f.filePath);
      const coreTag = isCoreModule(f.filePath) ? " [CORE]" : "";
      lines.push(`  ${f.filePath}${coreTag}`);
      lines.push(`    Lines:      ${formatPercentage(f.lines.pct, threshold)}`);
      lines.push(`    Branches:   ${formatPercentage(f.branches.pct, THRESHOLDS.branch)}`);
      lines.push(`    Statements: ${formatPercentage(f.statements.pct, THRESHOLDS.statement)}`);
      lines.push(`    Functions:  ${formatPercentage(f.functions.pct, THRESHOLDS.function)}`);
      lines.push("");
    }
  }

  // Section 2: Files Below Branch Coverage Threshold
  const belowBranchThreshold = coverageResults.filter(
    (f) => f.branches.pct < THRESHOLDS.branch && f.branches.total > 0
  );

  lines.push("");
  lines.push("  BRANCH COVERAGE GAPS (below threshold, with branches present)");
  lines.push(thinSep);

  if (belowBranchThreshold.length === 0) {
    lines.push("  No files below branch coverage threshold.  PASS");
  } else {
    for (const f of belowBranchThreshold) {
      const threshold = getThreshold(f.filePath);
      const coreTag = isCoreModule(f.filePath) ? " [CORE]" : "";
      lines.push(`  ${f.filePath}${coreTag}`);
      lines.push(`    Branches:   ${formatPercentage(f.branches.pct, THRESHOLDS.branch)} (${f.branches.covered}/${f.branches.total})`);
      lines.push("");
    }
  }

  // Section 3: Summary Statistics
  const totalFiles = coverageResults.length;
  const filesPassingLine = coverageResults.filter(
    (f) => f.lines.pct >= getThreshold(f.filePath)
  ).length;
  const filesPassingBranch = coverageResults.filter(
    (f) => f.branches.pct >= THRESHOLDS.branch || f.branches.total === 0
  ).length;

  const avgLine = totalFiles > 0
    ? coverageResults.reduce((sum, f) => sum + f.lines.pct, 0) / totalFiles
    : 0;
  const avgBranch = totalFiles > 0
    ? coverageResults.reduce((sum, f) => sum + f.branches.pct, 0) / totalFiles
    : 0;

  lines.push("");
  lines.push("  COVERAGE SUMMARY");
  lines.push(thinSep);
  lines.push(`  Total files analyzed:          ${totalFiles}`);
  lines.push(`  Files passing line threshold:  ${filesPassingLine}/${totalFiles}`);
  lines.push(`  Files passing branch threshold: ${filesPassingBranch}/${totalFiles}`);
  lines.push(`  Average line coverage:         ${avgLine.toFixed(1)}%`);
  lines.push(`  Average branch coverage:       ${avgBranch.toFixed(1)}%`);

  // Section 4: Untested Files
  lines.push("");
  lines.push("  UNTESTED FILES (no .spec.ts found)");
  lines.push(thinSep);

  if (untestedFiles.length === 0) {
    lines.push("  All source files have corresponding test files.  PASS");
  } else {
    for (const f of untestedFiles) {
      lines.push(`  MISSING TEST: ${f}`);
    }
  }

  // Final Verdict
  const hasLineGap = belowLineThreshold.length > 0;
  const hasBranchGap = belowBranchThreshold.length > 0;
  const overallPass = !hasLineGap && !hasBranchGap;

  lines.push("");
  lines.push(separator);
  if (overallPass) {
    lines.push("  RESULT: ALL COVERAGE THRESHOLDS MET");
  } else {
    lines.push("  RESULT: COVERAGE THRESHOLD VIOLATIONS DETECTED");
    lines.push(`  Line gaps:   ${belowLineThreshold.length} file(s)`);
    lines.push(`  Branch gaps: ${belowBranchThreshold.length} file(s)`);
  }
  lines.push(separator);

  return {
    report: lines.join("\n"),
    pass: overallPass,
    belowLineThreshold,
    belowBranchThreshold,
    untestedFiles,
    summary: {
      totalFiles,
      filesPassingLine,
      filesPassingBranch,
      avgLineCoverage: avgLine,
      avgBranchCoverage: avgBranch,
    },
  };
}

// -- JSON Report Writer ------------------------------------------------------

function writeJsonReport(report) {
  const outputPath = path.resolve(__dirname, "..", "coverage-audit-report.json");
  const jsonReport = {
    audit_date: new Date().toISOString(),
    project: "booking-frontend",
    thresholds: THRESHOLDS,
    core_threshold: 90,
    summary: report.summary,
    violations: {
      line_coverage: report.belowLineThreshold.map((f) => ({
        file: f.filePath,
        line_pct: f.lines.pct,
        branch_pct: f.branches.pct,
        threshold: getThreshold(f.filePath),
        is_core: isCoreModule(f.filePath),
      })),
      branch_coverage: report.belowBranchThreshold.map((f) => ({
        file: f.filePath,
        branch_pct: f.branches.pct,
        branch_covered: f.branches.covered,
        branch_total: f.branches.total,
        threshold: THRESHOLDS.branch,
      })),
    },
    untested_files: report.untestedFiles.map((f) => ({
      file: f,
      suggested_test: f.replace(/\.ts$/, ".spec.ts"),
    })),
    pass: report.pass,
  };

  fs.writeFileSync(outputPath, JSON.stringify(jsonReport, null, 2), "utf-8");
  console.log(`\n  Machine-readable report: ${outputPath}`);
}

// -- Main --------------------------------------------------------------------

function main() {
  console.log("  Running coverage audit for booking-frontend...\n");

  // Step 1: Run Jest tests with coverage
  console.log("  Step 1: Running jest --coverage ...");
  try {
    execSync("npx jest --coverage", {
      stdio: "inherit",
      cwd: path.resolve(__dirname, ".."),
      timeout: 120000,
    });
  } catch (err) {
    console.log("\n  Warning: Some tests may have failed, but parsing coverage report anyway...");
  }

  // Step 2: Parse coverage report
  console.log("\n  Step 2: Parsing coverage report...");
  let coverageResults;
  try {
    coverageResults = parseCoverageReport();
  } catch (err) {
    console.error(`\n  ERROR: ${err.message}`);
    process.exit(1);
  }

  // Step 3: Find untested files
  console.log("  Step 3: Scanning for untested source files...");
  const untestedFiles = findUntestedFiles();

  // Step 4: Generate report
  console.log("  Step 4: Generating coverage audit report...\n");
  const report = generateReport(coverageResults, untestedFiles);

  // Print the report
  console.log(report.report);

  // Step 5: Write JSON report
  writeJsonReport(report);

  // Step 6: Exit code
  if (!report.pass) {
    console.log("\n  Coverage audit FAILED -- exit code 1");
    process.exit(1);
  } else {
    console.log("\n  Coverage audit PASSED -- exit code 0");
    process.exit(0);
  }
}

main();
