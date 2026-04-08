import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Animated,
  Alert,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import * as FileSystem from "expo-file-system/legacy";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Play,
  Pause,
  Download,
  CheckCircle,
  Star,
  Search,
  ChevronLeft,
  AlertCircle,
  HardDrive,
} from "lucide-react-native";
import colors from "../theme/colors";
import MovieCard from "../components/MovieCard";
import { MOVIES } from "../data/data";
import { useNavigation } from "@react-navigation/native";
import { DownloadService } from "../service/DownloadService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
// Temporary cache directory for the download process
const TEMP_DOWNLOAD_PATH = FileSystem.cacheDirectory + "temp_movie.mp4";

const DL_STATE = {
  IDLE: "IDLE",
  DOWNLOADING: "DOWNLOADING",
  DONE: "DONE",
  ERROR: "ERROR",
};

function PlayerScreen({ route }) {
  const { movie } = route.params;
  const navigation = useNavigation();

  // ── State ──
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const [localUri, setLocalUri] = useState(null);
  const [partialProgress, setPartialProgress] = useState(0);

  const recommendations = MOVIES.filter((m) => m.id !== movie.id).slice(0, 10);

  const player = useVideoPlayer(localUri ? localUri : movie.link);

  useEffect(() => {
    Animated.timing(bannerOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    checkLocalFile();
  }, []);

  const checkLocalFile = async () => {
    try {
      await DownloadService.clearAllDownloads();

      const isDownloaded = await DownloadService.isDownloaded(movie);

      if (isDownloaded) {
        const path = DownloadService.getFilePath(movie);
        setLocalUri(path);
        setPartialProgress(100);
        return;
      }

      // 📊 check progress
      const progress = await DownloadService.getProgress(movie);

      if (progress > 0 && progress < 100) {
        setPartialProgress(progress);
      } else {
        setPartialProgress(0);
      }
    } catch (error) {
      console.error("checkLocalFile error:", error);
      setPartialProgress(0);
      setLocalUri(null);
    }
  };

  // ── Download & Save Logic ──
  const handleDownloadPress = async () => {
    try {
      const status = await DownloadService.startDownload(movie, (progress) => {
        setPartialProgress(progress);

        if (progress === 100) {
          setLocalUri(DownloadService.getFilePath(movie));
        }
      });

      if (!status) return;

      if (status === "DONE") {
        setPartialProgress(100);
        setLocalUri(DownloadService.getFilePath(movie));
      }
    } catch (e) {
      console.error("handleDownloadPress error:", e);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" transparent translucent />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Banner Area */}
        <Animated.View
          style={[styles.bannerContainer, { opacity: bannerOpacity }]}
        >
          {showVideoPlayer ? (
            <VideoView
              player={player}
              style={styles.videoView}
              contentFit="cover"
              nativeControls
            />
          ) : (
            <>
              <Image
                contentFit="cover"
                cachePolicy="memory-disk"
                source={{ uri: movie.image }}
                style={styles.bannerImage}
              />
              <TouchableOpacity
                style={styles.playCircle}
                onPress={() => {
                  setShowVideoPlayer(true);
                  player.play();
                }}
              >
                <Play
                  fill="white"
                  color="white"
                  size={28}
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft color="white" size={26} />
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.contentPadding}>
          <Text style={styles.movieTitle}>{movie.title}</Text>

          {/* YouTube Style Download Button */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.downloadBtn}
              onPress={handleDownloadPress}
            >
              {localUri ? (
                <>
                  <CheckCircle size={20} color={colors.primary} />
                  <Text style={styles.dlText}>Downloaded</Text>
                </>
              ) : partialProgress > 0 && partialProgress < 100 ? (
                <>
                  <Pause size={20} color="white" />
                  <Text style={styles.dlText}>{partialProgress}% Pause</Text>
                </>
              ) : (
                <>
                  <Download size={20} color="white" />
                  <Text style={styles.dlText}>Download</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryAction}>
              <Star size={20} color={colors.gray} />
              <Text style={styles.secondaryText}>Rate</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>{movie.description}</Text>

          {/* Recommendations */}
          <Text style={styles.sectionTitle}>You May Also Like</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recommendScroll}
          >
            {recommendations.map((m) => (
              <MovieCard
                key={m.id}
                movie={m}
                width={SCREEN_WIDTH * 0.35}
                onPress={() => navigation.push("Player", { movie: m })}
              />
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default React.memo(PlayerScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  bannerContainer: { width: "100%", height: 250, backgroundColor: "#000" },
  bannerImage: { width: "100%", height: "100%", opacity: 0.7 },
  videoView: { width: "100%", height: "100%" },
  playCircle: {
    position: "absolute",
    top: "40%",
    left: "42%",
    backgroundColor: colors.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  backBtn: {
    position: "absolute",
    top: 20,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 8,
  },
  contentPadding: { padding: 20 },
  movieTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
  },
  actionRow: { flexDirection: "row", marginBottom: 20, gap: 15 },
  downloadBtn: {
    flexDirection: "row",
    backgroundColor: colors.card,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
    minWidth: 140,
    justifyContent: "center",
  },
  doneBtn: { borderColor: colors.primary, borderWidth: 1 },
  progressContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  dlText: { color: "white", marginLeft: 8, fontWeight: "600" },
  secondaryAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  secondaryText: { color: colors.gray, marginLeft: 8 },
  description: { color: colors.gray, lineHeight: 22, marginBottom: 25 },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  recommendScroll: { gap: 15 },
});
