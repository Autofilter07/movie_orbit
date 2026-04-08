import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BottomTabs from "./BottomTabs";
import PlayerScreen from "../screens/PlayerScreen";
import DownloadsScreen from "../screens/DownloadsScreen";

const Stack = createNativeStackNavigator();

export default function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* The main app interface with the Bottom Bar */}
      <Stack.Screen name="MainTabs" component={BottomTabs} />

      {/* player screen */}
      <Stack.Screen
        name="Player"
        component={PlayerScreen}
        options={{
          // This makes the Player specifically come from the bottom
          presentation: "fullScreenModal",
          orientation: "all",
          // Optional: prevents flickering on some Android versions
        }}
      />

      <Stack.Screen
        name="Downloads"
        component={DownloadsScreen}
        options={{
          orientation: "all",
          // Optional: prevents flickering on some Android versions
        }}
      />
    </Stack.Navigator>
  );
}
