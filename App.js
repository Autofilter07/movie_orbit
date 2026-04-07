import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import RootStack from "./navigation/RootStack"; // Import the Stack instead of just Tabs
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import colors from "./theme/colors";

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor={colors.background} />
        {/* RootStack now contains both BottomTabs and the Player */}
        <RootStack />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
