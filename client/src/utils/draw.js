export function jumpToPoint(ctx, { x, y }) {
    ctx.beginPath();
    ctx.moveTo(x, y);
}

export function draw(ctx, { x, y }) {
    ctx.lineCap = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
    jumpToPoint(ctx, { x, y });
}

export function drawLine(ctx, line) {
    ctx.strokeStyle = line.colour;
    ctx.lineWidth = line.width;
    jumpToPoint(ctx, line.points[0]);
    for (const point of line.points) {
        draw(ctx, point);
    }
}

export function drawAllLines(ctx, data) {
    for (const line of data) {
        drawLine(ctx, line);
    }
}

export class Brush {
    constructor(ctx) {
        this.ctx = ctx;
    }
}