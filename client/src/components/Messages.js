import React, { useEffect, useLayoutEffect } from 'react';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';

export default function Messages({ socket, roomId, username, messages, onMsg }) {

    const msgInputRef = React.createRef();
    const messagesAreaRef = React.createRef();

    useEffect(() => {
        const msgListener = data => onMsg(data);
        socket.on("receive_message", msgListener);
        return () => socket.off("receive_message", msgListener);
    }, []);

    useLayoutEffect(() => {
        if (messagesAreaRef.current) {
            messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
        }
    }, [messages]);
    
    const sendMessage = async (e) => {
        if (e.key !== 'Enter') return; 

        const msg = msgInputRef.current.value
        if (msg === "") return;

        const msgData = {
            roomId, author: username, message: msg, time: new Date(Date.now()).toLocaleTimeString(), type: "user"
        };

        await socket.emit("send_message", msgData);
        onMsg(msgData);
        msgInputRef.current.value = "";
    }

    return (
        <Card style={{ minWidth: '20em', verticalAlign: 'middle', top: '50px', position: 'relative', minHeight:'700px', maxHeight: '700px' }}>
            <Card.Header>
                <Card.Title> Chat | Username: {username}</Card.Title>
            </Card.Header>
            <Card.Body style={{ maxHeight: '650px', overflowY: 'scroll' }} ref={messagesAreaRef}>
                {messages.map((msg, index) => (
                    <div style={{ backgroundColor: (index % 2 === 0 ? 'lightgray' : 'white'), padding: '5px' }} key={index}>
                        {msg.type === "user" ? (
                            <div><strong>{msg.author}:</strong> {msg.message}</div>
                        ) : (
                            <div style={{ textAlign: 'center' }}><strong>{msg.message}</strong></div>
                        )
                        }
                    </div>
                ))}
            </Card.Body>
            <Card.Footer>
                <Form.Control ref={msgInputRef} className='mb-3' type='text' placeholder='Enter Message' onKeyDown={e => sendMessage(e)}  />
            </Card.Footer>
        </Card>
    )
}
