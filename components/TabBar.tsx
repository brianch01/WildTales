import { View, Platform, StyleSheet } from 'react-native';
import { useLinkBuilder, useTheme } from '@react-navigation/native';
import { Text, PlatformPressable } from '@react-navigation/elements';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  primary: "#4c1fbf",    //bluish purple is icon color
  secondary: "#FFBF69",  
  accent: "#FF9F1C",     
  background: "#FFFFFF",  
  text: "#333333",        
  lightText: "#777777",  
  inactive: "#BBBBBB"    
};

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const { buildHref } = useLinkBuilder();

  // Define the tabs we want to show in the order we want them
  const visibleTabs = ['home', 'tales', 'v-parent_prof'];

  return (
    <View style={styles.tabbar}>
      {state.routes.map((route, index) => {
        // Only show tabs we've defined in visibleTabs
        if (!visibleTabs.includes(route.name)) return null;

        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name === 'v-parent_prof' ? 'Profile' : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        // Get the appropriate icon for each tab
        const getIconName = () => {
          switch (route.name) {
            case "home": return isFocused ? "home" : "home-outline";
            case "tales": return isFocused ? "book" : "book-outline";
            case "v-parent_prof": return isFocused ? "person" : "person-outline"; // Updated to use v-parent_prof
            default: return "alert";
          }
        };

        // Display name for the tab
        const getDisplayName = () => {
          switch (route.name) {
            case "home": return "Home";
            case "tales": return "Tales";
            case "v-parent_prof": return "Profile";
            default: return route.name;
          }
        };

        return (
          <PlatformPressable
            key={route.key}
            href={buildHref(route.name, route.params)}
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabBarItemStyle}
          >
            <View style={styles.tabContent}>
              <Ionicons
                name={getIconName()}
                size={24}
                color={isFocused ? COLORS.primary : COLORS.inactive}
              />
              <Text 
                style={[
                  styles.tabText, 
                  { 
                    color: isFocused ? COLORS.primary : COLORS.inactive,
                  }
                ]}
              >
                {getDisplayName()}
              </Text>
            </View>
          </PlatformPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabbar: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    bottom: 32,
    borderRadius: 30,
    marginHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(68, 31, 102, 0.2)', // Subtle purple border
  },
  tabBarItemStyle: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  }
});