import { Tabs,Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet } from "react-native";
import { TabBar } from "@/components/TabBar";

export default function TabsLayout() {
  return (
    <Tabs   tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="home" options={{ headerShown: false}} />
      <Tabs.Screen name="tales" options={{ headerShown: false}} />
      <Tabs.Screen name="v-parent_prof" options={{ headerShown: false}} />
    </Tabs>
  );
}
