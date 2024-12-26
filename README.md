# Pictionary Game

## Overview 
This project is an in progress pictionary game inspired by the popular online multiplayer drawing and guessing game, Skribbl.io. Players take turns drawing a given word while others try to guess what the word is. The game is built using modern web technologies and provides a fun and interactive experience.

## Features
- **Multiplayer Support**: Play with friends or join public games.
- **Real-time Drawing and Guessing**: Smooth and responsive drawing canvas with real-time updates.
- **Customizable Rooms**: Create private rooms with custom settings.
- **Chat Functionality**: In-game chat to communicate with other players.
- **Score Tracking**: Keep track of scores and determine the winner at the end of each round.

## Technologies Used
- **Frontend**: HTML, CSS, JavaScript, React
- **Backend**: Node.js, Express
- **WebSockets**: Socket.io for real-time communication

## Installation

### Prerequisites
- Node.js and npm installed on your machine

### Steps
1. **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/pictionary-game.git
    cd pictionary-game
    ```

2. **Install dependencies**:
    ```bash
    npm install
    ```

4. **Run the server**:
    ```bash
    npm start
    ```

5. **Open the application**:
    Open your browser and navigate to `http://localhost:3000`

## Usage
- **Create a Room**: Click on "Create Room" and set your preferences.
- **Join a Room**: Enter the room code provided by the host.
- **Start Drawing**: If it's your turn, draw the given word. If not, guess the word based on the drawing.
- **Chat**: Use the chat box to communicate with other players.

## Contributing
Contributions are welcome! Please fork the repository and create a pull request with your changes. Make sure to follow the code style and include tests for any new features.

## License
This project is licensed under the MIT License. See the LICENSE file for details.

## Acknowledgements
- Inspired by the original Skribbl.io
- Thanks to all contributors and open-source libraries used in this project.
