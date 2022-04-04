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


// var admin = require("firebase-admin");

// var serviceAccount = require('./admin.json');

// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//     databaseURL: "https://learnfdb-default-rtdb.firebaseio.com/",
//     authDomain: "learnfdb-default-rtdb.firebaseapp.com",
// });

// var db = admin.database();


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// app.get('/add', (req, res) => {
//     addUser({ table: "users", name: "piyush" }, res);
// });

// app.get('/addId', (req, res) => {
//     demoUser({ table: "users", name: "ayush" }, res);
// });

// app.get('/getAll', (req, res) => {
//     getUsers({ table: "users" }, res);
// });

// app.get('/getOne', (req, res) => {
//     getOneUser({ table: "users" , id : "-MzUDC9CJIw95i_kSfY4" }, res);
// });

// app.get('/delete', (req, res) => {
//     deleteUser({ ref: "/users/-MzUDC9CJIw95i_kSfY4" }, res);
// });


// function demoUser(obj, res) {
//     // const db = firebase.firestore();
//     var userRefdemo = db.ref();
//     var oneUser = userRefdemo.child(obj.table);
//     oneUser.push(obj, (err) => {
//         if (err) {
//             res.status(300).json({ "msg": "Something went wrong", "error": err });
//         }
//         else {
//             res.status(200).json({ "msg": "user created sucessfully" });
//         }
//     })
// }

// function getUsers(obj, res) {
//     var userRef = db.ref();
//     var oneUser = userRef.child(obj.table);
//     userRef.once('value', function (snap) {
//         res.status(200).json({ "users": snap.val() });
//     })
// }

// function addUser(obj, res) {
//     var userRef = db.ref();
//     var oneUser = userRef.child(obj.table);
//     oneUser.update(obj, (err) => {
//         if (err) {
//             res.status(300).json({ "msg": "Something went wrong", "error": err });
//         }
//         else {
//             res.status(200).json({ "msg": "user created sucessfully" });
//         }
//     })
// }

// function deleteUser(obj , res){
//     let userRef = db.ref(obj.ref);
//     userRef.remove();
//     res.status(200).json({ "msg": "delete Success" });

// }

// function getOneUser(obj, res){
//     var userRefdemo = db.ref(obj.table);
//     var oneUser = userRefdemo.child(obj.id);
//     oneUser.once('value', function (snap) {
//         res.status(200).json({ "user": snap.val() });
//     })
// }



let usersByRooms = { "start": { "users": 0 } }
let usersRooms = { "start": 0 }

let quesNo = 1;

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.emit('news', { msg: 'Hello world' });
    // socket.emit('getAllRooms', {msg : usersByRooms})

    socket.on("giveAllRooms", () => {
        socket.emit('getAllRooms', { msg: usersRooms })
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
        // console.log(usersByRooms , usersRooms)

        if (usersByRooms[data.room] == undefined) {
            usersByRooms[data.room] = { users: 1 }
            usersRooms[data.room] = 1
            usersByRooms[data.room]["report" + data.uniqueKey] = { userId: data.uniqueKey };

        } else {
            if (usersByRooms[data.room].users) {
                ++usersByRooms[data.room].users;
                ++usersRooms[data.room];
                usersByRooms[data.room]["report" + data.uniqueKey] = { userId: data.uniqueKey }
            } else {
                usersByRooms[data.room].users = 1;
                usersRooms[data.room] = 1
                usersByRooms[data.room]["report" + data.uniqueKey] = { userId: data.uniqueKey };
            }
        }
        // usersByRooms[data.room].users = usersByRooms[data.room] != undefined ? ++usersByRooms[data.room] : 1;
        if (usersByRooms[data.room].users > 1) {
            io.in(data.room).emit("roomJoined", { joined: true, newRoom: false })
        } else {
            io.in(data.room).emit("roomJoined", { joined: true, newRoom: true })
        }
        if (data.ques) {

            let problem = genProblem(2, 100);
            usersByRooms[data.room]["ques"] = {}
            usersByRooms[data.room]["ques"][quesNo] = { ...problem }
            io.in(data.room).emit("getQues",
                {
                    ques: problem.ques,
                    sno: quesNo,
                    userJoined: true,
                });
            quesNo++;
        }
        // console.log(JSON.stringify(usersByRooms) , usersRooms)
    });

    socket.on("submitAns", async (data) => {

        // console.log(data)
        let problem = genProblem(2, 100);
        for (const x of socket.rooms.values()) {
            if (usersByRooms[x]) {
                // console.log(object)
                let ansStatus = false;
                if (usersByRooms[x]["ques"][data.sno]["ans"] === data.userAns) {
                    ansStatus = true;
                }
                // console.log(usersByRooms[x]["ques"][data.sno]["ans"], data.userAns, ansStatus)

                usersByRooms[x]["report" + data.user][data.sno] = {
                    ...usersByRooms[x]["ques"][quesNo],
                    ...usersByRooms[x]["ques"][data.sno],
                    yourAns: data.userAns,
                    status: ansStatus,

                }
                usersByRooms[x]["ques"][quesNo] = { ...problem }
                io.in(x).emit("getQues",
                    {
                        ques: problem.ques,
                        sno: quesNo,
                        userJoined: false,

                    });
                quesNo++;
            }
        }
        // console.log(JSON.stringify(usersByRooms))
    })

    socket.on("report", function (data) {
        for (const x of socket.rooms.values()) {
            if (usersByRooms[x]) {
                // usersByRooms[x]["report" + data.uniqueKey]
                io.in(x).emit("showReports",
                    {
                        userReport: usersByRooms[x]["report" + data.uniqueKey],
                    });
            }
        }
    })

    socket.on("leaveRoom", async (data) => {
        for (const x of socket.rooms.values()) {
            socket.leave(x);
            io.in(x).emit("userLeft", { msg: "Another User Has Left" });
        }
    })

    socket.on('disconnecting', function () {

        // console.log("left user room ", rooms, "---", socket.rooms, " ------ ", socket.rooms.values())
        for (const x of socket.rooms.values()) {
            if (usersByRooms[x]) {
                socket.leave(x);

                io.in(x).emit("userLeft", { msg: "Another User Has Left" });
                io.in(x).emit("showReports",
                    {
                        userReport: usersByRooms[x],
                    });

                delete usersByRooms[x];
                delete usersRooms[x];
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

function genProblem(level, upto) {
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

    // var x = ['/', '*', '-', '+'];
    var x = ['+'];

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
    if(level == 2){
        probStatment = probStatment.slice(1, -1)
    }
    var problem;

    problem = { ques: probStatment + " =", ans: Math.round(evaluate(probStatment) * 100) / 100 };
    return problem;
}


server.listen(port, () => {
    console.log(`listening on *:${port}`);
});