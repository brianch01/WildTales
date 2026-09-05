import React, { useEffect, useState } from 'react';
import {
  View,
  Image,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

const icons = [
  { screen: 'ScreenOne', image: require('../assets/images/Book.png') },
  { screen: 'ScreenTwo', image: require('../assets/images/Compass.png') },
  { screen: 'ScreenThree', image: require('../assets/images/User.png') },
];

type Props = {
  handleUnmountComponent: (value: boolean) => void;
};

const { width, height } = Dimensions.get('window');

export default function OverlayMenu({ handleUnmountComponent }: Props) {
  const navigation = useNavigation();
  const [finishedCount, setFinishedCount] = useState<number>(0);

  const radius = 100; // radius of the arch
  const centerX = width / 2;
  const centerY = height - 120;

  // Shared values for animation radius of each icon (from 0 to radius)
  const radiusValues = icons.map(() => useSharedValue(0));
  const scaleValues = icons.map(() => useSharedValue(1));

  useEffect(() => {
    // Animate all radius values from 0 to radius on mount
    radiusValues.forEach((r) => {
      r.value = withSpring(radius, { damping: 15 });
    });
  }, []);

  // Handle collapse animation and then unmount
  const goBack = () => {
    radiusValues.forEach((r, i) => {
      r.value = withTiming(0, { duration: 200 }, () => {
        runOnJS(handleUnmountComponent)(false);
      });
    });
  };

  const handlePress = (screen: string, index: number) => {
    scaleValues[index].value = withTiming(0.85, { duration: 100 }, () => {
      scaleValues[index].value = withTiming(1, { duration: 100 });
    });
    setTimeout(() => {
      navigation.navigate(screen as never);
    }, 150);
  };

  // Arc parameters
  const angleOffset = Math.PI / 6; // 30 degrees offset (you can adjust)
  const angleStep = Math.PI / 3; // 60 degrees step between icons

  return (
    <View style={styles.overlay}>
      {icons.map((item, index) => {
        const angle = -angleOffset - index * angleStep;

        const iconStyle = useAnimatedStyle(() => {
          const r = radiusValues[index].value;

          const x = centerX + r * Math.cos(angle) - 32; // 32 is half icon width
          const y = centerY + r * Math.sin(angle) - 32;

          return {
            position: 'absolute',
            left: x,
            top: y,
            transform: [{ scale: scaleValues[index].value }],
          };
        });

        return (
          <TouchableWithoutFeedback
            key={index}
            onPress={() => handlePress(item.screen, index)}
          >
            <Animated.View style={[styles.iconContainer, iconStyle]}>
              <Image source={item.image} style={styles.icon} />
            </Animated.View>
          </TouchableWithoutFeedback>
        );
      })}

      <TouchableWithoutFeedback onPress={goBack}>
        <View style={[styles.cancelButton, { left: centerX - 40, top: centerY }]}>
          <Image
            source={require('../assets/images/Plus.png')}
            style={styles.cancelIcon}
          />
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(55, 65, 81, 0.9)', // gray-700 with opacity
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 50,
    padding: 10,
    elevation: 4,
  },
  icon: {
    width: 42,
    height: 42,
  },
  cancelButton: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderRadius: 50,
    backgroundColor: '#F28C38',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  cancelIcon: {
    width: 82,
    height: 82,
    tintColor: '#333',
  },
});