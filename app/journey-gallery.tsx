import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, auth, storage } from '@/FirebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { ref, getDownloadURL } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Get screen dimensions for responsive layout
const { width } = Dimensions.get('window');
const itemSize = width / 2 - 24; // 2 columns with padding

// Interfaces
interface JourneyPhoto {
  id: string;
  imageUrl: string;
  type: 'user' | 'milestone';
  caption: string;
  timestamp?: Date;
  rotation: number; // For fun tilted effect
  borderColor: string;
  milestoneId: string;
  localUri?: string; // For offline mode
}

export default function JourneyGallery() {
  const { journeyId, journeyName } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<JourneyPhoto[]>([]);
  const [milestoneAssets, setMilestoneAssets] = useState<JourneyPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Border colors for the frames - kid-friendly bright colors
  const borderColors = [
    '#FF9966', // Orange 
    '#88DDAA', // Green
    '#66CCFF', // Blue
    '#FFCC66', // Yellow
    '#FF99CC', // Pink
    '#CC99FF'  // Purple
  ];

  // Check online status
  useEffect(() => {
    const checkConnection = async () => {
      const networkState = await NetInfo.fetch();
      setIsOnline(networkState.isConnected);
    };
    
    checkConnection();
    
    // Set up subscription for changes
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
    });
    
    return () => unsubscribe();
  }, []);

  // Store photos in AsyncStorage for offline access
  const savePhotosToStorage = async (photosData: JourneyPhoto[], milestoneData: JourneyPhoto[]) => {
    try {
      const photoKey = `journey_photos_${journeyId}`;
      const milestoneKey = `journey_milestones_${journeyId}`;
      
      await AsyncStorage.setItem(photoKey, JSON.stringify(photosData));
      await AsyncStorage.setItem(milestoneKey, JSON.stringify(milestoneData));
      
      console.log('Photos and milestone assets saved to local storage for offline use');
    } catch (error) {
      console.error('Error saving data to AsyncStorage:', error);
    }
  };

  // Get photos from AsyncStorage
  const getOfflinePhotos = async (): Promise<{photos: JourneyPhoto[], milestones: JourneyPhoto[]}> => {
    try {
      const photoKey = `journey_photos_${journeyId}`;
      const milestoneKey = `journey_milestones_${journeyId}`;
      
      const storedPhotos = await AsyncStorage.getItem(photoKey);
      const storedMilestones = await AsyncStorage.getItem(milestoneKey);
      
      return {
        photos: storedPhotos ? JSON.parse(storedPhotos) : [],
        milestones: storedMilestones ? JSON.parse(storedMilestones) : []
      };
    } catch (error) {
      console.error('Error retrieving data from AsyncStorage:', error);
      return { photos: [], milestones: [] };
    }
  };

  // Add this function at the top of your component
  const fetchAuthenticatedUrl = async (urlPath) => {
    try {
      // Extract just the path part
      let path = urlPath;
      if (path.includes('firebasestorage.googleapis.com')) {
        path = path.split('/o/')[1].split('?')[0];
        path = decodeURIComponent(path);
      }
      
      // Get a fresh authenticated URL
      const storageRef = ref(storage, path);
      return await getDownloadURL(storageRef);
    } catch (err) {
      console.error("Error getting download URL:", err);
      return null;
    }
  };

  useEffect(() => {
    const fetchJourneyPhotos = async () => {
      if (!journeyId) {
        setError("Journey information missing");
        setLoading(false);
        return;
      }
      
      try {
        // First check if we're offline - if so, use cached photos
        if (!isOnline) {
          const offlineData = await getOfflinePhotos();
          if (offlineData.photos.length > 0 || offlineData.milestones.length > 0) {
            setPhotos(offlineData.photos);
            setMilestoneAssets(offlineData.milestones);
            setLoading(false);
            return;
          }
        }
        
        const userPhotos: JourneyPhoto[] = [];
        const milestoneImages: JourneyPhoto[] = [];
        const userId = auth.currentUser?.uid;
        
        if (!userId) {
          setError("You must be logged in to view photos");
          setLoading(false);
          return;
        }
        
        // First, get milestones for this journey to filter photos
        const milestoneQuery = query(
          collection(db, "milestones"),
          where("journey_id_string", "==", journeyId),
          orderBy("order_in_journey")
        );
        
        const milestoneSnapshot = await getDocs(milestoneQuery);
        const milestoneIds = milestoneSnapshot.docs.map(doc => doc.id);
        
        if (milestoneIds.length === 0) {
          console.log("No milestones found for this journey");
          setLoading(false);
          return;
        }
        
        // Process milestone assets
        const milestonePromises = milestoneSnapshot.docs.map(async (doc) => {
          const milestoneData = doc.data();
          if (milestoneData.visual_asset_url) {
            try {
              let imageUrl = milestoneData.visual_asset_url;
              
              // If URL doesn't have a token, get a fresh one
              if (imageUrl && !imageUrl.includes("token=") && imageUrl.includes('firebasestorage')) {
                imageUrl = await fetchAuthenticatedUrl(imageUrl);
              }
              
              if (imageUrl) {
                return {
                  id: doc.id,
                  imageUrl,
                  type: 'milestone',
                  caption: milestoneData.name || "Journey Milestone",
                  rotation: Math.random() * 6 - 3, // Less rotation for milestone images
                  borderColor: borderColors[Math.floor(Math.random() * borderColors.length)],
                  milestoneId: doc.id
                };
              }
            } catch (err) {
              console.error("Error processing milestone image:", err);
            }
          }
          return null;
        });
        
        const validMilestoneAssets = (await Promise.all(milestonePromises)).filter(Boolean);
        milestoneImages.push(...validMilestoneAssets);
        
        // Now fetch user photos from photos_taken collection
        // Filter by userId AND milestoneId in the list of journey milestones
        const userPhotoQuery = query(
          collection(db, "photos_taken"),
          where("userId", "==", userId),
          where("milestoneId", "in", milestoneIds)
        );

        const photoSnapshot = await getDocs(userPhotoQuery);
        const photoPromises = [];

        // Process user photos
        photoSnapshot.forEach(doc => {
          const photoData = doc.data();
          
          const promise = (async () => {
            try {
              // Use the existing URL if it has a token
              let imageUrl = photoData.photoUrl;
              
              // If URL doesn't have a token, get a fresh one
              if (!imageUrl.includes("token=")) {
                imageUrl = await fetchAuthenticatedUrl(photoData.storagePath);
              }
              
              if (imageUrl) {
                return {
                  id: doc.id,
                  imageUrl,
                  type: 'user',
                  caption: photoData.caption || "My adventure photo!",
                  timestamp: photoData.createdAt?.toDate(),
                  rotation: Math.random() * 10 - 5,
                  borderColor: borderColors[Math.floor(Math.random() * borderColors.length)],
                  milestoneId: photoData.milestoneId,
                  storagePath: photoData.storagePath,
                  localUri: photoData.localUri // If available
                };
              }
            } catch (err) {
              console.error("Error processing user photo:", err);
            }
            return null;
          })();
          
          photoPromises.push(promise);
        });

        // Wait for all promises to resolve
        const validUserPhotos = (await Promise.all(photoPromises)).filter(Boolean);
        userPhotos.push(...validUserPhotos);
        
        // If we have photos or milestone assets, save them to AsyncStorage for offline use
        if (userPhotos.length > 0 || milestoneImages.length > 0) {
          savePhotosToStorage(userPhotos, milestoneImages);
          
          // Sort photos by timestamp, newest first
          const sortedPhotos = [...userPhotos].sort((a, b) => {
            if (!a.timestamp || !b.timestamp) return 0;
            return b.timestamp.getTime() - a.timestamp.getTime();
          });
          
          setPhotos(sortedPhotos);
          setMilestoneAssets(milestoneImages);
        }
        
      } catch (err) {
        console.error("Error fetching journey photos:", err);
        
        // If online fetch failed, try to get offline photos as fallback
        const offlineData = await getOfflinePhotos();
        if (offlineData.photos.length > 0 || offlineData.milestones.length > 0) {
          setPhotos(offlineData.photos);
          setMilestoneAssets(offlineData.milestones);
        } else {
          setError("Could not load photos. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchJourneyPhotos();
  }, [journeyId, isOnline]);

  return (
    <SafeAreaView className="flex-1">
      <StatusBar style="dark" />
      
      <ImageBackground 
        source={require('@/assets/images/paper_background.png')} // Use light texture background
        className="flex-1"
        resizeMode="cover"
      >
        {/* Back Button */}
        <TouchableOpacity 
          className="absolute top-12 left-4 z-10 p-2 bg-white rounded-full shadow-md" 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#8A4DFF" />
        </TouchableOpacity>
        
        {/* Offline indicator */}
        {!isOnline && (
          <View style={{
            position: 'absolute',
            top: 12,
            right: 10,
            backgroundColor: 'rgba(0,0,0,0.7)',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 15,
            flexDirection: 'row',
            alignItems: 'center',
            zIndex: 10
          }}>
            <Ionicons name="cloud-offline" size={16} color="white" />
            <Text style={{color: 'white', marginLeft: 6, fontWeight: '500'}}>Offline Mode</Text>
          </View>
        )}
        
        {/* Main Content */}
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#8A4DFF" />
            <Text className="mt-3 text-purple-700">Loading photos...</Text>
          </View>
        ) : error ? (
          <View className="flex-1 justify-center items-center px-6">
            <Ionicons name="alert-circle" size={60} color="#FF6B6B" />
            <Text className="mt-4 text-lg text-center text-gray-700">{error}</Text>
          </View>
        ) : photos.length === 0 && milestoneAssets.length === 0 ? (
          <View className="flex-1 justify-center items-center px-6">
            <Text className="text-xl font-bold text-center text-purple-800 mb-2">
              No Photos Yet!
            </Text>
            <Text className="text-base text-center text-gray-600 mb-6">
              Take some photos during your adventure, and they'll appear here!
            </Text>
          </View>
        ) : (
          <ScrollView className="flex-1 pt-20" contentContainerStyle={{ paddingBottom: 80 }}>
            {/* Gallery Title */}
            <View style={{paddingHorizontal: 20, marginBottom: 20, alignItems: 'center'}}>
              <Text style={{
                fontFamily: 'serif',
                fontSize: 44,
                color: '#3b2927',
                fontStyle: 'italic',
              }}>
                My Adventure
              </Text>
            </View>
            
            {/* User Photos Section - Only show if we have photos */}
            {photos.length > 0 && (
              <>
                <View style={{paddingHorizontal: 20, marginBottom: 15, alignItems: 'center'}}>
                  <Text style={{
                    fontFamily: 'serif',
                    fontSize: 28,
                    color: '#3b2927',
                    fontStyle: 'italic',
                  }}>
                    My Photos
                  </Text>
                </View>
                
                <View style={{paddingHorizontal: 15}}>
                  {/* First group - large feature photo with smaller one */}
                  {photos.length >= 2 && (
                    <View style={{flexDirection: 'row', justifyContent: 'center', marginBottom: 15}}>
                      <Animatable.View 
                        animation="fadeIn" 
                        style={{
                          width: width * 0.62,
                          marginRight: 8,
                          transform: [{rotate: '1deg'}],
                          backgroundColor: 'white',
                          padding: 10,
                          shadowColor: "#000",
                          shadowOffset: {width: 0, height: 3},
                          shadowOpacity: 0.2,
                          shadowRadius: 4,
                          elevation: 5,
                          zIndex: 2
                        }}
                      >
                        <Image
                          source={{uri: photos[0].imageUrl}}
                          style={{width: '100%', height: width * 0.5, borderRadius: 1}}
                          resizeMode="cover"
                        />
                        <Text style={{textAlign: 'center', marginTop: 8, fontWeight: '500', color: '#444'}}>
                          {photos[0].caption}
                        </Text>
                        <View style={{position: 'absolute', top: 5, right: 5, backgroundColor: '#9932CC', padding: 4, borderRadius: 10}}>
                          <Ionicons name="camera" size={10} color="white" />
                        </View>
                      </Animatable.View>
                      
                      <Animatable.View 
                        animation="fadeIn" 
                        delay={100}
                        style={{
                          width: width * 0.25,
                          transform: [{rotate: '-2deg'}],
                          backgroundColor: 'white',
                          padding: 8,
                          shadowColor: "#000",
                          shadowOffset: {width: 0, height: 3},
                          shadowOpacity: 0.2,
                          shadowRadius: 4,
                          elevation: 5
                        }}
                      >
                        <Image
                          source={{uri: photos[1].imageUrl}}
                          style={{width: '100%', height: width * 0.25, borderRadius: 1}}
                          resizeMode="cover"
                        />
                        <Text style={{textAlign: 'center', marginTop: 6, fontSize: 11, fontWeight: '500', color: '#444'}} numberOfLines={1}>
                          {photos[1].caption}
                        </Text>
                        <View style={{position: 'absolute', top: 5, right: 5, backgroundColor: '#9932CC', padding: 4, borderRadius: 10}}>
                          <Ionicons name="camera" size={10} color="white" />
                        </View>
                      </Animatable.View>
                    </View>
                  )}
                  
                  {/* Second group - Two medium photos */}
                  {photos.length >= 4 && (
                    <View style={{flexDirection: 'row', justifyContent: 'center', marginBottom: 18}}>
                      {photos.slice(2, 4).map((photo, index) => (
                        <Animatable.View 
                          key={photo.id}
                          animation="fadeIn" 
                          delay={200 + (index * 100)}
                          style={{
                            width: width * 0.43,
                            marginLeft: index === 0 ? 0 : 12,
                            transform: [{rotate: index === 0 ? '-1deg' : '1.5deg'}],
                            backgroundColor: 'white',
                            padding: 10,
                            shadowColor: "#000",
                            shadowOffset: {width: 0, height: 3},
                            shadowOpacity: 0.2,
                            shadowRadius: 4,
                            elevation: 5,
                            zIndex: 2 - index
                          }}
                        >
                          <Image
                            source={{uri: photo.imageUrl}}
                            style={{width: '100%', height: width * 0.35, borderRadius: 1}}
                            resizeMode="cover"
                          />
                          <Text style={{textAlign: 'center', marginTop: 8, fontWeight: '500', color: '#444'}}>
                            {photo.caption}
                          </Text>
                          <View style={{position: 'absolute', top: 5, right: 5, backgroundColor: '#9932CC', padding: 4, borderRadius: 10}}>
                            <Ionicons name="camera" size={10} color="white" />
                          </View>
                        </Animatable.View>
                      ))}
                    </View>
                  )}
                  
                  {/* Large family photo */}
                  {photos.length >= 5 && (
                    <View style={{alignItems: 'center', marginBottom: 15}}>
                      <Animatable.View 
                        animation="fadeIn" 
                        delay={400}
                        style={{
                          width: width * 0.9,
                          transform: [{rotate: '0.5deg'}],
                          backgroundColor: 'white',
                          padding: 12,
                          shadowColor: "#000",
                          shadowOffset: {width: 0, height: 3},
                          shadowOpacity: 0.25,
                          shadowRadius: 4,
                          elevation: 5
                        }}
                      >
                        <Image
                          source={{uri: photos[4].imageUrl}}
                          style={{width: '100%', height: width * 0.6, borderRadius: 1}}
                          resizeMode="cover"
                        />
                        <Text style={{textAlign: 'center', marginTop: 10, fontWeight: 'bold', fontSize: 16, color: '#444'}}>
                          {photos[4].caption}
                        </Text>
                        <View style={{position: 'absolute', top: 5, right: 5, backgroundColor: '#9932CC', padding: 4, borderRadius: 10}}>
                          <Ionicons name="camera" size={10} color="white" />
                        </View>
                      </Animatable.View>
                    </View>
                  )}
                  
                  {/* Remaining photos in grid */}
                  {photos.length >= 6 && (
                    <View style={{flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center'}}>
                      {photos.slice(5).map((photo, index) => (
                        <Animatable.View 
                          key={photo.id}
                          animation="fadeIn" 
                          delay={500 + (index * 100)}
                          style={{
                            width: width * 0.43,
                            margin: 5,
                            transform: [{rotate: (index % 2 === 0 ? 1 : -1) + 'deg'}],
                            backgroundColor: 'white',
                            padding: 10,
                            shadowColor: "#000",
                            shadowOffset: {width: 0, height: 2},
                            shadowOpacity: 0.2,
                            shadowRadius: 3,
                            elevation: 4
                          }}
                        >
                          <Image
                            source={{uri: photo.imageUrl}}
                            style={{width: '100%', height: width * 0.35, borderRadius: 1}}
                            resizeMode="cover"
                          />
                          <Text style={{textAlign: 'center', marginTop: 8, fontWeight: '500', color: '#444'}} numberOfLines={1}>
                            {photo.caption}
                          </Text>
                          <View style={{position: 'absolute', top: 5, right: 5, backgroundColor: '#9932CC', padding: 4, borderRadius: 10}}>
                            <Ionicons name="camera" size={10} color="white" />
                          </View>
                        </Animatable.View>
                      ))}
                    </View>
                  )}
                  
                  {/* Special case: just one photo */}
                  {photos.length === 1 && (
                    <View style={{alignItems: 'center', marginBottom: 15}}>
                      <Animatable.View 
                        animation="fadeIn" 
                        style={{
                          width: width * 0.8,
                          transform: [{rotate: '0.5deg'}],
                          backgroundColor: 'white',
                          padding: 12,
                          shadowColor: "#000",
                          shadowOffset: {width: 0, height: 3},
                          shadowOpacity: 0.25,
                          shadowRadius: 4,
                          elevation: 5
                        }}
                      >
                        <Image
                          source={{uri: photos[0].imageUrl}}
                          style={{width: '100%', height: width * 0.7, borderRadius: 1}}
                          resizeMode="cover"
                        />
                        <Text style={{textAlign: 'center', marginTop: 10, fontWeight: 'bold', fontSize: 16, color: '#444'}}>
                          {photos[0].caption}
                        </Text>
                        <View style={{position: 'absolute', top: 5, right: 5, backgroundColor: '#9932CC', padding: 4, borderRadius: 10}}>
                          <Ionicons name="camera" size={10} color="white" />
                        </View>
                      </Animatable.View>
                    </View>
                  )}
                </View>
              </>
            )}
            
            {/* Milestone Assets Section - Only show if we have milestone assets */}
            {milestoneAssets.length > 0 && (
              <>
                <View style={{paddingHorizontal: 20, marginTop: 30, marginBottom: 15, alignItems: 'center'}}>
                  <Text style={{
                    fontFamily: 'serif',
                    fontSize: 28,
                    color: '#3b2927',
                    fontStyle: 'italic',
                  }}>
                    Journey Highlights
                  </Text>
                </View>
                
                <View style={{paddingHorizontal: 15}}>
                  {/* Staggered milestone assets */}
                  <View style={{flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center'}}>
                    {milestoneAssets.map((asset, index) => (
                      <Animatable.View 
                        key={asset.id}
                        animation="fadeIn" 
                        delay={200 + (index * 80)}
                        style={{
                          width: width * (index % 3 === 0 ? 0.65 : 0.42),
                          margin: 5,
                          transform: [{rotate: asset.rotation + 'deg'}],
                          backgroundColor: 'white',
                          padding: 10,
                          shadowColor: "#000",
                          shadowOffset: {width: 0, height: 2},
                          shadowOpacity: 0.2,
                          shadowRadius: 3,
                          elevation: 4
                        }}
                      >
                        <Image
                          source={{uri: asset.imageUrl}}
                          style={{width: '100%', height: width * (index % 3 === 0 ? 0.45 : 0.32), borderRadius: 1}}
                          resizeMode="cover"
                        />
                        <Text style={{textAlign: 'center', marginTop: 8, fontWeight: '500', color: '#444'}} numberOfLines={2}>
                          {asset.caption}
                        </Text>
                        <View style={{position: 'absolute', top: 5, right: 5, backgroundColor: '#4CAF50', padding: 4, borderRadius: 10}}>
                          <Ionicons name="flag" size={10} color="white" />
                        </View>
                      </Animatable.View>
                    ))}
                  </View>
                </View>
              </>
            )}
            
          </ScrollView>
        )}
      </ImageBackground>
    </SafeAreaView>
  );
}