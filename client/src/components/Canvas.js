import React, { useEffect } from 'react';
import Card from 'react-bootstrap/Card';
import { jumpToPoint, draw, drawLine, drawAllLines } from '../utils/draw.js';

export default function Canvas({ socket, roomId, initHistory, initUndoHistory, viewOnly }) {

    const canvasRef = React.createRef();
    const colourRef = React.createRef();
    const brushSizeRef = React.createRef();

    const [drag, setDrag] = React.useState(false);
    const [history, setHistory] = React.useState(initHistory);
    const [undoHistory, setUndoHistory] = React.useState(initUndoHistory);
    const [currentLine, setCurrentLine] = React.useState([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const drawStartHandler = data => {
            console.log("draw start received");
            ctx.strokeStyle = data.colour;
            ctx.lineWidth = data.width;
            jumpToPoint(ctx, data);
        }

        const drawingHandler = data => draw(ctx, data);
        const drawEndHandler = data => setHistory(lines => [...lines, { colour: data.colour, width: data.width, points: data.points }]);

        const undoHandler = data => {
            setHistory(data.history);
            setUndoHistory(data.undoHistory);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawAllLines(ctx, data.history);
        }

        const redoHandler = data => {
            setHistory(data.history);
            setUndoHistory(data.undoHistory);
            drawLine(ctx, data.line);
        }

        const clearBoard = () => {
            console.log("board_clear");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setHistory([]);
            setUndoHistory([]);
        }

        socket.on("receive_draw_start", drawStartHandler);
        socket.on("receive_drawing", drawingHandler);
        socket.on("receive_draw_end", drawEndHandler);
        socket.on("receive_undo", undoHandler);
        socket.on("receive_redo", redoHandler);
        socket.on("receive_clear_board", clearBoard);

        drawAllLines(ctx, initHistory);

        return () => {
            socket.off("receive_draw_start", drawStartHandler);
            socket.off("receive_drawing", drawingHandler);
            socket.off("receive_draw_end", drawEndHandler);
            socket.off("receive_undo", undoHandler);
            socket.off("receive_redo", redoHandler);
            socket.off("receove_clear_board", clearBoard);
        }
    }, [initHistory, initUndoHistory]);

    const getScaledCoordinates = (canvas, event) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: scaleX * (event.clientX - rect.left),
            y: scaleY * (event.clientY - rect.top)
        }
    };

    const drawStart = async e => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const colour = colourRef.current.value, width = brushSizeRef.current.value;
        const coords = getScaledCoordinates(canvas, e);
        ctx.strokeStyle = colour;
        ctx.lineWidth = width;
        jumpToPoint(ctx, coords);

        setDrag(true)
        setUndoHistory([]);
        setCurrentLine(points => [...points, coords])
        await socket.emit("send_draw_start", { roomId, colour, width, ...coords });
    };

    const drawing = async e => {
        if (drag) {
            console.log("DOOTZ")
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const coords = getScaledCoordinates(canvas, e);

            draw(ctx, coords);
            setCurrentLine(points => [...points, coords])
            await socket.emit("send_drawing", { roomId, ...coords });
        }
    };

    const drawEnd = async () => {
        setDrag(false);
        if (currentLine.length !== 0) {
            const colour = colourRef.current.value, width = brushSizeRef.current.value;
            setHistory(lines => [...lines, { colour, width, points: currentLine }]);
            await socket.emit("send_draw_end", { roomId, colour, width, points: currentLine });
            setCurrentLine([]);
        }
    };

    const undo = async () => {
        console.log(history);
        if (history.length === 0) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const copy = history;
        const line = copy.pop();
        setHistory(copy)
        setUndoHistory(lines => [...lines, line])

        await socket.emit("undo", { roomId });
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawAllLines(ctx, history);
    }

    const redo = async () => {
        if (undoHistory.length === 0) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        const copy = undoHistory;
        const line = copy.pop();
        setUndoHistory(copy);
        setHistory(lines => [...lines, line]);

        await socket.emit("redo", { roomId });       
        drawLine(ctx, line);
    }

    const visibility = viewOnly ? 'hidden' : 'visible';

    return (
        <>
            <canvas
                ref={canvasRef} 
                width="700" 
                height="600" 
                onMouseDown={viewOnly ? null : e => drawStart(e)}
                onMouseMove={viewOnly ? null :e => drawing(e)}
                onMouseUp={viewOnly ? null : () => drawEnd()}
                onMouseOut={viewOnly ? null : () => drawEnd()}
            ></canvas>
               
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', maxWidth: '70%', gap: '10px', visibility: visibility }}>
                <button onClick={undo}>UNDO</button>
                <button onClick={redo}>REDO</button>
                <label for='color'>Select Colour</label>
                <input ref={colourRef} type='color' name='color'/>
                <label for='brush-size'>Brush Size</label>
                <input ref={brushSizeRef} type='range' name='brush-size' min='1' max='50' />
            </div>
        </>
    )
}
