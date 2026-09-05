import React, { useState, useEffect } from 'react';
import {
  GluestackUIProvider,
  Box,
  VStack,
  HStack,
  Heading,
  Button,
  ButtonText,
  Image,
  Spinner,
  Text,
  Avatar,
  AvatarFallbackText,
} from '@gluestack-ui/themed';
import { router } from 'expo-router';
import { config } from '@gluestack-ui/config';
import OverlayMenu from '../../components/ExploreScreenOverlay';
import { auth, db } from '../../FirebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Dimensions, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';

const { width } = Dimensions.get('window');

export default function ParentDashboard() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  interface UserPreferences {
    notifications: boolean;
    theme: string;
  }

  interface UserDocument {
    uid: string;
    Parent_name: string;
    email: string | null;
    createdAt: string;
    updatedAt: string;
    preferences: UserPreferences;
  }

  interface FirebaseUser {
    uid: string;
    displayName?: string | null;
    email?: string | null;
  }

  const ensureUserDocumentExists = async (user: FirebaseUser | null): Promise<void> => {
    if (!user) return;
    
    try {
      const userDoc = await getDoc(doc(db, "user", user.uid));
      
      if (!userDoc.exists()) {
        const newUserDoc: UserDocument = {
          uid: user.uid,
          Parent_name: user.displayName || "Parent",
          email: user.email ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          preferences: {
            notifications: false,
            theme: "Forest"
          }
        };
        await setDoc(doc(db, "user", user.uid), newUserDoc);
        console.log("Created missing user document for:", user.uid);
      }
    } catch (error) {
      console.error("Error ensuring user document exists:", error);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        
        if (currentUser) {
          await ensureUserDocumentExists(currentUser);
          
          const userDoc = await getDoc(doc(db, "user", currentUser.uid));
          
          if (userDoc.exists() && userDoc.data().Parent_name) {
            setUserName(userDoc.data().Parent_name);
          } else if (currentUser.displayName) {
            setUserName(currentUser.displayName);
          } else {
            setUserName('Parent');
          }
        } else {
          setUserName('Parent');
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUserName('Parent');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log('User signed out successfully');
      // Navigate back to the root index screen
      router.replace('/'); // This will take you to app/index.tsx
    } catch (error) {
      console.error('Error signing out:', error);
      // You might want to show an error message to the user
    }
  };

  const handleShowOverlay = (toggle: boolean) => {
    setShowOverlay(toggle)
  }

  const handlePress = (action: string) => {
    if (action === 'Add Action') {
      setShowOverlay(true);
    }
  };

  return (
    <GluestackUIProvider config={config}>
      <ScrollView style={{ flex: 1, backgroundColor: '#f8f5ff' }}>
        <Box 
          bg="$purple700" 
          style={{
            paddingTop: 60,
            paddingBottom: 30,
            paddingHorizontal: 20,
            borderBottomLeftRadius: 30,
            borderBottomRightRadius: 30,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <Box 
            position="absolute" 
            top={0} 
            left={0} 
            width="100%" 
            height="100%" 
            bg="$purple900" 
            opacity={0.3}
            style={{
              transform: [{ skewX: '-30deg' }],
              left: -width/2,
              width: width * 1.5
            }}
          />
          
          <Box 
            position="absolute" 
            top={0} 
            right={0} 
            width={width/2} 
            height="100%" 
            bg="$orange500" 
            opacity={0.2}
            style={{
              transform: [{ skewX: '45deg' }],
              right: -width/4
            }}
          />
          
          <Box 
            position="absolute" 
            top={30} 
            right={30} 
            width={50} 
            height={50} 
            borderRadius={25} 
            bg="rgba(255,255,255,0.1)" 
          />
          
          <Box 
            position="absolute" 
            bottom={50} 
            left={20} 
            width={30} 
            height={30} 
            borderRadius={15} 
            bg="rgba(255,255,255,0.15)" 
          />
          
          <HStack space="md" alignItems="center" mb="$4">
            <Avatar 
              size="lg" 
              borderWidth={3} 
              borderColor="$white"
              bg="$orange300"
            >
              <AvatarFallbackText>{userName.charAt(0)}</AvatarFallbackText>
            </Avatar>
            
            {loading ? (
              <VStack>
                <HStack space="sm" alignItems="center">
                  <Heading color="$white" size="xl">Hi </Heading>
                  <Spinner color="$white" size="small" />
                </HStack>
              </VStack>
            ) : (
              <VStack>
                <Text color="$white" fontSize="$sm">Parent Dashboard</Text>
                <Heading color="$white" size="xl">Hi {userName}!</Heading>
              </VStack>
            )}
          </HStack>
          
          <Box 
            bg="$white" 
            p="$3" 
            borderRadius="$xl" 
            shadowColor="$purple900"
            shadowOpacity={0.2}
            shadowRadius={10}
            elevation={5}
          >
            <Image
              source={require('../../assets/images/logowild.png')}
              alt="WildTales Logo"
              style={{ width: width - 70, height: 70, resizeMode: 'contain' }}
            />
          </Box>
        </Box>
        
        <Box p="$5">
          <Heading
            size="md" 
            mb="$3" 
            color="$purple800"
            style={{ fontWeight: 'bold' }}
          >
            Adventure Options
          </Heading>
          
          <Box 
            bg="$purple100" 
            borderRadius="$xl" 
            p="$3"
            mb="$4"
            shadowColor="$purple900"
            shadowOpacity={0.1}
            shadowRadius={5}
            elevation={3}
            borderWidth={1}
            borderColor="rgba(138, 77, 255, 0.15)"
            style={{ minHeight: 170 }} // Reduced height since buttons are more compact
          >
            <VStack gap="$5">
              <Button
                width="100%"
                size="xl"
                bg="$orange200"
                borderRadius="$lg"
                onPress={() => router.push('/artwork-gallery')}
                p="$2"
                style={{
                  shadowColor: "#FF8C42",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.2,
                  shadowRadius: 3,
                  elevation: 3,
                  height: 60 // Reduced height
                }}
              >
                <HStack alignItems="center" space="md"> 
                  <Ionicons name="images-outline" size={32} color="#black" />
                  <ButtonText 
                    color="$black" 
                    fontWeight="$bold"
                    style={{ fontSize: 18 }}
                  >
                    Collected Artworks
                  </ButtonText>
                </HStack>
              </Button>
              
              <Button
                width="100%"
                size="xl"
                bg="$orange500"
                borderRadius="$lg"
                onPress={() => router.push('/achievements')}
                p="$2"
                style={{
                  shadowColor: "#FF6B42",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.2,
                  shadowRadius: 3,
                  elevation: 3,
                  height: 60 // Reduced height
                }}
              >
                <HStack alignItems="center" space="md"> 
                  <Ionicons name="trophy-outline" size={32} color="white" />
                  <ButtonText 
                    color="$white" 
                    fontWeight="$bold"
                    style={{ fontSize: 18 }}
                  >
                    Achievements
                  </ButtonText>
                </HStack>
              </Button>
            </VStack>
          </Box>

          <Heading 
            size="md" 
            mb="$3" 
            color="$purple800"
            style={{ fontWeight: 'bold' }}
          >
            Settings
          </Heading>
          
          <Box 
            bg="$white" 
            borderRadius="$xl" 
            p="$5" 
            mb="$6"
            shadowColor="$purple900"
            shadowOpacity={0.1}
            shadowRadius={5}
            elevation={2}
            borderWidth={1}
            borderColor="rgba(138, 77, 255, 0.1)"
          >
            <VStack space="md">
              <Button
                size="lg"
                bg="$purple500"
                borderRadius="$lg"
                onPress={() => router.push('./pin/set')}
                style={{
                  shadowColor: "#5D3FD3",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 3,
                  elevation: 2
                }}
              >
                <HStack alignItems="center" space="md">
                  <Ionicons name="lock-closed-outline" size={22} color="white" />
                  <ButtonText color="$white" fontWeight="$bold">
                    Change Parental PIN
                  </ButtonText>
                </HStack>
              </Button>

              <View style={{ 
                height: 1, 
                backgroundColor: 'rgba(138, 77, 255, 0.1)', 
                marginVertical: 5 
              }} />

              <Button
                size="lg"
                bg="$red500"
                borderRadius="$lg"
                onPress={handleSignOut}
                style={{
                  shadowColor: "#FF4444",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 3,
                  elevation: 2
                }}
              >
                <HStack alignItems="center" space="md">
                  <Ionicons name="log-out-outline" size={22} color="white" />
                  <ButtonText color="$white" fontWeight="$bold">
                    Sign out
                  </ButtonText>
                </HStack>
              </Button>
            </VStack>
          </Box>
        </Box>

        {showOverlay && <OverlayMenu handleUnmountComponent={handleShowOverlay} />}
      </ScrollView>
    </GluestackUIProvider>
  );
}