const express = require('express');
const app = express();

app.set('view engine', 'ejs');

app.use(express.static('css'));
app.use(express.static('image'));

app.get('/', function (req, res) {
  res.render('index');
});

app.get('/about', function (req, res) {
    res.render('about');
  });

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
