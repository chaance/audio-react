import React from 'react';
import './App.css';
import Audio, {
  AudioPlayButton,
  AudioVolumeButton,
  AudioVolumeRange,
  AudioProgressRange,
  AudioTime,
} from '../Audio';

const App: React.FC = () => {
  return (
    <div className="App">
      <header className="App-header">
        <div>
          <Audio src="https://www.buzzsprout.com/153232/1744747-e11-publishing-community-and-life-as-a-digital-nomad-with-jessica-bell.mp3">
            <AudioPlayButton />
            <div>
              <AudioVolumeButton />
              <div>
                <AudioVolumeRange />
              </div>
            </div>
            <AudioProgressRange />
            <AudioTime />
          </Audio>
        </div>
      </header>
    </div>
  );
};

export default App;
