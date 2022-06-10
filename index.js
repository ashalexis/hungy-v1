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

app.get('/elimination', (req, res) => {
	res.sendFile(__dirname + '/elimination.html')
})

// listening on the connection event
io.on("connection", (socket) => {
	socket.on("food choice", (choice) => {
		io.emit("food choice", choice);
	});
});

server.listen(3121, () => {
	console.log("listening on port 3121");
});
