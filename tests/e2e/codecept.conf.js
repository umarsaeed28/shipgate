const { setHeadlessWhen, setCommonPlugins } = require('@codeceptjs/configure');

setHeadlessWhen(process.env.HEADLESS);

exports.config = {
  tests: process.env.TEST_SUITE === 'smoke' ? './smoke/*_test.js' : './regression/*_test.js',
  output: './output',
  helpers: {
    Playwright: {
      url: process.env.MORTGAGE_APP_URL || 'http://localhost:3099',
      show: !process.env.HEADLESS,
      browser: 'chromium',
      waitForNavigation: 'networkidle',
      waitForTimeout: 10000,
    },
  },
  plugins: {
    allure: {
      enabled: true,
      require: 'allure-codeceptjs',
      outputDir: './allure-results',
    },
    screenshotOnFail: {
      enabled: true,
    },
    retryFailedStep: {
      enabled: true,
      retries: 2,
    },
  },
  include: {
    I: './steps_file.js',
    calculatorPage: './pages/calculator.js',
  },
  name: 'shipgate-regression',
};
