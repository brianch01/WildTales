import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet, Dimensions, Animated } from 'react-native';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { collection, DocumentReference, getDocs, query, where, doc, writeBatch } from 'firebase/firestore';
import * as Progress from 'expo-progress';
import NetInfo from '@react-native-community/netinfo'; // Import NetInfo


interface Milestones {
  id: string;
  name: string;
  description: string;
  is_completed: boolean;
  latitude: number;
  longitude: number;
  radius: number;
  journey_id: DocumentReference;
  journey_id_string: string;
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

const { width, height } = Dimensions.get('window');

interface ResponsiveSizeFn {
  (size: number): number;
}

const responsiveWidth: ResponsiveSizeFn = (size: number): number => (width / 375) * size; // 375 is standard iPhone width
const responsiveHeight = (size) => (height / 812) * size; // 812 is standard iPhone height
const responsiveFont = (size) => {
  const ratio = (width / height) * (16 / 9);
  return Math.round(size * ratio);
};

interface JourneyHeaderProps {
  journeys: Journey[];
  onStartPress: (journey: Journey) => void;
  onDownloadPress: (journey: Journey) => void;
  onJourneyChange: (journey: Journey) => void;
  isDownloading?: boolean;
  downloadProgress?: number;
}

const JourneyHeader: React.FC<JourneyHeaderProps> = ({ 
  journeys, 
  onStartPress, 
  onDownloadPress,
  onJourneyChange,
  isDownloading = false,
  downloadProgress = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startButtonScale] = useState(new Animated.Value(1));
  const [downloadButtonScale] = useState(new Animated.Value(1));
  const [isOffline, setIsOffline] = useState(false); // Offline state

  const currentJourney = journeys[currentIndex] || {
    theme: '',
    name: '',
    length: 0,
    description: '',
    cover_image_url: ''
  };

  // Network status detection
  useEffect(() => {
    const checkNetworkStatus = async () => {
      const status = await NetInfo.fetch();
      setIsOffline(!(status.isConnected ?? false));
    };
    
    checkNetworkStatus();
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!(state.isConnected ?? false));
    });
    
