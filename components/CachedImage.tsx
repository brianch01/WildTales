import React, { useState, useEffect } from 'react';
import { Image, View, ActivityIndicator } from 'react-native';
import * as FileSystem from 'expo-file-system';

const imageCache = {};

export default function CachedImage({ uri, className, ...props }) {
  const [cachedUri, setCachedUri] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cacheImage = async () => {
      if (!uri) {
        setLoading(false);
        return;
      }

      try {
        // Check if image is already cached
        if (imageCache[uri]) {
          setCachedUri(imageCache[uri]);
          setLoading(false);
          return;
        }

        // Create a file path for caching
        const filename = uri.split('/').pop();
        const filePath = `${FileSystem.cacheDirectory}${filename}`;

        // Check if file already exists
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (fileInfo.exists) {
          setCachedUri(filePath);
          imageCache[uri] = filePath;
          setLoading(false);
          return;
        }

        // Download and cache
        await FileSystem.downloadAsync(uri, filePath);
        imageCache[uri] = filePath;
        setCachedUri(filePath);
      } catch (error) {
        console.error("Image caching error:", error);
        // Fallback to original URI
        setCachedUri(uri);
      } finally {
        setLoading(false);
      }
    };

    cacheImage();
  }, [uri]);

  if (loading) {
    return (
      <View className={className}>
        <ActivityIndicator color="#8A4DFF" />
      </View>
    );
  }

  return <Image source={{ uri: cachedUri }} className={className} {...props} />;
}