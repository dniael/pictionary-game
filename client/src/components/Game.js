import React, { useEffect } from 'react';
import Card from 'react-bootstrap/Card';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import { router } from '../index';
import Canvas from './Canvas';
import Messages from './Messages';
import Button from 'react-bootstrap/Button';

export default function Game({ socket }) {

    const [messages, setMessages] = React.useState([]);
    const [users, setUsers] = React.useState([]);
    const [canvasHistory, setCanvasHistory] = React.useState([]);
    const [canvasUndoHistory, setCanvasUndoHistory] = React.useState([]);
    const [leader, setLeader] = React.useState();
    const [started, setStarted] = React.useState(false);

    const params = useParams();
    const location = useLocation();
    const [roomId] = React.useState(params.roomId);
    const [state] = React.useState(location.state);

    useEffect(() => {
        const verify = async () => {
            if (!state) return;

            await socket.emit("join_room", { roomId, username: state.username })
            window.history.replaceState({}, '', window.location.pathname);

            const roomData = (await axios.get(`http://localhost:6969/${roomId}`)).data;
            setMessages(roomData.messages);
            setUsers(roomData.users);
            setCanvasHistory(roomData.canvasActionsHistory);
            setCanvasUndoHistory(roomData.canvasUndoHistory);
            setLeader(roomData.leader);
                
        }
        verify();

    }, [])

    useEffect(() => {
        const connectListener = data => {
            setMessages(msgs => [...msgs, { type: "System", message: `${data.username} joined.` }]);
            setUsers(users => [...users, data]);
        }
        const disconnectListener = data => {
            setMessages(msgs => [...msgs, { type: "system", message: `${data.username} left.` }]);
            setUsers(users => users.filter(user => user.id !== data.id));
            if (users.length === 1) {
                setLeader(users[0]);
            }
        }

        const gameStartListener = () => setStarted(true);

        socket.on("user_connect", connectListener);
        socket.on("user_disconnect", disconnectListener);
        socket.on("game_start", gameStartListener);

        return () => {
            socket.off("user_connect", connectListener);
            socket.off("user_disconnect", disconnectListener);
        }
    }, [])

    useEffect(() => {
        return router.subscribe(() => {
            console.log("user leave room via back button press");
            socket.emit("leave_room", { roomId: params.roomId });
        });
    })

    if (!state) {
        socket.emit("leave_room", { roomId });
        return <Navigate to='/' state={{ existingRoomId: roomId }} />
    }

    const { username } = state;

    const startGame = () => {
        setStarted(true);
        socket.emit("game_start", { roomId });
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: '50px', maxWidth: '100%' }}>
            <Card style={{ minWidth: '20em', verticalAlign: 'middle', top: '50px', position: 'relative', minHeight:'700px', maxHeight: '700px' }}>
                <Card.Header>
                    <Card.Title>Users</Card.Title>
                </Card.Header>
                <Card.Body style={{ maxHeight: '650px', overflowY: 'scroll' }}>
                    {
                        users.sort((a, b) => a - b).map((user, index) => (
                            <div style={{ backgroundColor: (index % 2 === 0 ? 'lightgray' : 'white'), padding: '5px' }} key={index}>
                                <span>
                                    <h4>#{index + 1} </h4>
                                    <strong style={{ color: (user.id === socket.id ? 'green' : 'black') }}>{user.username}</strong>
                                </span>
                                <p style={{ marginBottom: '-2px' }}>Points: {user.points}</p>     
                            </div>
                        ))
                    }   
                </Card.Body>
            </Card>
            
            <Card style={{ minWidth: '50em', top: '50px', position: 'relative', minHeight:'700px', maxHeight: '600px' }}>
            {
                started ? (
                    <Canvas socket={socket} roomId={roomId} initHistory={canvasHistory} initUndoHistory={canvasUndoHistory} />
                )
                    : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', visibility: (leader.id == socket.id ? 'visible' : 'hidden') }}>
                        <Button style={{verticalAlign: 'center' }} variant='primary' onClick={startGame}>START</Button>
                    </div>
                )
            }
                
            </Card> 
            
            <Messages socket={socket} roomId={roomId} messages={messages} username={username} onMsg={msg => setMessages(msgs => [...msgs, msg])} />
        </div>
    )
}
