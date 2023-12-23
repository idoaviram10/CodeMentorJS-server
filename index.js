const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { connect } = require('./db');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: ['http://localhost:3000', 'https://fantastic-pony-3ffa80.netlify.app'],
	},
});

const userRooms = {};

connect()
	.then((db) => {
		const codeCollection = db.collection('codeblocks');

		app.get('/getCodes', async (req, res) => {
			try {
				const codes = await codeCollection.find({}).sort({ id: 1 }).toArray();
				res.status(200).json(codes);
			} catch (error) {
				res.status(500).send('Error fetching codes');
			}
		});

		app.get('/getCode/:id', async (req, res) => {
			const id = parseInt(req.params.id);
			try {
				const code = await codeCollection.findOne({ id: id });
				if (code) {
					res.status(200).json(code);
				} else {
					res.status(404).send('Code not found');
				}
			} catch (error) {
				res.status(500).send('Error fetching code');
			}
		});

		io.on('connection', (socket) => {
			console.log(`User Connected: ${socket.id}`);

			socket.on('joinRoom', (room) => {
				socket.join(room);
				userRooms[room] = userRooms[room] || [];
				userRooms[room].push(socket.id);

				const role = userRooms[room].length === 1 ? 'Mentor' : 'Student';
				socket.emit('assignRole', role);

				console.log(`User ${socket.id} joined room: ${room} as ${role}`);
			});

			socket.on('updateCode', async (data) => {
				const { room, code } = data;
				try {
					await codeCollection.updateOne({ id: parseInt(room) }, { $set: { code: code } });
					socket.to(room).emit('codeUpdated', code);
				} catch (error) {
					console.error('Error updating code:', error);
				}
			});

			socket.on('leaveRoom', (room) => {
				socket.leave(room);
				userRooms[room] = (userRooms[room] || []).filter((id) => id !== socket.id);
				if (userRooms[room].length === 0) {
					delete userRooms[room];
				}
				console.log(`User ${socket.id} left room: ${room}`);
			});

			socket.on('disconnect', () => {
				for (const room in userRooms) {
					userRooms[room] = userRooms[room].filter((id) => id !== socket.id);
					if (userRooms[room].length === 0) {
						delete userRooms[room];
					}
				}
				console.log(`User Disconnected: ${socket.id}`);
			});
		});

		server.listen(process.env.PORT || 3001, () => {
			console.log('Server is running');
		});
	})
	.catch((err) => {
		console.error('Failed to connect to MongoDB', err);
	});
