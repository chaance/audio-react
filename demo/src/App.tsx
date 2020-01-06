import React from 'react';
import './App.css';
import Audio, {
  AudioPlayButton,
  AudioVolumeButton,
  AudioVolumeRange,
  AudioProgressRange,
  AudioTime,
} from './Audio';

const App: React.FC = () => {
  return (
    <div className="App">
      <p>
        The goal of this component is to mirror the behavior of a native HTML 5
        audio player as closely as possible with the flexibility of a custom
        component.
      </p>
      <p>
        The outer group should receive focus when a user interacts with the
        player, and normal keyboard controls should work for the player
        regardless of which inner component a user clicks. Enter/Space toggles
        play, arrow up/down adjusts volume at 10% intervals, and arrow
        left/right seeks at 15 second intervals.
      </p>
      <p>
        The tab key can focus on individual components, at which point the user
        can control that component in isolation.
      </p>
      <p>
        Further, we should ensure that all of the components are properly
        labeled and that screen readers propoerly announce each element.
      </p>
      <header className="App-header">
        <div>
          <Audio src="https://www.buzzsprout.com/153232/1744747-e11-publishing-community-and-life-as-a-digital-nomad-with-jessica-bell.mp3">
            <div style={{ margin: 10, padding: 10, border: '2px solid #fff' }}>
              <div>CONTROLS</div>
              <AudioPlayButton />
              <AudioVolumeButton />
            </div>
            <div>
              <div>
                <div
                  style={{ margin: 10, padding: 10, border: '2px solid #fff' }}
                >
                  VOLUME
                  <AudioVolumeRange />
                </div>
              </div>
            </div>
            <div style={{ margin: 10, padding: 10, border: '2px solid #fff' }}>
              PROGRESS
              <AudioProgressRange />
            </div>
            <AudioTime />
          </Audio>
        </div>
      </header>
    </div>
  );
};

export default App;
