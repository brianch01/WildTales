import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, Pressable, SafeAreaView, Dimensions, View } from 'react-native';
import { Box, VStack, HStack, Text, Progress, Center, Image } from "@gluestack-ui/themed";
import { GluestackUIProvider } from "@gluestack-ui/themed";
import { config } from "@gluestack-ui/config";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/FirebaseConfig";
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const windowWidth = Dimensions.get('window').width;

// Animal emoji images
const animalEmojis = [
//   require("@/assets/images/achivementsList-animal1.png"),
  require("@/assets/images/achivementsList-animal2.png"),
//   require("@/assets/images/achivementsList-animal3.png"),
  require("@/assets/images/achivementsList-animal4.png")
];

// Achievement colors based on type/category
const achievementColors = {
  default: {
    bg: "#FFF8E1",
    icon: "#8A4DFF",
    progress: "#8A4DFF"
  },
  wildlife: {
    bg: "#E8F5E9",
    icon: "#43A047",
    progress: "#43A047"
  },
  landmark: {
    bg: "#E3F2FD",
    icon: "#1976D2",
    progress: "#1976D2"
  },
  botanical: {
    bg: "#F3E5F5",
    icon: "#8E24AA",
    progress: "#8E24AA"
  }
};

interface Achievement {
  name: string;
  description: string;
  currentProgress: number;
  targetValue: number;
  ioniconName: string;
  order: number;
  type: string;
}

