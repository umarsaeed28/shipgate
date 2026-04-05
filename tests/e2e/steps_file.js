module.exports = function () {
  return actor({
    loginAs(username, password) {
      this.amOnPage("/login");
      this.fillField("#username", username);
      this.fillField("#password", password);
      this.click("#login-btn");
      this.waitInUrl("/welcome", 10);
    },
  });
};
