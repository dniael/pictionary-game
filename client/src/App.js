import './App.css';
import JoinRoom from './components/JoinRoom';
import 'bootstrap/dist/css/bootstrap.min.css';
import React from 'react';

function App({ socket }) { 
  
    React.useEffect(() => {
      window.addEventListener("pageshow", e => {
        if (e.persisted) {
          window.location.reload();
        }
      })
    })

    return (
        <div className="App">
            <JoinRoom socket={socket} />
        </div>
    );
}

export default App;
