import { nanoid } from "nanoid";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

// set up the express server
import express from "express";
const app = express();
const server = createServer(app);

// set up socket io
const io = new Server(server);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "/index.html"));
});

app.get("/elimination", (req, res) => {
    res.sendFile(path.join(__dirname, "/elimination.html"));
});

const rooms = {};

// listening on the connection event
io.on("connection", (client) => {
    // making new room
    client.on("createRoom", () => {
        let roomId = nanoid(8);
        rooms[client.id] = roomId;
        client.emit("roomCode", roomId);

        client.join(roomId);
        client.emit("init");
    });

    // join room
    client.on("joinRoom", (roomId) => {
        const room = io.sockets.adapter.rooms.get(roomId);
        if (!room) {
            client.emit("throwError", {
                status: 404,
                message: "Room not found!",
                roomId,
            });
        } else if (room.size > 1) {
            client.emit("throwError", { status: 400, message: "Room full!", roomId });
        } else {
            rooms[client.id] = roomId;
            client.emit("roomCode", roomId);
            client.join(roomId);
            client.emit("init");
        }
    });

    client.on("food choice", (choice, roomId) => {
        io.emit("food choice", choice, roomId);
    });
});

server.listen(3121, () => {
    console.log("listening on port 3121");
});