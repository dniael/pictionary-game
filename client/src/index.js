import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import io from 'socket.io-client'
import Game from './components/Game';

const socket = io.connect('skribblio-clone-production.up.railway.app');
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App socket={socket} />
  },
  {
    path: '/chat/:roomId',
    element: <Game socket={socket} />,
  },
  
])

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <RouterProvider router={router} />
);

