import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import RootStack from "./navigation/RootStack"; // Import the Stack instead of just Tabs
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import colors from "./theme/colors";
import { DownloadService } from "./service/DownloadService";
import { enableScreens } from "react-native-screens";

enableScreens(true);

export default function App() {
  useEffect(() => {
    DownloadService.initFolder();
  }, []);
  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#FF7A00",
        }}
        edges={["top", "bottom"]}
      >
        <NavigationContainer>
          <StatusBar backgroundColor="#FF7A00" style="light" />
          {/* RootStack now contains both BottomTabs and the Player */}
          <RootStack />
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
