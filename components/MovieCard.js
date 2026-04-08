import React, { memo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Heart, Star } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import colors from "../theme/colors";
import { Image } from "expo-image";

export const CARD_HEIGHT = 280;

const MovieCard = memo(({ movie, width }) => {
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigation.navigate("Player", { movie })}
      style={[styles.card, { width: width, height: CARD_HEIGHT }]}
    >
      {loading && (
        <View style={[StyleSheet.absoluteFill, styles.skeleton]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      <View style={styles.imageContainer}>
        <Image
          source={{ uri: movie.image }}
          style={styles.image}
          contentFit="cover"
          cachePolicy={"memory-disk"}
          onLoadEnd={() => setLoading(false)}
        />
        <TouchableOpacity style={styles.heart}>
          <Heart size={16} color="white" fill={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {movie.title}
        </Text>
        <View style={styles.ratingRow}>
          <Text style={styles.rating}>{movie.rating}</Text>
          <Star size={12} color={colors.primary} fill={colors.primary} />
          <Text style={styles.totalRating}> / 5</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: 20,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: colors.card,
  },
  skeleton: {
    backgroundColor: "#1A2133",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  imageContainer: { width: "100%", height: 200 },
  image: { width: "100%", height: "100%" },
  heart: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: colors.primary,
    padding: 6,
    borderRadius: 12,
  },
  info: { padding: 10 },
  title: { color: "white", fontWeight: "bold", fontSize: 14 },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  rating: { color: colors.gray, fontSize: 12 },
  totalRating: { color: colors.gray, fontSize: 12 },
});

export default MovieCard;
