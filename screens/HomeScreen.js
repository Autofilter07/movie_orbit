import React from "react";
import { ScrollView, View, Text, StyleSheet, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MOVIES } from "../data/data";
import Header from "../components/Header";
import HeroCard from "../components/homeScreen/HeroCard";
import MovieCard from "../components/MovieCard";
import colors from "../theme/colors";

// Screen dimensions for responsive grid calculation
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PADDING = 20;
const GAP = 15;
// Calculate card width: (Total Width - Outer Paddings - Gap between cards) / 2 columns
const CARD_WIDTH = (SCREEN_WIDTH - PADDING * 2 - GAP) / 2;

function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigation();

  const handleNavigate = () => {
    navigate.navigate("Movies");
  };

  return (
    <View style={[styles.mainWrapper, { backgroundColor: colors.background }]}>
      {/* Header stays static at the top */}
      <View style={{ paddingTop: insets.top }}>
        <Header />
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollPadding}
      >
        <HeroCard />

        <SectionHeader
          handleNavigate={handleNavigate}
          title="Trending Now"
          rightText="See All"
        />
        <View style={styles.grid}>
          {MOVIES.slice(0, 4).map((item) => (
            <MovieCard
              key={item.id}
              movie={item}
              width={CARD_WIDTH} // Passing calculated width
            />
          ))}
        </View>

        <SectionHeader title="New Releases" rightText="See All" />
        <View style={styles.grid}>
          {MOVIES.slice(2, 6).map((item) => (
            <MovieCard
              key={item.id}
              movie={item}
              width={CARD_WIDTH} // Passing calculated width
            />
          ))}
        </View>

        {/* Space so content isn't hidden by the floating Bottom Tab Bar */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const SectionHeader = ({ title, rightText, handleNavigate }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <TouchableOpacity onPress={handleNavigate}>
      <Text style={styles.sectionLink}>{rightText}</Text>
    </TouchableOpacity>
  </View>
);

export default React.memo(HomeScreen);

// Added TouchableOpacity import requirement for SectionHeader if you want it clickable
import { TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollPadding: {
    paddingBottom: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start", // Changed to flex-start for consistent spacing
    paddingHorizontal: PADDING,
    gap: GAP, // Using gap property for modern Flexbox spacing
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: PADDING,
    marginBottom: 15,
    marginTop: 25,
  },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  sectionLink: {
    color: colors.primary, // Highlights the "See All" link
    fontSize: 13,
    fontWeight: "600",
  },
});
