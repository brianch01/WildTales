import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  Image, 
  Animated, 
  Easing, 
  ImageBackground, 
  Dimensions,
  Vibration
} from 'react-native';
import MapView, { Marker, Circle, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast, Toast, ToastTitle, ToastDescription } from "@/components/ui/toast";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Icon, CloseIcon, CheckCircleIcon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { collection, DocumentReference, getDocs, query, where, doc, writeBatch, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/FirebaseConfig';
import MapViewDirections from 'react-native-maps-directions';
import DialoguePopup from '@/components/DialoguePopup';
import JourneyHeader from '@/components/JourneyHeader';
import { useMilestoneAudio } from '@/app/milestoneAudioContext';
import MilestoneActionTab from '@/components/MilestoneActionTab';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  loadAllJourneys, 
  downloadJourney, 
  getJourney,
  updateMilestoneCompletion as updateOfflineMilestoneCompletion,
  isOnline as checkIsOnline
} from '../services/offlineDataService';
import BackgroundPlayback from '@/components/BackgroundPlayback';



interface Milestones {
  id: string;
  order_in_journey: number;
  name: string;
  type: string;
  animal_description: string;
  description: string;
  is_completed: boolean;
  is_complete: boolean;
  latitude: number;
  longitude: number;
  radius: number;
  journey_id: DocumentReference;
  journey_id_string: string;
  user_location?: {
    latitude: number;
    longitude: number;
  };
}

interface Journey {
  id: string;
  child_id: string;
  cover_image_url: string;
  description: string;
  is_complete: boolean;
  is_downloaded: boolean;
  length: number;
  name: string;
  theme: string;
  user_id: string;
  milestones: Milestones[];
}

// Get screen dimensions
const { width, height } = Dimensions.get('window');

// Responsive sizing functions
const responsiveWidth = (size) => (width / 375) * size; // 375 is standard iPhone width
const responsiveHeight = (size) => (height / 812) * size; // 812 is standard iPhone height
const responsiveFont = (size) => {
  const ratio = (width / height) * (16 / 9);
  return Math.round(size * ratio);
};



