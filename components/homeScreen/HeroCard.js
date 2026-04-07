import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  useWindowDimensions, // Added for responsiveness
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import colors from "../../theme/colors";
import { MOVIES } from "../../data/data";
import { useNavigation } from "@react-navigation/native";

const HERO_DATA = MOVIES.slice(4, 8);

export default function HeroCard() {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const flatListRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const navigation = useNavigation();

  // Determine if we are in landscape to adjust height
  const isLandscape = SCREEN_WIDTH > SCREEN_HEIGHT;

  // 1. Synchronize dots with manual scroll
  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    // Use dynamic SCREEN_WIDTH here
    const index = Math.round(scrollPosition / SCREEN_WIDTH);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  // 2. Auto-scroll Logic
  useEffect(() => {
    const timer = setInterval(() => {
      let nextIndex = (activeIndex + 1) % HERO_DATA.length;

      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    }, 4000); // Increased to 4s for better UX

    return () => clearInterval(timer);
  }, [activeIndex, HERO_DATA.length]);

  const renderItem = ({ item }) => (
    <View style={[styles.cardContainer, { width: SCREEN_WIDTH }]}>
      <ImageBackground
        source={{ uri: item.image }}
        style={[
          styles.hero,
          { height: isLandscape ? SCREEN_HEIGHT * 0.7 : 210 }, // Responsive height
        ]}
        imageStyle={{ borderRadius: 20 }}
      >
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.9)"]}
          style={styles.gradient}
        >
          <View style={styles.textContainer}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.tag}</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                navigation.navigate("Player", { movie: item });
              }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Watch Now</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );

  return (
    <View
      style={[
        styles.wrapper,
        { height: isLandscape ? SCREEN_HEIGHT * 0.8 : 250 },
      ]}
    >
      <FlatList
        ref={flatListRef}
        data={HERO_DATA}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id.toString()}
        onMomentumScrollEnd={handleScroll}
        snapToAlignment="center"
        decelerationRate="fast"
        // Key optimization: ensures FlatList re-renders on rotation
        extraData={SCREEN_WIDTH}
        getItemLayout={(data, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Synchronized Pagination Dots */}
      <View style={styles.pagination}>
        {HERO_DATA.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i === activeIndex ? colors.primary : "rgba(255,255,255,0.3)",
                width: i === activeIndex ? 22 : 8,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 10,
    position: "relative",
  },
  cardContainer: {
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  hero: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
  },
  gradient: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 20,
  },
  textContainer: {
    gap: 2,
  },
  title: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  subtitle: {
    color: "#ccc",
    fontSize: 14,
    marginBottom: 8,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  pagination: {
    flexDirection: "row",
    position: "absolute",
    bottom: 5,
    alignSelf: "center",
  },
  dot: {
    height: 5,
    borderRadius: 3,
    marginHorizontal: 3,
  },
});
