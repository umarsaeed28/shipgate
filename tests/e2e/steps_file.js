module.exports = function () {
  return actor({
    login() {
      this.amOnPage("/login");
      this.fillField("#username", "admin");
      this.fillField("#password", "admin");
      this.click("#login-btn");
      this.waitInUrl("/calculator", 10);
    },
  });
};
