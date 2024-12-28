import React, { useEffect, useState, useRef } from 'react'
import Card from 'react-bootstrap/Card';

const TIME_OFFSET = 5, LETTER_OFFSET = 2;

export default function Timer({ visible, socket, onEnd, word }) {

    const [timeLeft, setTimeLeft] = useState();
    const [remainingLetters, setRemainingLetters] = useState();
    const letterRevealInterval = useRef(0);
    const [revealedLetters, setRevealedLetters] = useState();
    const revealedLetterIndexes = useRef([]);
    const originalTime = useRef();

    useEffect(() => {
        setRevealedLetters(word.split("").map(char => char == " " ? char : "___"));

    }, [word, ])

    useEffect(() => {

        if (revealedLetters) {
            setRemainingLetters(revealedLetters.join(" "));
            console.log(remainingLetters);
        }

        const gameStartListener = data => {
            if (!word) return;

            setTimeLeft(data.drawtime);
            originalTime.current = data.drawtime;
            letterRevealInterval.current = Math.ceil((data.drawtime - TIME_OFFSET) / (word.length));
            console.log("d ",letterRevealInterval.current);
        }

        socket.on("game_start", gameStartListener);

        const timeTickListener = data => {
            setTimeLeft(data.timeLeft);
            console.log(data.timeLeft);
            if (data.timeLeft === 0) {
                onEnd();
                setTimeLeft(originalTime.current);
            } else if (
                remainingLetters !== undefined && 
                (data.timeLeft % letterRevealInterval.current === 0) &&
                (remainingLetters.split(" ").filter(l => l === "___").length > LETTER_OFFSET)
            ) {
                const rand = Math.floor(Math.random() * word.length);

                const alreadyRevealed = revealedLetterIndexes.current.includes(rand);
                const blankSpace = revealedLetters[rand] === " " || word[rand] === " "
                if (alreadyRevealed || blankSpace) {
                    return;
                }

                revealedLetters[rand] = " " + word[rand] + " ";
                setRemainingLetters(revealedLetters.current);
                revealedLetterIndexes.current.push(rand);
            }
        }


        socket.on("countdown_tick", timeTickListener);

        return () => {
            socket.off("receive_initialize", gameStartListener);
            socket.off("countdown_tick", timeTickListener);
        }
    }, [revealedLetters, remainingLetters, word])

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
