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

var sql_Connect = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  port: process.env.MYSQLPORT,
  database: process.env.MYSQLDATABASE,

  // 無可用連線時是否等待pool連線釋放(預設為true)
  waitForConnections: true,
  // 連線池可建立的總連線數上限(預設最多為10個連線數)
  connectionLimit: 15
});


app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true
}));
app.use(express.json());
//app.use(express.urlencoded({ extended: true }));
/*


*/
app.use('/lib', express.static(__dirname + '/lib'));

app.use("/",express.static(path.join(__dirname, 'static')));

app.get('/', (req, res) => {

  if (req.session.loggedin) {

    res.sendFile(__dirname + '/index.html');

  } else {

    res.sendFile(__dirname + '/login.html');
  }

});


app.post("/account/check", (req, res) => {
  if (req.session.loggedin) {
    console.log({ "code": "success", "login": true, "account": req.session.username, "nickname": req.session.nickname })
    res.send(JSON.stringify({ "code": "success", "login": true, "account": req.session.username, "nickname": req.session.nickname }))
  } else {
    res.send(JSON.stringify({ "code": "success", "login": false, "account": "尚未登入", "nickname": "尚未登入的使用者" }))
  }
})
app.post("/account/logout", (req, res) => {
  if (req.body.next) {
    res.sendFile(__dirname + "/login.html")
    req.session.switching_account = true
    req.session.loggedin = false
    req.session.next_path = req.body.next
  } else {
    req.session.destroy();
    res.send(JSON.stringify({ "code": "success", "login": false }))
  }
})
app.get("/file", (req, res) => {
  res.sendFile(__dirname + "/index.html")
})
app.get("/meet", (req, res) => {
  res.sendFile(__dirname + "/meet.html")
})

app.get(/js|css|html|/, (req, res) => {
  res.sendFile(__dirname + req.path)
})
app.get(/icon|.png/, (req, res) => {
  res.sendFile(__dirname + req.path)
})
app.get('/lib/health', (req, res) => {
  res.sendStatus(200)
})

app.get('*', (req, res) => {
 
  console.log(404)
  res.status(404).sendFile(__dirname+"/404.html")
})


app.post("/file/check", (req, res) => {
  var uid = req.session.loggedin ? req.session.username : "@all_know_link_user";
  sql_Connect.getConnection(function (err, connection) {
    if (err) throw err
    connection.query('SELECT * FROM drawData WHERE fileID = ?', req.body.fileID, function (err, results, fields) {

      if (err) throw err
      if (results.length !== 0 && results.length < 2) {

        for (i = 0; i < JSON.parse(results[0].share_with).user.length; i++) {
          if (JSON.parse(results[0].share_with).user[i] == uid || JSON.parse(results[0].share_with).user[i] == "@all_know_link_user") {
            if (!JSON.parse(results[0].share_with).role[i] !== "disabled") {
              res.send(JSON.stringify({ "code": "success", "par": { "code": 200, "text": "找到1筆資料", "file": results, "user": uid } })); res.end(); connection.release(); return;
            } else {
              res.send(JSON.stringify({ "code": "failed", "par": { "code": 403, "text": "無法存取檔案", "user": uid } }));
              res.end(); connection.release(); return
            }
          }
        }
        res.send(JSON.stringify({ "code": "failed", "par": { "code": 403, "text": "無法存取檔案", "user": uid } }));
        res.end(); connection.release(); return
        //res.send(JSON.stringify({ "code": "success", "par": {"code":200, "text": "找到檔案","file":results } }));; 

      } else {
        res.send(JSON.stringify({ "code": "failed", "par": { "code": 404, "text": "找不到檔案", "user": uid } })); res.end(); connection.release(); return;
      }
    })
  })
})

app.post("/file/get/example", (req, res) => {
  sql_Connect.getConnection(function (err, connection) {
    if (err) throw err
    connection.query('SELECT * FROM drawData WHERE data_type = ?', "example", function (err, results, fields) {

      if (err) throw err
      res.send({ code: "success", par: { data: results } })
      connection.release();
    })
  })
})