export default function VAchieveScreen() {
    const router = useRouter();
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [overallProgress, setOverallProgress] = useState(0);

    useEffect(() => {
        const fetchAchievements = async () => {
            try {
                const achievementsCollection = collection(db, "achievements");
                const achievementsSnapshot = await getDocs(achievementsCollection);
                
                const achievementsData: Achievement[] = [];
                achievementsSnapshot.forEach((doc) => {
                    const data = doc.data() as Achievement;
                    achievementsData.push(data);
                });
                
                achievementsData.sort((a, b) => a.order - b.order);
                setAchievements(achievementsData);
                
                // calculates overall progress by averaging the progress of all achievements
                const totalProgress = achievementsData.reduce((total, achievement) => {
                    if (achievement.type === "boolean") {
                        return total + (achievement.currentProgress > 0 ? 100 : 0);
                    } else {
                        return total + (achievement.currentProgress / achievement.targetValue) * 100;
                    }
                }, 0);
                
                const overallPercentage = Math.round(totalProgress / achievementsData.length);
                setOverallProgress(overallPercentage);
                
                setLoading(false);
            } catch (error) {
                console.error("Error fetching achievements:", error);
                setLoading(false);
            }
        };
        
        fetchAchievements();
    }, []);

    // Helper function to determine achievement color scheme
    // lowkey dont need
    const getAchievementColor = (item: Achievement) => {
        if (item.name.toLowerCase().includes('wildlife') || 
            item.description.toLowerCase().includes('animal') || 
            item.ioniconName.includes('paw')) {
            return achievementColors.wildlife;
        } else if (item.name.toLowerCase().includes('botanical') || 
                  item.description.toLowerCase().includes('plant') || 
                  item.ioniconName.includes('leaf')) {
            return achievementColors.botanical;
        } else if (item.name.toLowerCase().includes('landmark') || 
                  item.description.toLowerCase().includes('place') || 
                  item.ioniconName.includes('location')) {
            return achievementColors.landmark;
        }
        return achievementColors.default;
    };

    return (
        <GluestackUIProvider config={config}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView style={styles.scrollView}>
                    <Box style={styles.container}>
                        <Pressable 
                            onPress={() => router.back()} 
                            style={styles.backButton}
                        >
                            <Ionicons name="arrow-back-circle" size={50} color="#8A4DFF" />
                        </Pressable>

                        <Text style={styles.title}>
                            Your Achievements
                        </Text>
                        <Text style={styles.subtitle}>
                            Embark on more Journeys to{"\n"}earn rewards and achievements!
                        </Text>

                        {/* Progress bar */}
                        <Box style={styles.progressContainer}>
                            <Box style={[styles.progressFill, { width: `${overallProgress}%` }]} />
                            <Box style={styles.progressLabel}>
                                <Text style={styles.progressText}>{overallProgress}%</Text>
                            </Box>
                        </Box>

                        {/* Animal emoji images are now positioned absolutely */}
                        <View style={styles.animalEmojiContainer}>
                            {animalEmojis.map((src, idx) => (
                                <Image
                                    key={idx}
                                    source={src}
                                    alt={`animal-${idx}`}
                                    resizeMode="contain"
                                    style={[
                                        styles.animalEmoji,
                                        {
                                            // Distribute horizontally
                                            left: (idx * (windowWidth - 40) / animalEmojis.length) + 
                                                  (((windowWidth - 40) / animalEmojis.length) - 85) / 2
                                        }
                                    ]}
                                />
                            ))}
                        </View>

                        {/* Achievement list */}
                        {loading ? (
                            <Center style={styles.loadingContainer}>
                                <Text style={styles.loadingText}>Loading achievements...</Text>
                            </Center>
                        ) : (
                            <VStack style={styles.achievementsList}>
                                {achievements.map((item, idx) => {
                                    const colorScheme = getAchievementColor(item);
                                    const progressPercent = item.type === "boolean" 
                                        ? (item.currentProgress > 0 ? 100 : 0) 
                                        : (item.currentProgress / item.targetValue) * 100;
                                    
                                    return (
                                        <Box
                                            key={idx}
                                            style={[styles.achievementCard, { backgroundColor: colorScheme.bg }]}
                                        >
                                            <Box style={styles.iconContainer}>
                                                {/* why tf this erroring */}
                                                <Ionicons name={item.ioniconName} size={36} color={colorScheme.icon} />
                                            </Box>
                                            <Box style={styles.achievementContent}>
                                                <Text style={styles.achievementTitle}>{item.name}</Text>
                                                <Text style={styles.achievementDescription}>{item.description}</Text>
                                                <HStack style={styles.progressBarContainer}>
                                                    <Box style={styles.progressBarBackground}>
                                                        <Box 
                                                            style={[
                                                                styles.progressBarFill, 
                                                                { 
                                                                    width: `${progressPercent}%`,
                                                                    backgroundColor: colorScheme.progress
                                                                }
                                                            ]} 
                                                        />
                                                    </Box>
                                                    <Text style={styles.progressIndicator}>
                                                        {item.type === "boolean" 
                                                            ? (item.currentProgress > 0 ? "1/1" : "0/1")
                                                            : `${item.currentProgress}/${item.targetValue}`}
                                                    </Text>
                                                </HStack>
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </VStack>
                        )}
                    </Box>
                </ScrollView>
            </SafeAreaView>
        </GluestackUIProvider>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollView: {
        flex: 1,
    },
    container: {
        padding: 20,
        paddingTop: 60,
        paddingBottom: 80,
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        left: 20,
        top: 40,
        zIndex: 10,
    },
    title: {
        fontSize: 38, 
        fontWeight: 'bold',
        marginTop: 48,
        lineHeight: 44,
    },
    subtitle: {
        fontSize: 24, 
        color: '#777777',
        marginTop: 12,
        marginBottom: 34,
    },
    progressContainer: {
        height: 50,
        backgroundColor: '#FFF3E0',
        borderRadius: 25,
        position: 'relative',
        justifyContent: 'center',
        marginBottom: 50,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    progressFill: {
        position: 'absolute',
        height: '100%',
        left: 0,
        backgroundColor: '#FFA726',
        borderRadius: 25,
    },
    progressLabel: {
        position: 'absolute',
        left: 15,
        backgroundColor: '#FF9800',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 15,
    },
    progressText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
    },
    animalEmojiContainer: {
        position: 'relative', 
        height: 0, 
        marginTop: 80,
        marginBottom: -15,
    },
    animalEmoji: {
        width: 120, 
        height: 120, 
        position: 'absolute', 
        bottom: -11, 
    },

    achievementsList: {
        marginTop: 0,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        height: 200,
    },
    loadingText: {
        fontSize: 18,
        color: '#777777',
    },
    achievementCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    iconContainer: {
        marginRight: 16,
        backgroundColor: 'white',
        borderRadius: 50,
        width: 70, 
        height: 70, 
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    achievementContent: {
        flex: 1,
    },
    achievementTitle: {
        fontSize: 20, 
        fontWeight: 'bold',
        marginBottom: 4,
    },
    achievementDescription: {
        fontSize: 15, 
        color: '#606060',
        marginBottom: 12,
    },
    progressBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressBarBackground: {
        flex: 1,
        height: 15, 
        backgroundColor: '#ffffff',
        borderRadius: 6,
        borderColor: '#E0E0E0',
        borderWidth: 2,
        marginRight: 10,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 6,
    },
    progressIndicator: {
        fontSize: 16,
        fontWeight: 'bold',
        width: 50,
        textAlign: 'right',
    },
});