// heroku用に待ち受け
var express = require('express');
var app = express();

app.get('/', function (req, res) {
	res.send('Hello, World!');
});
app.listen(process.env.PORT || 8080);
