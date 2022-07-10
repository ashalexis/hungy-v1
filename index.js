const { uuid } = require("uuidv4");

// set up the express server
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);

// set up socket io
const { Server } = require("socket.io");
const io = new Server(server);

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.get("/elimination", (req, res) => {
    res.sendFile(__dirname + "/elimination.html");
});

const rooms = {};

// listening on the connection event
io.on("connection", (client) => {
    // making new room
    client.on("newRoom", () => {
        let roomId = uuid();
        rooms[client.id] = roomId;
        client.emit("roomCode", roomId);

        client.join(roomId);
        client.emit("init");
    });

    // join room
    client.on("joinRoom", (roomId) => {
        // const room = io.sockets.adapter.rooms[roomId];
        rooms[client.id] = roomId;
        client.emit("roomCode", roomId);
        client.join(roomId);
        client.emit("init");
    });

    client.on("food choice", (choice, roomId) => {
        io.emit("food choice", choice, roomId);
    });
});

server.listen(3121, () => {
    console.log("listening on port 3121");
});