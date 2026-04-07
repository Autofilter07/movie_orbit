import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BottomTabs from "./BottomTabs";
import PlayerScreen from "../screens/PlayerScreen";

const Stack = createNativeStackNavigator();

export default function RootStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: "slide_from_right" }}
    >
      {/* The main app interface with the Bottom Bar */}
      <Stack.Screen name="MainTabs" component={BottomTabs} />

      {/* player screen */}
      <Stack.Screen
        name="Player"
        component={PlayerScreen}
        options={{
          // This makes the Player specifically come from the bottom
          animation: "slide_from_bottom",
          // 'containedModal' or 'fullScreenModal' adds that native pop-down feel
          presentation: "fullScreenModal",
          orientation: "all",
          // Optional: prevents flickering on some Android versions
          animationDuration: 400,
        }}
      />
    </Stack.Navigator>
  );
}
