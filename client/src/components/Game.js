import React, { useEffect, useState, useRef } from 'react';
import Card from 'react-bootstrap/Card';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import { router } from '../index';
import Canvas from './Canvas';
import Messages from './Messages';
import Timer from './Timer';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

const STATES = Object.freeze({
    GAME_LOBBY: "LOBBY",
    GAME_ONGOING: "GAME",
    GAME_FINISHED: "FINISHED"
});

export default function Game({ socket }) {

    const [messages, setMessages] = React.useState([]);
    const [users, setUsers] = React.useState([]);
    const [canvasHistory, setCanvasHistory] = React.useState([]);
    const [canvasUndoHistory, setCanvasUndoHistory] = React.useState([]);
    const [wordChoices, setWordChoices] = React.useState([]);
    const [leader, setLeader] = React.useState();
    const [gameStarted, setGameStarted] = React.useState(false);
    const [currentDrawer, setCurrentDrawer] = React.useState();
    const [currentWord, setCurrentWord] = React.useState();
    const [currentRound, setCurrentRound] = React.useState(0);

    const totalRounds = React.useRef();

    const [showModal, setShowModal] = React.useState(false);

    const params = useParams();
    const location = useLocation();
    const roomId = React.useRef(params.roomId);
    const state = React.useRef(location.state);

    useEffect(() => {
        const verify = async () => {
            if (!state.current) return;
            await socket.emit("join_room", { roomId: roomId.current, username: state.current.username })
            window.history.replaceState({}, '', window.location.pathname);

            console.log(roomId.current);
            const roomData = (await axios.get(`http://localhost:6969/${roomId.current}`)).data;

            setMessages(roomData.messages);
            setUsers(roomData.users);
            setCanvasHistory(roomData.canvasActionsHistory);
            setCanvasUndoHistory(roomData.canvasUndoHistory);
            setLeader(roomData.leaderId);
            setGameStarted(roomData.state == STATES.GAME_ONGOING);    
            setCurrentRound(roomData.currentRound);     
            setCurrentWord(roomData.currentWord);

            totalRounds.current = roomData.rounds;

            if (roomData.currentDrawer) {
                setCurrentDrawer(roomData.currentDrawer);
            }
        }
        verify();

    }, [])

    useEffect(() => {
        const connectListener = data => {
            setMessages(msgs => [...msgs, { type: "System", message: `${data.username} joined.` }]);
            setUsers(users => [...users, data]);
        }

        const disconnectListener = data => {
            setMessages(msgs => [...msgs, { type: "system", message: `${data.user.username} left.` }]);
            setLeader(data.leaderId);
            setUsers(prevUsers => {
                const newUsers = prevUsers.filter(user => user.id !== data.user.id);
                
                if (gameStarted && !newUsers.some(user => user.id === currentDrawer.id)) {
                    // Check that newUsers is non-empty before setting a new drawer
                    const newDrawer = newUsers[newUsers.findIndex(user => user.id === data.user.id) + 1];
                    setCurrentDrawer(newDrawer);
                    
                    // Check if the new drawer is the current socket user
                    getWordChoices();
                    setShowModal(newDrawer && newDrawer.id === socket.id);
                }
    
                return newUsers;
            });

        }

        const gameStartedListener = data => {
            setGameStarted(true);
            setCurrentDrawer(data.currentDrawer);
            console.log("receive start game");
        }

        const newDrawerListener = data => {
            setCurrentDrawer(data.newDrawer);
            if (data.newDrawer.id == socket.id) {
                promptWord();
            }
        }

        const updateRoundListener = data => {
            setCurrentRound(data.currentRound);
        }

        const startDrawListener = data => {
            setCurrentWord(data.word);
            setShowModal(false);
        }

        socket.on("user_connect", connectListener);
        socket.on("user_disconnect", disconnectListener);
        socket.on("receive_start_game", gameStartedListener);
        socket.on("receive_new_drawer", newDrawerListener);
        socket.on("receive_update_round", updateRoundListener);
        socket.on("receive_start_draw", startDrawListener);

        return () => {
            socket.off("user_connect", connectListener);
            socket.off("user_disconnect", disconnectListener);
            socket.off("receive_start_game", gameStartedListener);
            socket.off("receive_new_drawer", newDrawerListener);
            socket.off("receive_update_round", updateRoundListener);
            socket.off("receive_start_draw", startDrawListener);

            return router.subscribe(() => {
                console.log("user leave room via back button press");
                socket.emit("leave_room", { roomId: roomId.current });
            });
        }
    }, [gameStarted, users])

    if (!state.current) {
        socket.emit("leave_room", { roomId: roomId.current });
        return <Navigate to='/' state={{ existingRoomId: roomId.current }} />
    }
    const { username } = state.current;

    const getWordChoices = () => {
        axios.get(`http://localhost:6969/${roomId.current}/words`).then(res => setWordChoices(res.data));
    }

    const startGame = (users) => {
        if (users.length === 1) {
            alert("need more players");
            return;
        }

        console.log("game start");
        setGameStarted(true);
        setCurrentDrawer(users[0]);

        socket.emit("start_game", { roomId: roomId.current });
        socket.emit("update_round", { roomId: roomId.current });

        promptWord();
    }

    const startDraw = (word, currentDrawer, users) => {

        setCurrentWord(word);
        socket.emit("clear_board", { roomId: roomId.current });
        setShowModal(false);

        socket.emit("start_draw", { roomId: roomId.current, word });
    }
    
    const getNewDrawer = (users, currentDrawer) => {
        console.log(users);
        const isNewRound = currentDrawer.id === users[users.length - 1].id;
        let index = 0;
        if (!isNewRound) {
            index = users.findIndex(user => user.id === currentDrawer.id) + 1;
        }

        return [users[index], isNewRound];
    }

    // KEEP FIGURING OUT ROUNDS SYSTEM
    const handleNewDrawer = (round, currentDrawer, users, leader) => {

        if (users.length === 1) {
            alert("need more players");
            return;
        }
        
        const [newDrawer, isNewRound] = getNewDrawer(users, currentDrawer);
        setCurrentDrawer(newDrawer);

        console.log("new round ", isNewRound);
        if (isNewRound) {
            console.log(round, totalRounds.current);
            if (round == totalRounds.current) {
                alert("game end"); // TODO
                return;
            }
            
            // only emit event once so round doesnt get double incremented
            if (socket.id === newDrawer.id) {
                socket.emit("update_round", { roomId: roomId.current });
            }
        }   

        // only emit event once 
        if (socket.id === currentDrawer.id) {
            socket.emit("new_drawer", { roomId: roomId.current, newDrawer });
        }

        if (newDrawer.id === socket.id) {
            promptWord();
        }
    }

    const promptWord = () => {
        setCurrentWord("");
        getWordChoices();
        setShowModal(true);
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column'}}>
        <Timer 
            visible={gameStarted} 
            socket={socket} 
            onEnd={() => handleNewDrawer(currentRound, currentDrawer, users, leader)}
            word={currentWord}
            currentDrawer={currentDrawer}    
        />
        {currentRound} / {totalRounds.current}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: '0px 50px 50px 50px', maxWidth: '100%' }}>
            <Card style={{ minWidth: '20em', verticalAlign: 'middle', top: '50px', position: 'relative', minHeight:'700px', maxHeight: '700px' }}>
                <Card.Header>
                    <Card.Title>Users</Card.Title>
                </Card.Header>
                <Card.Body style={{ maxHeight: '650px', overflowY: 'scroll' }}>
                    {
                        users.sort((a, b) => a.points - b.points).map((user, index) => (
                            <div style={{ backgroundColor: (index % 2 === 0 ? 'lightgray' : 'white'), padding: '5px' }} key={index}>
                                <span>
                                    <h4>#{index + 1} {((currentDrawer !== undefined) && currentDrawer.id == user.id) ? '✏️' : ''}</h4>
                                    <strong style={{ color: (user.id === socket.id ? 'green' : 'black') }}>{user.username}</strong>
                                    
                                </span>
                                <p style={{ marginBottom: '-2px' }}>Points: {user.points}</p>     
                            </div>
                        ))
                    }   
                </Card.Body>
            </Card>
            
            <Card style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                minWidth: '50em', 
                top: '50px', 
                position: 'relative', 
                minHeight:'700px', 
                maxHeight: '600px' 
            }}>
                {gameStarted ? (
                    <Canvas 
                        socket={socket} 
                        roomId={roomId.current} 
                        initHistory={canvasHistory} 
                        initUndoHistory={canvasUndoHistory}
                        viewOnly={socket.id != currentDrawer.id}
                    />
                ) : (
                    <Button 
                        style={{ visibility: (leader == socket.id ? 'visible' : 'hidden') }} 
                        variant='primary' 
                        onClick={() => startGame(users)}
                    >
                        START
                    </Button>
                )}
            </Card> 
            
            <Messages 
                socket={socket} 
                roomId={roomId.current} 
                messages={messages} 
                username={username} 
                onMsg={msg => setMessages(msgs => [...msgs, msg])} 
            />
        </div>

        <Modal show={showModal}>
            <Modal.Header>
                <Modal.Title>Choose Word</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-evenly' }}>
                    {wordChoices.map(word => (
                        <Button variant='primary' onClick={() => startDraw(word, currentDrawer, users)}>
                            {word}
                        </Button>
                    ))}

                </div>                                      
            </Modal.Body>
        </Modal>
        </div>
        
    )
}
