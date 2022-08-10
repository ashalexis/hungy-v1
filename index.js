import { customAlphabet } from "nanoid";
import nanoidDictionary from "nanoid-dictionary";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { foodOptions } from "./js/constants.js";
import { getMatchupAnswer, removeDuplicates } from "./js/helpers.js";

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
const eliminationRooms = new Map();
const matchupRooms = new Map();
const roomClosed = new Map();
const nanoid = customAlphabet(nanoidDictionary.alphanumeric, 8);

const eliminationSpace = io.of("/elimination");
const matchupSpace = io.of("/matchup");

// listening on the connection event
eliminationSpace.on("connection", (client) => {
    // making new room
    client.on("createRoom", () => {
        const roomId = nanoid();
        const clientNumber = 1;
        client.join(roomId);
        const room = eliminationSpace.adapter.rooms.get(roomId);
        client.emit("init", roomId, clientNumber, room.size, foodOptions);
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
            client.join(roomId);
            client.emit("init", roomId, clientNumber, room.size, foodOptions);
        }
    });

    // on player ready
    client.on("playerReady", (roomId, foodOptionsList) => {
        if (eliminationRooms.has(roomId)) {
            console.log("has roomid");
            eliminationRooms.set(roomId, {
                ...eliminationRooms.get(roomId),
                [client.id]: foodOptionsList,
            });
        } else {
            console.log("no roomid");
            eliminationRooms.set(roomId, {
                [client.id]: foodOptionsList,
            });
        }

        console.log(eliminationRooms.get(roomId));

        if (Object.keys(eliminationRooms.get(roomId)).length === 2) {
            const allFoodOptions = Object.values(eliminationRooms.get(roomId));
            const uniqueFoodOptions = removeDuplicates(allFoodOptions.flat());
            console.log(uniqueFoodOptions);
            eliminationSpace.to(roomId).emit("startRoom", 1, uniqueFoodOptions);
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
        } else if (roomClosed.get(roomId) === true) {
            client.emit("throwError", {
                status: 404,
                message: "Room closed!",
                roomId,
            });
        } else {
            client.join(roomId);
            client.emit("init", roomId, room.size);
            matchupSpace.to(roomId).emit("roomSize", room.size);
        }
    });

    client.on("playerReady", (roomId) => {
        const room = matchupSpace.adapter.rooms.get(roomId);
        matchupRooms.set(roomId, {
            ...matchupRooms.get(roomId),
            [client.id]: null,
        });

        if (
            Object.keys(matchupRooms.get(roomId)).length === room.size &&
            room.size > 2
        ) {
            matchupSpace.to(roomId).emit("startRoom", foodOptions, roomId);
            roomClosed.set(roomId, true);
        } else if (room.size < 3) {
            client.emit(
                "throwInfo",
                `Room is too small! Current number of people waiting: ${room.size}`
            );
        }
    });

    client.on("sendChoices", (foodChoices, roomId) => {
        const room = matchupSpace.adapter.rooms.get(roomId);
        // obj will look like { client.id : foodChoices }
        matchupRooms.set(roomId, {
            ...matchupRooms.get(roomId),
            [client.id]: foodChoices,
        });

        if (
            room &&
            Object.keys(matchupRooms.get(roomId)).length === room.size &&
            !Object.values(matchupRooms.get(roomId)).some((choice) => choice === null)
        ) {
            matchupSpace.to(roomId).emit("displayAnswerOptions");
        }
    });

    client.on("mostVoted", (roomId) => matchupSpace.to(roomId).emit("mostVoted"));
    client.on("topThree", (roomId) => matchupSpace.to(roomId).emit("topThree"));
    client.on("random", (roomId) => matchupSpace.to(roomId).emit("random"));

    client.on("confirmAnswer", (answerChoice, roomId) => {
        const finalAnswer = getMatchupAnswer(
            answerChoice,
            matchupRooms.get(roomId)
        );
        matchupSpace.to(roomId).emit("finalAnswer", finalAnswer);
    });

    client.on("noConfirmAnswer", (roomId) => {
        matchupSpace.to(roomId).emit("noConfirmAnswer");
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