// CodeceptJS config driven by env so the runner can target any staging URL and
// a specific generated test file. Generated tests live only under tests/**.
exports.config = {
  tests: process.env.QA_TEST_FILE || "./**/*_test.js",
  output: process.env.QA_OUTPUT_DIR || "./output",
  helpers: {
    Playwright: {
      url: process.env.QA_BASE_URL || "http://localhost:3000",
      show: false,
      browser: "chromium",
      waitForTimeout: 15000,
    },
  },
  name: "qa-platform",
};
