import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getProfileFromId } from '../../utils/user-profile';
import DialoguePopup from '@/components/DialoguePopup';


export default function ChooseNickname() {
    const [showPopup, setShowPopup] = useState<boolean>(true);

    return (
        <SafeAreaView style={styles.container}>
            <NickName />
        </SafeAreaView>
    )
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFF", // Bright and kid-friendly background color
        padding: 16,
        zIndex: -10
    },
    logoContainer: {
        alignItems: 'center',
    },
    logo: {
        width: 180,
        height: 180,
        resizeMode: 'contain',
    },
    input: {
        width: "80%",
        height: 50,
        backgroundColor: "white",
        borderRadius: 32,
        paddingHorizontal: 15,
        color: "black",
        borderWidth: 1,
        marginBottom: 15,
        alignSelf: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 2,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
})

function NickName() {
    const [nickname, setNickname] = useState<string>("");
    const router = useRouter();
    const { user } = useLocalSearchParams();
    const userProfile = typeof user === 'string' ? user : user[0]
    const selectedImage = getProfileFromId(userProfile);
    return (
        <View>
            <View style={styles.logoContainer}>
                <Image style={styles.logo} source={selectedImage} />
            </View>
            <Text style={{ textAlign: 'center', fontSize: 32, fontWeight: 800, marginVertical: 20 }}>Create Your Nickname</Text>
            <TextInput
                style={styles.input}
                placeholder="Adventurer"
                placeholderTextColor="#999"
                value={nickname}
                onChangeText={(text) => setNickname(text)}
            />

            <View style={{ marginTop: 10, alignItems: 'center', margin: 'auto' }}>
                <TouchableOpacity
                    className="rounded-xl py-4 px-16 mb-20 items-center shadow-md bg-[#F28C38]"
                    disabled={nickname.length < 1}
                    onPress={() => router.push({ pathname: "/child-onboarding/guide", params: { user: userProfile, nickname } })}
                >
                    <Text className="text-white text-lg font-semibold">Next</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}
