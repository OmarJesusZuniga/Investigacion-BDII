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
  session
  .run(`MATCH (from:Person {username: $usernameParam})-[:FRIENDS*2]-(to:Person)
  WHERE NOT (from)-[:FRIENDS]-(to) AND (from.username <> to.username)
  RETURN DISTINCT to`, {
  usernameParam : currUser.username,
  })
  .then((result) => {
      res.render('home', {recommendedList: result.records})
  })
  .catch((err) =>{
    console.log(err)
 })
});

app.get('/addWave', function (req, res) {
  res.render('wave');
});

app.get('/about', function (req, res) {
    res.render('about');
});

app.get('/friend', (req, res) =>{
  session 
  .run(`MATCH (from:Person)-[r:REQUEST]->(to:Person{email: $emailParam})
    RETURN from`, {
    emailParam : currUser.email,
  })
  .then((result) =>{
      var friendRequests = result.records;
      session
      .run(`MATCH (from:Person)-[r:FRIENDS]->(to:Person{email: $emailFriendParam})
      RETURN from`, {
          emailFriendParam : currUser.email,
      })
      .then((result) =>{
          var friendsList = result.records;
          session
          .run(`MATCH (from:Person {email: $emailParam})-[r:REQUEST]->(to:Person)
          RETURN to`, {
            emailParam : currUser.email,
          })
          .then((result) => {
            var requestsList = result.records;
            session
            .run(`MATCH (from:Person {username: $usernameParam})-[:FRIENDS*2]-(to:Person)
            WHERE NOT (from)-[:FRIENDS]-(to) AND (from.username <> to.username)
            RETURN DISTINCT to`, {
              usernameParam : currUser.username,
            })
            .then((result) => {
              res.render('friend', {friendRequests, friendsList, requestsList, recommendedList: result.records})
            })
            .catch((err) => {
              console.log(err)
            })
          })
          .catch((err) => {
            console.log(err)
        })
      })
      .catch((err) => {
          console.log(err)
      })
  })
  .catch((err) =>{
     console.log(err)
  })
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
    .then(response => { 
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
          birthDateParam: req.body.dateOfBirth
      }
      session 
      .run(`MATCH (p:Person {email: $oldEmailParam})
      SET p.email = $emailParam,
      p.password = $passwordParam, 
      p.username = $usernameParam, 
      p.birthDate = $birthDateParam
      RETURN p`, dataNeo)
      .then(result =>{
        currUser.birthdate = req.body.dateOfBirth;
        currUser.email = req.body.email;
        currUser.password = req.body.password;
        currUser.username = req.body.username;
        res.redirect('/account');
      })
      .catch (err => {
       console.log(err);
      })
});

app.post('/addPostPerson', function(req, res) {
  const email = currUser.email;
  const bodyPost = req.body.bodyPost;
  const postedDate = new Date();

  const parameters = {
    emailParam: email,
    bodyPostParam: bodyPost,
    postedDateParam: postedDate
  };

  session
  .run(`CREATE(n:Post {
      email:$emailParam, 
      bodyPost:$bodyPostParam, 
      postedDate:$postedDateParam
    }) RETURN n`, parameters 
  )
  .then(response => { 
    session
    .run(`MATCH (p:Post {email: $emailParam}), (p2:Person {username: $emailParam})
    WHERE 
    NOT (p2)-[:POSTS]->(p) 
    CREATE (p2)-[:POSTS]->(p)
    RETURN p, p2`, {
      emailParam: currUser.email,
    }) 
    .then(response => { 
      res.redirect('home');
      console.log('post added');
    })
    .catch((err) =>{
      console.log(err);
    })
  })
  .catch((err) =>{
    console.log(err);
  })
});

app.post('/sendFriendRequest', function(req, res){
  const usernameSearched = req.body.friendName;
  if (usernameSearched == "")
      return;

  session
  .run(`MATCH (p1:Person {username: $usernameP1}), (p2:Person {username: $usernameP2})
      WHERE 
      NOT (p1)-[:REQUEST]->(p2) 
      AND NOT (p2)-[:REQUEST]->(p1)
      AND NOT (p1)-[:FRIENDS]->(p2)
      AND NOT (p2)-[:FRIENDS]->(p1)
      CREATE (p1)-[:REQUEST]->(p2)
      RETURN p1, p2`, {
      usernameP1: currUser.username,
      usernameP2: usernameSearched,
  })
  .then(result => {
      res.redirect('/friend');
  })
  .catch(error => {
      console.error('Error establishing friendship:', error);
      res.render('/friend');
      
  })
});

app.post('/acceptFriend/:id', function(req, res) {
  session 
      .run(`MATCH (p1:Person {username: $usernameP1})-[r:REQUEST]->(p2:Person {username: $usernameP2})
      CREATE (p1)-[:FRIENDS]->(p2), (p2)-[:FRIENDS]->(p1)
      DELETE r`, {
      usernameP1 : req.params.id,
      usernameP2 : currUser.username,
      })
      .then(function(result){
          
          res.redirect('/friend')
      })
      .catch(function(err) {
          console.log(err);
          res.status(500).send("Error occurred");
      });
});

app.post('/declineFriend/:id', function(req, res) {
  session 
      .run(`MATCH (p1:Person {username: $usernameP1})-[r:REQUEST]->(p2:Person {username: $usernameP2})
      DELETE r`, {
      usernameP1 : req.params.id,
      usernameP2 : currUser.username,
      })
      .then(function(result){
          res.redirect('/friend')
      })
      .catch(function(err) {
          console.log(err);
          res.status(500).send("Error occurred");
      });
});

app.post('/removeFriend/:id', function(req, res) {
  session 
      .run(`MATCH (p1:Person {username: $usernameP1})-[r:FRIENDS]->(p2:Person {username: $usernameP2})
      DELETE r`, {
      usernameP1 : req.params.id,
      usernameP2 : currUser.username,
      })
      .then(function(result){
        session 
        .run(`MATCH (p1:Person {username: $usernameP2})-[r:FRIENDS]->(p2:Person {username: $usernameP1})
        DELETE r`, {
        usernameP1 : req.params.id,
        usernameP2 : currUser.username,
        })
        .then(function(result) {
          res.redirect('/friend')
        })
          
      })
      .catch(function(err) {
          console.log(err);
          res.status(500).send("Error occurred");
      });
});

app.post('/cancelRequest/:id', function(req, res) {
  console.log('d')
  session 
      .run(`MATCH (p1:Person {username: $usernameP2})-[r:REQUEST]->(p2:Person {username: $usernameP1})
      DELETE r`, {
      usernameP1 : req.params.id,
      usernameP2 : currUser.username,
      })
      .then(function(result){
          console.log('hola')
          res.redirect('/friend')
      })
      .catch(function(err) {
          console.log(err);
          res.status(500).send("Error occurred");
      });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
