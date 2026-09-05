import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system';

interface MilestoneAudioContextType {
  playMilestoneAudio: (text: string, milestoneId: string) => Promise<void>;
  stopMilestoneAudio: () => Promise<void>;
  isPlaying: boolean;
  currentMilestoneId: string | null;
  playedMilestones: Set<string>;
  resetPlayedMilestone: (milestoneId: string) => void;
}

const MilestoneAudioContext = createContext<MilestoneAudioContextType>({
  playMilestoneAudio: async () => {},
  stopMilestoneAudio: async () => {},
  isPlaying: false,
  currentMilestoneId: null,
  playedMilestones: new Set(),
  resetPlayedMilestone: () => {},
});

export const useMilestoneAudio = () => useContext(MilestoneAudioContext);

interface MilestoneAudioProviderProps {
  children: React.ReactNode;
}

//DISABLE API KEY
// sk_81e31fe2a861a09db480807aaccd44d4e3e4a28d8cd9b17b
// sk_d539156af99fc248f4fec410c7a6f7aad199c07234ad651a
const ELEVENLABS_API_KEY = "sk_81e31fe2a861a09db480807aaccd44d4e3e4a28d8cd9b17b";

    // Hope voice ID - tnSpp4vdxKPjI9w0GnoV
const ELEVENLABS_VOICE_ID = "tnSpp4vdxKPjI9w0GnoV"; 

export const MilestoneAudioProvider = ({ children }: MilestoneAudioProviderProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMilestoneId, setCurrentMilestoneId] = useState<string | null>(null);
  const [playedMilestones, setPlayedMilestones] = useState<Set<string>>(new Set());
  const sound = useRef<Audio.Sound | null>(null);
  const isMounted = useRef(true);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (sound.current) {
        sound.current.unloadAsync();
      }
    };
  }, []);

  // Helper function to use ElevenLabs API for speech synthesis
  const synthesizeSpeech = async (text: string): Promise<string> => {
    if (!ELEVENLABS_API_KEY) {
      console.error("ElevenLabs API key not found!");
      throw new Error("ElevenLabs API key not found");
    }

    try {
      const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream`;
      
      const payload = {
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("ElevenLabs API error:", errorText);
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      // Get the audio binary data
      const blob = await response.blob();
      const audioData = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      // Write the audio data to a temporary file
      const buffer = Buffer.from(audioData);
      const fileUri = `${FileSystem.cacheDirectory}temp-speech-${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(fileUri, buffer.toString('base64'), {
        encoding: FileSystem.EncodingType.Base64
      });

      return fileUri;
    } catch (error) {
      console.error("Failed to synthesize speech:", error);
      throw error;
    }
  };

  const playMilestoneAudio = async (text: string, milestoneId: string) => {
    if (!text || text.trim() === '') {
      console.error("Empty text provided for milestone audio");
      return;
    }

    try {
      console.log(`Starting audio playback for milestone ${milestoneId}`);
      
      if (playedMilestones.has(milestoneId)) {
        console.log(`Milestone ${milestoneId} was already played. Use resetPlayedMilestone to play again.`);
        return;
      }
      
      await stopMilestoneAudio();
      
      setIsPlaying(true);
      setCurrentMilestoneId(milestoneId);
      
      try {
        console.log("Generating audio with ElevenLabs...");
        const audioUrl = await synthesizeSpeech(text);
        console.log(`Got audio URL: ${audioUrl}`);
        
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true },
          status => {
            console.log("Playback status update:", status);
          }
        );
        
        sound.current = newSound;
        console.log("Audio started playing");
        
        sound.current.setOnPlaybackStatusUpdate(status => {
          if (status.isLoaded) {
            if (status.didJustFinish) {
              console.log("Audio finished playing");
              if (isMounted.current) {
                setIsPlaying(false);
                setCurrentMilestoneId(milestoneId);
                
                setPlayedMilestones(prev => {
                  const newSet = new Set(prev);
                  newSet.add(milestoneId);
                  return newSet;
                });
              }
            }
          } else if (status.error) {
            console.error(`Playback error: ${status.error}`);
          }
        });
        
        return;
      } catch (error) {
        console.error("ElevenLabs TTS failed, trying fallback:", error);
      }
      
      // Fallback to Expo Speech
      console.log("Using fallback Expo Speech");
      await Speech.speak(text, {
        language: 'en',
        pitch: 1.0,
        rate: 0.9,
        onDone: () => {
          console.log(`Fallback speech finished for ${milestoneId}`);
          if (isMounted.current) {
            setIsPlaying(false);
            setCurrentMilestoneId(milestoneId);
            
            // Mark as played
            setPlayedMilestones(prev => {
              const newSet = new Set(prev);
              newSet.add(milestoneId);
              return newSet;
            });
          }
        },
        onError: (error) => {
          console.error("Speech error:", error);
          if (isMounted.current) {
            setIsPlaying(false);
            setCurrentMilestoneId(milestoneId);
          }
        }
      });
    } catch (error) {
      console.error('Error in playMilestoneAudio:', error);
      if (isMounted.current) {
        setIsPlaying(false);
        setCurrentMilestoneId(milestoneId);
      }
    }
  };
  
  // Function to stop currently playing audio
        // Stop TTS if playing
  const stopMilestoneAudio = async () => {
    try {
      Speech.isSpeakingAsync().then(speaking => {
        if (speaking) {
          Speech.stop();
        }
      });
      
      if (sound.current) {
        await sound.current.stopAsync();
        await sound.current.unloadAsync();
        sound.current = null;
      }
      
      if (isMounted.current) {
        setIsPlaying(false);
        setCurrentMilestoneId(null);
      }
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  };

  //reset milestone for replays
  const resetPlayedMilestone = (milestoneId: string) => {
    setPlayedMilestones(prev => {
      const newSet = new Set(prev);
      newSet.delete(milestoneId);
      return newSet;
    });
  };

  console.log("Played milestones:", Array.from(playedMilestones));
  console.log("Current milestone ID:", currentMilestoneId);

  return (
    <MilestoneAudioContext.Provider value={{
      playMilestoneAudio,
      stopMilestoneAudio,
      isPlaying,
      currentMilestoneId,
      playedMilestones,
      resetPlayedMilestone
    }}>
      {children}
    </MilestoneAudioContext.Provider>
  );
};