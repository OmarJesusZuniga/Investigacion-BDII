const express = require('express');

class Person {
  constructor(email, username, password, birthdate) {
      this.email = email;
      this.username = username;
      this.password = password;
      this.birthdate = birthdate;
  }
}

let currUser = new Person();

const path = require('path');
var neo4j = require('neo4j-driver');

const driver = neo4j.driver('bolt://127.0.0.1', neo4j.auth.basic('neo4j', '12345678'));
const session = driver.session();

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static('views')); // Static Files
app.use(express.urlencoded({extended: true}));

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
  res.render('account', {person : currUser});
});

app.post('/register/addPerson', function(req, res) {
  const email = req.body.email;
  const username = req.body.username;
  const password = req.body.password;
  const birthDate = req.body.dateOfBirth;

  const parameters = {
    emailParam: email,
    passwordParam: password,
    usernameParam: username,
    birthDateParam: birthDate
  };

  session
    .run(`CREATE(n:Person {
        email:$emailParam, 
        password:$passwordParam, 
        username:$usernameParam,
        birthDate:$birthDateParam
    }) RETURN n`, 
    parameters 
    )
    .then(response => { // Change the variable name here
      res.redirect('/');
      console.log('person added');
    })
    .catch((err) =>{
      console.log(err);
    })
});

app.post('/getPerson', function(req, res) {
    
  const email = req.body.email;
  const password = req.body.password;

  const parameters = {
      emailParam: email,
      passwordParam: password,
  };

  session .run(`MATCH(n:Person) WHERE n.email = $emailParam AND n.password = $passwordParam RETURN n`, parameters)
    .then(function(result){
      if (result.records.length > 0) {
        const record = result.records[0]; // Get the first record from the records array
        const node = record.get('n'); // Get the node
        
        currUser.email = node.properties.email;
        currUser.password = node.properties.password;
        currUser.birthdate = node.properties.birthDate;
        currUser.username = node.properties.username;
        
        res.redirect('/account');
    } else {
        // Handle case where no matching user is found
        console.log("Invalid user");

        //res.status(401).send("Invalid user");
      }
    })
    .catch(function(err) {
      console.log(err);
      res.status(500).send("Error occurred");
    });
});

app.post('/modifyAccount', function(req,res){
  
      const dataNeo = {
          oldEmailParam: currUser.email,
          emailParam: req.body.email,
          passwordParam: req.body.password,
          usernameParam: req.body.username,
          secondNameParam: req.body.dateOfBirth
      }
      session 
      .run(`MATCH (p:Person {email: $oldEmailParam})
      SET p.email = $emailParam,
      p.password = $passwordParam, 
      p.userame = $usernameParam, 
      p.birthDate = $birthDateParam
      RETURN p`, dataNeo)
      .then(result =>{
          res.render('/account')
      })
      .catch (err => {
       console.log(err);
      })
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