    return () => unsubscribe();
  }, []);

  const navigateJourney = (direction: 'prev' | 'next') => {
    let newIndex = currentIndex;
    
    if (direction === 'prev' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'next' && currentIndex < journeys.length - 1) {
      newIndex = currentIndex + 1;
    }
    
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
      
      // Call the onJourneyChange callback with the new journey
      if (onJourneyChange && journeys[newIndex]) {
        onJourneyChange(journeys[newIndex]);
      }
    }
  };

  const animateButton = (button: Animated.Value, isPressed: boolean) => {
    Animated.spring(button, {
      toValue: isPressed ? 0.9 : 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true
    }).start();
  };

  return (
    <View style={styles.outerContainer}>
      {/* Navigation Buttons - Now inside card with fun shapes */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[
            styles.navButton, 
            styles.leftNavButton,
            currentIndex === 0 && styles.disabledNavButton
          ]}
          onPress={() => navigateJourney('prev')}
          disabled={currentIndex === 0}
        >
          <MaterialIcons
            name="chevron-left"
            size={30}
            color={currentIndex === 0 ? '#ccc' : 'white'}
          />
        </TouchableOpacity>

        {/* Main Card */}
        <View style={styles.container}>
          {/* Theme Badge */}
          <View style={styles.themeTag}>
            <FontAwesome5 name="map-marked-alt" size={14} color="white" style={styles.themeIcon} />
            <Text style={styles.themeText}>{currentJourney.theme}</Text>
          </View>

          {/* Cover Image with rounded corners and border */}
          <Image
            source={{ uri: currentJourney.cover_image_url }}
            style={styles.coverImage}
            resizeMode="cover"
          />

          {/* Journey Title with fun font */}
          <Text style={styles.title}>{currentJourney.name}</Text>
          
          {/* Journey Info - simplified */}
          <View style={styles.infoRow}>
            <Text style={styles.length}>
              <FontAwesome5 name="walking" size={14} color="#8A4DFF" /> {currentJourney.length}
            </Text>
          </View>

          {/* Description - shorter, more concise */}
          <Text style={styles.description} numberOfLines={2}>
            {currentJourney.description}
          </Text>

          {/* Action Buttons - more playful */}
          <View style={styles.buttonContainer}>
            <Animated.View style={{transform: [{scale: startButtonScale}], flex: 1, marginRight: 8}}>
              {/* Start Journey Button */}
              <TouchableOpacity
                style={[
                  styles.button, 
                  styles.startButton,
                  (isOffline && !currentJourney.is_downloaded) && styles.disabledButton
                ]}
                onPress={() => onStartPress(currentJourney)}
                onPressIn={() => animateButton(startButtonScale, true)}
                onPressOut={() => animateButton(startButtonScale, false)}
                disabled={isOffline && !currentJourney.is_downloaded}
              >
                <Ionicons name="play-circle" size={20} color="white" />
                <Text style={styles.buttonText}>
                  {isOffline && !currentJourney.is_downloaded ? 'Download First' : 'Start'}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={{transform: [{scale: downloadButtonScale}]}}>
              {/* Download Button */}
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={() => onDownloadPress(currentJourney)}
                onPressIn={() => animateButton(downloadButtonScale, true)}
                onPressOut={() => animateButton(downloadButtonScale, false)}
              >
                <Text style={styles.downloadButtonText}>Download</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Journey Indicator - more playful dots */}
          <View style={styles.indicatorContainer}>
            {journeys.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicatorDot,
                  index === currentIndex && styles.activeDot
                ]}
              />
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.navButton, 
            styles.rightNavButton,
            currentIndex === journeys.length - 1 && styles.disabledNavButton
          ]}
          onPress={() => navigateJourney('next')}
          disabled={currentIndex === journeys.length - 1}
        >
          <MaterialIcons
            name="chevron-right"
            size={30}
            color={currentIndex === journeys.length - 1 ? '#ccc' : 'white'}
          />
        </TouchableOpacity>
      </View>

      {/* New Journey Selector Component */}
      <View style={styles.journeySelector}>
        {journeys.map((journey, index) => (
          <TouchableOpacity
            key={journey.id}
            style={[
              styles.journeyDot,
              currentIndex === index && styles.activeJourneyDot,
              journey.is_downloaded && styles.downloadedJourneyDot
            ]}
            onPress={() => {
              setCurrentIndex(index);
              // Call the onJourneyChange callback with the new journey
              if (onJourneyChange) {
                onJourneyChange(journey);
              }
            }}
          >
            {journey.is_downloaded && (
              <Ionicons 
                name="checkmark-circle" 
                size={12} 
                color="white" 
                style={styles.downloadedIcon} 
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: 120,
    height: 360,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 10,
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    width: 280,
    borderWidth: 3,
    borderColor: '#F7EAFF',
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8A4DFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  leftNavButton: {
    marginRight: 10,
  },
  rightNavButton: {
    marginLeft: 10,
  },
  disabledNavButton: {
    backgroundColor: '#E0E0E0',
    shadowOpacity: 0.1,
  },
  themeTag: {
    position: 'absolute',
    top: -20,
    left: 20,
    backgroundColor: '#F28C38',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  themeIcon: {
    marginRight: 5,
  },
  themeText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 13,
  },
  coverImage: {
    width: '100%',
    height: 130,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 4,
    borderColor: '#f0650e',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#4A4A4A',
    fontFamily: 'System',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  length: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  startButton: {
    backgroundColor: '#F28C38',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F28C38',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: '#95a5a6', // Grey color to indicate disabled state
    opacity: 0.7,
  },
  buttonText: {
    fontWeight: '800',
    color: 'white',
    marginLeft: 8,
    fontSize: 15,
  },
  downloadButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#8A4DFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadingButton: {
    backgroundColor: '#95a5a6',
    justifyContent: 'center',
  },
  downloadedButton: {
    backgroundColor: '#2ecc71',
  },
  downloadButtonText: {
    fontWeight: '700',
    color: 'white',
    marginLeft: 6,
    fontSize: 14,
  },
  progressBar: {
    marginHorizontal: 10,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#F28C38',
    width: 16,
    height: 8,
  },
  journeySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  journeyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#bdc3c7',
    margin: 4,
  },
  activeJourneyDot: {
    backgroundColor: '#3498db',
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  downloadedJourneyDot: {
    borderWidth: 2,
    borderColor: '#2ecc71',
  },
  downloadedIcon: {
    position: 'absolute',
    right: -6,
    top: -6,
  },
});

export default JourneyHeader;