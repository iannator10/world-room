const express = require('express');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages.js')
const { userJoin, getCurrentUser, userLeave, getRoomUsers } = require('./utils/users.js')

const app = express();
const server = http.createServer(app);
const io = socketio(server)

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs')

const bot = 'Admin';

//runn when a client connects
io.on('connection', socket => {
    socket.on('joinRoom', ({ username, room }) => {
        const user = userJoin(socket.id, username, room);

        socket.join(user.room)

        //welcome current user
        socket.emit(
            'message',
            formatMessage(bot, `Welcome to ${user.room}`));

        //broadcast when a user connects
        socket.broadcast.to(user.room).emit(
            'message',
            formatMessage(bot, `A ${user.username} has joined the chat`));

        // send users and room info
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getCurrentUser(user.room)
        })

        //listen for chatMessage
        socket.on('chatMessage', (message) => {
            const user = getCurrentUser(socket.id)

            io.to(user.room).emit(
                'message',
                formatMessage(user.username, message))
        })

        //runs when client disconnects
        socket.on('disconnect', () => {
            const user = userLeave(socket.id);

            if (user) {
                io.to(user.room).emit(
                    'message',
                    formatMessage(bot, `A ${user.username} has left the chat`))

                // send users and room info
                io.to(user.room).emit('roomUsers', {
                    room: user.room,
                    users: getCurrentUser(user.room)
                })
            }
        });
    });
});

app.get('/', (req, res) => {
    res.render('index')
})

const port = 3000 || process.env.PORT

server.listen(port, () => {
    console.log(`listening on port ${port}`)
});