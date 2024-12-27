import React, { createContext } from 'react'
import Card from 'react-bootstrap/Card'
import Button from 'react-bootstrap/Button'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import Modal from 'react-bootstrap/Modal'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function JoinRoom({ socket }) {

    const navigate = useNavigate();
    const { state } = useLocation();

    const usernameInputRef = React.createRef();
    const roomIdInputRef = React.createRef();
    const playersRef = React.createRef();
    const drawtimeRef = React.createRef();
    const roundsRef = React.createRef();

    const [err, setErr] = React.useState(false);
    const [showModal, setShowModal] = React.useState(false);

    const handleCloseModal = () => setShowModal(false);
    const handleShowModal = () => setShowModal(true);

    const roomExists = async roomId => {
        const res = await axios.get(`http://localhost:6969/${roomId}/exists`, { params: { roomId: roomId } });
        return res.data;
    }
    
    const generateRoomId = () => {
        return Math.random().toString(36).substring(2,8).toUpperCase();
    }
    
    const joinRoom = async existing => {
        const username = usernameInputRef.current.value
        const roomId = roomIdInputRef.current.value
    
        if ((username === "") || (existing && roomId === "")) return;

        if (existing) {
            const room = await roomExists(roomId);
            if (!room) {
                setErr(true);
                return;
            } 

            usernameInputRef.current.value = ""
            roomIdInputRef.current.value = ""
            navigate(`/chat/${roomId}`, { state: { username } });
            return;

        } 

        const drawtime = drawtimeRef.current.value;
        const rounds = roundsRef.current.value;
        const difficulty = difficultyRef.current.value;
        const newRoomId = generateRoomId();
        handleCloseModal();
        
        // have to pass in id instead of the entire socket object, otherwise results in infinite recursion
        await socket.emit("create_room", { roomId: newRoomId, drawtime, rounds, difficulty, creator: socket.id }) 
        navigate(`/chat/${newRoomId}`, { state: { username } })
    }

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Row>
                    <Col></Col>
                    <Col>   
                        <Card style={{ minWidth: '20em', verticalAlign: 'middle', top: '50px', position: 'relative' }}>
                            <Card.Header>
                                <Card.Title>Hi</Card.Title>
                            </Card.Header>
                            <Card.Body>
                                <Form>
                                    <Form.Group>
                                        <Form.Label>Enter name</Form.Label>
                                        <Form.Control ref={usernameInputRef} className='mb-3' type='text' placeholder='Enter a username' />
                                    </Form.Group>
                                    <Form.Group>
                                        <Form.Label>Enter room code</Form.Label>
                                        <Form.Control ref={roomIdInputRef} className='mb-3' type='text' placeholder='Enter a room code' value={state && state.existingRoomId} />
                                    </Form.Group>
                                </Form>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Button variant="primary" type="submit" onClick={() => joinRoom(true)}>Join Room</Button>
                                    <Button variant="primary" type="submit" onClick={() => handleShowModal()}>Create New Room</Button>
                                </div>
                            </Card.Body>
                            <Card.Footer>{ err ? "Room does not exist!" : null }</Card.Footer>
                        </Card>
                    </Col>
                    <Col></Col>
                </Row>

            </div>
            <Modal show={showModal} onHide={handleCloseModal}>
                <Modal.Header closeButton>
                    <Modal.Title>New Game Settings</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <label for='drawtime'>Draw Time</label>
                        <select name='drawtime' ref={drawtimeRef}>
                            {[15, 30, 60, 90, 120].map(time => <option>{time}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                        <label for='rounds'>Rounds</label>
                        <select name='rounds' ref={roundsRef}>
                            {Array.from({ length: 8 }).map((_, round) => <option>{round + 3}</option>)}
                        </select>
                    </div>                                        
                </Modal.Body>
                <Modal.Footer>
                    <Button variant='secondary' onClick={handleCloseModal}>Close</Button>
                    <Button variant='primary' type="submit" onClick={() => joinRoom(false)}>Create</Button>
                </Modal.Footer>
            </Modal>
        </>
    )
}
