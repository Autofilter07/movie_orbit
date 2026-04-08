import React from "react";
import { StyleSheet, useWindowDimensions, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Icons & Screens
import { Home, LayoutGrid, Search, User, Heart } from "lucide-react-native";
import colors from "../theme/colors";
import HomeScreen from "../screens/HomeScreen";
import MoviesScreen from "../screens/MoviesScreen";
import SearchScreen from "../screens/SearchScreen";
import FavoritesScreen from "../screens/FavoritesScreen";
import ProfileScreen from "../screens/ProfileScreen";

import TabBarIcon from "../components/TabBarIcon";

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  // --- RESPONSIVE LOGIC ---
  // On large screens (landscape/tablets), we don't want the bar to be 100% wide.
  const MAX_TAB_WIDTH = 600;
  const isLargeScreen = SCREEN_WIDTH > MAX_TAB_WIDTH;
  const horizontalMargin = isLargeScreen
    ? (SCREEN_WIDTH - MAX_TAB_WIDTH) / 2
    : 10;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: [
          styles.tabBar,
          {
            // Dynamic Positioning
            left: horizontalMargin,
            right: horizontalMargin,
            bottom: insets.bottom > 0 ? insets.bottom : 20,
            backgroundColor: colors.card,
            // Adjust height slightly for landscape if needed
            height: Platform.OS === "ios" && insets.bottom > 0 ? 85 : 75,
          },
        ],
        tabBarItemStyle: {
          height: 70,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: (props) => (
            <TabBarIcon {...props} Icon={Home} label="Home" />
          ),
        }}
      />
      <Tab.Screen
        name="Movies"
        component={MoviesScreen}
        options={{
          tabBarIcon: (props) => (
            <TabBarIcon {...props} Icon={LayoutGrid} label="Movies" />
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarIcon: (props) => (
            <TabBarIcon {...props} Icon={Search} label="Search" isSpecial />
          ),
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          tabBarIcon: (props) => (
            <TabBarIcon {...props} Icon={Heart} label="Favorites" />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: (props) => (
            <TabBarIcon {...props} Icon={User} label="Profile" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    borderRadius: 20, // Slightly more rounded for responsiveness
    borderTopWidth: 0,
    paddingHorizontal: 10,
    paddingTop: Platform.OS === "android" ? 20 : 20, // Fix for vertical centering on Android
    // Shadows
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    // Ensure content stays centered
    justifyContent: "center",
    alignItems: "center",
  },
});
