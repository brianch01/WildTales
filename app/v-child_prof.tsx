import React from 'react';
import {
  GluestackUIProvider,
  StyledProvider,
  Box,
  VStack,
  HStack,
  Heading,
  Button,
  ButtonText,
  Image,
  AddIcon,
  Icon,
} from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config'; // Import your theme configuration
import { FontAwesome } from '@expo/vector-icons'; // For icons
import { router } from 'expo-router';

export default function ChildDashboard() {
  const handlePress = (action: string) => {
    console.log(`Action: ${action}`);
    // Add navigation or action logic here
  };

  return (
    <StyledProvider config={config}>
      <GluestackUIProvider>
        <Box flex={1} bg="$white" p="$5" pt="$12">
          {/* Profile Section */}
          <VStack alignItems="center" space="md" mb="$6">
            <Image
              source={require('../assets/images/logowild.png')} // Replace with actual avatar path
              alt="Child Avatar"
              style={{ width: 100, height: 100, borderRadius: 50 }}
            />
            <Heading size="lg">"User Name" the Adventurer</Heading>
          </VStack>

          {/* Stats Section */}
          <Box bg="$purple200" borderRadius="$xl" p="$4" mb="$6">
            <HStack justifyContent="space-between" flexWrap="wrap">
              {/* Journeys Completed */}
              <Box
                bg="$white"
                borderRadius="$lg"
                p="$4"
                alignItems="center"
                w="48%"
                mb="$4"
                >
                <FontAwesome name="map-marker" size={24} color="$orange500" />
                <Heading size="lg" mt="$2">1</Heading>
                <ButtonText color="$black">Journeys Completed</ButtonText>
              </Box>

              {/* Landmarks Visited */}
              <Box
                bg="$white"
                borderRadius="$lg"
                p="$4"
                alignItems="center"
                w="48%"
                mb="$4"
              >
                <FontAwesome name="flag" size={24} color="#28a745"/>
                <Heading size="lg" mt="$2">4</Heading>
                <ButtonText color="$black">Landmarks Visited</ButtonText>
              </Box>

              {/* Artworks Received */}
              <Box
                bg="$white"
                borderRadius="$lg"
                p="$4"
                alignItems="center"
                w="48%"
              >
                <FontAwesome name="image" size={24} color="#6f42c1"/>
                <Heading size="lg" mt="$2">1</Heading>
                <ButtonText color="$black">Artworks Received</ButtonText>
              </Box>

              {/* Achievements */}
              <Box
                bg="$white"
                borderRadius="$lg"
                p="$4"
                alignItems="center"
                w="48%"
              >
                <FontAwesome name="thumbs-up" size={24} color="#007bff" />
                <Heading size="lg" mt="$2">1</Heading>
                <ButtonText color="$black">Achievements</ButtonText>
              </Box>
            </HStack>
          </Box>

          {/* Switch to Parent Button */}
          <Button
            size="lg"
            variant="solid"
            bg="$red500"
            borderRadius="$lg"
            onPress={() => router.push("/v-parent_prof")}
            mb="$6"
          >
            <ButtonText color="$white" fontWeight="$bold">
              Switch to Parent
            </ButtonText>
          </Button>

          {/* Floating Action Button */}
          <Button
            size="lg"
            borderRadius="$full"
            bg="$purple500"
            w="$16"
            h="$16"
            position="absolute"
            bottom={30}
            alignSelf="center"
            onPress={() => handlePress('Add Action')}>
            <AddIcon color="$white" size="xl" />
          </Button>
        </Box>
      </GluestackUIProvider>
    </StyledProvider>
  );
}