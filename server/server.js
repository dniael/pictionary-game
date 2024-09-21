import express from 'express';
import http from 'http';
import cors from 'cors';
const app = express()
import { Server } from 'socket.io';
app.use(cors())
const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
})

const rooms = []

const STATES = Object.freeze({
    GAME_LOBBY: "LOBBY",
    GAME_ONGOING: "GAME",
    GAME_FINISHED: "FINISHED"
});

const getRoom = id => rooms.find(room => room.id === id)
const removeUserFromRoom = (room, socketId) => room.users = room.users.filter(user => user.id !== socketId)

io.on('connection', socket => {
    console.log(`user connected!: ${socket.id}`)

    socket.on("create_room", data => {
        rooms.push({
            id: data.roomId,
            users: [],
            leader: null,
            currentDrawer: null,
            messages: [],
            state: STATES.GAME_LOBBY,
            canvasActionsHistory: [],
            canvasUndoHistory: [],
            drawtime: data.drawtime,
            rounds: data.rounds
        })
    })
    
    socket.on("join_room", data => {
        const room = getRoom(data.roomId)
        if (!room) return;
        const userData = { username: data.username, id: socket.id, points: 0 }

        if (room.users.length === 0) {
            room.leader = userData;
        }
        
        room.users.push(userData)
        room.messages.push({ type: "System", message: `${data.username} joined.` })

        socket.join(data.roomId)
        console.log(`User with ID: ${socket.id} joined room: ${data.roomId}`)
        socket.to(data.roomId).emit("user_connect", userData)
    })

    socket.on("game_start", data => {
        const room = getRoom(data.roomId);
        room.state = STATES.GAME_ONGOING;
        room.currentDrawer = room.users[0];
        socket.to(data.roomId).emit("game_started");
    })
 
    socket.on("send_message", data => {
        const room = getRoom(data.roomId)
        room.messages.push(data)
        socket.to(room.id).emit("receive_message", data);
        
    })

    socket.on("send_draw_start", data => {
        const room = getRoom(data.roomId);
        const { colour, width, x, y } = data;
        room.canvasActionsHistory.push({ colour, width, points: [{ x, y }] });
        socket.to(room.id).emit("receive_draw_start", data);
    })

    socket.on("send_drawing", data => {
        const room = getRoom(data.roomId);
        const current = room.canvasActionsHistory.length - 1;
        room.canvasActionsHistory[current].points.push({ x: data.x, y: data.y })
        socket.to(room.id).emit("receive_drawing", data);
    })

    socket.on("send_draw_end", data => {
        const room = getRoom(data.roomId);
        socket.to(room.id).emit("receive_draw_end", data);
    });

    socket.on("undo", data => {
        const room = getRoom(data.roomId);
        room.canvasUndoHistory.push(room.canvasActionsHistory.pop());
        socket.to(room.id).emit("receive_undo", { history: room.canvasActionsHistory, undoHistory: room.canvasUndoHistory })
    })
    
    socket.on("redo", data => {
        const room = getRoom(data.roomId);
        const line = room.canvasUndoHistory.pop();
        room.canvasActionsHistory.push(line);
        socket.to(room.id).emit("receive_redo", { history: room.canvasActionsHistory, undoHistory: room.canvasUndoHistory, line: line })
    })

    socket.on("leave_room", data => {
       
        const room = getRoom(data.roomId);
        if (!room) return;

        const user = room.users.find(u => u.id === socket.id)
        if (!user) return;

        console.log("from leave room event")
                
        socket.to(room.id).emit("user_disconnect", user)
        room.messages.push({ type: "System", message: `${user.username} left.` })
        
        removeUserFromRoom(room, socket.id)
        socket.leave(room.id)

        switch (room.users.length) {
            case 0:
                rooms.splice(rooms.indexOf(room), 1)
                console.log(`Closed room ${room.id}`)
            
            case 1:
                room.leader = room.users[0]
        }
        
    })

    socket.on('disconnect', () => {
        
        rooms.forEach((room, index) => {
            const user = room.users.find(u => u.id === socket.id)
            if (user) {
                console.log("disconnect event")
                console.log(user)
                socket.to(room.id).emit("user_disconnect", user)
                room.messages.push({ type: "System", message: `${user.username} left.` })
                removeUserFromRoom(room, socket.id)
                if (room.users.length === 0) {
                    rooms.splice(index, 1)
                    console.log(`Closed room ${room.id}`)
                }   
            }
        })
        console.log(`user disconnected! ${socket.id}`)
    })
})

app.get('/:roomId/exists', (req, res) => {
    res.send(getRoom(req.params.roomId) !== undefined)
})

app.get('/:roomId', (req, res) => {
    res.send(getRoom(req.params.roomId));
})

app.get('/:roomId/messages', (req, res) => {
    res.send(getRoom(req.params.roomId).messages)
})

app.get('/:roomId/users', (req, res) => {
    res.send(getRoom(req.params.roomId).users)
})

app.get('/:roomId/canvas', (req, res) => {
    const room = getRoom(req.params.roomId);
    res.send({
        history: room.canvasActionsHistory,
        undoHistory: room.canvasUndoHistory
    });
})

app.get('/:roomId/state', (req, res) => {
    res.send(getRoom(req.params.roomId).state);
})

server.listen(6969, () => console.log(`Server running on http://localhost:6969`))