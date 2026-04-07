import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions, // Added for responsiveness
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle2, Clapperboard } from "lucide-react-native";
import Header from "../components/Header";
import MovieCard, { CARD_HEIGHT } from "../components/MovieCard";
import { MOVIES } from "../data/data";
import colors from "../theme/colors";

const CATEGORIES = ["All", "Action", "Sci-Fi", "Adventure", "Drama", "Horror"];

export default function MoviesScreen() {
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions(); // Dynamic width

  // --- DYNAMIC GRID CALCULATION ---
  const SCREEN_PADDING = 20;
  const COLUMN_GAP = 15;
  // If width is large (landscape), show 4 columns, otherwise 2
  const NUM_COLUMNS = SCREEN_WIDTH > 600 ? 4 : 2;
  const CARD_WIDTH =
    (SCREEN_WIDTH - SCREEN_PADDING * 2 - COLUMN_GAP * (NUM_COLUMNS - 1)) /
    NUM_COLUMNS;

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [displayedMovies, setDisplayedMovies] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);

  // 1. Filter logic
  const filteredMasterList = useMemo(() => {
    const categoryLower = selectedCategory.toLowerCase();
    if (categoryLower === "all") return MOVIES;
    return MOVIES.filter((movie) =>
      movie.genre.some((g) => g.toLowerCase() === categoryLower)
    );
  }, [selectedCategory]);

  // 2. Initial load
  useEffect(() => {
    setDisplayedMovies(filteredMasterList.slice(0, 12));
  }, [filteredMasterList]);

  // 3. Load more logic
  const loadMoreMovies = useCallback(() => {
    if (loadingMore || displayedMovies.length >= filteredMasterList.length)
      return;

    setLoadingMore(true);
    setTimeout(() => {
      const currentLength = displayedMovies.length;
      const nextBatch = filteredMasterList.slice(
        currentLength,
        currentLength + 10
      );
      setDisplayedMovies((prev) => [...prev, ...nextBatch]);
      setLoadingMore(false);
    }, 800);
  }, [loadingMore, displayedMovies.length, filteredMasterList]);

  // 4. Layout Calculation (Updated for dynamic columns)
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

  const renderCategoryItem = useCallback(
    ({ item }) => (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setSelectedCategory(item)}
        style={[
          styles.categoryBtn,
          selectedCategory === item && styles.categoryBtnActive,
        ]}
      >
        <Text
          style={[
            styles.categoryText,
            selectedCategory === item && styles.categoryTextActive,
          ]}
        >
          {item}
        </Text>
      </TouchableOpacity>
    ),
    [selectedCategory]
  );

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footerContainer}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.footerText}>Fetching more movies...</Text>
        </View>
      );
    }
    if (
      displayedMovies.length >= filteredMasterList.length &&
      filteredMasterList.length > 0
    ) {
      return (
        <View style={styles.footerContainer}>
          <CheckCircle2 size={20} color="#FF8C00" />
          <Text style={[styles.footerText, { color: "#FF8C00" }]}>
            No more movies to load
          </Text>
        </View>
      );
    }
    return <View style={{ height: 100 }} />;
  };

  return (
    <View style={styles.mainContainer}>
      <View style={{ paddingTop: insets.top }}>
        <Header />
      </View>

      <View>
        <FlatList
          data={CATEGORIES}
          renderItem={renderCategoryItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          keyExtractor={(item) => item}
        />
      </View>

      <FlatList
        key={NUM_COLUMNS} // KEY CHANGE: Forces re-render when column count changes (rotation)
        data={displayedMovies}
        keyExtractor={(item, index) =>
          `${selectedCategory}-${item.id}-${index}`
        }
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: 180 }]}
        getItemLayout={getItemLayout}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={11}
        initialNumToRender={8}
        onEndReached={loadMoreMovies}
        onEndReachedThreshold={0.5}
        renderItem={renderMovieItem}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Clapperboard size={48} color={colors.gray} strokeWidth={1} />
            <Text style={styles.emptyText}>No movies found.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: colors.background },
  categoryList: { paddingHorizontal: 20, paddingVertical: 15 },
  categoryBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: colors.card,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  categoryBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: { color: colors.gray, fontWeight: "600", fontSize: 14 },
  categoryTextActive: { color: "white" },
  listContent: { paddingHorizontal: 20 },
  row: {
    justifyContent: "flex-start", // Keeps cards aligned to left in large grids
    gap: 15,
    marginBottom: 20,
  },
  footerContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  footerText: { color: colors.gray, fontSize: 14, fontWeight: "500" },
  emptyContainer: { marginTop: 100, alignItems: "center", gap: 15 },
  emptyText: { color: colors.gray, fontSize: 16, textAlign: "center" },
});
