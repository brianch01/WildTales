import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, storage } from '@/FirebaseConfig';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Queue key for AsyncStorage
const PHOTO_QUEUE_KEY = 'photo_upload_queue';

// Interface for queued photo items
interface QueuedPhotoItem {
  milestoneId: string;
  userId: string;
  localUri: string;
  timestamp: number;
  metaData?: {
    [key: string]: string;
  };
}

// Add a photo to the offline queue
export const queuePhotoUpload = async (
  milestoneId: string, 
  userId: string, 
  localUri: string,
  metaData?: { [key: string]: string }
): Promise<void> => {
  try {
    // Get existing queue
    const queue = await getPhotoQueue();
    
    // Add new photo to queue
    queue.push({
      milestoneId,
      userId,
      localUri,
      timestamp: Date.now(),
      metaData
    });
    
    // Save updated queue
    await AsyncStorage.setItem(PHOTO_QUEUE_KEY, JSON.stringify(queue));
    console.log(`Photo queued for later upload: ${milestoneId}`);
    
    // Try to process queue immediately if online
    processPhotoQueue();
  } catch (error) {
    console.error('Error queuing photo upload:', error);
  }
};

// Get the current photo queue
export const getPhotoQueue = async (): Promise<QueuedPhotoItem[]> => {
  try {
    const queueData = await AsyncStorage.getItem(PHOTO_QUEUE_KEY);
    return queueData ? JSON.parse(queueData) : [];
  } catch (error) {
    console.error('Error getting photo queue:', error);
    return [];
  }
};

// Get the count of queued photos
export const getQueuedPhotoCount = async (): Promise<number> => {
  const queue = await getPhotoQueue();
  return queue.length;
};

// Process the photo queue
export const processPhotoQueue = async (): Promise<boolean> => {
  try {
    // Check network status
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      console.log('Cannot process photo queue while offline');
      return false;
    }

    console.log('Processing photo queue...');
    
    // Get the queue
    const queue = await getPhotoQueue();
    if (queue.length === 0) {
      console.log('Photo queue is empty');
      return true;
    }
    
    console.log(`Processing ${queue.length} queued photos`);
    
    // Process each item one by one
    const newQueue: QueuedPhotoItem[] = [];
    
    for (const item of queue) {
      try {
        // Check if file exists
        const fileInfo = await FileSystem.getInfoAsync(item.localUri);
        if (!fileInfo.exists) {
          console.log(`File not found, skipping: ${item.localUri}`);
          continue;
        }
        
        // Generate structured filename with timestamp for better organization
        const timestamp = Date.now();
        const structuredFilename = `photo_${item.milestoneId}_${timestamp}.jpg`;
        
        // Use the CORRECT storage path structure matching the security rules
        // This path should match what's used in photo-task.tsx
        const storageRef = ref(storage, `userPhotos/${item.userId}/${item.milestoneId}/${structuredFilename}`);
        
        // Read the file
        const response = await fetch(item.localUri);
        const blob = await response.blob();
        
        // Upload to Firebase Storage
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);
        
        // Save to Firestore photos_taken collection with all required fields
        await addDoc(collection(db, 'photos_taken'), {
          milestoneId: item.milestoneId,
          userId: item.userId,
          photoUrl: downloadURL,
          storagePath: `userPhotos/${item.userId}/${item.milestoneId}/${structuredFilename}`,
          createdAt: serverTimestamp(),
          // Add references to related documents
          milestoneRef: doc(db, "milestones", item.milestoneId),
          userRef: doc(db, "users", item.userId),
          // Include any additional metadata from the queued item
          ...item.metaData
        });
        
        console.log(`Successfully uploaded queued photo: ${item.milestoneId}`);
        
        // Also update milestone as completed
        try {
          await updateDoc(doc(db, "milestones", item.milestoneId), {
            is_complete: true,
            updated_at: serverTimestamp()
          });
        } catch (milestoneError) {
          console.error('Error updating milestone completion:', milestoneError);
          // Continue even if milestone update fails
        }
      } catch (error) {
        console.error('Error processing queued item:', error);
        // Keep failed items in the queue
        newQueue.push(item);
      }
    }
    
    // Save the updated queue with only failed items
    await AsyncStorage.setItem(PHOTO_QUEUE_KEY, JSON.stringify(newQueue));
    
    return newQueue.length === 0; // Return true if queue is now empty
  } catch (error) {
    console.error('Error processing photo queue:', error);
    return false;
  }
};

// Clear the entire queue (for testing)
export const clearPhotoQueue = async (): Promise<void> => {
  await AsyncStorage.removeItem(PHOTO_QUEUE_KEY);
};