const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const port = process.env.PORT || 3000;
const mysql = require('mysql2');
const session = require('express-session');

const sql_Connect = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  port: process.env.MYSQLPORT,
  database: process.env.MYSQLDATABASE        
});
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});
app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/login.html');
});
app.get(/js|css|html/, (req, res) => {
  res.sendFile(__dirname + __filename)
})
app.get('/lib/health', (req, res) => {
  res.sendStatus(200)
})
app.get('/dist',(req,res) =>{
  res.status(403).sendFile(__dirname + '/lib/block.html');
})



sql_Connect.connect(function(err) {
 console.log(err?err:"connected to sql server")
});
app.post('/auth',function(request, response) {
	// Capture the input fields
 
  console.log(request.body.user)
	let username ='@'+request.body.user.account;
	let password = request.body.user.pass;
	// Ensure the input fields exists and are not empty
	if (username && password) {
		// Execute SQL query that'll select the account from the database based on the specified username and password
		sql_Connect.query('SELECT * FROM userData WHERE user_id = ? AND user_password = ?', [username, password], function(error, results, fields) {
			// If there is an issue with the query, output the error
			if (error) throw error;
			// If the account exists
      console.log(results)
			if (results.length > 0) {
				// Authenticate the user
				request.session.loggedin = true;
				request.session.username = username;
				// Redirect to home page
				response.redirect('/');
			} else {
				response.send('Incorrect Username and/or Password!');
			}			
      
			response.end();
		});
	} else {
		response.send('Please enter Username and Password!');
		response.end();
	}
});
app.get('*', (req, res) => {
  res.status(404).sendFile(__dirname + '/lib/404.html')
})





var user = {
  IdList : ["@not_logged_in_user", "@admin"],
  PassList :  ["", "tgedqa123"],
  TakenList : [101010,0]
}



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

  socket.on("loginData", (e) => {
    console.log(e)
    console.log(socket.id)

    var status = false
    var random = getRandomInt(100000,999999);
    var userIndex;
    for (i = 0; i < user.IdList.length; i++) {

      if (e.un === user.IdList[i] && e.up === user.PassList[i]) {
        status = true;
        userIndex = i;
        break;
      }
    }
   
    while(user.TakenList.includes(random)){
      random = getRandomInt(100000,999999);
    }

    user.TakenList[userIndex] = random
    if (status === true) {
      io.to(socket.id).emit("loginStatus", { 'status': 'success', 'un': e.un, 'up': e.up ,'tk':random})
    }
    else {
      io.to(socket.id).emit("loginStatus", { 'status': 'no_match_data', 'un': e.un, 'up': e.up,'tk':random })
    }


  })
});





server.listen(port,'0.0.0.0', () => {
  console.log(`running on ${__dirname}:${port}`);
});