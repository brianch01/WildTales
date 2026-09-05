import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, Alert, Platform, Linking, StyleSheet, Pressable, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { storage, db, auth } from '@/FirebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, doc, updateDoc, setDoc, Timestamp, getDoc } from 'firebase/firestore';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { StatusBar } from 'expo-status-bar';
import { useMilestoneAudio } from './milestoneAudioContext';

// Import the new components
import CachedImage from '@/components/CachedImage';
import NetworkStatusBar from '@/components/NetworkStatus';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PhotoTaskScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();
  const [cameraVisible, setCameraVisible] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);
  
  // Milestone state
  const [milestoneData, setMilestoneData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Audio context
  const { playMilestoneAudio, stopMilestoneAudio, isPlaying, currentMilestoneId, resetPlayedMilestone } = useMilestoneAudio();

  // Get milestone ID from params - normally it's in the 'id' parameter just like milestone-details
  const { id: milestoneId } = useLocalSearchParams<{ id: string }>();
  
  // Add state for offline detection
  const [isOffline, setIsOffline] = useState(false);

  // Fetch milestone data
  useEffect(() => {
    const fetchMilestoneData = async () => {
      if (!milestoneId) {
        console.error("No milestone ID provided");
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        console.log("Fetching milestone data for:", milestoneId);
        
        // Try to get from cache first
        const cachedData = await AsyncStorage.getItem(`milestone_${milestoneId}`);
        if (cachedData) {
          console.log("Using cached milestone data");
          setMilestoneData(JSON.parse(cachedData));
          setLoading(false);
          return;
        }
        
        // If not cached, try to get from Firebase
        const milestoneRef = doc(db, "milestones", milestoneId);
        const milestoneSnap = await getDoc(milestoneRef);
        
        if (milestoneSnap.exists()) {
          const data = milestoneSnap.data();
          setMilestoneData(data);
          
          // Cache the data for offline use
          await AsyncStorage.setItem(`milestone_${milestoneId}`, JSON.stringify(data));
        } else {
          console.error("No such milestone exists in Firestore:", milestoneId);
          Alert.alert("Error", "Couldn't find information about this photo task.");
        }
      } catch (error) {
        console.error("Error fetching milestone:", error);
        
        // Try to use cached data even if Firebase throws an error
        const cachedData = await AsyncStorage.getItem(`milestone_${milestoneId}`);
        if (cachedData) {
          console.log("Using cached milestone data after error");
          setMilestoneData(JSON.parse(cachedData));
        } else {
          Alert.alert("Error", "Failed to load photo task details and no cached data available.");
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchMilestoneData();
    
    // Clean up when component unmounts
    return () => {
      stopMilestoneAudio();
    };
  }, [milestoneId]);

  // Function to handle audio
  const handleAudioButton = async () => {
    if (!milestoneData) return;
    
    if (isPlaying && currentMilestoneId === milestoneId) {
      await stopMilestoneAudio();
    } else {
      resetPlayedMilestone(milestoneId!);
      await playMilestoneAudio(milestoneData.animal_description || '', milestoneId!);
    }
  };

  // Request camera permissions
  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleGrantAccess = () => {
    if (!permission) return;

    if (permission.canAskAgain) {
      requestPermission();
    } else {
      Alert.alert(
        "Camera Permission Required",
        "To take photos, please enable camera access in your device settings.",
        [
          { text: "Cancel", style: "cancel", onPress: () => router.back() },
          { text: "Open Settings", onPress: () => Linking.openSettings() }
        ]
      );
    }
  };

  // Photo capture logic
  const takePhoto = async () => {
    if (!cameraRef.current) return;
    
    try {
      const photo = await cameraRef.current.takePictureAsync();
      setCameraVisible(false);
      setPhoto(photo.uri);
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets[0].uri) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const uploadPhoto = async () => {
    if (!photo || !milestoneId) return;
    
    // Check if online
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      // Queue for later upload
      try {
        const photoData = {
          milestoneId,
          photoUri: photo,
          timestamp: Date.now()
        };
        
        // Get any existing queued photos
        const queuedString = await AsyncStorage.getItem('queued_photos');
        const queuedPhotos = queuedString ? JSON.parse(queuedString) : [];
        
        // Add new photo to queue
        queuedPhotos.push(photoData);
        await AsyncStorage.setItem('queued_photos', JSON.stringify(queuedPhotos));
        
        // Update UI as if successful (for demo purposes)
        Alert.alert(
          "Photo Saved",
          "You're currently offline. Your photo will be uploaded automatically when you reconnect.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      } catch (error) {
        console.error("Error queueing photo:", error);
        Alert.alert("Error", "Failed to save photo for later upload.");
      }
      return;
    }
    
    try {
      setUploading(true);
      
      // Compress the image
      const manipResult = await manipulateAsync(
        photo,
        [{ resize: { width: 800 } }],
        { format: SaveFormat.JPEG, compress: 0.7 }
      );
      
      const localUri = manipResult.uri;
      const filename = localUri.split('/').pop() || 'photo.jpg';

      // Get the user ID safely
      const userId = auth.currentUser?.uid || "anonymous";

      // Create a structured filename that includes the milestone ID for easier identification
      const structuredFilename = `photo_${milestoneId}_${Date.now()}.jpg`;

      // Use the path structure that matches your Firebase rules
      const storageRef = ref(storage, `userPhotos/${userId}/${milestoneId}/${structuredFilename}`);
      
      // Fetch the file
      const response = await fetch(localUri);
      const blob = await response.blob();
      
      // Upload
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      console.log("downloadURL:", downloadURL);
      console.log("storage path:", `userPhotos/${userId}/${milestoneId}/${structuredFilename}`);

      // Save to photos_taken collection instead of milestone_photos
      const photoRef = collection(db, "photos_taken");
      await addDoc(photoRef, {
        milestoneId: milestoneId,
        userId: userId,
        photoUrl: downloadURL,
        storagePath: `userPhotos/${userId}/${milestoneId}/${structuredFilename}`,
        createdAt: serverTimestamp(),
        // Add references if needed
        milestoneRef: doc(db, "milestones", milestoneId),
        userRef: doc(db, "users", userId)
      });
      
      // Update milestone as completed
      await updateDoc(doc(db, "milestones", milestoneId), {
        is_complete: true,
        updated_at: serverTimestamp()
      });
      
      setUploadSuccess(true);
      
      // Show success and navigate back after delay
      Alert.alert("Success", "Photo uploaded successfully!");
      setTimeout(() => {
        router.back();
      }, 1500);
      
    } catch (error) {
      console.error("Error uploading photo:", error);
      Alert.alert("Error", "Failed to upload photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Check initial data on app startup
  useEffect(() => {
    const checkInitialData = async () => {
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        const allKeys = await AsyncStorage.getAllKeys();
        const milestoneKeys = allKeys.filter(key => key.startsWith('milestone_'));
        if (milestoneKeys.length === 0) {
          Alert.alert(
            "No Cached Data",
            "You're offline and don't have any cached data. Please connect to the internet to download journey data."
          );
        }
      }
    };

    checkInitialData();
  }, []);

  // Loading view
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8A4DFF" />
        <Text style={styles.loadingText}>Loading photo challenge...</Text>
      </SafeAreaView>
    );
  }

  // Error view - No milestone found
  if (!milestoneData) {
    return (
      <SafeAreaView style={styles.container}>
         <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back-circle" size={40} color="#8A4DFF" />
         </Pressable>
        <View style={styles.centeredContent}>
            <Text style={styles.errorText}>Oops! Photo challenge not found.</Text>
            <Pressable style={[styles.actionButton, styles.errorButton]} onPress={() => router.back()}>
                <Text style={styles.actionButtonText}>GO BACK</Text>
            </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Camera permissions view
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#8A4DFF" />
        <Text style={styles.loadingText}>
          Checking camera permissions...
        </Text>
      </SafeAreaView>
    );
  }

  // Permission denied view
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back-circle" size={40} color="#8A4DFF" />
        </Pressable>
        
        <View style={styles.centeredContent}>
          <Image
            source={require('@/assets/images/platypus-hide.png')}
            style={styles.platypusImage}
            resizeMode="contain"
          />
          <Text style={styles.headerText}>Oops! We Need Camera Access</Text>
          <Text style={styles.descriptionText}>
            To take amazing nature photos, we need permission to use your camera!
          </Text>

          <View style={styles.buttonRow}>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.back()}
            >
              <Text style={styles.secondaryButtonText}>Go Back</Text>
            </Pressable>

            <Pressable
              style={styles.actionButton}
              onPress={handleGrantAccess}
            >
              <Text style={styles.actionButtonText}>Grant Access</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Camera view
  if (cameraVisible) {
    return (
      <View style={styles.cameraContainer}>
        <StatusBar style="light" />
        <CameraView
          ref={cameraRef}
          style={styles.cameraPreview}
          facing="back"
        >
          <View style={styles.cameraControlsContainer}>
            {uploading && (
              <View style={styles.cameraProcessingIndicator}>
                <ActivityIndicator color="white" size="large" />
              </View>
            )}
            
            <View style={styles.cameraBottomBar}>
              <TouchableOpacity
                style={styles.cameraControlButton}
                onPress={pickImage}
                disabled={uploading}
              >
                <Ionicons name="images" size={30} color="white" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cameraCaptureButtonOuter}
                onPress={takePhoto}
                disabled={uploading}
              >
                <View style={styles.cameraCaptureButtonInner} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cameraControlButton}
                onPress={() => setCameraVisible(false)}
                disabled={uploading}
              >
                <Ionicons name="close" size={30} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  // Main Photo Task View - Updated with Tailwind CSS
  return (
    <SafeAreaView className="flex-1 bg-yellow-50" edges={['left', 'right', 'bottom']}>
      <StatusBar style="dark" />
      <NetworkStatusBar />
      {/* Header Bar */}
      <View className="flex-row items-center justify-between pt-16 pb-2 px-4 bg-yellow-50">
        <Pressable onPress={() => router.back()} className="w-12 h-12 rounded-full bg-purple-100 items-center justify-center">
          <Ionicons name="arrow-back" size={28} color="#8A4DFF" />
        </Pressable>
        <Text className="text-2xl font-bold text-purple-600 flex-1 text-center mr-12">Photo Challenge</Text>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Card with challenge info */}
        <View className="bg-white pt-10 rounded-3xl p-5 mb-5 shadow-md">
          {/* Title with camera icon - centered */}
          <View className="flex-row items-center justify-center mb-4">
            <Ionicons name="paw" size={28} color="#F28C38" />
            <Text className="text-2xl font-bold text-gray-800 ml-2 text-center">
              {milestoneData.animal_name || "Nature Explorer"}
            </Text>
          </View>

          {/* Simplified description */}
          <Text className="text-xl text-gray-600 mb-4">
            {milestoneData.animal_description 
              ? milestoneData.animal_description.split('.')[0] + '.'  // Just first sentence
              : "Hey Adventurer! Mr Platypus is asking you to take a photo of something amazing in nature!"}
          </Text>

          {/* Tip Box with Animal Image Below */}
          <View className="bg-blue-50 rounded-xl p-4 mb-3">
            <View className="flex-row items-center">
              <Ionicons name="bulb" size={28} color="#4285F4" />
              <Text className="text-l text-blue-600 flex-1 ml-3">
                Tip: Here's a reference to help you!
              </Text>
            </View>
            
            {/* Animal image integrated within the tip box */}
            {milestoneData.animal_image_url && (
              <View className="items-center mt-2">
                <CachedImage
                  uri={milestoneData.animal_image_url}
                  className="w-64 h-52 rounded-xl"
                  resizeMode="contain"
                />
              </View>
            )}
          </View>
        </View>

        {/* Photo Buttons Section */}
        {photo ? (
          // Photo Preview
          <View className="items-center mb-6">
            <Image
              source={{ uri: photo }}
              className="w-72 h-72 rounded-2xl mb-4"
              resizeMode="cover"
            />
            
            <View className="flex-row justify-center w-full">
              <Pressable
                className="bg-gray-200 rounded-xl py-3 px-5 flex-row items-center mr-4"
                onPress={() => setPhoto(null)}
                disabled={uploading}
              >
                <Ionicons name="refresh" size={20} color="#444" />
                <Text className="text-base font-semibold text-gray-700 ml-2">Try Again</Text>
              </Pressable>
              
              <Pressable
                className="bg-purple-600 rounded-xl py-3 px-5 flex-row items-center"
                onPress={uploadPhoto}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="white" size="small" className="mr-2"/>
                ) : (
                  <Ionicons name="cloud-upload" size={20} color="white" />
                )}
                <Text className="text-base font-semibold text-white ml-2">
                  {uploading ? "Saving..." : "Save Photo"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          // Camera Button - Blue as requested
          <View className="pt-10 items-center mb-6">
            <Pressable
              className="bg-blue-500 rounded-full py-4 px-6 flex-row items-center justify-center w-4/5 shadow-md"
              onPress={() => setCameraVisible(true)}
            >
              <Ionicons name="camera" size={28} color="white" />
              <Text className="text-2xl font-bold text-white ml-3">Take a Photo!</Text>
            </Pressable>
          </View>
        )}

        {/* Help reminder box */}
        <View className="flex-row bg-green-100 rounded-xl p-4 mb-8 items-center">
          <Ionicons name="happy-outline" size={34} color="#2E8B57" />
          <Text className="text-xl text-green-700 flex-1 ml-3">
            Remember to ask an adult for help if you need it!
          </Text>
        </View>
      </ScrollView>

      {/* Audio button - floating at bottom */}
      <Pressable
        className={`absolute bottom-8 right-6 w-20 h-20 rounded-full items-center justify-center shadow-md ${isPlaying && currentMilestoneId === milestoneId ? 'bg-purple-700' : 'bg-purple-600'}`}
        onPress={handleAudioButton}
      >
        <Ionicons
          name={isPlaying && currentMilestoneId === milestoneId ? "volume-high" : "volume-medium"}
          size={40}
          color="white"
        />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fffff5", // Match milestone-details background
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
    color: "#FF6B6B",
    textAlign: "center",
    marginBottom: 20,
  },
  // Matching backButton from milestone-details
  backButton: {
    position: 'relative',
    marginTop: 75,
    left: 10,
    zIndex: 10,
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8A4DFF',
    marginVertical: 10,
  },
  imageContainer: {
    marginTop: 10,
    marginBottom: 20,
    alignItems: 'center',
    width: '100%',
  },
  mainImage: {
    width: "96%",
    aspectRatio: 2.2,
    borderRadius: 25,
    borderWidth: 4,
    borderColor: '#FFA500',
    alignSelf: 'center',
  },
  platypusImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  descriptionSection: {
    marginBottom: 20,
  },
  animalNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  animalNameText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  // Speech bubble styling similar to milestone-details
  speechBubbleContainer: {
    marginBottom: 20,
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
  descriptionText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 21,
    fontFamily: 'Comfortaa',
  },

  audioButtonActive: {
    backgroundColor: "#E69500",
  },
  tipBox: {
    flexDirection: 'row',
    backgroundColor: '#EBF3FF',
    borderRadius: 15,
    padding: 12,
    marginVertical: 15,
    alignItems: 'flex-start',
  },
  tipText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#3B82F6',
    lineHeight: 20,
  },
  cameraSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  cameraButtonsContainer: {
    alignItems: 'center',
    width: '100%',
  },
  primaryCameraButton: {
    backgroundColor: '#8A4DFF',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '85%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 15,
  },
  primaryCameraButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20,
    marginLeft: 10,
  },
  secondaryCameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    padding: 10,
  },
  secondaryCameraButtonText: {
    color: '#3B82F6',
    fontSize: 16,
  },
  photoPreviewContainer: {
    alignItems: 'center',
    width: '100%',
  },
  photoPreview: {
    width: 280,
    height: 280,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#FFA500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: "#8A4DFF",
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 120,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: "#f0f0f0",
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.20,
    shadowRadius: 1.41,
    elevation: 2,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#555",
    marginLeft: 8,
  },
  errorButton: {
    backgroundColor: "#8A4DFF",
  },
  // Camera view styles
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  cameraPreview: {
    flex: 1,
  },
  cameraControlsContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  cameraProcessingIndicator: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  cameraBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  cameraControlButton: {
    padding: 15,
  },
  cameraCaptureButtonOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraCaptureButtonInner: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#FFFFFF',
  },
  // New styles for updated layout
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: 10,
    paddingHorizontal: 15,
    backgroundColor: '#fffff5',
    elevation: 4,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  pageTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#8A4DFF',
    textAlign: 'center',
  },
  challengeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  challengeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 20,
    alignContent: 'center',
    textAlign: 'center',
  },
  challengeDescription: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
    marginBottom: 15,
  },
  referenceSection: {
    marginBottom: 25,
    alignItems: 'center',
  },
  referenceImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: '#FFA500',
  },
  referenceText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  galleryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  galleryOptionText: {
    fontSize: 16,
    color: '#3B82F6',
    marginRight: 8,
  },
  helpBox: {
    flexDirection: 'row',
    backgroundColor: '#bcf6d0',
    borderRadius: 15,
    padding: 12,
    marginVertical: 15,
    alignItems: 'center',
  },
  helpText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#1a7f48',
    lineHeight: 20,
  },
  // Floating audio button at bottom
  floatingAudioButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8A4DFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});