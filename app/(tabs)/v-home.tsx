import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Animated } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

// Reuse the map style from home.tsx
const mapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#f5f5f5"
      }
    ]
  },
  {
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  // ... (keeping same map style as home.tsx)
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  }
];

export default function VHome() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const mapRef = useRef<MapView>(null);
  const router = useRouter();
  
  // Animation values for menu items
  const menuScaleAnim = useRef(new Animated.Value(0)).current;
  const menuOpacityAnim = useRef(new Animated.Value(0)).current;

  // Toggle menu visibility
  const toggleMenu = () => {
    if (menuVisible) {
      // Close menu animation
      Animated.parallel([
        Animated.timing(menuScaleAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(menuOpacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setMenuVisible(false);
      });
    } else {
      setMenuVisible(true);
      // Open menu animation
      Animated.parallel([
        Animated.timing(menuScaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(menuOpacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
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
          if (mapRef.current && currentLocation) {
            mapRef.current.animateCamera({
              center: {
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
              },
              heading: currentLocation.coords.heading || 0,
              pitch: 30,
            }, { duration: 2000 });
          }
        }
      );
    })();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  if (errorMsg) {
    return (
      <View style={styles.container}>
        <Text style={{ color: 'red' }}>{errorMsg}</Text>
      </View>
    );
  }

  const initialRegion = location ? {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : undefined;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Hi Adventurer User!</Text>
      </View>

      {/* Map View */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation
          showsBuildings={false}
          showsCompass={false}
          showsPointsOfInterest={false}
          showsScale={false}
          customMapStyle={mapStyle}
        >
          {location && (
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
            >
              <View style={styles.userMarker} />
            </Marker>
          )}
        </MapView>
      </View>

      {/* Bottom Action Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={styles.startButton}
          onPress={() => router.push('/home')}
        >
          <Text style={styles.buttonText}>Start Exploring!</Text>
        </TouchableOpacity>
      </View>

      {/* Menu Items */}
      {menuVisible && (
        <View style={styles.menuOverlay}>
          {/* Compass icon - top */}
          <Animated.View 
            style={[
              styles.menuItem, 
              styles.topMenuItem,
              {
                opacity: menuOpacityAnim,
                transform: [{ scale: menuScaleAnim }]
              }
            ]}
          >
            <TouchableOpacity style={styles.menuButton}>
              <Text style={styles.menuIconText}>⟳</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Book icon - left */}
          <Animated.View 
            style={[
              styles.menuItem, 
              styles.leftMenuItem,
              {
                opacity: menuOpacityAnim,
                transform: [{ scale: menuScaleAnim }]
              }
            ]}
          >
            <TouchableOpacity style={[styles.menuButton, styles.bookButton]}>
              <Text style={styles.menuIconText}>▭</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* User icon - right */}
          <Animated.View 
            style={[
              styles.menuItem, 
              styles.rightMenuItem,
              {
                opacity: menuOpacityAnim,
                transform: [{ scale: menuScaleAnim }]
              }
            ]}
          >
            <TouchableOpacity style={styles.menuButton}>
              <Text style={styles.menuIconText}>👤</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Close icon - bottom */}
          <Animated.View 
            style={[
              styles.menuItem, 
              styles.bottomMenuItem,
              {
                opacity: menuOpacityAnim,
                transform: [{ scale: menuScaleAnim }]
              }
            ]}
          >
            <TouchableOpacity 
              style={[styles.menuButton, styles.closeButton]} 
              onPress={toggleMenu}
            >
              <Text style={[styles.menuIconText, styles.closeIconText]}>✕</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* Floating Action Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={toggleMenu}>
          <Text style={styles.fabIcon}>{menuVisible ? "×" : "+"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    backgroundColor: '#f28c38', // Changed back to brighter orange
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  headerText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  userMarker: {
    height: 20,
    width: 20,
    backgroundColor: '#b25eff', // Purple color from your image
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'white',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 160,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#f28c38', // Changed back to brighter orange
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 50,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    zIndex: 10,
  },
  fab: {
    backgroundColor: '#b25eff', // Purple color from your image
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    zIndex: 10,
  },
  fabIcon: {
    fontSize: 32,
    color: 'white',
    fontWeight: 'bold',
  },
  menuOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  menuItem: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topMenuItem: {
    bottom: 160,
    alignSelf: 'center',
  },
  leftMenuItem: {
    bottom: 90,
    right: '55%',
  },
  rightMenuItem: {
    bottom: 90,
    left: '55%',
  },
  bottomMenuItem: {
    top: '65%',
    alignSelf: 'center',
  },
  menuButton: {
    backgroundColor: '#b25eff', // Purple for most menu items
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  bookButton: {
    backgroundColor: '#e8e1f9', // Light purple for book icon
  },
  closeButton: {
    backgroundColor: '#f28c38', // Orange for close button
  },
  menuIconText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  closeIconText: {
    fontSize: 24,
  }
});