export default function HomeScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInsideGeofence, setIsInsideGeofence] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState<Milestones | null>(null);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [activeJourney, setActiveJourney] = useState<Journey | null>(null);
  const [milestones, setMilestones] = useState<Milestones[]>([]);
  const [isJourneyActive, setIsJourneyActive] = useState(false);
  const [lastPopupShownTime, setLastPopupShownTime] = useState<number | null>(null);
  const [showGuideBird, setShowGuideBird] = useState(true);
  const birdPosition = useRef(new Animated.Value(0)).current;
  const birdOpacity = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation>();
  const [currentMilestoneIndex, setCurrentMilestoneIndex] = useState(0);
  const [showNextButton, setShowNextButton] = useState(false);
  const geofenceCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const toast = useToast();
  const [toastId, setToastId] = React.useState(0);
  const mapRef = useRef<MapView>(null);
  const { playMilestoneAudio, isPlaying, playedMilestones } = useMilestoneAudio();
  const [showMilestoneTab, setShowMilestoneTab] = useState(false);
  const [lastTriggeredMilestoneId, setLastTriggeredMilestoneId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineDataLoaded, setOfflineDataLoaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  
  // Pulse animation for the GPS marker
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

   // Network status detection
   useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
      
      if (!state.isConnected) {
        toast.show({
          placement: 'top',
          render: ({ id }) => (
            <Toast nativeID={id} variant="accent" action="info">
              <ToastTitle>Offline Mode</ToastTitle>
              <ToastDescription>
                You're offline. Using cached data.
              </ToastDescription>
            </Toast>
          ),
        });
      }
    });

    return () => unsubscribe();
  }, []);

  

  useEffect(() => {
    // Fetch milestones from Firebase

    async function addJourneyIdStringToAllMilestones() {
      try {
        // 1. Get all milestones
        const milestonesSnapshot = await getDocs(collection(db, 'milestones'));

        // 2. Prepare a batch for bulk update
        const batch = writeBatch(db);
        let count = 0;

        // 3. Process each document
        milestonesSnapshot.forEach((milestoneDoc) => {
          const data = milestoneDoc.data();

          // Only update if journey_id exists but journey_id_string doesn't
          if (data.journey_id && !data.journey_id_string) {
            batch.update(milestoneDoc.ref, {
              journey_id_string: data.journey_id.id // Extract ID from reference
            });
            count++;
          }
        });

        // 4. Commit the batch
        if (count > 0) {
          await batch.commit();
          console.log(`Updated ${count} milestones with journey_id_string`);
        } else {
          console.log('No milestones needed updating');
        }

        return count;
      } catch (error) {
        console.error('Error updating milestones:', error);
        throw error;
      }
    }



    const fetchJourneysAndMilestones = async () => {
      try {
        // Load all journeys - the service handles online/offline logic
        const journeysData = await loadAllJourneys();
        setJourneys(journeysData);
        
        // Set the first journey as active
        if (journeysData.length > 0) {
          // If a journey is already downloaded, make it the active one
          const downloadedJourney = journeysData.find(j => j.is_downloaded);
          if (downloadedJourney) {
            // Get full journey with milestones
            const fullJourney = await getJourney(downloadedJourney.id);
            if (fullJourney) {
              setActiveJourney(fullJourney);
            } else {
              setActiveJourney(journeysData[0]);
            }
          } else {
            setActiveJourney(journeysData[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    addJourneyIdStringToAllMilestones();
    fetchJourneysAndMilestones();

  }, []);

  const cacheJourneys = async (journeys: Journey[]) => {
    try {
      await AsyncStorage.setItem('cachedJourneys', JSON.stringify(journeys));
    } catch (error) {
      console.error("Error caching journeys:", error);
    }
  };

  const getCachedJourneys = async (): Promise<Journey[] | null> => {
    try {
      const cached = await AsyncStorage.getItem('cachedJourneys');
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error("Error getting cached journeys:", error);
      return null;
    }
  };

  useEffect(() => {
    let subscription: Location.LocationSubscription;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 1,
        },
        (currentLocation) => {
          setLocation(currentLocation);
          // Don't auto-focus on user location - we'll focus on milestones instead
        }
      );
    })();
    
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [activeJourney]); // Remove isTracking from dependencies

  // Add this function to check if popup should be shown
  const shouldShowPopup = () => {
    const now = Date.now();
    const tenMinutesInMs = 10 * 60 * 1000;
    
    // Show popup if it hasn't been shown before or if 10 minutes have passed
    return !lastPopupShownTime || (now - lastPopupShownTime) >= tenMinutesInMs;
  };

  const startAnimation = () => {
    // Only proceed if the dialog should be shown
    if (!shouldShowPopup()) {
      console.log("Skipping guide animation - cooldown not elapsed yet");
      return;
    }
    
    setShowGuideBird(true);
    birdPosition.setValue(-300);
    birdOpacity.setValue(0);

    animationRef.current = Animated.parallel([
      // Slide in animation
      Animated.sequence([
        Animated.timing(birdPosition, {
          toValue: 20,
          duration: 1000,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
      ]),
      // Fade animation
      Animated.timing(birdOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);

    animationRef.current.start();
  };

  const stopAnimation = () => {
    if (animationRef.current) {
      animationRef.current.stop();
    }
    Animated.parallel([
      Animated.timing(birdOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(birdPosition, {
        toValue: -300,
        duration: 800,
        easing: Easing.in(Easing.exp),
        useNativeDriver: true,
      })
    ]).start(() => setShowGuideBird(false));
  };

  useEffect(() => {
    if (journeys.length > 0) {
      startAnimation();
    }
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [journeys]);

  


  useEffect(() => {
    checkGeofence();
  }, [location]);


  // Add this function to reset milestone completion status
  const resetJourneyCompletionStatus = (journey) => {
    if (!journey) return journey;
    
    // Create a deep copy with all milestones reset to is_complete: false
    return {
      ...journey,
      milestones: journey.milestones.map(milestone => ({
        ...milestone,
        is_complete: false
      }))
    };
  };
  
  // Modify checkGeofence to add vibration and better completion handling
  const checkGeofence = () => {
    if (!location || !location.coords || !activeJourney) {
      return;
    }
    
    // Check each milestone to see if user is inside any of them
    for (const milestone of activeJourney.milestones) {
      // Skip if milestone is already completed
      if (milestone.is_complete) {
        continue;
      }
      
      const distance = calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        milestone.latitude,
        milestone.longitude
      );
      
      // User is inside this milestone's geofence
      if (distance <= milestone.radius) {
        console.log(`User entered milestone: ${milestone.name}`);
        
        // Vibrate when milestone is triggered
        Vibration.vibrate([500, 100, 500]); // Pattern: vibrate, pause, vibrate
        
        // Mark milestone as complete in both local state and Firestore
        updateMilestoneCompletion(milestone);
        
        // Set current milestone for UI state
        setIsInsideGeofence(true);
        setCurrentMilestone(milestone);
        
        // Play appropriate audio based on milestone type
        const shouldPlayAudio = !playedMilestones.has(milestone.id) && !isPlaying;
        if (shouldPlayAudio) {
          if (milestone.type === 'FloraFauna' && milestone.animal_description) {
            playMilestoneAudio(milestone.animal_description, milestone.id);
          } else if (milestone.description) {
            playMilestoneAudio(milestone.description, milestone.id);
          }
        }
        
        // Show milestone tab
        setTimeout(() => {
          setShowMilestoneTab(true);
          setLastTriggeredMilestoneId(milestone.id);
        }, shouldPlayAudio ? 500 : 0);
        
        return; // Exit after finding first incomplete milestone
      }
    }

    setIsInsideGeofence(false);
  };

  const handleToast = (milestone: Milestones) => {
    if (!toast.isActive(toastId)) {
      showNewToast(milestone);
    }
  };

  const showNewToast = (milestone: Milestones) => {
    const newId = Math.random();
    setToastId(newId);
    toast.show({
      id: newId,
      placement: 'top',
      duration: 3000,
      render: ({ id }) => {
        const uniqueToastId = "toast-" + id;
        return (
          <Toast
            action="success"
            variant="outline"
            nativeID={uniqueToastId}
            className="p-4 border-success-500 w-[320px] shadow-hard-5 flex-row justify-between items-start"
          >
            <HStack space="sm" className="flex-1">
              <Icon
                as={CheckCircleIcon}
                className="stroke-success-500 mt-0.5"
              />
              <VStack space="xs" className="flex-1">
                <ToastTitle className="font-semibold text-success-500 text-sm">
                  {milestone.name}
                </ToastTitle>
                <ToastDescription 
                  size="sm" 
                  className="text-xs flex-1"
                >
                  {milestone.description}
                </ToastDescription>
              </VStack>
            </HStack>
            <Pressable 
              onPress={() => toast.close(id)}
              className="ml-2"
            >
              <Icon as={CloseIcon} size={14} />
            </Pressable>
          </Toast>
        );
      },
    });
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const lat1Rad = toRad(lat1);
    const lat2Rad = toRad(lat2);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d * 1000; // Convert to meters
  };

  const toRad = (x) => {
    return (x * Math.PI) / 180;
  };

  if (errorMsg) {
    return (
      <View style={styles.container}>
        <Text style={{ color: 'red' }}>{errorMsg}</Text>
      </View>
    );
  }

  const user_origin = location ? {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  } : undefined;

  const createLocationObject = (coords: { latitude: number; longitude: number }): Location.LocationObject => {
    return {
      coords: {
        latitude: coords.latitude,
        longitude: coords.longitude,
        altitude: null,
        accuracy: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };
  };

  const handleStartJourney = async (journey: Journey) => {
    try {
      resetAudioState();
      
      // First, ensure we have the full journey with milestones, especially offline
      let fullJourney = journey;
      
      // If journey doesn't have milestones or has empty milestones array, try to get from storage
      if (!journey.milestones || journey.milestones.length === 0) {
        console.log("Journey missing milestones, trying to load from storage");
        const storedJourney = await getJourney(journey.id);
        
        if (storedJourney && storedJourney.milestones && storedJourney.milestones.length > 0) {
          console.log(`Loaded ${storedJourney.milestones.length} milestones from storage`);
          fullJourney = storedJourney;
        } else {
          // Show toast if we can't start the journey
          toast.show({
            placement: 'top',
            render: ({ id }) => (
              <Toast nativeID={id} variant="accent" action="error">
                <ToastTitle>Cannot Start Journey</ToastTitle>
                <ToastDescription>
                  This journey needs to be downloaded before using it offline.
                </ToastDescription>
              </Toast>
            ),
          });
          return; // Exit the function if we can't get the journey data
        }
      }
      
      // Now proceed with the journey if we have milestones
      if (fullJourney?.milestones?.length > 0) {
        const resetJourneyData = resetJourneyCompletionStatus(fullJourney);
        const firstMilestone = resetJourneyData.milestones[0];
        const origin = createLocationObject({
          latitude: firstMilestone.latitude,
          longitude: firstMilestone.longitude
        });
        
        setLocation(origin);
        setActiveJourney(resetJourneyData);
        setIsJourneyActive(true);
        setCurrentMilestoneIndex(0);
        setCurrentMilestone(firstMilestone); 
        setShowNextButton(true);
        setShowGuideBird(false);

        if (mapRef.current) {
          mapRef.current.animateCamera({
            center: {
              latitude: firstMilestone.latitude,
              longitude: firstMilestone.longitude
            },
            heading: 0,
            pitch: 30,
            zoom: 18,
          }, { duration: 1000 });
        }
      } else {
        // This is a fallback in case we somehow still don't have milestones
        toast.show({
          placement: 'top',
          render: ({ id }) => (
            <Toast nativeID={id} variant="accent" action="error">
              <ToastTitle>Cannot Start Journey</ToastTitle>
              <ToastDescription>
                This journey has no milestones or needs to be downloaded first.
              </ToastDescription>
            </Toast>
          ),
        });
      }
    } catch (error) {
      console.error("Error starting journey:", error);
      toast.show({
        placement: 'top',
        render: ({ id }) => (
          <Toast nativeID={id} variant="accent" action="error">
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>
              Could not start journey. Please try again.
            </ToastDescription>
          </Toast>
        ),
      });
    }
  };

  // Update goToNextMilestone for consistent zoom
  const goToNextMilestone = () => {
    if (!activeJourney) return;
    const nextIndex = currentMilestoneIndex + 1;
    
    if (nextIndex < activeJourney.milestones.length) {
      const nextMilestone = activeJourney.milestones[nextIndex];
      Vibration.vibrate([200, 100, 200]);
      
      const targetLocation = nextMilestone.user_location 
        ? createLocationObject(nextMilestone.user_location)
        : createLocationObject({
            latitude: nextMilestone.latitude,
            longitude: nextMilestone.longitude
          });
      
      setLocation(targetLocation);
      setCurrentMilestoneIndex(nextIndex);
      setCurrentMilestone(nextMilestone); // Update currentMilestone
      updateMilestoneCompletion(nextMilestone, true); // Mark as complete
      
      const shouldPlayAudio = !playedMilestones.has(nextMilestone.id) && !isPlaying;
      if (shouldPlayAudio) {
        if (nextMilestone.type === 'FloraFauna' && nextMilestone.animal_description) {
          playMilestoneAudio(nextMilestone.animal_description, nextMilestone.id);
        } else if (nextMilestone.description) {
          playMilestoneAudio(nextMilestone.description, nextMilestone.id);
        }
      }
      
      setTimeout(() => {
        setShowMilestoneTab(true);
        setLastTriggeredMilestoneId(nextMilestone.id);
      }, shouldPlayAudio ? 100 : 0);
      
      if (mapRef.current) {
        mapRef.current.animateCamera({
          center: targetLocation.coords,
          heading: 0,
          pitch: 30, // Slightly less pitch for better readability if needed
          zoom: 23, // Consistent close-up zoom
        }, { duration: 1000 });
      }
      
      if (nextIndex === activeJourney.milestones.length - 1) {
        setShowNextButton(false);
      }
    }
  };

  // Add this function to HomeScreen component
  const resetAudioState = () => {
    // Call this when selecting a new journey or exiting
    if (playedMilestones.size > 0) {
      console.log("Resetting played milestones");
      playedMilestones.forEach(id => {
        // resetPlayedMilestone(id);
      });
    }
  };

  // Log user location and current milestone details
  // console.log("USER LOCATION", location?.coords.latitude, location?.coords.longitude);
  // console.log("CURRENT MILESTONE LOCATION", currentMilestone?.latitude, currentMilestone?.longitude);
  // console.log("CURRENT MILESTONE ORDER IN JOURNEY", currentMilestone?.order_in_journey);

  // Add a function to handle closing the milestone tab
  const handleCloseMilestoneTab = () => {
    setShowMilestoneTab(false);
  };

  const updateMilestoneCompletion = async (milestone) => {
    try {
      // Update local state first to prevent repeated triggers
      // Create a new milestones array with the updated milestone
      const updatedMilestones = activeJourney.milestones.map(m => 
        m.id === milestone.id ? { ...m, is_complete: true } : m
      );
      
      // Update the active journey with new milestones

      setActiveJourney({
        ...activeJourney,
        milestones: updatedMilestones
      });
      
      // Update Firestore in the background
      const milestoneRef = doc(db, "milestones", milestone.id);
      await updateDoc(milestoneRef, {
        is_complete: true,
        visited_at: serverTimestamp()
      });
      
      console.log(`Milestone ${milestone.name} marked as complete`);
      
      // Check if all milestones are complete to mark journey as complete
      const allComplete = updatedMilestones.every(m => m.is_complete);
      if (allComplete) {
        const journeyRef = doc(db, "journeys", activeJourney.id);
        await updateDoc(journeyRef, {
          is_complete: true,
          updated_at: serverTimestamp()
        });
        console.log(`Journey ${activeJourney.name} marked as complete`);
      }
    } catch (error) {
      console.error("Error updating milestone completion:", error);
      // Even if Firestore update fails, we've already updated local state
      // so the milestone won't trigger again in this session
    }
  };

  // Fix the auto-hiding timer to properly hide the tab after delay
  useEffect(() => {
    let tabTimer: NodeJS.Timeout;
    
    if (showMilestoneTab) {
      // Auto-hide the milestone tab after 15 seconds if user doesn't interact with it
      tabTimer = setTimeout(() => {
        setShowMilestoneTab(false); // Changed to false to actually hide the tab
      }, 1500000); // Changed to 15 seconds instead of 150
    }
    
    return () => {
      if (tabTimer) clearTimeout(tabTimer);
    };
  }, [showMilestoneTab]);

  // Add this helper function to calculate boundaries from all milestones
  const fitJourneyToScreen = (journey: Journey) => {
    if (!journey?.milestones?.length || !mapRef.current) return;

    const coordinates = journey.milestones.map(m => ({
      latitude: m.latitude,
      longitude: m.longitude,
    }));

    if (coordinates.length === 1 && mapRef.current) { // Single milestone
        mapRef.current.animateCamera({
            center: coordinates[0],
            pitch: 45,
            heading: 0,
            zoom: 12, // Zoom for a single point
        }, { duration: 1000 });
    } else if (coordinates.length > 1 && mapRef.current) { // Multiple milestones
        mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: {
                top: responsiveHeight(10), // Adjust padding as needed
                right: responsiveWidth(10),
                bottom: responsiveHeight(300), // More bottom padding for JourneyHeader
                left: responsiveWidth(10),
            },
            animated: true,
        });
    }
  };

  // Update useEffect for currentMilestone for consistent zoom
  useEffect(() => {
    if (currentMilestone && mapRef.current && isJourneyActive) { // Ensure journey is active
      mapRef.current.animateCamera({
        center: {
          latitude: currentMilestone.latitude,
          longitude: currentMilestone.longitude
        },
        heading: 0,
        pitch: 45,
        zoom: 12, // Consistent close-up zoom
      }, { duration: 1000 });
    }
  }, [currentMilestone, isJourneyActive]); // Add isJourneyActive dependency

  // Add this function to your component
  const handleExitJourney = () => {
    setIsJourneyActive(false);
    setShowNextButton(false);
    setCurrentMilestoneIndex(0);
    
    // If you want to keep showing the last journey the user was on:
    // (no need to change activeJourney)
    
    // Force refit the map to show all milestones
    if (activeJourney) {
      fitJourneyToScreen(activeJourney);
    }
  };

  // Add this function to your HomeScreen component, before the return statement

const handleDownloadJourney = async (journey: Journey) => {
  try {
    setIsDownloading(true);
    setDownloadProgress(0);
    
    // Show toast to indicate download started
    toast.show({
      placement: 'top',
      render: ({ id }) => (
        <Toast nativeID={id} variant="accent" action="info">
          <ToastTitle>Downloading Journey</ToastTitle>
          <ToastDescription>
            Downloading "{journey.name}" for offline use...
          </ToastDescription>
        </Toast>
      ),
    });
    
    // Simulate progress updates while downloading
    const progressInterval = setInterval(() => {
      setDownloadProgress(prev => {
        const newProgress = prev + 0.1;
        return newProgress > 0.9 ? 0.9 : newProgress;
      });
    }, 300);
    
    // Download the journey and all its data
    const downloadedJourney = await downloadJourney(journey.id);
    
    // Clean up and set final progress
    clearInterval(progressInterval);
    setDownloadProgress(1);
    
    if (downloadedJourney) {
      // Update the journeys list to reflect downloaded status
      setJourneys(prev => 
        prev.map(j => j.id === journey.id ? { ...j, is_downloaded: true } : j)
      );
      
      // Update active journey if this is the current one
      if (activeJourney?.id === journey.id) {
        setActiveJourney(downloadedJourney);
      }
      
      // Show success toast
      toast.show({
        placement: 'top',
        render: ({ id }) => (
          <Toast nativeID={id} variant="accent" action="success">
            <ToastTitle>Download Complete</ToastTitle>
            <ToastDescription>
              "{journey.name}" is now available offline.
            </ToastDescription>
          </Toast>
        ),
      });
    } else {
      // Show error toast if download failed
      toast.show({
        placement: 'top',
        render: ({ id }) => (
          <Toast nativeID={id} variant="accent" action="error">
            <ToastTitle>Download Failed</ToastTitle>
            <ToastDescription>
              Could not download "{journey.name}". Please try again.
            </ToastDescription>
          </Toast>
        ),
      });
    }
  } catch (error) {
    console.error("Error downloading journey:", error);
    
    // Show error toast
    toast.show({
      placement: 'top',
      render: ({ id }) => (
        <Toast nativeID={id} variant="accent" action="error">
          <ToastTitle>Download Error</ToastTitle>
          <ToastDescription>
            An unexpected error occurred. Please try again.
          </ToastDescription>
        </Toast>
      ),
    });
  } finally {
    setIsDownloading(false);
  }
};

  return (
    <View style={styles.container}>
       {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Offline Mode</Text>
        </View>
      )}
      { isJourneyActive && <BackgroundPlayback playAll={false} volume={10} loop={true} choose={2}/>}
      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation
        followsUserLocation={false}
        showsMyLocationButton={false}
        showsTraffic
        showsBuildings
        showsCompass
        showsPointsOfInterest
        showsScale
        toolbarEnabled={true}
        zoomEnabled={true}
        rotateEnabled={true}
        scrollEnabled={true}
        pitchEnabled={true}
        userInterfaceStyle="light"
        userLocationAnnotationTitle="You are here"
        mapPadding={{ top: responsiveHeight(80), right: responsiveWidth(20), bottom: responsiveHeight(200), left: responsiveWidth(20) }}
        initialCamera={{ // Corrected initialCamera
          center: location?.coords || { latitude: -27.4975, longitude: 153.0137 }, // Default to Brisbane
          pitch: 45,
          heading: 0,
          zoom: 5, // Sensible initial zoom level
        }}
      >
        
        {/* Route Visualization - Improved for navigation */}
        {activeJourney && activeJourney.milestones.length > 0 && (
          <>
            {/* Draw connecting lines between milestones in purple */}
            <Polyline
              coordinates={activeJourney.milestones.map(milestone => ({
                latitude: milestone.latitude,
                longitude: milestone.longitude,
              }))}
              strokeColor="#9E2F9C" // Purple color from the image
              strokeWidth={4}
              lineDashPattern={[0]}
            />
            
            {/* Draw markers for each milestone */}
            {activeJourney.milestones.map((milestone, index) => (
              <React.Fragment key={`milestone-${milestone.id}`}>
                <Marker
                  coordinate={{
                    latitude: milestone.latitude,
                    longitude: milestone.longitude,
                  }}
                  title={milestone.name}
                  description={milestone.description}
                >
                  {/* Custom styled circular marker like in the example */}
                  <View style={[
                    styles.customMilestoneMarker,
                    milestone.is_complete ? styles.completedMilestoneMarker : styles.incompleteMilestoneMarker
                  ]}>
                    {/* No text label as requested */}
                  </View>
                </Marker>
                
                {/* Circle for geofence radius */}
                <Circle
                  center={{
                    latitude: milestone.latitude,
                    longitude: milestone.longitude,
                  }}
                  radius={milestone.radius}
                  strokeColor={milestone.is_complete ? '#00ff00' : '#ff0000'}
                  fillColor={milestone.is_complete ? 'rgba(0,255,0,0.1)' : 'rgba(255,0,0,0.1)'}
                  strokeWidth={1}
                />
              </React.Fragment>
            ))}
          </>
        )}
        {/* Current User Location Marker (only one visible at a time) */}
        {activeJourney?.milestones[currentMilestoneIndex]?.user_location && (
          <Marker
          coordinate={{
            latitude: activeJourney.milestones[currentMilestoneIndex].user_location.latitude,
            longitude: activeJourney.milestones[currentMilestoneIndex].user_location.longitude,
          }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.gpsMarker}>
              <View style={styles.gpsMarkerPulse} />
              <View style={styles.gpsMarkerCore} />
            </View>
          </Marker>
        )}

        {/* Add a custom direction marker for the user */}
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={location.coords.heading || 0} // Rotate based on user heading
          >
            <View style={styles.userDirectionMarker}>
              <View style={styles.userDirectionArrow} />
            </View>
          </Marker>
        )}

      </MapView>

      <DialoguePopup
        visible={showGuideBird}
        message="I recommend downloading the journey for the best experience!"
        onClose={() => { 
          setShowGuideBird(false);
          const currentTime = Date.now();
          setLastPopupShownTime(currentTime);
          
          // Also save to AsyncStorage for persistence
          AsyncStorage.setItem('lastPopupShownTime', currentTime.toString())
            .catch(err => console.error('Failed to save popup time:', err));
          
          console.log("Popup closed, next popup allowed after:", new Date(currentTime + 10 * 60 * 1000));
        }}
        isBlur={true}
        size="small"
        enableAudio={false}
        animated={true}
      />

      {/* Journey Details Header */}
      {!isJourneyActive ? (
        <View style={styles.journeyHeaderContainer}>
          <JourneyHeader
            journeys={journeys}
            onStartPress={handleStartJourney}
            onDownloadPress={handleDownloadJourney} // Use the new handler
            isDownloading={isDownloading}
            downloadProgress={downloadProgress}
            onJourneyChange={(journey) => {
              setActiveJourney(journey);
              fitJourneyToScreen(journey);
            }}
          />
        </View>
      ) : (
        <View style={styles.exitButtonContainer}>
          <TouchableOpacity
            style={styles.exitButton}
            onPress={handleExitJourney}
          >
            <MaterialIcons name="exit-to-app" size={24} color="white" />
            <Text style={styles.exitButtonText}>Exit Journey</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Next Milestone Button */}
      {isJourneyActive && showNextButton && (
        <TouchableOpacity
          style={styles.nextButton}
          onPress={goToNextMilestone}
        >
          <Text style={styles.nextButtonText}>GO TO NEXT MILESTONE!</Text>
        </TouchableOpacity>
      )}

      {/* Milestone Action Tab */}
      {currentMilestone && (
        <MilestoneActionTab
          milestone={currentMilestone}
          isVisible={showMilestoneTab}
          onClose={handleCloseMilestoneTab}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  buttonOverlay: {
    position: 'absolute',
    top: 120,
    right: 5,
    borderRadius: 50,
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customMarker: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'orange',
    borderWidth: 2,
    borderColor: 'white',
  },
  journeyHeader: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    gap: 10,
  },
  coverImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  journeyInfo: {
    flex: 1,
  },
  journeyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  journeyTheme: {
    fontSize: 14,
    color: '#3498db',
    marginBottom: 4,
  },
  journeyDescription: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  journeyStats: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '500',
  },
  journeyButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  activeJourneyButton: {
    backgroundColor: '#2ecc71',
  },
  journeySelector: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  journeyButton: {
    backgroundColor: '#3498db',
    padding: 10,
    margin: 5,
    borderRadius: 5,
    minWidth: 100,
  },
  activeJourneyIndicator: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 255, 0, 0.7)',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  activeJourneyText: {
    color: 'white',
    fontWeight: 'bold',
  },
  guideContainer: {
    position: 'absolute',
    top: 120,
    left: -93,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
  },
  guideImage: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
  },
  speechBubble: {
    width: 190,
    height: 120,
    left: -230,
    bottom: 100,
    justifyContent: 'center',
    alignItems: 'left',
    paddingHorizontal: 5,
    paddingBottom: 20, // Adjust this to position text properly in the bubble
    marginLeft: 10,
  },
  speechText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    width: '80%', // Adjust based on your bubble shape
  },
  exitButtonContainer: {
    position: 'absolute',
    bottom: 130,
    alignSelf: 'center',
    backgroundColor: '#F28C38',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exitButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  nextButton: {
    position: 'absolute',
    top: 70,
    right: 20,
    // backgroundColor: '#F28C38',
    backgroundColor: 'red',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  nextButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  gpsMarkerContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(66, 134, 244, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gpsMarkerInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(66, 134, 244, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gpsMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(66, 134, 244, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  gpsMarkerPulse: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(66, 134, 244, 0.4)',
    zIndex: 0,
  },
  gpsMarkerCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4286f4',
    zIndex: 1,
  },
  offlineBanner: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    backgroundColor: '#ff9800',
    padding: 8,
    zIndex: 1000,
    alignItems: 'center',
  },
  offlineText: {
    color: 'white',
    fontWeight: 'bold',
  },
  // New styles for map controls
  mapButton: {
    backgroundColor: 'white',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  // Milestone marker styles like in the example image
  customMilestoneMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: 'white',
  },
  completedMilestoneMarker: {
    backgroundColor: '#00ff00', // Green for completed
  },
  incompleteMilestoneMarker: {
    backgroundColor: '#FF2400', // Purple like in the image
  },
  
  // User direction marker
  userDirectionMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4286f4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDirectionArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'white',
    transform: [{ rotate: '180deg' }], // Arrow points in direction of travel
  },
  journeyHeaderContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    zIndex: 5, // Lower than the map points
  },
});