import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// Interface for milestone data
interface MilestoneActionTabProps {
  milestone: any;
  isVisible: boolean;
  onClose: () => void;
}

export default function MilestoneActionTab({ milestone, isVisible, onClose }: MilestoneActionTabProps) {
  const slideAnimation = useRef(new Animated.Value(150)).current;

  useEffect(() => {
    if (isVisible) {
      // Slide in from right
      Animated.spring(slideAnimation, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      // Slide out to right
      Animated.spring(slideAnimation, {
        toValue: 150,
        friction: 6,
        tension: 40, 
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  // Log the milestone details when milestone prop changes
  useEffect(() => {
    if (milestone) {
      console.log(`MilestoneActionTab received milestone:`, {
        id: milestone.id,
        name: milestone.name,
        type: milestone.type,
        hasAnimalDesc: !!milestone.animal_description,
        hasDescription: !!milestone.description
      });
    }
  }, [milestone]);

  // Determine milestone type based on the type attribute
  const isPhotoTask = milestone?.type === 'FloraFauna';
  
  const handleAction = () => {
    onClose();
    
    // Use a try-catch to handle potential navigation errors
    try {
      if (isPhotoTask) {
        // Navigate to photo task with milestone ID
        console.log("Navigating to photo task with milestone ID:", milestone.id);
        router.push({
          pathname: '/photo-task',
          params: { id: milestone.id || 'default' } // Provide a fallback
          // params: { 
          //   taskId: milestone.id || 'default', // Provide a fallback
          //   milestone: milestone.id || 'default' // Provide a fallback
          // }
        });
      } else {
        // Navigate to milestone details
        console.log("Navigating to milestone details with ID:", milestone.id);
        router.push({
          pathname: '/milestone-details',
          params: { id: milestone.id || 'default' }
        });
      }
    } catch (error) {
      console.error("Navigation error:", error);
      // Fallback approach in case router push fails
      if (isPhotoTask) {
        // window.location.href = `/photo-task?taskId=${milestone.id}&milestone=${milestone.id}`;
        window.location.href = `/photo-task?id=${milestone.id}`;
      } else {
        window.location.href = `/milestone-details?id=${milestone.id}`;
      }
    }
  };

  if (!milestone || !isVisible) return null;

  return (
    <Animated.View style={[
      styles.container, 
      { transform: [{ translateX: slideAnimation }] }
    ]}>

      
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {isPhotoTask ? '   Photo Challenge!' : '   Milestone Reached!'}
        </Text>
      </View>
      
      <View style={styles.content}>
        {/* <Text style={styles.title}>{milestone.name}</Text> */}
        
        {/* Icon display instead of image */}
        <View style={styles.iconContainer}>
          <Ionicons 
            name={isPhotoTask ? 'camera-outline' : 'location-outline'} 
            size={34} 
            color={isPhotoTask ? '#1f1d1c' : '#1f1d1c'} 
          />
        </View>
        
        <Text style={styles.description}>
          {isPhotoTask 
            ? milestone.animal_name 
              ? `Take a photo of the ${milestone.animal_name}!` 
              : "Photo challenge awaits!"
            : milestone.description 
              ? milestone.description.substring(0, 20) + (milestone.description.length > 20 ? '...' : '') 
              : "You've discovered a new location!"}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={[
          styles.actionButton,
          {backgroundColor: isPhotoTask ? '#FFA726' : '#FFA726'}
        ]} 
        onPress={handleAction}
      >
        <Text style={styles.actionButtonText}>
          {isPhotoTask ? 'GO!' : 'VIEW DETAILS'}
        </Text>
        <Ionicons 
          name={isPhotoTask ? 'camera' : 'information-circle'} 
          size={24} 
          color="white" 
        />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Ionicons name="close" size={20} color="#777" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '25%',
    right: 0,
    width: 240,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
    iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 40,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#EAEAEA',
  },

  header: {
    backgroundColor: '#8A4DFF',
    marginHorizontal: -14,
    marginTop: -16,
    paddingVertical: 10,
    alignItems: 'center',
    borderTopLeftRadius: 20,
  },
  headerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 22,
  },
  content: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
  },
  image: {
    width: 140,
    height: 100,
    borderRadius: 10,
    marginBottom: 10,
  },
  description: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#c76616',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginRight: 8,
    fontSize: 18,
  },
  closeButton: {
    position: 'absolute',
    top: -15,
    left: -15,
    padding: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    zIndex: 10,
  },
});