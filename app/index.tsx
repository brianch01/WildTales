import { Text, StyleSheet, TextInput, TouchableOpacity, Image, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { auth } from "@/FirebaseConfig";
import { router } from "expo-router";
import { Checkbox, CheckboxLabel, CheckboxIndicator,CheckboxGroup,CheckboxIcon } from "@/components/ui/checkbox"
import { CheckIcon } from "@/components/ui/icon"
import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { UploadQueueService } from './services/UploadQueue';
import { initializeFirestore } from 'firebase/firestore';


export default function Index() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checked, setChecked] = useState(false);
  const [signInError, setSignInError] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [isCheckingNetwork, setIsCheckingNetwork] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
      setIsCheckingNetwork(false);
      
      if (!state.isConnected) {
        Alert.alert(
          "Offline Mode",
          "You need to be online to sign in. Please check your internet connection.",
          [{ text: "OK" }]
        );
      }
    });

    return () => unsubscribe();
  }, []);


  const signIn = async () => {
    if (!isOnline) {
      setSignInError("You're offline. Please connect to the internet to sign in.");
      return;
    }

    setSignInError(""); 
    try {
      const user = await signInWithEmailAndPassword(auth, email, password);
      if (user) {
        router.replace("/home");
      }
    } catch (error) {
      setSignInError("Incorrect email or password. Please try again.");
      console.log(error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#fff", justifyContent: "flex-start", paddingTop: 50 }]}>
      <View style={styles.logoContainer}>
        <Image style={styles.logo} source={require('../assets/images/logowild.png')} />
      </View>
      
      <Text style={styles.heading}>Sign in</Text>
      <Text style={styles.subheading}>Sign in and continue your journey!</Text>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Offline Mode - Connect to internet to sign in</Text>
        </View>
      )}

      {signInError !== "" && <Text style={styles.errorText}>{signInError}</Text>}

      <Text style={styles.inputLabel}>Email</Text>
      <TextInput
        style={styles.inputField}
        placeholder="Enter Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.inputField}
        placeholder="Password"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

<View style={styles.checkboxContainer}>
        <Checkbox
          value="stayLoggedIn"
          isChecked={checked}
          onChange={() => isOnline && setChecked(!checked)}
          accessibilityLabel="stayLoggedIn"
          disabled={!isOnline}
        >
          <CheckboxIndicator>
            <CheckboxIcon as={CheckIcon}/>
          </CheckboxIndicator>
          <CheckboxLabel style={!isOnline ? styles.disabledText : null}>Keep me logged in</CheckboxLabel>
        </Checkbox>
      </View>


      <TouchableOpacity 
        style={[styles.signupButton, !isOnline && styles.disabledButton]} 
        onPress={signIn}
        disabled={!isOnline}
      >
        <Text style={styles.signupButtonText}>Sign in</Text>
      </TouchableOpacity>

      <Text style={[styles.loginRedirect, !isOnline && styles.disabledText]}>
        Don't have an account? <Text 
          style={[styles.loginLink, !isOnline && styles.disabledText]} 
          onPress={() => isOnline && router.push("/createacc")}
        >
          Create Account
        </Text>
      </Text>
    </SafeAreaView>
  );


}

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#4B3621",
    padding: 30,
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
  },
  subheading: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputLabel: {
    alignSelf: 'flex-start',
    marginLeft: 10,
    fontSize: 12,
    color: '#F28C38',
    fontWeight: '500',
  },
  inputField: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#F28C38',
    borderRadius: 8,
    paddingHorizontal: 15,
    color: '#000',
    marginBottom: 15,
  },
  checkboxContainer: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    marginLeft:10,
    marginBottom: 20,
  },
  checkboxLabel: {
    color: '#222',
    marginLeft: 7,
  },
  signupButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#F28C38',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  signupButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginRedirect: {
    color: '#888',
    fontSize: 14,
  },
  loginLink: {
    color: '#F28C38',
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginVertical: 10,
    textAlign: 'center',
  },
  offlineBanner: {
    backgroundColor: '#ff9800',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    width: '100%',
  },
  offlineText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '500',
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ccc',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  disabledText: {
    color: '#aaa',
  },
});