import React from "react";
import { View, Text, StyleSheet } from "react-native";
import colors from "../theme/colors";

export default function TabBarIcon({ Icon, label, focused, isSpecial }) {
  if (isSpecial) {
    return (
      <View style={styles.specialContainer}>
        <View style={styles.orangeCircle}>
          <Icon size={26} color="white" />
        </View>
        <Text numberOfLines={1} style={[styles.label, { color: "white" }]}>
          {label}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Icon size={22} color={focused ? colors.primary : colors.gray} />
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          { color: focused ? colors.primary : colors.gray },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    width: 65, // Fixed width helps prevent wrapping
  },
  specialContainer: {
    alignItems: "center",
    justifyContent: "center",
    bottom: 18, // Lifted to match image height
    width: 70,
  },
  orangeCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 4,
    borderColor: colors.background, // Creates the "cutout" look
  },
  label: {
    fontSize: 10, // Slightly smaller to fit "Favorites"
    marginTop: 4,
    fontWeight: "600",
    textAlign: "center",
  },
});
