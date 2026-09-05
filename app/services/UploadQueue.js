// services/UploadQueue.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { storage, db, auth } from '@/FirebaseConfig';
import * as FileSystem from 'expo-file-system';

export const UploadQueueService = {
  checkAndProcessQueue: async () => {
    // Check if we're online
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) return;
    
    try {
      // Get queued photos
      const queuedString = await AsyncStorage.getItem('queued_photos');
      if (!queuedString) return;
      
      const queuedPhotos = JSON.parse(queuedString);
      if (queuedPhotos.length === 0) return;
      
      console.log(`Processing ${queuedPhotos.length} queued photos`);
      
      // Process each photo
      const processingQueue = [];
      for (const item of queuedPhotos) {
        processingQueue.push(processQueuedItem(item));
      }
      
      await Promise.all(processingQueue);
      
      // Clear the queue when done
      await AsyncStorage.removeItem('queued_photos');
    } catch (error) {
      console.error('Error processing upload queue:', error);
    }
  }
};

async function processQueuedItem(item) {
  try {
    const { photoUri, milestoneId } = item;
    
    // Check if file still exists
    const fileInfo = await FileSystem.getInfoAsync(photoUri);
    if (!fileInfo.exists) {
      console.log(`File no longer exists: ${photoUri}`);
      return;
    }
    
    // Upload logic - similar to your uploadPhoto function
    const response = await fetch(photoUri);
    const blob = await response.blob();
    
    const filename = photoUri.split('/').pop();
    const storageRef = ref(storage, `milestone_photos/${milestoneId}/${filename}`);
    
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    
    // Save to Firestore
    const photoRef = collection(db, "milestone_photos");
    await addDoc(photoRef, {
      milestone_id: milestoneId,
      user_id: auth.currentUser?.uid || "anonymous",
      image_url: downloadURL,
      created_at: serverTimestamp(),
    });
    
    // Update milestone as completed
    await updateDoc(doc(db, "milestones", milestoneId), {
      is_complete: true,
      updated_at: serverTimestamp()
    });
    
    console.log(`Successfully processed queued photo for milestone ${milestoneId}`);
  } catch (error) {
    console.error('Error processing queued item:', error);
  }
}