import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from 'expo-router';
import { Checkbox, CheckboxGroup, CheckboxIcon, CheckboxIndicator } from '@/components/ui/checkbox';
import { CheckIcon } from '@/components/ui/icon';
import { getProfileFromId, profile } from '../../utils/user-profile';

export default function SelectProfile() {
    const [selected, setSelected] = useState<string>('profile1');
    const router = useRouter();

    const handleSelect = (id: string) => {
        setSelected(id); // Only one selected at a time
    };

    const selectedImage = getProfileFromId(selected);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                <View style={styles.logoContainer}>
                    <Image style={styles.logo} source={selectedImage} />
                </View>
                <Text style={{ textAlign: 'center', fontSize: 32, fontWeight: '800', marginVertical: 10 }}>Select Your Profile</Text>

                <View style={{ backgroundColor: '#E9D5FF', borderRadius: 24, margin:15 }}>
                    <CheckboxGroup value={[selected]} onChange={() => { }} style={styles.checkboxGroup}>
                        <FlatList
                            style={{ paddingTop: 20 }}
                            data={profile}
                            numColumns={2}
                            columnWrapperStyle={styles.row}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <View style={styles.itemContainer}>
                                    <TouchableOpacity onPress={() => handleSelect(item.id)} style={styles.imageWrapper}>
                                        <Image source={item.source} style={styles.image} />
                                        {selected === item.id && (
                                            <View style={styles.checkboxOverlay}>
                                                <Checkbox value={item.id} size="md">
                                                    <CheckboxIndicator>
                                                        <CheckboxIcon as={CheckIcon} />
                                                    </CheckboxIndicator>
                                                </Checkbox>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}
                        />
                    </CheckboxGroup>
                </View>

                <View style={{ marginTop: 10, alignItems: 'center', paddingTop:30 }}>
                    <TouchableOpacity
                        className="rounded-xl py-4 px-16 items-center shadow-md bg-[#F28C38]"
                        onPress={() => router.push({ pathname: "/child-onboarding/nickname", params: { user: selected } })}
                    >
                        <Text className="text-white text-lg font-semibold">Next</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFF",
        padding: 16,
        height:'100%'
    },
    logoContainer: {
        marginTop: 30,
        alignItems: 'center',
    },
    logo: {
        width: 180,
        height: 180,
        resizeMode: 'contain',
    },
    image: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    checkboxGroup: {
        position: 'relative',
    },
    checkboxOverlay: {
        position: 'absolute',
        top: -5,
        right: -5,
        zIndex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
    },
    itemContainer: {
        alignItems: 'center',
        width: '45%',
        marginBottom: 10,
    },
    row: {
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    imageWrapper: {
        position: 'relative',
        padding:5
    },
});
