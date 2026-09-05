import { FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView } from 'react-native'
import React, { useState, useRef, useEffect } from 'react'
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Checkbox, CheckboxGroup, CheckboxIcon, CheckboxIndicator } from '@/components/ui/checkbox';
import { CheckIcon } from '@/components/ui/icon';
import { getProfileFromId, animals } from '../../utils/user-profile';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChooseGuide() {
    const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
    const [selectedAnimal, setSelectedAnimal] = useState<string>("");
    const router = useRouter();

    useEffect(() => {
        (async () => {
            await Audio.requestPermissionsAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });
        })();
    }, []);


    const toggleSelection = (name: string) => {
        setSelectedAnimals([name]);
    };

    const soundRef = useRef<Audio.Sound | null>(null);

    const playAnimalSound = async (soundFile: any) => {
        // Unload any previous sound
        if (soundRef.current) {
            await soundRef.current.unloadAsync();
            soundRef.current = null;
        }

        const { sound } = await Audio.Sound.createAsync(soundFile);
        soundRef.current = sound;
        await sound.playAsync();

        //   sound.setOnPlaybackStatusUpdate((status) => {
        //     if ('isLoaded' in status && status.isLoaded) {
        //       if (status.didJustFinish) {
        //         sound.unloadAsync();
        //         soundRef.current = null;
        //       }
        //     } else {
        //       console.error('Playback error:', status);
        //     }
        //   });
    };

    const handleAnimalPress = async (animal: any) => {
        toggleSelection(animal.name);
        setSelectedAnimal(animal.name);
        await playAnimalSound(animal.sound);
    };

    const handleNavigateToHome = async () => {
        try {
            const preferences = {
                nickname,
                guide: user,
                avatar: selectedAnimal,
            };

            await AsyncStorage.setItem("wildTales-Preferences", JSON.stringify(preferences));
            router.push({ pathname: "/home", params: { guide: user, nickname } });
        } catch (error) {
            console.error("Failed to save preferences:", error);
        }
    };



    const { user, nickname } = useLocalSearchParams();
    const userProfile = typeof user === 'string' ? user : user[0]
    const selectedImage = getProfileFromId(userProfile);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                <View style={styles.logoContainer}>
                    <Image style={styles.logo} source={selectedImage} />
                </View>
                <Text style={{ textAlign: 'center', fontSize: 32, fontWeight: 800, marginVertical: 10 }}>
                    Hi, {nickname}! {'\n'} Select Your {"\n"} Guide Companion
                </Text>
                <Text style={{ textAlign: 'center', fontSize: 24, fontWeight: 600, color: 'gray' }}>
                    Click to hear voice
                </Text>
                <View style={{ backgroundColor: '#E9D5FF', borderRadius: 24, margin: 15 }}>
                    <CheckboxGroup value={selectedAnimals} onChange={setSelectedAnimals} style={styles.checkboxGroup}>
                        <FlatList
                            style={{ paddingVertical: 10 }}
                            data={animals}
                            numColumns={2}
                            columnWrapperStyle={styles.row}
                            keyExtractor={(item) => item.name}
                            renderItem={({ item }) => (
                                <View style={styles.itemContainer}>
                                    <TouchableOpacity onPress={() => handleAnimalPress(item)} style={styles.imageWrapper}>
                                        <Image source={item.source} style={styles.image} />
                                        {selectedAnimals.includes(item.name) && (
                                            <View style={styles.checkboxOverlay}>
                                                <Checkbox value={item.name} size="md">
                                                    <CheckboxIndicator>
                                                        <CheckboxIcon as={CheckIcon} />
                                                    </CheckboxIndicator>
                                                </Checkbox>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                    <Text style={styles.label}>{item.name}</Text>
                                </View>
                            )}
                        />
                    </CheckboxGroup>
                </View>
                <View style={{ marginTop: 10, alignItems: 'center', margin: 'auto', paddingBottom: 20 }}>
                    <TouchableOpacity
                        className="rounded-xl py-4 px-16 mb-20 items-center shadow-md bg-[#F28C38]"
                        onPress={handleNavigateToHome}
                    >
                        <Text className="text-white text-lg font-semibold">Next</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFF", // Bright and kid-friendly background color
        padding: 16,
        justifyContent: 'center'
    },
    row: {
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    imageWrapper: {
        position: 'relative',
        padding: 5
    },
    checkboxOverlay: {
        position: 'absolute',
        top: -5,
        right: -5,
        zIndex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
    },
    logoContainer: {
        alignItems: 'center',
    },
    logo: {
        width: 180,
        height: 180,
        resizeMode: 'contain',
    },
    image: {
        width: 100,
        height: 100,
        borderRadius: 100,
        marginBottom: 5,
    },
    itemContainer: {
        alignItems: 'center',
        width: '45%',
        marginBottom: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
    },
    checkboxGroup: {
        padding: 10,
    },
});