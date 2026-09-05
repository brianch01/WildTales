import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export default function NetworkStatusBar() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? false);
    });
    
    return () => unsubscribe();
  }, []);

  if (isConnected) return null;

  return (
    <View className="absolute top-20 left-0 right-0 bg-red-500 py-2 z-50 items-center">
      <Text className="text-white font-bold">You are currently offline</Text>
    </View>
  );
}