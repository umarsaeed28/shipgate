/** @type {import('codeceptjs').CodeceptJS.Config} */
const config = {
  tests: "./smoke/*_test.js",
  output: "./output",
  helpers: {
    Playwright: {
      browser: "chromium",
      url: process.env.DUMMY_APP_URL || "http://localhost:3099",
      show: false,
      waitForTimeout: 5000,
    },
  },
  include: {
    I: "./steps_file.js",
  },
  plugins: {
    allure: {
      enabled: true,
      require: "allure-codeceptjs",
      outputDir: "./allure-results",
    },
  },
  mocha: {
    reporterOptions: {
      reportDir: "./output",
    },
  },
  name: "smoke",
};

module.exports = { config };
