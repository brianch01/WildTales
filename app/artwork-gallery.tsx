import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions, StyleSheet, Modal, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../FirebaseConfig';
// import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
// import ViewShot from 'react-native-view-shot';
import * as Print from 'expo-print';
import { captureRef } from 'react-native-view-shot';
import * as Animatable from 'react-native-animatable';
import { JOURNEY_PUZZLES } from '../utils/puzzleConfig';

// config
const JOURNEY_ID_TO_DISPLAY = "southbank01"; //hardcoded for this sb journey
const screenWidth = Dimensions.get('window').width;
const puzzleSize = screenWidth * 0.8;
const pieceSize = puzzleSize / 2;

// Puzzle pieces fill order: top-right, top-left, bottom-right, bottom-left
const FILL_ORDER = ['topRight', 'topLeft', 'bottomRight', 'bottomLeft'];

interface Milestone {
  puzzle_piece_collected: boolean;
  [key: string]: any; 
}

const ArtworkGallery = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [collectedPieces, setCollectedPieces] = useState<Milestone[]>([]);
  const [journeyName, setJourneyName] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const puzzleRef = React.useRef(null);

  // Replace your hardcoded puzzlePieces with:
  const puzzlePieces = JOURNEY_PUZZLES[JOURNEY_ID_TO_DISPLAY].pieces;

  // Update your useEffect to fetch all milestones for the journey
  useEffect(() => {
    const fetchMilestones = async () => {
      setLoading(true);
      try {
        // Query all milestones for the journey
        const milestonesRef = collection(db, 'milestones');
        const q = query(milestonesRef, where('journey_id_string', '==', JOURNEY_ID_TO_DISPLAY));
        const milestonesSnapshot = await getDocs(q);
        
        if (!milestonesSnapshot.empty) {
          setJourneyName(JOURNEY_PUZZLES[JOURNEY_ID_TO_DISPLAY].name);
        }
        
        const collected: Milestone[] = [];
        milestonesSnapshot.forEach(doc => {
          const milestone = doc.data() as Milestone;
          milestone.id = doc.id; // Add the ID to the milestone data
          
          if (milestone.puzzle_piece_collected) {
            collected.push(milestone);
          }
        });
        
        setCollectedPieces(collected);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching milestones:', err);
        setError('Failed to load your puzzle pieces. Please try again.');
        setLoading(false);
      }
    };

    fetchMilestones();
  }, []);

  // Ask for permissions when component mounts
  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setPermissionGranted(status === 'granted');
    })();
  }, []);

  // Function to capture the puzzle view as an image
  const capturePuzzle = async () => {
    if (puzzleRef.current) {
      try {
        const uri = await captureRef(puzzleRef, {
          format: 'png',
          quality: 1
        });
        return uri;
      } catch (error) {
        console.error("Error capturing puzzle:", error);
        return null;
      }
    }
    return null;
  };

  // create in phone album
  const saveToGallery = async () => {
    const uri = await capturePuzzle();
    if (!uri) return;
    
    if (permissionGranted) {
      try {
        const asset = await MediaLibrary.createAssetAsync(uri);
        await MediaLibrary.createAlbumAsync('WildTales', asset, false);
        alert('Your artwork has been saved to your gallery!');
        setShowPrintModal(false);
      } catch (error) {
        console.error("Error saving to gallery:", error);
        alert('Failed to save your artwork. Please try again.');
      }
    } else {
      alert('Permission to access media library is required');
    }
  };

  // Share image
  const shareImage = async () => {
    const uri = await capturePuzzle();
    if (!uri) return;
    
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri);
        setShowPrintModal(false);
      } else {
        alert('Sharing is not available on this device');
      }
    } catch (error) {
      console.error("Error sharing:", error);
      alert('Failed to share your artwork. Please try again.');
    }
  };

  // Print image
  const printImage = async () => {
    const uri = await capturePuzzle();
    if (!uri) return;
    
    try {
      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          </head>
          <body style="text-align: center;">
            <h2 style="font-family: Arial; color: #7E22CE;">WildTales Artwork</h2>
            <img src="${uri}" style="width: 100%; max-width: 500px;" />
            <h4 style="font-family: Arial; color:rgb(0, 53, 158); margin-top: 20px;">${journeyName || 'South Bank Adventure'}</h4>
          </body>
        </html>
      `;
      
      await Print.printAsync({
        html,
      });
      setShowPrintModal(false);
    } catch (error) {
      console.error("Error printing:", error);
      alert('Failed to print your artwork. Please try again.');
    }
  };

  // check for full puzzle completion
  const collectedCount = collectedPieces.length;

  const isFilled = (positionName: string) => {
    const index = FILL_ORDER.indexOf(positionName);
    return index < collectedCount;
  };

  const handleBack = () => {
    router.back();
  };

  // Trigger celebration when puzzle is completed
  useEffect(() => {
    if (collectedCount === 4) {
      setShowCelebration(true);
      
      // Hide the celebration after some time
      const timer = setTimeout(() => {
        setShowCelebration(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [collectedCount]);

  return (

    <SafeAreaView style={styles.container}>

        <Image 
          source={require('../assets/images/hand-drawn-spring-wallpaper.avif')} 
          style={styles.backgroundImage} 
        />

      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Ionicons name="arrow-back-circle" size={42} color="#8A4DFF" />
      </TouchableOpacity>

      <View style={styles.titleContainer}>
        <Text style={styles.title}>Your Artwork</Text>
        <Text style={styles.subtitle}>
          {journeyName ? `${journeyName}` : 'See the pieces you\'ve collected!'}
        </Text>
      </View>

      {loading && <ActivityIndicator size="large" color="#8A4DFF" style={styles.activityIndicator}/>}
      {!loading && error && <Text style={styles.errorText}>{error}</Text>}


      <View style={styles.puzzleContainer} ref={puzzleRef}>
        <View style={styles.row}>
          <View
            style={[
              styles.puzzlePiece,
              isFilled('topLeft') ? styles.filled : styles.empty,
            ]}
          >
            {isFilled('topLeft') && (
              <Image 
                source={puzzlePieces.topLeft}
                style={styles.pieceImage}
                resizeMode="contain"
              />
            )}
          </View>
          <View
            style={[
              styles.puzzlePiece,
              isFilled('topRight') ? styles.filled : styles.empty,
            ]}
          >
            {isFilled('topRight') && (
              <Image 
                source={puzzlePieces.topRight}
                style={styles.pieceImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
        <View style={styles.row}>
          <View
            style={[
              styles.puzzlePiece,
              isFilled('bottomLeft') ? styles.filled : styles.empty,
            ]}
          >
            {isFilled('bottomLeft') && (
              <Image 
                source={puzzlePieces.bottomLeft}
                style={styles.pieceImage}
                resizeMode="contain"
              />
            )}
          </View>
          <View
            style={[
              styles.puzzlePiece,
              isFilled('bottomRight') ? styles.filled : styles.empty,
            ]}
          >
            {isFilled('bottomRight') && (
              <Image 
                source={puzzlePieces.bottomRight}
                style={styles.pieceImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </View>

      <Text style={styles.statusText}>
        {collectedCount === 0 ? 'You haven\'t collected any pieces yet!' :
         collectedCount < 4 ? `You've collected ${collectedCount} out of 4 pieces!` :
         'Congratulations! You\'ve completed the puzzle!'}
      </Text>

      {collectedCount < 4 ? (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => router.push('/(tabs)/home')}
        >
          <Ionicons name="compass-outline" size={32} color="#fff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={styles.printButton}
          onPress={() => setShowPrintModal(true)}
        >
          <Text style={styles.printButtonText}>Print or Share Your Artwork</Text>
          <Ionicons name="share-outline" size={20} color="#fff" style={{marginLeft: 8}} />
        </TouchableOpacity>
      )}

      {/* Celebration Animation */}
      {showCelebration && (
        <Animatable.View 
          animation="pulse" 
          iterationCount="infinite" 
          style={styles.celebrationContainer}
        >
          <Text style={styles.celebrationText}>
            🎉 Congratulations! 🎉
          </Text>
          <Text style={styles.celebrationSubtext}>
            You've completed the artwork!
          </Text>
        </Animatable.View>
      )}

      {/* Print/Share Modal */}
      <Modal
        visible={showPrintModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPrintModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Share Your Collection!</Text>
            
            <TouchableOpacity style={styles.optionButton} onPress={saveToGallery}>
              <Ionicons name="save-outline" size={24} color="#7E22CE" />
              <Text style={styles.optionText}>Save to Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.optionButton} onPress={shareImage}>
              <Ionicons name="share-social-outline" size={24} color="#7E22CE" />
              <Text style={styles.optionText}>Share</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.optionButton} onPress={printImage}>
              <MaterialCommunityIcons name="printer-outline" size={24} color="#7E22CE" />
              <Text style={styles.optionText}>Print as Postcard</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowPrintModal(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({

      backgroundImage: {
        position: 'absolute',
        bottom: 0,
        opacity: 0.7,
        left: 0,
        right: 0,
        height: '57.1%', // Takes up bottom half of screen
        resizeMode: 'cover',
        zIndex: -1, // Behind other content
      },
    container: {
        flex: 1,
        backgroundColor: '#FFFBEB', // Light cream background
        alignItems: 'center',
        // backgroundImage: 'url(../assets/images/artworkgallery-bg-image-1.png)', 
        // backgroundSize: 'cover',
        paddingTop: 40,
    },
    backButton: {
        position: 'absolute',
        top: 50, 
        left: 15,
        zIndex: 10,
    },
    titleContainer: {
        marginTop: 40, // Space below back button
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#7E22CE', // Purple
        marginBottom: 25,
    },
    subtitle: {
        fontSize: 24,
        fontWeight: '800',
        fontFamily: 'Arial',
        color: '#8a5b0d', // Gold
    },
    activityIndicator: {
        marginTop: 80,
    },
    errorText: {
        color: 'red',
        marginTop: 50,
        fontSize: 16,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    puzzleContainer: {
        marginTop: 20,
        width: puzzleSize,
        height: puzzleSize,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff', 
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 5,
        padding: 5, 
    },
    row: {
        flexDirection: 'row',
    },
    puzzlePiece: {
        width: pieceSize,
        height: pieceSize,
        margin: 0, 
        backgroundColor: '#f0f0f0', 
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden', 
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    pieceImage: {
        width: '100%',
        height: '100%',
    },
    filled: {
        backgroundColor: '#f0f0f0', // Change to match puzzle background
    },
    empty: {
        backgroundColor: '#f0f0f0',
    },
    statusText: {
        marginTop: 20,
        fontSize: 24,
        fontWeight: '700',
        color: '#8A4DFF',
        textAlign: 'center',
        paddingHorizontal: 30,
    },
    fab: {
        position: 'absolute',
        bottom: 40,
        backgroundColor: '#b25eff',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    printButton: {
        backgroundColor: '#8A4DFF',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 38,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    printButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.69)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#f2e4e5',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingTop: 30,
        paddingBottom: 40,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#7E22CE',
        marginBottom: 40,
    },
    modalSubtitle: {
        fontSize: 18,
        color: '#6B7280',
        marginBottom: 30,
        textAlign: 'center',
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        width: '90%',
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    optionText: {
        marginLeft: 15,
        fontSize: 18,
        color: '#333',
        fontWeight: '500',
    },
    closeButton: {
        marginTop: 10,
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    closeButtonText: {
        color: '#6B7280',
        fontSize: 16,
        fontWeight: '500',
    },
    celebrationContainer: {
        position: 'absolute',
        top: 150,
        alignItems: 'center',
    },
    celebrationText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#F28C38',
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 1, height: 2 },
        textShadowRadius: 3,
    },
    celebrationSubtext: {
        fontSize: 18,
        color: '#8A4DFF',
        marginTop: 10,
    },
});

export default ArtworkGallery;