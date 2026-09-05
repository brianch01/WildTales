import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/FirebaseConfig';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import NetInfo from '@react-native-community/netinfo';

// Types - move these to a separate types file later
export interface Milestone {
  id: string;
  order_in_journey: number;
  name: string;
  type: string;
  animal_name?: string;
  animal_description?: string;
  animal_image_url?: string;
  description: string;
  is_completed: boolean;
  is_complete: boolean;
  latitude: number;
  longitude: number;
  radius: number;
  journey_id: any;
  journey_id_string: string;
  visual_asset_url?: string;
  asset_unlock?: string;
  audio_prompt?: string;
  puzzlePieceAssetUrl?: string;
  visited_at?: any;
  created_at?: any;
  updated_at?: any;
  puzzle_piece_collected?: boolean;
  user_location?: {
    latitude: number;
    longitude: number;
  };
}

export interface Journey {
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
  milestones: Milestone[];
}

// Cache keys
const KEYS = {
  JOURNEYS: 'cached_journeys',
  JOURNEY_PREFIX: 'journey_',
  MILESTONE_PREFIX: 'milestone_',
  IMAGES_PREFIX: 'img_',
  LAST_UPDATED: 'offline_data_last_updated'
};

// Check if we're online
export const isOnline = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  return state.isConnected === true;
};

// Load all journeys (with basic info only)
export const loadAllJourneys = async (): Promise<Journey[]> => {
  try {
    // Try to get from network first
    if (await isOnline()) {
      const journeysSnapshot = await getDocs(collection(db, 'journeys'));
      const journeys = journeysSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          child_id: data.child_id ?? '',
          cover_image_url: data.cover_image_url ?? '',
          description: data.description ?? '',
          is_complete: data.is_complete ?? false,
          is_downloaded: data.is_downloaded ?? false,
          length: data.length ?? 0,
          name: data.name ?? '',
          theme: data.theme ?? '',
          user_id: data.user_id ?? '',
          milestones: []
        } as Journey;
      });
      
      // Cache basic journey info
      await AsyncStorage.setItem(KEYS.JOURNEYS, JSON.stringify(journeys));
      await AsyncStorage.setItem(KEYS.LAST_UPDATED, Date.now().toString());
      
      return journeys;
    }
    
    // Fall back to cached data if offline
    const cachedData = await AsyncStorage.getItem(KEYS.JOURNEYS);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    
    return [];
  } catch (error) {
    console.error("Error loading journeys:", error);
    
    // Last resort - try cache even if there was an error
    try {
      const cachedData = await AsyncStorage.getItem(KEYS.JOURNEYS);
      return cachedData ? JSON.parse(cachedData) : [];
    } catch {
      return [];
    }
  }
};

// Download a specific journey with all milestone data
export const downloadJourney = async (journeyId: string): Promise<Journey | null> => {
  try {
    if (!(await isOnline())) {
      // If offline, try to get from cache
      const cachedJourney = await AsyncStorage.getItem(`${KEYS.JOURNEY_PREFIX}${journeyId}`);
      return cachedJourney ? JSON.parse(cachedJourney) : null;
    }

    // Get journey details from Firestore
    const journeyDoc = await getDoc(doc(db, 'journeys', journeyId));
    if (!journeyDoc.exists()) {
      throw new Error(`Journey with ID ${journeyId} not found`);
    }

    // Get journey data
    const journey = { 
      id: journeyDoc.id, 
      ...journeyDoc.data()
    } as Journey;

    // Get all milestones for this journey
    const milestonesQuery = query(
      collection(db, 'milestones'),
      where('journey_id_string', '==', journeyId)
    );
    const milestonesSnapshot = await getDocs(milestonesQuery);
    const milestones = milestonesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Milestone[];

    // Sort milestones by order
    journey.milestones = milestones.sort((a, b) => a.order_in_journey - b.order_in_journey);
    
    // Mark journey as downloaded
    journey.is_downloaded = true;
    
    // Cache the complete journey data
    await AsyncStorage.setItem(`${KEYS.JOURNEY_PREFIX}${journeyId}`, JSON.stringify(journey));
    
    // Cache each milestone separately for potential individual updates
    // This ensures milestone-details and photo-task pages can access their data
    for (const milestone of milestones) {
      await AsyncStorage.setItem(`${KEYS.MILESTONE_PREFIX}${milestone.id}`, JSON.stringify(milestone));
    }
    
    // Update the main journeys cache to mark this as downloaded
    const allJourneys = await loadAllJourneys();
    const updatedJourneys = allJourneys.map(j => 
      j.id === journeyId ? { ...j, is_downloaded: true } : j
    );
    await AsyncStorage.setItem(KEYS.JOURNEYS, JSON.stringify(updatedJourneys));
    
    console.log(`Downloaded journey ${journeyId} with ${milestones.length} milestones`);
    
    return journey;
  } catch (error) {
    console.error(`Error downloading journey ${journeyId}:`, error);
    return null;
  }
};

// Get a specific journey (tries cache first, then network)
export const getJourney = async (journeyId: string): Promise<Journey | null> => {
  try {
    // Try cache first
    const cachedJourney = await AsyncStorage.getItem(`${KEYS.JOURNEY_PREFIX}${journeyId}`);
    if (cachedJourney) {
      return JSON.parse(cachedJourney);
    }
    
    // If online, download it
    if (await isOnline()) {
      return downloadJourney(journeyId);
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting journey ${journeyId}:`, error);
    return null;
  }
};

// Update milestone completion status (works offline too)
export const updateMilestoneCompletion = async (
  milestoneId: string,
  isComplete: boolean
): Promise<boolean> => {
  try {
    // Update in cache first (optimistic update)
    const cachedMilestone = await AsyncStorage.getItem(`${KEYS.MILESTONE_PREFIX}${milestoneId}`);
    if (cachedMilestone) {
      const milestone = JSON.parse(cachedMilestone) as Milestone;
      milestone.is_complete = isComplete;
      await AsyncStorage.setItem(`${KEYS.MILESTONE_PREFIX}${milestoneId}`, JSON.stringify(milestone));
      
      // Also update in journey cache
      const journeyId = milestone.journey_id_string;
      const cachedJourney = await AsyncStorage.getItem(`${KEYS.JOURNEY_PREFIX}${journeyId}`);
      if (cachedJourney) {
        const journey = JSON.parse(cachedJourney) as Journey;
        journey.milestones = journey.milestones.map(m => 
          m.id === milestoneId ? { ...m, is_complete: isComplete } : m
        );
        await AsyncStorage.setItem(`${KEYS.JOURNEY_PREFIX}${journeyId}`, JSON.stringify(journey));
      }
    }
    
    // If online, update in Firestore too (will be handled by your existing code)
    return true;
  } catch (error) {
    console.error(`Error updating milestone ${milestoneId} completion:`, error);
    return false;
  }
};

// Clear cached data for testing
export const clearOfflineData = async (): Promise<void> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const offlineDataKeys = allKeys.filter(key => 
      key.startsWith(KEYS.JOURNEY_PREFIX) || 
      key.startsWith(KEYS.MILESTONE_PREFIX) || 
      key.startsWith(KEYS.IMAGES_PREFIX) ||
      key === KEYS.JOURNEYS ||
      key === KEYS.LAST_UPDATED
    );
    
    await AsyncStorage.multiRemove(offlineDataKeys);
  } catch (error) {
    console.error("Error clearing offline data:", error);
  }
};