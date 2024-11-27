import React, { useEffect, useState, useRef } from 'react'
import Card from 'react-bootstrap/Card';

const TIME_OFFSET = 5, LETTER_OFFSET = 2;

export default function Timer({ visible, socket, onEnd, word }) {

    const [timeLeft, setTimeLeft] = useState();
    const [remainingLetters, setRemainingLetters] = useState();
    const letterRevealInterval = useRef(0);
    const revealedLetters = useRef(word.split("").map(char => char == " " ? char : "___"));
    const revealedLetterIndexes = useRef([]);

    useEffect(() => {
        setRemainingLetters(revealedLetters.current.join(" "));

        const gameStartListener = data => {
            setTimeLeft(data.drawtime);
            
            letterRevealInterval.current = Math.ceil((data.drawtime - TIME_OFFSET) / (word.length));
        }

        socket.on("game_start", gameStartListener);

        const timeTickListener = data => {
            setTimeLeft(data.timeLeft);
            if (data.timeLeft === 0) {
                onEnd();
            } else if (
                (data.timeLeft % letterRevealInterval === 0) && 
                (remainingLetters.filter(l => l === "___").length > LETTER_OFFSET)
            ) {
                const rand = Math.floor(Math.random()*word.length);

                const alreadyRevealed = revealedLetterIndexes.current.includes(rand);
                const blankSpace = revealedLetters.current[rand] === " " || word[rand] === " "
                if (alreadyRevealed || blankSpace) {
                    return;
                }

                revealedLetters.current[rand] = word[rand];
                setRemainingLetters(revealedLetters.current);
                revealedLetterIndexes.current.push(rand);
            }
        }

        socket.on("game_tick", timeTickListener);

        return () => {
            socket.off("game_start", gameStartListener);
            socket.off("game_tick", timeTickListener);
        }
    })

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            marginTop: '50px',
            marginBottom: '-25px', 
            maxWidth: '100%', 
            visibility: visible ? 'visible' : 'hidden'
        }}>
            <Card.Title>{timeLeft} seconds</Card.Title>
            <Card.Title>{remainingLetters}</Card.Title>
        </div>
    )
}
