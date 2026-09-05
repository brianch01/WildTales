// components/BackgroundPlayback.tsx

import React, { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

type BackgroundPlaybackProps = {
  choose?: number;     // 1 to 4
  loop?: boolean;
  playAll?: boolean;
  volume?: number; //0 to 100
};

const audioSources = [
  require('../assets/sounds/background-audio-1.mp3'),
  require('../assets/sounds/background-audio-2.mp3'),
  require('../assets/sounds/background-audio-3.mp3'),
  require('../assets/sounds/background-audio-4.mp3'),
];

const BackgroundPlayback: React.FC<BackgroundPlaybackProps> = ({ choose = 1, loop = false, playAll = false, volume = 100 }) => {
  const soundRefs = useRef<Audio.Sound[]>([]);

  useEffect(() => {
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
        });

        const sourcesToPlay = playAll ? audioSources : [audioSources[(choose - 1) % 4]];

        // Load and play each sound
        for (let i = 0; i < sourcesToPlay.length; i++) {
          const { sound } = await Audio.Sound.createAsync(
            sourcesToPlay[i],
            {
              shouldPlay: true,
              isLooping: loop,
              volume: volume/100,
            }
          );
          soundRefs.current.push(sound);
        }
      } catch (err) {
        console.error("Error loading audio:", err);
      }
    })();

    return () => {
      // Cleanup on unmount
      soundRefs.current.forEach((sound) => {
        sound.unloadAsync();
      });
    };
  }, []);

  return null; // No UI component needed
};

export default BackgroundPlayback;