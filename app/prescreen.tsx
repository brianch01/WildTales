import { View, Text, Image, ScrollView } from "react-native";
import { Checkbox, CheckboxLabel, CheckboxIndicator, CheckboxGroup, CheckboxIcon } from "@/components/ui/checkbox";
import { CheckIcon } from "@/components/ui/icon";
import { useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";
import { useState } from "react";

export default function PreScreen() {
  const [checkedValues, setCheckedValues] = useState<string[]>([]);
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View className="flex-1 bg-white px-6 pt-16 items-center">
        <Text className="text-3xl font-extrabold text-left w-full leading-tight mb-2">Welcome to{"\n"}Wild Tales!</Text>
        <Text className="text-gray-500 text-base mb-8 text-left w-full leading-relaxed">
          Before your child embarks on their adventure, let’s walk you through a quick setup and permission process.
        </Text>

        <View className="w-full bg-gray-100 rounded-xl p-4 mb-6">
          <Text className="text-gray-500 mb-4 text-sm">
            For your child’s protection, no personal data is saved.
          </Text>
          <CheckboxGroup value={checkedValues} onChange={setCheckedValues}>
            <View className="gap-4">
              <Checkbox value="consent" size="md">
                <CheckboxIndicator>
                  <CheckboxIcon as={CheckIcon} />
                </CheckboxIndicator>
                <CheckboxLabel>I consent to my child using this app</CheckboxLabel>
              </Checkbox>
              <Checkbox value="guardian" size="md">
                <CheckboxIndicator>
                  <CheckboxIcon as={CheckIcon} />
                </CheckboxIndicator>
                <CheckboxLabel>I am a legal guardian/parent</CheckboxLabel>
              </Checkbox>
            </View>
          </CheckboxGroup>
        </View>

        <View className="bg-[#DFB7FF] rounded-2xl p-4 w-full mb-4 shadow-md">
          <Text className="font-bold text-lg text-center text-purple-800">How does Wild Tales work?</Text>
        </View>

        <View className="w-full mb-8 space-y-4 gap-4">
          <View>
            <Text className="text-xl font-semibold"><Text className="text-orange-500">Step 1:</Text> Pick a Trail</Text>
            <Text className="text-med text-gray-600">Choose a themed adventure trail suited for your child.</Text>
          </View>
          <View>
            <Text className="text-xl font-semibold"><Text className="text-orange-500">Step 2:</Text> Start Exploring</Text>
            <Text className="text-med text-gray-600">Follow the GPS route while also completing fun nature tasks.</Text>
          </View>
          <View>
            <Text className="text-xl font-semibold"><Text className="text-orange-500">Step 3:</Text> Discover & Do Fun Tasks</Text>
            <Text className="text-med text-gray-600">Learn together with your child about nearby plants and animals.</Text>
          </View>
          <View>
            <Text className="text-xl font-semibold"><Text className="text-orange-500">Step 4:</Text> Earn Your Reward</Text>
            <Text className="text-med text-gray-600">Finish the trail and celebrate with your child with a special artwork to collect.</Text>
          </View>
        </View>

<Image
  source={require("../assets/images/instructions.png")}
  className="h-96 w-full mb-10 rounded-lg shadow-sm"
  resizeMode="contain"
/>

        <TouchableOpacity
          className={`rounded-xl py-4 px-8 mb-20 w-full items-center shadow-md ${
            checkedValues.length < 2 ? "bg-gray-300" : "bg-[#F28C38]"
          }`}
          disabled={checkedValues.length < 2}
          onPress={() => router.push("/pin/set")}
        >
          <Text className="text-white text-lg font-semibold">Let's Go!</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}