app.post("/file/save", (req, res) => {

  console.log(req.body)


  if (req.body.fileID) { //如果檔案已經存在

  } else {

  }
})

app.post("/file/create", (req, res) => {
  if (req.session.username === "@guest" || req.session.username == null || req.session.username == undefined || req.session.username === "@all_know_link_user") {
    res.send(JSON.stringify({ "code": "failed", "status": 403, "par": {}, "text": "請使用一般帳號登入" }))
  } else {
    var num = getRandomInt(100000, 999999),
      result = 1;
    while (result == 0) {
      sql_Connect.getConnection(function (err, connection) {
        if (err) throw err
        connection.query('SELECT * FROM drawData WHERE fileID = ?', num, function (err, results, fields) {

          if (err) throw err
          if (results.length == 0) { result = 0 }
          else { num = getRandomInt(100000, 999999) }
          connection.release();
        })
      })
    }
    sql_Connect.getConnection(function (err, connection) {
      if (err) throw err
      connection.query(
        `INSERT INTO drawData(owner_nickname,owner_id,data,data_type,fileID,share_with,filename,summary)
         VALUES("${req.body.user.account}","${req.session.username}","{}","normal","${num}","{"user":[${req.session.username}],"role":["editor"]}","${req.body.file.name}","描述這個文件...")`, function (err, results, fields) {

        if (err) throw err

        connection.release();
      })

    })
    res.send(JSON.stringify({ "code": "success", "par": { "id": num } }))

  }

  res.end()
})


app.post("/account/signup"), (req, res) => {
  //判斷ID存在與否
  console.log(req.body)
  if (req.body.uid.length - 1 < 5 || req.body.uid.length > 20 || IfStrIsBlank(req.body.uid)) {
    res.send(JSON.stringify({ "code": "failed", "par": { "uid_used": null, "text": `ID需在5到20個字元之間` } }))
    res.end(); // end the response
    return;

  } else if (req.body.uid.includes("@")) {
    res.send(JSON.stringify({ "code": "failed", "par": { "uid_used": null, "text": `ID不能包含2個"@"` } }))
    res.end(); // end the response
    return;
  } else if (req.body.uid.includes(" ")) {
    res.send(JSON.stringify({ "code": "failed", "par": { "uid_used": null, "text": `ID不能包含空白，請使用底線"_"` } }))
    res.end(); // end the response
    return;
  }
  sql_Connect.getConnection(function (err, connection) {
    if (err) throw err
    connection.query('SELECT * FROM userData WHERE user_id = ?', '@' + req.body.uid, function (err, results, fields) {

      if (err) throw err
      if (results.length !== 0) { res.send(JSON.stringify({ "code": "failed", "par": { "uid_used": true, "text": "這個ID已經被註冊過，請使用其他ID" } })); res.end(); return; }
      connection.release();
    })
  })
  sql_Connect.getConnection(function (err, connection) {
    if (err) throw err
    connection.query(
      `INSERT INTO userData(user_id,user_nickname,user_password)
     VALUES("${"@" + req.body.uid}","${req.body.nickname}","${req.body.pass}")`, function (err, results, fields) {

      if (err) throw err

      connection.release();
    })
    res.send(JSON.stringify({ "code": "success", "par": { "uid_used": false, "text": `註冊成功，請記住你的ID(${req.body.uid})和密碼` } }))
    res.end(); // end the response

  })
}
app.post('/account/login', function (request, response) {
  // Capture the input fields

  console.log(request.body.user)
  let username = '@' + request.body.user.account;
  let password = request.body.user.pass;

  if (request.session.loggedin) {
    response.send(JSON.stringify({ 'code': 'reload', 'par': { 'text': '正在重新導向...' } }));
    return;
  }

  // Ensure the input fields exists and are not empty
  if (username && password) {
    sql_Connect.getConnection(function (err, connection) {
      if (err) throw err
      connection.query('SELECT * FROM userData WHERE user_id = ? AND user_password = ?', [username, password], function (error, results, fields) {
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
        connection.release();
      })
    })
  } else {
    response.send(JSON.stringify({ 'code': 'failed', 'par': { 'text': '帳號或密碼輸入錯誤，或是尚未註冊成功。' } }));
    response.end();
  }
});
app.post("/account/signup/getid", (req, res) => {
  var num = getRandomInt(100000, 999999),
    result = 1;
  while (result == 0) {
    sql_Connect.getConnection(function (err, connection) {
      if (err) throw err
      connection.query('SELECT * FROM userData WHERE user_id = ?', "@user-" + num, function (err, results, fields) {

        if (err) throw err
        if (results.length == 0) { result = 0 }
        else { num = getRandomInt(100000, 999999) }
        connection.release();
      })
    })
  }
  res.send(JSON.stringify({ "code": "success", "par": { "uid": "user-" + num } }))
})
app.post("/account/signup/checkid", (req, res) => {
  sql_Connect.getConnection(function (err, connection) {
    if (err) throw err
    connection.query('SELECT * FROM userData WHERE user_id = ?', req.body.uid, function (err, results, fields) {

      if (err) throw err
      if (results.length == 0) { res.send(JSON.stringify({ "code": "success", "par": { "used": false } })) }
      else { res.send(JSON.stringify({ "code": "success", "par": { "used": true } })) }

    })
    connection.release();
  })

})
app.post("/share/getcode", (req, res) => {

})



