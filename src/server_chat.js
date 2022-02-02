import http from "http";
// import WebSocket from "ws";
import { Server } from "socket.io";
import { instrument } from "@socket.io/admin-ui";
import express from "express";

const app = express();

app.set("view engine", "pug");

app.set("views", __dirname + "/views");

app.use("/public", express.static(__dirname + "/public"))

app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

const httpServer = http.createServer(app);
const wsServer = new Server(httpServer, {
    cors: {
        origin: ["https://admin.socket.io"],
        credentials: false,
    }
});
instrument(wsServer, {
    auth: false
})

function publicRooms() {
    const {sockets: {adapter: {sids, rooms}}} = wsServer;
    const publicRooms = [];
    rooms.forEach((_,key) => {
        if(sids.get(key) === undefined){
            publicRooms.push(key)
        }
    })
    console.log(publicRooms)
    return publicRooms;
}

function countRoom(roomName){
    return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}

wsServer.on("connection", socket => {
    socket["nickname"] = "Anonymous";
    socket.onAny(event => {
        console.log(wsServer.sockets.adapter)
        console.log(`Socket Event: ${event}`)
    })
    socket.on("enter_room", (roomName, done) => {
        socket.join(roomName)
        done(roomName.payload);
        socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
        wsServer.sockets.emit("room_change", publicRooms());
    })
    socket.on("disconnecting", (reason) => {
        socket.rooms.forEach(room => socket.to(room).emit("bye", socket.nickname, countRoom(room) - 1));
    })
    socket.on("disconnect", (reason) => {
        wsServer.sockets.emit("room_change", publicRooms());
    })
    socket.on("new_message", (msg, room, done) => {
        socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`);
        done();
    })
    socket.on("nickname", nickname => socket["nickname"] = nickname);
})
// const wss = new WebSocket.Server({server});

// const sockets = [];

// wss.on("connection", (socket) => {
//     sockets.push(socket)
//     socket["nickname"] = "Anon";
//     console.log("Connected to Server")
//     socket.on("close", () => {
//         console.log("DisConnected from the Browser")
//     });
//     socket.on("message", (msg) => {
//         const message = JSON.parse(msg);
//         switch(message.type){
//             case "new_message":
//                 sockets.forEach(aSocket => aSocket.send(`${socket.nickname}: ${message.payload}`));
//                 break;
//             case "nickname":
//                 socket["nickname"] = message.payload;
//                 console.log(message.payload)
//                 break;
//         }
//     })
    
// })


httpServer.listen(3000);