import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search, Mic, PlayCircle, X } from "lucide-react-native";
import { MOVIES } from "../data/data";
import colors from "../theme/colors";
import { useNavigation } from "@react-navigation/native"; // Added Import

const { width } = Dimensions.get("window");

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation(); // Initialize navigation
  const [searchQuery, setSearchQuery] = useState("");

  // Filter logic for real-time search
  const filteredMovies = useMemo(() => {
    if (!searchQuery.trim()) return MOVIES.slice(0, 8); // Show trending if empty
    return MOVIES.filter((movie) =>
      movie.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const renderSearchItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      style={styles.movieRow}
      onPress={() => {
        // Navigates to the Player screen defined in RootStack
        navigation.navigate("Player", { movie: item });
      }}
    >
      <Image source={{ uri: item.image }} style={styles.thumbnail} />
      <Text style={styles.movieTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <PlayCircle size={24} color="white" strokeWidth={1.5} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {/* Search Bar Section */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchContainer}>
          <Search size={20} color={colors.gray} style={styles.searchIcon} />
          <TextInput
            placeholder="Search movies, genres..."
            placeholderTextColor={colors.gray}
            style={styles.input}
            value={searchQuery}
            onChangeText={setSearchQuery}
            selectionColor={colors.primary}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={20} color="white" />
            </TouchableOpacity>
          ) : (
            <Mic size={20} color={colors.gray} />
          )}
        </View>
      </View>

      {/* Results / Trending Section */}
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>
          {searchQuery ? "Results" : "Top Searches"}
        </Text>

        <FlatList
          data={filteredMovies}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSearchItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Oh! We couldn't find "{searchQuery}"
            </Text>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchBarWrapper: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "white",
    fontSize: 16,
    fontWeight: "400",
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 20,
    letterSpacing: 0.5,
  },
  movieRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
    marginBottom: 10,
    borderRadius: 5,
    overflow: "hidden",
    paddingRight: 15,
  },
  thumbnail: {
    width: width * 0.35,
    height: 80,
    resizeMode: "cover",
    marginRight: 15,
  },
  movieTitle: {
    flex: 1,
    color: "white",
    fontSize: 15,
    fontWeight: "500",
  },
  emptyText: {
    color: colors.gray,
    textAlign: "center",
    marginTop: 50,
    fontSize: 14,
  },
});
