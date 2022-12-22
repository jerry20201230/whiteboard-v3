const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const port = process.env.PORT || 3000;
const mysql = require('mysql2');
const session = require('express-session');
const path = require("path")

var sql_Connect = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  port: process.env.MYSQLPORT,
  database: process.env.MYSQLDATABASE
});
sql_Connect.connect(function (err) {
  console.log(err ? err : "connected to sql server")
});

app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true
}));

app.use(express.static(path.join(__dirname, 'static')));


app.get('/', (req, res) => {

  if (req.session.loggedin) {
    // Output username 
    res.sendFile(__dirname + '/index.html');

  } else {
    // Not logged in
    res.sendFile(__dirname + '/login.html');
  }

});


app.post("/account/check", (req, res) => {
  if (req.session.loggedin) {
    console.log({ "code": "success", "login": true, "account": req.session.username, "nickname": req.session.nickname })
    res.send(JSON.stringify({ "code": "success", "login": true, "account": req.session.username, "nickname": req.session.nickname }))
  } else {
    res.send(JSON.stringify({ "code": "success", "login": false, "account": null }))
  }
})
app.post("/account/logout", (req, res) => {

  req.session.loggedin = false
  res.send(JSON.stringify({ "code": "success", login: req.session.loggedin }))
})


app.get(/js|css|html/, (req, res) => {
  res.sendFile(__dirname + __filename)
})
app.get('/lib/health', (req, res) => {
  res.sendStatus(200)
})
app.get('/dist', (req, res) => {
  res.status(403).sendFile(__dirname + '/lib/block.html');
})


app.post('/account/login', function (request, response) {
  // Capture the input fields

  console.log(request.body.user)
  let username = '@' + request.body.user.account;
  let password = request.body.user.pass;
  // Ensure the input fields exists and are not empty
  if (username && password) {
    // Execute SQL query that'll select the account from the database based on the specified username and password
    sql_Connect.query('SELECT * FROM userData WHERE user_id = ? AND user_password = ?', [username, password], function (error, results, fields) {
      // If there is an issue with the query, output the error
      if (error) throw error;
      // If the account exists

      if (results.length > 0) {
        // Authenticate the user
        request.session.loggedin = true;
        request.session.username = username;
        request.session.nickname = results[0].user_nickname

        response.send(JSON.stringify({ 'code': 'success', 'par': { 'user': username } }));
      } else {
        response.send(JSON.stringify({ 'code': 'failed', 'par': { 'text': '帳號或密碼輸入錯誤，或是尚未註冊成功。' } }));
      }

      response.end();
    });
  } else {
    response.send(JSON.stringify({ 'code': 'failed', 'par': { 'text': '帳號或密碼輸入錯誤，或是尚未註冊成功。' } }));
    response.end();
  }
});


app.post("/account/signup/getid", (req, res) => {
  var num = getRandomInt(100000, 999999),
      result = 1;
  while (result == 0) {
    sql_Connect.query('SELECT * FROM userData WHERE user_id = ?', "@user-" + num, function (err, results, fields) {

      if (err) throw err
      if (results.length == 0) { result = 0 }
      else { num = getRandomInt(100000, 999999) }

    })
  }
  res.send(JSON.stringify({"code":"success","par":{"uid":"user-"+num}}))
})
app.post("/account/signup/checkid", (req, res) => {
  sql_Connect.query('SELECT * FROM userData WHERE user_id = ?', req.body.uid, function (err, results, fields) {

    if (err) throw err
    if (results.length == 0) { res.send(JSON.stringify({"code":"success","par":{"used":false}})) }
    else { res.send(JSON.stringify({"code":"success","par":{"used":true}})) }

  })

})


app.post("/account/signup", (req, res) => {
//判斷ID存在與否
  sql_Connect.query('SELECT * FROM userData WHERE user_id = ?', req.body.uid, function (err, results, fields) {

    if (err) throw err
    if (results.length !== 0) {res.send(JSON.stringify({"code":"failed","par":{"uid_used":true},"text":"這個ID已經被註冊過，請使用其他ID"}));res.end();return;}

  })

  sql_Connect.query(
    `INSERT INTO userData(user_id,user_nickname,user_password)
     VALUES(${req.body.uid},${req.body.nickname},${req.body.pass})`, function (err, results, fields) {

    if (err) throw err
   

  })

})




app.get('*', (req, res) => {
  res.status(404).sendFile(__dirname + '/lib/404.html')
})





var chatId = 0


function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


io.on('connection', (socket) => {
  console.log('a user connected');
  socket.emit("data-update", { chat_id: chatId })

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });


  socket.on("CanvasUpdate", (e) => {

    socket.broadcast.emit("CanvasUpdate", e)
  })
  socket.on("ChatMsg", (e) => {
    socket.broadcast.emit("ChatMsg", e);
    console.log(e)
    chatId++
  })


});





server.listen(port, '0.0.0.0', () => {
  console.log(`running on ${__dirname}:${port}`);
});