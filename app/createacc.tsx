import { Text, StyleSheet, TextInput, TouchableOpacity, Image, View, Alert, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useState } from "react";
import { auth, db } from "@/FirebaseConfig";
import { router } from "expo-router";
import { doc, setDoc } from "firebase/firestore";

export default function CreateAccount() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [Parentname, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const signUp = async () => {
    if (isLoading) return;

    // Validate inputs
    if (!email || !password || !confirmPassword || !Parentname) {
      setErrorMessage("All fields are required.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setErrorMessage(""); // Clear any previous error
    setIsLoading(true);

    try {
      // 1. Create the Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // 2. Set the display name in Authentication
      await updateProfile(userCredential.user, {
        displayName: Parentname
      });

      // 3. Create a document in the "user" collection (note: singular, matching your DB)
      await setDoc(doc(db, "user", userCredential.user.uid), {
        uid: userCredential.user.uid,
        Parent_name: Parentname,  // Match this exactly with what your app expects
        email: email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preferences: {
          notifications: false,
          theme: "Forest"
        }
      });

      console.log("User account created successfully!");
      
      // Navigate to the prescreen page after successful signup
      router.replace("/prescreen");

    } catch (error) {
      console.error("Sign up error:", error);
      if (error.code === 'auth/email-already-in-use') {
        setErrorMessage("Email is already in use. Please use another email or sign in.");
      } else if (error.code === 'auth/weak-password') {
        setErrorMessage("Password is too weak. Please use at least 6 characters.");
      } else {
        setErrorMessage("Failed to create account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.imageContainer}>
        <Image style={styles.image} source={require('../assets/images/logowild.png')}/>
        <Text style={styles.subtitle}>Wander. Write. Wild.</Text>
        <Text style={styles.title}>Create Account</Text>
        {errorMessage !== "" && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}
      </View>

      {/* Name Input */}
      <TextInput
        style={styles.input}
        placeholder="Parent Name"
        placeholderTextColor="#999"
        value={Parentname}
        onChangeText={(text) => setName(text)}
        autoCapitalize="words"
      />

      {/* Email Input */}
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={(text) => setEmail(text)}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* Password Input */}
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#999"
        value={password}
        onChangeText={(text) => setPassword(text)}
        secureTextEntry
      />

      {/* Confirm Password Input */}
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor="#999"
        value={confirmPassword}
        onChangeText={(text) => setConfirmPassword(text)}
        secureTextEntry
      />

      {/* Create Account Button */}
      <TouchableOpacity 
        style={styles.button} 
        onPress={signUp}
        // onPress={()=>router.replace("/prescreen")}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Create Account</Text>
        )}
      </TouchableOpacity>

      <View style={styles.signInContainer}>
        <Text style={styles.signInText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.signInLink}>Sign in</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "white",
    },
    imageContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20, // Reduced from negative margin
    },
    image: {
      width: 180,
      height: 180,
      resizeMode: 'contain',
    },
    subtitle: {
      fontSize: 14,
      color: "#555",
      marginBottom: 10, // Reduced margin
      fontWeight: "bold",
    },
    title: {
      fontSize: 30,
      color: "#333",
      fontWeight: "bold",
      marginBottom: 20, // Added margin
    },
    input: {
      width: "100%",
      height: 50,
      backgroundColor: "white",
      borderRadius: 8,
      paddingHorizontal: 15,
      color: "black",
      borderColor: '#F28C38',
      borderWidth: 1,
      marginBottom: 15,
    },
    button: {
      width: "100%",
      height: 50,
      backgroundColor: "#F28C38",
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 10,
    },
    signInContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 10,
    },
    signInText: {
      fontSize: 14,
      color: '#666',
    },
    signInLink: {
      fontSize: 14,
      color: '#F28C38',
      fontWeight: 'bold',
      textDecorationLine: 'underline',
    },
    buttonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "bold",
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 30,
    },
    errorText: {
      color: "red",
      fontSize: 14,
      marginBottom: 10,
      textAlign: "center",
    },
});