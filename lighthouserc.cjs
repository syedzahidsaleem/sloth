/**
 * Lighthouse CI configuration — Core Web Vitals budgets for Sloth.
 *
 * Enforces Google's mobile "good" CWV thresholds:
 *   - Largest Contentful Paint (LCP) <= 2500 ms
 *   - Cumulative Layout Shift (CLS)  <= 0.1
 *   - Total Blocking Time (TBT) <= 200 ms
 */

const PORT = 5174;
const BASE_URL = `http://localhost:${PORT}`;

const LCP_BUDGET_MS = 2500;
const INP_BUDGET_MS = 200;
const CLS_BUDGET = 0.1;

module.exports = {
  ci: {
    collect: {
      url: [`${BASE_URL}/`],
      numberOfRuns: 3,
      settings: {
        preset: process.env.LHCI_FORM_FACTOR === "desktop" ? "desktop" : undefined,
        chromeFlags: "--headless --no-sandbox --disable-gpu",
        onlyCategories: [
          "performance",
          "accessibility",
          "best-practices",
        ],
      },
    },
    assert: {
      aggregationMethod: "median-run",
      assertions: {
        "largest-contentful-paint": ["error", { maxNumericValue: LCP_BUDGET_MS }],
        "cumulative-layout-shift": ["error", { maxNumericValue: CLS_BUDGET }],
        "total-blocking-time": ["error", { maxNumericValue: INP_BUDGET_MS }],
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./.lighthouseci",
    },
  },
};