app.post("*", (req, res) => {
  console.log("post")
  if (req.body.action == "signup") {
    //判斷ID存在與否
    console.log(req.body)
    if (req.body.uid.length - 1 < 5 || req.body.uid.length > 20 || IfStrIsBlank(req.body.uid)) {
      res.send(JSON.stringify({ "code": "failed", "par": { "uid_used": null, "text": `ID需在5到20個字元之間` } }))
      res.end(); // end the response
      return;

    } else if (req.body.uid.includes("@")) {
      res.send(JSON.stringify({ "code": "failed", "par": { "uid_used": null, "text": `ID不能包含2個"@"` } }))
      res.end(); // end the response
      return;
    } else if (req.body.uid.includes(" ")) {
      res.send(JSON.stringify({ "code": "failed", "par": { "uid_used": null, "text": `ID不能包含空白，請使用底線"_"` } }))
      res.end(); // end the response
      return;
    }
    sql_Connect.getConnection(function (err, connection) {
      if (err) throw err
      connection.query('SELECT * FROM userData WHERE user_id = ?', '@' + req.body.uid, function (err, results, fields) {

        if (err) throw err
        if (results.length !== 0) { res.send(JSON.stringify({ "code": "failed", "par": { "uid_used": true, "text": "這個ID已經被註冊過，請使用其他ID" } })); res.end(); return; }
        connection.release();
      })
    })
    sql_Connect.getConnection(function (err, connection) {
      if (err) throw err
      connection.query(
        `INSERT INTO userData(user_id,user_nickname,user_password)
   VALUES("${"@" + req.body.uid}","${req.body.nickname}","${req.body.pass}")`, function (err, results, fields) {

        if (err) throw err

        connection.release();
      })
      res.send(JSON.stringify({ "code": "success", "par": { "uid_used": false, "text": `註冊成功，請記住你的ID(${req.body.uid})和密碼` } }))
      res.end(); // end the response

    })
  }
})


var chatId = 0


function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function IfStrIsBlank(str) {
  let _arr = str.split(" ")
  for (i = 0; i < _arr.length; i++) {

    if (_arr[i] !== " " && _arr[i] !== "") {
      return false
    }
  }

  return true
}

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.emit("data-update", { chat_id: chatId })

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

 
  /* socket.on("CanvasUpdate", (e) => {

     socket.broadcast.emit("CanvasUpdate", e)
   })*/
  socket.on("ChatMsg", (e) => {
    socket.broadcast.emit("ChatMsg", e);
    console.log(e)
    chatId++
  })


});





server.listen(port, '0.0.0.0', () => {
  console.log(`running on ${__dirname}:${port}`);
});



