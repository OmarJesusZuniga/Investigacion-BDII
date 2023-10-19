const express = require('express');
const app = express();

app.set('view engine', 'ejs');

app.use(express.static('css'));
app.use(express.static('image'));

app.get('/', function (req, res) {
  res.render('index');
});

app.get('/register', function (req, res) {
  res.render('register');
});

app.get('/home', function (req, res) {
  res.render('home');
});

app.get('/addWave', function (req, res) {
  res.render('wave');
});

app.get('/about', function (req, res) {
    res.render('about');
});

app.get('/friend', function (req, res) {
  res.render('friend');
});

app.get('/account', function (req, res) {
  res.render('account');
});


app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
