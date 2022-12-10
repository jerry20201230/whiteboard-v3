const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get("/lib",(req,res)=>{
    res.sendFile(__dirname+__filename)
})
app.get('/lib/health',(req,res)=>{
    res.sendStatus(200)
})
app.get('*',(req,res)=>{
    res.status(404).sendFile(__dirname+'/lib/404.html')
})

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
      console.log('user disconnected');
    });

    
    socket.on("CanvasUpdate",(e)=>{
     
      socket.broadcast.emit("CanvasUpdate",e)
    })
    socket.on("ChatMsg",(e)=>{
      socket.broadcast.emit("ChatMsg",e);
      console.log(e)
    })
  });
server.listen(3000, () => {
  console.log('listening on *:3000');
});