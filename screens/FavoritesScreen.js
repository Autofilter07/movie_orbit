import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useWindowDimensions, // Critical for responsiveness
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeartOff, Trash2 } from "lucide-react-native";
import MovieCard, { CARD_HEIGHT } from "../components/MovieCard";
import { MOVIES } from "../data/data";
import colors from "../theme/colors";
import { useNavigation } from "@react-navigation/native";

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  // --- DYNAMIC GRID CALCULATION ---
  const SCREEN_PADDING = 20;
  const COLUMN_GAP = 15;
  // Switch to 4 columns on tablets/landscape, 2 on phones
  const NUM_COLUMNS = SCREEN_WIDTH > 600 ? 4 : 2;
  const CARD_WIDTH =
    (SCREEN_WIDTH - SCREEN_PADDING * 2 - COLUMN_GAP * (NUM_COLUMNS - 1)) /
    NUM_COLUMNS;

  // Simulation: first 4 movies as favorites
  const [favoriteMovies, setFavoriteMovies] = useState(MOVIES.slice(0, 4));

  const clearAllFavorites = () => {
    setFavoriteMovies([]);
  };

  // Optimization: getItemLayout for smooth scrolling
  const getItemLayout = useCallback(
    (data, index) => ({
      length: (CARD_HEIGHT + 20) / NUM_COLUMNS,
      offset: ((CARD_HEIGHT + 20) / NUM_COLUMNS) * index,
      index,
    }),
    [NUM_COLUMNS]
  );

  const renderMovieItem = useCallback(
    ({ item }) => <MovieCard movie={item} width={CARD_WIDTH} />,
    [CARD_WIDTH]
  );

  return (
    <View style={styles.mainContainer}>
      {/* Header Section */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View>
          <Text style={styles.title}>My Favorites</Text>
          <Text style={styles.subtitle}>
            {favoriteMovies.length} movies saved
          </Text>
        </View>

        {favoriteMovies.length > 0 && (
          <TouchableOpacity onPress={clearAllFavorites} style={styles.clearBtn}>
            <Trash2 size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        key={NUM_COLUMNS} // Forces re-render on rotation
        data={favoriteMovies}
        keyExtractor={(item) => `fav-${item.id}`}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        // Performance Props
        getItemLayout={getItemLayout}
        removeClippedSubviews={true}
        initialNumToRender={6}
        renderItem={renderMovieItem}
        // Empty State
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.iconCircle}>
              <HeartOff size={40} color={colors.gray} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>Your list is empty</Text>
            <Text style={styles.emptySubtitle}>
              Tap the heart icon on any movie to save it here for later.
            </Text>

            <TouchableOpacity
              onPress={() => navigation.navigate("Movies")}
              style={styles.exploreBtn}
            >
              <Text style={styles.exploreText}>Explore Movies</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: colors.background,
  },
  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  subtitle: {
    color: colors.gray,
    fontSize: 14,
    marginTop: 4,
  },
  clearBtn: {
    backgroundColor: "rgba(255, 140, 0, 0.1)", // Matches your orange theme
    padding: 10,
    borderRadius: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  row: {
    justifyContent: "flex-start", // Changed to flex-start for consistent landscape gaps
    gap: 15,
    marginBottom: 20,
  },
  // Empty State Styles
  emptyContainer: {
    flex: 1,
    marginTop: 100,
    alignItems: "center",
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.card,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  emptySubtitle: {
    color: colors.gray,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 30,
  },
  exploreBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  exploreText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});
