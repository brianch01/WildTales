import React, { useEffect, useRef, useState } from 'react';
import { Text, View, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { Entypo, Feather } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { avatarAnimatedMap, avatarMap } from '@/utils/user-profile';
import {Image} from 'expo-image';

const { height } = Dimensions.get('window');

interface Props {
  visible: boolean;
  message: string;
  onClose: () => void;
  isBlur?: boolean;
  size?: 'small' | 'medium' | 'large';
  enableAudio?: boolean;
  animated?:boolean;
}

export default function DialoguePopup({
  visible,
  message,
  onClose,
  isBlur = true,
  size = 'medium',
  enableAudio = true,
  animated = false,
}: Props) {
  const slideAnim = useRef(new Animated.Value(-400)).current;
  const characterAnim = useRef(new Animated.Value(-100)).current;
  const [localVisible, setLocalVisible] = useState(visible);
  const [avatar, setAvatar] = useState<string>('skye'); // default avatar

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const storedPrefs = await AsyncStorage.getItem('wildTales-Preferences');
        console.log("the stored value is", storedPrefs)
        if (storedPrefs) {
          const parsed = JSON.parse(storedPrefs);
          if (parsed.avatar && avatarMap[parsed.avatar]) {
            setAvatar(parsed.avatar);
            // setAvatar("Paddy");
          }
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
        setAvatar(avatarMap['Skye']); // fallback
      }
    };

    loadPreferences();
  }, []);

  useEffect(() => {
    if (visible) {
      setLocalVisible(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: height * 0.15,
          useNativeDriver: true,
        }),
        Animated.spring(characterAnim, {
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -300,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(characterAnim, {
          toValue: 300,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setLocalVisible(false);
      });
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: -300,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setLocalVisible(false);
      onClose();
    });
  };

  const playAudio = async () => {
    // Optional: add your audio logic here
  };

  const getSizeScale = () => {
    switch (size) {
      case 'small':
        return 0.8;
      case 'large':
        return 1.2;
      default:
        return 1;
    }
  };

  const scale = getSizeScale();
  const avatarImage = avatarMap[avatar] || avatarMap['skye'];
  const avatarImageAnimated = avatarAnimatedMap[avatar] || avatarAnimatedMap['skye'];

  if (!localVisible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={[styles.overlay, { backgroundColor: isBlur ? 'rgba(0, 0, 0, 0.5)' : 'transparent' }]}>
        <Animated.View style={[styles.popupContainer, { transform: [{ translateY: slideAnim }] }]}>
          <View style={[styles.svgWrapper, { transform: [{ scale }] }]}>
            <Svg width={380} height={280} viewBox="40 20 220 120" fill="none">
              <Path
                d="M60 20 C60 10, 240 10, 230 20 L230 120 C220 140, 130 110, 100 150 L110 130 C90 110, 60 130, 60 120 Z"
                fill="white"
                stroke="#000"
                strokeWidth={2}
              />
            </Svg>

            <View style={styles.textInsideBubble}>
              <Text style={[styles.message, { fontSize: 32 * scale }]}>{message}</Text>
              {enableAudio && (
                <TouchableOpacity style={[styles.speakerButton, { padding: 12 * scale }]} onPress={playAudio}>
                  <Feather name="volume-2" size={28 * scale} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Entypo name="cross" size={24 * scale} color="#000" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {!animated && <Animated.Image
          source={avatarImage}
          style={[styles.characterImage, { transform: [{ translateY: characterAnim }] }]}
          resizeMode="contain"
        />}
        {animated && <Image
          source={avatarImageAnimated}
          style={styles.characterImageAnimated}
          resizeMode="contain"
        />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    alignItems: 'center',
    zIndex: 999,
    position: 'absolute',
  },
  popupContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  svgWrapper: {
    position: 'relative',
    width: 280,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInsideBubble: {
    position: 'absolute',
    top: 0,
    right: 12,
    width: '100%',
    alignItems: 'center',
  },
  message: {
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
    margin: 4,
  },
  speakerButton: {
    marginTop: 10,
    backgroundColor: '#F28C38',
    borderRadius: 999,
  },
  closeButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    padding: 4,
    elevation: 10,
  },
  characterImage: {
    position: 'absolute',
    bottom: '36%',
    left: 0,
    width: 240,
    height: 240,
  },
  characterImageAnimated: {
    position: 'absolute',
    bottom: '25%',
    left: 0,
    width: 480,
    height: 420,
  }
});