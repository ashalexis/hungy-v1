import { customAlphabet } from "nanoid";
import nanoidDictionary from "nanoid-dictionary";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { foodOptions } from "./constants.js";

const __filename = fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);

// set up the express server
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

app.get("/matchup", (req, res) => {
    res.sendFile(path.join(__dirname, "/matchup.html"));
});

// static files
app.use(express.static(path.join(__dirname, ".")));

// globals
const rooms = {};
const matchupChoices = new Map();
const nanoid = customAlphabet(nanoidDictionary.alphanumeric, 8);

const eliminationSpace = io.of("/elimination");
const matchupSpace = io.of("/matchup");

// listening on the connection event
eliminationSpace.on("connection", (client) => {
    // making new room
    client.on("createRoom", () => {
        const roomId = nanoid();
        const clientNumber = 1;
        rooms[client.id] = roomId;
        client.join(roomId);
        const room = eliminationSpace.adapter.rooms.get(roomId);
        client.emit("init", roomId, clientNumber, room.size);
    });

    // join room
    client.on("joinRoom", (roomId) => {
        const room = eliminationSpace.adapter.rooms.get(roomId);
        if (!room) {
            client.emit("throwError", {
                status: 404,
                message: "Room not found!",
                roomId,
            });
        } else if (room.size > 1) {
            client.emit("throwError", { status: 400, message: "Room full!", roomId });
        } else {
            const clientNumber = 2;
            rooms[client.id] = roomId;
            client.join(roomId);
            client.emit("init", roomId, clientNumber, room.size);
        }
    });

    client.on("waitingInRoom", (roomId) => {
        const room = eliminationSpace.adapter.rooms.get(roomId);
        if (room && room.size === 2) {
            client.emit("startRoom", foodOptions, 1);
        }
    });

    client.on("food choice", (choice, roomId, clientNumber) => {
        let turn = clientNumber === 1 ? 2 : 1;
        eliminationSpace.to(roomId).emit("food choice", choice, roomId, turn);
    });
});

matchupSpace.on("connection", (client) => {
    // making new room
    client.on("createRoom", () => {
        const roomId = nanoid();
        rooms[client.id] = roomId;
        client.join(roomId);
        const room = matchupSpace.adapter.rooms.get(roomId);
        client.emit("init", roomId, room.size);
    });

    // join room
    client.on("joinRoom", (roomId) => {
        const room = matchupSpace.adapter.rooms.get(roomId);
        if (!room) {
            client.emit("throwError", {
                status: 404,
                message: "Room not found!",
                roomId,
            });
        } else {
            rooms[client.id] = roomId;
            client.join(roomId);
            client.emit("init", roomId, room.size);
            matchupSpace.to(roomId).emit("roomSize", room.size);
        }
    });

    client.on("playerReady", (roomId) => {
        const room = matchupSpace.adapter.rooms.get(roomId);
        matchupChoices.set(roomId, {
            ...matchupChoices.get(roomId),
            [client.id]: [],
        });

        console.log(Object.keys(matchupChoices.get(roomId)).length, room.size);
        if (Object.keys(matchupChoices.get(roomId)).length === room.size) {
            matchupSpace.to(roomId).emit("startRoom", foodOptions, roomId);
        }
    });

    client.on("sendChoices", (foodChoices, roomId) => {
        // obj will look like { client.id : foodChoices }
        matchupChoices.set(roomId, {
            ...matchupChoices.get(roomId),
            [client.id]: foodChoices,
        });
        console.log(matchupChoices);
    });

    client.on("prelimChoices", (foodChoices, clientNumber) => {
        // make map of choices
    });

    client.on("disconnecting", (reason) => {
        for (const roomId of client.rooms) {
            if (roomId !== client.id) {
                const room = matchupSpace.adapter.rooms.get(roomId);
                room.delete(client.id);
                client.to(roomId).emit("roomSize", room.size);
            }
        }
    });
});

const port = process.env.PORT || 3121;

server.listen(port, () => {
    console.log(`listening on port ${port}`);
});