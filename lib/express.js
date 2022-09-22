// heroku用に待ち受け
const express = require("express");

module.exports = {
  init: () => {
    const app = express();
    app.get("/", function (req, res) {
      res.send("Hello, World!");
    });
    app.listen(process.env.PORT || 8080);
  },
};
