const express = require('express');
const { evaluate } = require('mathjs')

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
let quesNo = 1;

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.emit('news', { msg: 'Hello world' });
    // socket.emit('getAllRooms', {msg : usersByRooms})

    socket.on("giveAllRooms", () => {
        socket.emit('getAllRooms', { msg: usersByRooms })
    })

    socket.on('joinRoom', async (data) => {

        if (usersByRooms[data.uniqueKey]) {
            socket.emit("error", { msg: "Room name is not unique", type: "noRoomJoin" })
            return;
        }

        if (socket.rooms.has(data.room)) {
            socket.emit("error", { msg: "You Are Already In The Room", type: "alreadyInRoom" })
            return;
        }
        await socket.join(data.room);
        console.log(usersByRooms[data.room])

        usersByRooms[data.room] = usersByRooms[data.room] != undefined ? ++usersByRooms[data.room] : 1;
        if (usersByRooms[data.room] > 1) {
            io.in(data.room).emit("roomJoined", { joined: true, newRoom: false })
        } else {
            io.in(data.room).emit("roomJoined", { joined: true, newRoom: true })
        }
        console.log(usersByRooms, usersByRooms[data.room])
        if (data.ques) {
            // var a = Math.floor(Math.random() * 10) + 1;
            // var b = Math.floor(Math.random() * 10) + 1;
            // var op = ["*", "+", "/", "-"][Math.floor(Math.random() * 4)];
            let problem = genProblem(3 , 10);

            // prompt("How much is " + a + " " + op + " " + b + "?") == eval(a + op + b);
            // socket.emit("getQues", { ques: "How much is " + a + " " + op + " " + b + "?", ans: eval(a + op + b) });
            io.in(data.room).emit("getQues",
                {
                    ...problem,
                    sno: quesNo,
                    userJoined: true,
                });

            quesNo++;
        }
    });

    socket.on("submitAns", async (data) => {

        console.log(data)
        // var a = Math.floor(Math.random() * 10) + 1;
        // var b = Math.floor(Math.random() * 10) + 1;
        // var op = ["*", "+", "/", "-"][Math.floor(Math.random() * 4)];
        let problem = genProblem(3 , 10);
        // prompt("How much is " + a + " " + op + " " + b + "?") == eval(a + op + b);
        // socket.emit("getQues", { ques: "How much is " + a + " " + op + " " + b + "?", ans: eval(a + op + b) });
        for (const x of socket.rooms.values()) {
            if (usersByRooms[x]) {
                // io.in(x).emit("userLeft", { msg: "Another User Has Left" });
                io.in(x).emit("getQues",
                    {
                        // ques: "How much is " + a + " " + op + " " + b + "?",
                        // ans: eval(a + op + b),
                        ...problem,
                        user: data.user,
                        userAns: data.ans,
                        sno: quesNo,
                    });
                quesNo++;

            }
        }
    })

    socket.on("report", function (data) {
        for (const x of socket.rooms.values()) {
            if (usersByRooms[x]) {
                io.in(x).emit("showReports",
                    {
                        userReport: data.userReport,
                    });
            }

            // console.log(usersByRooms, x)
        }
    })

    socket.on("leaveRoom", async (data) => {
        for (const x of socket.rooms.values()) {
            socket.leave(x);
            io.in(x).emit("userLeft", { msg: "Another User Has Left" });
            // console.log(usersByRooms, x)
        }
    })

    socket.on('disconnecting', function () {
        var self = this;
        // console.log(self)
        var rooms = this.rooms;
        // console.log("left user room ", rooms, "---", socket.rooms, " ------ ", socket.rooms.values())
        for (const x of socket.rooms.values()) {
            if (usersByRooms[x]) {
                socket.leave(x);
                delete usersByRooms[x];
                io.in(x).emit("userLeft", { msg: "Another User Has Left" });
                // usersByRooms[x] = usersByRooms[x] - 1;
                // if (usersByRooms[x] == 0) {
                //     delete usersByRooms[x];
                //     console.log(usersByRooms)
                // }
                // console.log(usersByRooms, x)
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

function genProblem(level , upto) {
    var TreeNode = function (left, right, operator) {
        this.left = left;
        this.right = right;
        this.operator = operator;

        this.toString = function () {
            return '(' + left + ' ' + operator + ' ' + right + ')';
        }
    }

    function randomNumberRange(min, max) {
        return Math.floor(Math.random() * (max - min) + min);
    }

    var x = ['/', '*', '-', '+'];

    function buildTree(numNodes) {
        if (numNodes === 1)
            return randomNumberRange(1, upto);

        var numLeft = Math.floor(numNodes / 2);
        var leftSubTree = buildTree(numLeft);
        var numRight = Math.ceil(numNodes / 2);
        var rightSubTree = buildTree(numRight);

        var m = randomNumberRange(0, x.length);
        var str = x[m];
        return new TreeNode(leftSubTree, rightSubTree, str);
    }

    var n = level;
    var probStatment = buildTree(n).toString()
    var problem;

    problem = { ques: "How much is " + probStatment + " ?", ans: Math.round(evaluate(probStatment) * 100) / 100 };
    return problem;
}


server.listen(port, () => {
    console.log(`listening on *:${port}`);
});