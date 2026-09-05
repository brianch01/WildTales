import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {Image, Text, Pressable, StyleSheet, View, ActivityIndicator, ScrollView, Alert, TouchableOpacity} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, updateDoc, DocumentData, Timestamp } from "firebase/firestore";
import { db } from "@/FirebaseConfig";
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Buffer } from 'buffer';
import { Platform } from 'react-native';
import { useMilestoneAudio } from './milestoneAudioContext';
import { useCurrentMilestone } from './hooks/useCurrentMilestone';
import { MILESTONE_TO_PUZZLE_PIECE } from '../utils/puzzleConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const birdImage = require('@/assets/images/guidebird-wave.png');
const placeholderImage = require('@/assets/images/splash-icon.png');
const puzzlePlaceholderImage = require('@/assets/images/puzzle_southbank_tr.png');

// Interfaces
interface Milestone {
  id?: string; 
  name?: string; 
  description?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  journey_id?: any; 
  visual_asset_url?: string;
  asset_unlock?: string;
  audio_prompt?: string;
  is_complete?: boolean;
  puzzlePieceAssetUrl?: string; 
  visited_at?: any | null; 
  created_at?: any;
  updated_at?: any;
  puzzle_piece_collected?: boolean;
}

export default function MilestoneDetails() {
  const { id: paramId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { playMilestoneAudio, stopMilestoneAudio, isPlaying, currentMilestoneId, resetPlayedMilestone } = useMilestoneAudio();
  
  const [milestoneId, setMilestoneId] = useState<string | null>(paramId || null);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [loading, setLoading] = useState(true);
  const [puzzleCollected, setPuzzleCollected] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);
  
  const { milestone: currentMilestone, loading: currentMilestoneLoading } = useCurrentMilestone();
  
  useEffect(() => {
    if (paramId) {
      fetchMilestone(paramId);
    } 
    else if (currentMilestone && !paramId) {
      setMilestone(currentMilestone);
      setMilestoneId(currentMilestone.id);
      setPuzzleCollected(currentMilestone.puzzle_piece_collected || false);
      setLoading(false);
    }
  }, [paramId, currentMilestone]);

  const fetchMilestone = async (id: string) => {
    setLoading(true);
    try {
      // First check if offline
      const networkState = await NetInfo.fetch();
      const isOffline = !(networkState.isConnected);
      
      // Try to get from cache first (whether online or offline)
      const cachedData = await AsyncStorage.getItem(`milestone_${id}`);
      if (cachedData) {
        const milestone = JSON.parse(cachedData);
        setMilestone(milestone);
        setPuzzleCollected(milestone.puzzle_piece_collected || false);
        setLoading(false);
        
        // If online, still fetch from Firestore to get latest data
        if (!isOffline) {
          fetchFromFirestore();
        }
        return;
      }
      
      // If no cache and offline, show error
      if (isOffline) {
        Alert.alert(
          "Offline Mode", 
          "This milestone data is not available offline. Please download the journey first or connect to the internet."
        );
        setLoading(false);
        return;
      }
      
      // If online and no cache, fetch from Firestore
      fetchFromFirestore();
      
      async function fetchFromFirestore() {
        const milestoneRef = doc(db, "milestones", id);
        const milestoneDoc = await getDoc(milestoneRef);

        if (milestoneDoc.exists()) {
          const data = milestoneDoc.data() as DocumentData;
          const milestone = {
            id: milestoneDoc.id,
            name: data.name,
            description: data.description,
            latitude: data.latitude,
            longitude: data.longitude,
            radius: data.radius,
            journey_id: data.journey_id,
            visual_asset_url: data.visual_asset_url,
            asset_unlock: data.asset_unlock,
            audio_prompt: data.audio_prompt,
            is_complete: data.is_complete,
            puzzlePieceAssetUrl: data.puzzlePieceAssetUrl,
            visited_at: data.visited_at,
            created_at: data.created_at,
            updated_at: data.updated_at,
            puzzle_piece_collected: data.puzzle_piece_collected || false,
          };
          
          setMilestone(milestone);
          setPuzzleCollected(data.puzzle_piece_collected || false);
          
          // Cache the data for offline use
          await AsyncStorage.setItem(`milestone_${id}`, JSON.stringify(milestone));
        } else {
          console.log("No milestone found with ID:", id);
          setMilestone(null);
        }
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching milestone:", error);
      setMilestone(null);
      setLoading(false);
      
      // Try cache as fallback if there was an error
      try {
        const cachedData = await AsyncStorage.getItem(`milestone_${id}`);
        if (cachedData) {
          const milestone = JSON.parse(cachedData);
          setMilestone(milestone);
          setPuzzleCollected(milestone.puzzle_piece_collected || false);
        }
      } catch (e) {
        console.error("Error reading from cache:", e);
      }
    }
  };

  const handleAudioButton = async () => {
    if (!milestone) return;
    
    if (isPlaying && currentMilestoneId === milestone.id) {
      await stopMilestoneAudio();
    } else {
      if (milestone.id) {
        resetPlayedMilestone(milestone.id);
      }
      
      if (milestone.id) {
      await playMilestoneAudio(milestone.description ?? '', milestone.id);
      }}
  };

  const collectPuzzlePiece = async () => {
    if (!milestone?.id) return;
    
    try {
      setIsCollecting(true); // Add this state for feedback
    
      // Get the milestone document
      const milestoneRef = doc(db, "milestones", milestone.id);
      const milestoneSnap = await getDoc(milestoneRef);
    
      if (milestoneSnap.exists()) {
        // If not already collected
        if (!milestoneSnap.data().puzzle_piece_collected) {
          // Update the milestone document
          await updateDoc(milestoneRef, {
            puzzle_piece_collected: true,
            collected_at: new Date()
          });
        
          // Show success message
          Alert.alert(
            "Puzzle Piece Collected!", 
            "You found a piece of the artwork! Visit the Artwork Gallery to see your collection.",
            [
              { 
                text: "View Gallery", 
                onPress: () => router.push('/artwork-gallery') 
              },
              { 
                text: "Continue", 
                style: "cancel" 
              }
            ]
          );
        } else {
          // Already collected
          Alert.alert(
            "Already Collected", 
            "You already collected this puzzle piece!"
          );
        }
      }
    } catch (error) {
      console.error("Error collecting puzzle piece:", error);
      Alert.alert("Error", "Failed to collect puzzle piece. Please try again.");
    } finally {
      setIsCollecting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8A4DFF" />
        <Text style={styles.loadingText}>Loading your next stop...</Text>
      </SafeAreaView>
    );
  }

  if (!milestone) {
    return (
      <SafeAreaView style={styles.container}>
         <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back-circle" size={40} color="#8A4DFF" />
         </Pressable>
        <View style={styles.centeredContent}>
            <Text style={styles.errorText}>Oops! Milestone not found.</Text>
            <Pressable style={[styles.collectButton, styles.errorButton]} onPress={() => router.back()}>
                <Text style={styles.collectButtonText}>GO BACK</Text>
            </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // --- Main Content
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back-circle" size={40} color="#8A4DFF" />
      </Pressable>

      <ScrollView contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.imageContainer}>
          <Image
             source={milestone.visual_asset_url ? { uri: milestone.visual_asset_url } : placeholderImage}
            style={styles.mainImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.speechSection}>
          <Image source={birdImage} style={styles.birdImage} resizeMode="contain" />
          <View style={styles.speechBubbleContainer}>
            <View style={styles.speechBubble}>
              {/* <Text style={styles.didYouKnow}>Did You Know?</Text> */}
              <Text style={styles.descriptionText}>
                {milestone.description ?? 'Description not available.'}
              </Text>
              <View style={styles.speechBubbleTail} />
            </View>
            <Pressable
              style={[styles.audioButton, isPlaying && currentMilestoneId === milestoneId && styles.audioButtonActive]}
              onPress={handleAudioButton}
              disabled={!milestone.description}
            >
              <Ionicons
                name={isPlaying && currentMilestoneId === milestoneId ? "volume-high" : "volume-medium-outline"}
                size={40}
                color="white"
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.puzzleContainer}>
          <Image 
            source={require('@/assets/images/dirtframe-puzzleBg.avif')} 
            style={styles.puzzleBackgroundImage}
            resizeMode="cover"
          />
          
          {puzzleCollected ? (
            // collected state
            <>
              <Text style={styles.puzzleText}>Hooray! You found a puzzle piece!</Text>
              <View style={styles.collectedContainer}>
                <Ionicons name="paw-sharp" size={70} color="#ef9b9c" />
                <Text style={styles.collectedText}>
                Keep exploring to complete the entire piece!
                </Text>
              </View>
            </>
          ) : (
            // uncollected state
            <>
              <Text style={styles.puzzleText}>You just found a puzzle piece!</Text>
              <Image
                source={milestone?.puzzlePieceAssetUrl ? { uri: milestone.puzzlePieceAssetUrl } : puzzlePlaceholderImage}
                style={styles.puzzleImage}
                resizeMode="contain"
              />
              <TouchableOpacity 
                style={styles.collectButton}
                onPress={collectPuzzlePiece}
                disabled={isCollecting}
              >
                <Text style={styles.collectButtonText}>
                  {isCollecting ? "Collecting..." : "Collect Puzzle Piece"}
                </Text>
                <Ionicons name="paw-outline" size={20} color="white" style={{marginLeft: 8}} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fffff5", //main page background
  },
  scrollContentContainer: {
    paddingBottom: 40, 
    paddingHorizontal: 15,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#2C2C2C",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  centeredContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF6B6B", //
    textAlign: "center",
    marginBottom: 20,
  },
  backButton: {
    position: 'relative',
    marginTop: 60, 
    left: 10, 
    zIndex: 10, 
  },
  imageContainer: {
    marginTop: 10, 
    marginBottom: 20,
    alignItems: 'center', 
  },
  mainImage: {
    width: "96%", 
    aspectRatio: 2.2, 
    borderRadius: 25, 
    borderWidth: 4,
    borderColor: '#FFA500', 
    alignSelf: 'center',
  },
  speechSection: {
    flexDirection: 'row', 
    marginBottom: 30,
    alignItems: 'flex-end', 
    position: 'relative', 
    minHeight: 180, 
  },

  speechBubbleContainer: {
    flex: 1,
    marginRight: 50,
    alignItems: 'flex-start',
  },
  speechBubble: {
    position: 'relative',
    backgroundColor: '#f4fbfe', 
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    marginLeft: 15,
    width: '90%',
    transform: [
      { rotate: '-4deg' },
      { perspective: 1000 },
    ],

    shadowColor: "#629bdd", 
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 8,
  },

  speechBubbleTail: {
    position: 'absolute',
    bottom: -15,
    right: 15,
    width: 0,
    height: 20,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderBottomWidth: 25,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#f4fbfe',
    transform: [{ rotate: '51deg' }],
    shadowColor: "#629bdd",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  didYouKnow: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 5,
  },
  descriptionText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 21,
    fontFamily: 'Comfortaa', 
  },
  birdImage: {
    width: 200, 
    height: 240, 
    position: 'absolute',
    top: 30, 
    right: -90, 
    transform: [{ rotate: '320deg' }], 
    zIndex: 20, 
  },
  audioButton: {
    backgroundColor: "#FFA500", //orange audio btn
    borderRadius: 30, 
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.20,
    shadowRadius: 1.41,
    elevation: 2,
  },
  audioButtonActive: {
    backgroundColor: "#E69500", //darker orange
  },
  photosContainer: { 
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  photosTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DDD', 
    marginBottom: 10,
  },
  photoTaken: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  puzzleContainer: {
    alignItems: "center",
    marginTop: 12,
    marginBottom: 30,
    padding: 20,
    // backgroundColor: "rgba(59, 54, 2, 0.88)", // Semi-transparent white background
    borderRadius: 15,
  },
  puzzleBackgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '112%',
    height: '115%',
    borderRadius: 15,
    opacity: 0.9, 
  },
  puzzleText: {
    fontSize: 18, 
    fontWeight: "bold",
    color: "#FFFFFF", 
    marginBottom: 15,
    textAlign: "center",
  },
  puzzleImage: {
    width: 140, 
    height: 140, 
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#FFA500', 
  },
  collectButton: {
    backgroundColor: "#8A4DFF", 
    borderRadius: 15, 
    paddingVertical: 15, 
    paddingHorizontal: 40, 
    // transform: [{ rotate: '-2deg' }],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  collectButtonText: {
    fontSize: 20, 
    fontWeight: "bold",
    color: "#FFFFFF", 
    textTransform: 'uppercase', 
  },
  collectedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  collectedText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 15,
  },
  errorButton: {
  }  
});