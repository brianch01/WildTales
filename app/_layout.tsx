import { Stack } from "expo-router";
import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { MilestoneAudioProvider } from "./milestoneAudioContext";

export default function RootLayout() {
  return (
    <GluestackUIProvider mode="light">
      <MilestoneAudioProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="createacc" options={{ headerShown: false }} />
          <Stack.Screen name="prescreen" options={{ headerShown: false }} />
          <Stack.Screen name="pin/set" options={{ headerShown: false }} />
          <Stack.Screen name="pin/confirm" options={{ headerShown: false }} />
          <Stack.Screen name="child-onboarding/avatar" options={{ headerShown: false }} />
          <Stack.Screen name="child-onboarding/nickname" options={{ headerShown: false }} />
          <Stack.Screen name="child-onboarding/guide" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ headerShown: false }} />
          <Stack.Screen name="artwork-gallery" options={{ headerShown: false }} />
          <Stack.Screen name="milestone-details" options={{ headerShown: false }} />
          <Stack.Screen name="v-parent_prof" options={{ headerShown: false }} />
          <Stack.Screen name="photo-task" options={{ headerShown: false }} />
          <Stack.Screen name="adventure-log" options={{ headerShown: false }} />
          <Stack.Screen name="achievements" options={{ headerShown: false }} />
          <Stack.Screen name="journey-gallery" options={{ headerShown: false }} />

        </Stack>
      </MilestoneAudioProvider>
    </GluestackUIProvider>
  );
}