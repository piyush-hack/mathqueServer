const express = require('express');
var cors = require('cors')
const app = express()
const port = process.env.PORT || 5000;
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(cors())
app.use(express.json())


// app.get('/', (req, res) => {
//     res.send({ msg: 'Welcome' })
// })

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

let usersByRooms = { "start": 0 }
let i = 1;

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.emit('news', { msg: 'Hello world' });
    // socket.emit('getAllRooms', {msg : usersByRooms})

    socket.on("giveAllRooms", () => {
        socket.emit('getAllRooms', { msg: usersByRooms })
    })
    
    socket.on('joinRoom', async (data) => {
        await socket.join(data.room);
        console.log(usersByRooms[data.room])
        usersByRooms[data.room] = usersByRooms[data.room] != undefined ? ++usersByRooms[data.room] : 1;
        console.log(usersByRooms, usersByRooms[data.room])
        if (data.ques) {
            var a = Math.floor(Math.random() * 10) + 1;
            var b = Math.floor(Math.random() * 10) + 1;
            var op = ["*", "+", "/", "-"][Math.floor(Math.random() * 4)];
            // prompt("How much is " + a + " " + op + " " + b + "?") == eval(a + op + b);
            // socket.emit("getQues", { ques: "How much is " + a + " " + op + " " + b + "?", ans: eval(a + op + b) });
            io.in(data.room).emit("getQues",
                {
                    ques: "How much is " + a + " " + op + " " + b + "?",
                    ans: eval(a + op + b)
                });
        }
    });


    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});


server.listen(3000, () => {
    console.log('listening on *:3000');
});