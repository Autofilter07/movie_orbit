import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Clapperboard, Download } from "lucide-react-native"; // Using Clapperboard as a placeholder for Movie SVG
import colors from "../theme/colors";
import { useNavigation } from "@react-navigation/native";

export default function Header() {
  const navigation = useNavigation();

  const handleNavigate = () => {
    navigation.navigate("Downloads");
  };
  return (
    <View style={styles.headerWrapper}>
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          {/* SVG-Style Icon */}
          <View style={styles.logoCircle}>
            <Clapperboard color="white" size={18} strokeWidth={2.5} />
          </View>

          <Text style={styles.brandText}>
            Movie<Text style={{ color: colors.primary }}>Orbit</Text>
          </Text>
        </View>

        <TouchableOpacity activeOpacity={0.7}>
          <Download onPress={handleNavigate} color={colors.white} size={24} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: colors.background,
    // Sticky positioning logic
    paddingTop: Platform.OS === "ios" ? 50 : 10, // Adjusts for notch
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)", // Subtle 1px border
    // Shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 1000, // Ensures it stays above the scroll content
  },
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoCircle: {
    backgroundColor: colors.primary,
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    // Small inner shadow effect
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  brandText: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: -0.5,
  },
});
