//TALES.TSX CODE ORIGINAL PAGE HAS BEEN COMMENTED OUT AND MOVED TO BOTTOM
import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { collection, query, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '@/FirebaseConfig';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { format } from 'date-fns';

// intefaces
interface Journey {
  id: string;
  name: string;
  description: string;
  cover_image_url: string;
  theme: string;
  length: string;
  is_complete: boolean;
  created_at: Date;
}

interface Milestone {
  id: string;
  name: string;
  description: string;
  visual_asset_url: string;
  latitude: number;
  longitude: number;
  visited_at: Date | null;
  is_complete: boolean;
  journey_id_string: string;
  order_in_journey: number;
  puzzle_piece_collected: boolean;
}

interface AdventureEntry {
  journey: Journey;
  milestones: Milestone[];
  completedCount: number;
  totalCount: number;
  lastVisited: Date | null;
}

export default function AdventureLogScreen() {
  const [adventures, setAdventures] = useState<AdventureEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const windowWidth = Dimensions.get('window').width;

  useEffect(() => {
    const fetchAdventureData = async () => {
      try {
        setLoading(true);
        
        const journeysQuery = query(collection(db, "journeys"), orderBy("created_at", "desc"), limit(10));
        const journeySnapshot = await getDocs(journeysQuery);
        
        //get journey's respective milestones into arr
        const adventureEntries: AdventureEntry[] = [];
        
        for (const journeyDoc of journeySnapshot.docs) {
          const journeyData = journeyDoc.data();
          
          // Create the journey object
          const journey: Journey = {
            id: journeyDoc.id,
            name: journeyData.name || "Unnamed Journey",
            description: journeyData.description || "",
            cover_image_url: journeyData.cover_image_url || "",
            theme: journeyData.theme || "",
            length: journeyData.length || "Unknown",
            is_complete: journeyData.is_complete || false,
            created_at: journeyData.created_at?.toDate() || new Date(),
          };
          
          //fetch milestone for this joureny
          const milestonesQuery = query(
            collection(db, "milestones"), 
            // where("journey_id_string", "==", journeyDoc.id),
            orderBy("order_in_journey")
          );
          
          const milestonesSnapshot = await getDocs(milestonesQuery);
          
          // Filter milestone down
          const milestones = milestonesSnapshot.docs
            .filter(doc => doc.data().journey_id_string === journeyDoc.id)
            .map(doc => {
              const data = doc.data();
              
              // console.log(`Milestone ${doc.id} - Image URL:`, data.visual_asset_url);
              
              return {
                id: doc.id,
                name: data.name || "Unnamed Milestone",
                description: data.description || "",
                visual_asset_url: data.visual_asset_url || "",
                latitude: data.latitude || 0,
                longitude: data.longitude || 0,
                visited_at: data.visited_at?.toDate() || null,
                is_complete: data.is_complete || false,
                journey_id_string: data.journey_id_string,
                order_in_journey: data.order_in_journey || 0,
                puzzle_piece_collected: data.puzzle_piece_collected || false
              };
            });
          
          // Calculate completion statistics
          const completedCount = milestones.filter(m => m.is_complete).length;
          
          // Find the most recently visited milestone
          let lastVisited: Date | null = null;
          milestones.forEach(m => {
            if (m.visited_at && (!lastVisited || m.visited_at > lastVisited)) {
              lastVisited = m.visited_at;
            }
          });
          
          adventureEntries.push({
            journey,
            milestones,
            completedCount,
            totalCount: milestones.length,
            lastVisited
          });
        }
        
        setAdventures(adventureEntries);
      } catch (err: any) {
        console.error("Error fetching adventure data:", err);
        setError("Could not load your adventures. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchAdventureData();
  }, []);

  const formatDate = (date: Date | null) => {
    if (!date) return "Not started yet";
    return format(date, "EEEE, MMM d");
  };
  
  // Function to calculate progress
  const calculateProgress = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };
  

  
  return (
    <SafeAreaView className="flex-1 bg-amber-50">
      <StatusBar style="dark" />
      
      <View className="flex-row items-center justify-between px-4 py-3 bg-amber-100 shadow-sm">
        {/* <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back-circle" size={36} color="#8A4DFF" />
        </TouchableOpacity> */}
        
        <View className="flex-row items-center">
          <Text className="text-3xl font-bold text-purple-900">My Adventures</Text>
        </View>
        
        <View className="w-10" />
      </View>
      
      {/* Main content */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#8A4DFF" />
          <Text className="mt-3 text-purple-700">Loading adventures...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="alert-circle" size={60} color="#FF6B6B" />
          <Text className="mt-4 text-lg text-center text-gray-700">{error}</Text>
        </View>
      ) : adventures.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <Image 
            source={require("@/assets/images/guidebird-wave.png")} 
            className="w-40 h-40 mb-4"
            resizeMode="contain"
          />
          <Text className="text-xl font-bold text-center text-purple-800 mb-2">
            No Adventures Yet!
          </Text>
          <Text className="text-base text-center text-gray-600 mb-6">
            Your adventures will appear here once you start exploring! Go find some cool places to discover.
          </Text>
          <TouchableOpacity 
            className="bg-green-500 px-6 py-3 rounded-full flex-row items-center"
            onPress={() => router.push("/(tabs)/home")}
          >
            <Ionicons name="eye" size={20} color="white" className="mr-2" />
            <Text className="text-white font-bold">View More</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView className="flex-1 px-3 pt-6">
          {adventures.map((adventure, index) => {
            const progressPercent = calculateProgress(adventure.completedCount, adventure.totalCount);
            //console.log(`Adventure: ${adventure.journey.name}, Completed: ${adventure.completedCount}, Total: ${adventure.totalCount}, Progress %: ${progressPercent}`);
            
            return (
              <TouchableOpacity 
                key={adventure.journey.id}
                className="mb-10"
                onPress={() => {
                  // Navigate to the journey gallery with the journey ID
                  router.push({
                    pathname: "/journey-gallery",
                    params: { 
                      journeyId: adventure.journey.id,
                      journeyName: adventure.journey.name
                    }
                  });
                }}
                activeOpacity={0.8}
              >
                <View className="relative">
                  <View 
                    className={`bg-white rounded-3xl overflow-hidden shadow-md border-2 ${
                      index % 3 === 0 ? 'border-blue-200' : 
                      index % 3 === 1 ? 'border-yellow-200' : 
                      'border-green-200'
                    }`}
                    style={{
                      transform: [{ rotate: (index % 2 === 0 ? 1.5 : -1.6) + 'deg' }]
                    }}
                  >
                    <View className="relative">
                      <Image
                        source={adventure.journey.cover_image_url ? { uri: adventure.journey.cover_image_url } : require('@/assets/images/Untitled picture.png')}
                        style={{ height: windowWidth * 0.55 }} 
                        className="w-full"
                        resizeMode="cover"
                        defaultSource={require('@/assets/images/Untitled picture.png')}
                      />
                      
                      <View className="absolute bottom-0 left-0 right-0">
                        <View 
                          className="h-5 bg-white rounded-t-3xl"
                          style={{ transform: [{ scaleX: 1.1 }] }}
                        />
                      </View>
                    </View>
                    
                    <View className="p-6 pt-3"> 
                      <Text className="text-3xl font-bold text-gray-800 mb-3 text-center"> 
                        {adventure.journey.name}
                      </Text>
                      
                      <View className="flex-row justify-center mb-5"> 
                        <View className="bg-purple-100 rounded-full px-4 py-2 mr-3 flex-row items-center"> 
                          <Ionicons name="compass" size={16} color="#8b5cf6" />
                          <Text className="text-base font-medium text-purple-800 ml-1"> 
                            {adventure.journey.theme}
                          </Text>
                        </View>
                        <View className="bg-orange-100 rounded-full px-4 py-2 flex-row items-center">
                          <Ionicons name="footsteps" size={16} color="#f97316" />
                          <Text className="text-base font-medium text-orange-800 ml-1"> 
                            {adventure.journey.length}
                          </Text>
                        </View>
                      </View>
                      
                      <View className="mt-2 mb-5">
                        <View className="flex-row justify-between items-center mb-3">
                          <View className="flex-row items-center">
                            <Ionicons name="sparkles" size={20} color="#b89c06" />
                            <Text className="text-xl font-medium text-purple-800 ml-2">
                              Your Adventure Progress
                            </Text>
                          </View>
                          <View className="bg-purple-100 px-3 py-1.5 rounded-full">
                            <Text className="text-sm font-bold text-gray-800">
                              {adventure.completedCount}/{adventure.totalCount}
                            </Text>
                          </View>
                        </View>

                        {/* Progress Bar Background */}
                        <View className="h-5 bg-gray-200 rounded-full overflow-hidden p-1">
                          <View
                            style={{
                              width: `${progressPercent}%`, 
                              height: '100%',            
                              backgroundColor: '#8B5CF6', 
                              borderRadius: 999,
                            }}
                          />
                        </View>
                      </View>
                      
                      <TouchableOpacity 
                        className="mt-3 bg-purple-600 py-3 rounded-xl flex-row items-center justify-center"
                        onPress={(e) => {
                          e.stopPropagation();
                          
                          router.push({
                            pathname: "/journey-gallery",
                            params: { 
                              journeyId: adventure.journey.id,
                              journeyName: adventure.journey.name
                            }
                          });
                        }}
                      >
                        <Ionicons name="images" size={20} color="#fff" />
                        <Text className="text-white font-bold text-lg ml-2">View Photos!</Text> 
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}


// import { Button, ButtonText } from "@/components/ui/button";
// import { HStack } from "@/components/ui/hstack";
// import { Pressable } from "@/components/ui/pressable";
// import { useToast, Toast, ToastTitle, ToastDescription } from "@/components/ui/toast";
// import { VStack } from "@/components/ui/vstack";
// import { Icon, CloseIcon, HelpCircleIcon } from "@/components/ui/icon";
// import React from "react";
// import { router } from "expo-router";
// import { SafeAreaView } from "react-native-safe-area-context";
	
// export default function Tales() {
//           const toast = useToast();
//           const [toastId, setToastId] = React.useState<string>("");
//           const handleToast = () => {
//             if (!toast.isActive(toastId)) {
//               showNewToast();
//             }
//           };
//           const showNewToast = () => {
//             const newId = Math.random().toString();
//             setToastId(newId);
//             toast.show({
//               id: newId,
//               placement: 'top',
//               duration: 3000,
//               render: ({ id }) => {
//                 const uniqueToastId = "toast-" + id;
//                 return (
//                   <Toast
//                     action="error"
//                     variant="outline"
//                     nativeID={uniqueToastId}
//                     className="p-4 gap-6 border-error-500 w-full shadow-hard-5 max-w-[443px] flex-row justify-between"
//                   >
//                     <HStack space="md">
//                       <Icon
//                         as={HelpCircleIcon}
//                         className="stroke-error-500 mt-0.5"
//                       />
//                       <VStack space="xs">
//                         <ToastTitle className="font-semibold text-error-500">Error!</ToastTitle>
//                         <ToastDescription size="sm">
//                           Something went wrong.
//                         </ToastDescription>
//                       </VStack>
//                     </HStack>
//                     <HStack className="min-[450px]:gap-3 gap-1">
//                       <Button variant="link" size="sm" className="px-3.5 self-center">
//                         <ButtonText>Retry</ButtonText>
//                       </Button>
//                       <Pressable onPress={() => toast.close(id)}>
//                         <Icon as={CloseIcon} />
//                       </Pressable>
//                     </HStack>
//                   </Toast>
//                 );
//               },
//             });
//           };
//           return (
//             <SafeAreaView>
//             <Button className = 'mt-[100px]'onPress={handleToast}>
//               <ButtonText>Press Me</ButtonText>
//             </Button>

//               {/* Temporary Button to Navigate to Milestone Details */}
//               <Button onPress={() => router.push("/milestone-details")}>
//                 <ButtonText>Go to Milestone Details</ButtonText>
//               </Button>

//               {/* Temporary Button to Navigate to photo task*/}
//               <Button onPress={() => router.push("/photo-task")}>
//                 <ButtonText>Go to photo task</ButtonText>
//               </Button>

//               {/* Temporary Button to Navigate to adventure log*/}
//               <Button onPress={() => router.push("/adventure-log")}>
//                 <ButtonText>Go to adventure-log</ButtonText>
//               </Button>

//               {/* Temporary Button to Navigate to artwork gallery*/}
//               <Button onPress={() => router.push("/artwork-gallery")}>
//                 <ButtonText>Go to artwork-gallery</ButtonText>
//               </Button>

//               </SafeAreaView>
//           );
//         }