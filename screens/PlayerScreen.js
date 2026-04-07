import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
  StatusBar,
  Animated,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import * as FileSystem from "expo-file-system/legacy";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Play,
  Pause,
  XCircle,
  Download,
  CheckCircle,
  Star,
  Search,
  ChevronLeft,
  AlertCircle,
  Wifi,
  HardDrive,
} from "lucide-react-native";
import colors from "../theme/colors";
import MovieCard from "../components/MovieCard";
import { MOVIES } from "../data/data"; // Fix #2
import { useNavigation } from "@react-navigation/native";

// ─── Constants ────────────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const BASE_DIR = FileSystem.documentDirectory + "movies_orbit/";
const BANNER_HEIGHT = Math.round(SCREEN_HEIGHT * 0.32);

/**
 * Fix #1 — Per-movie file paths.
 * A ".done" sentinel file is written ONLY after downloadAsync() resolves
 * successfully. On app init we require BOTH the .mp4 AND the .done marker.
 * If the .mp4 exists without a marker (crash / partial download), it is deleted
 * so the user always gets a clean state.
 */
const getMovieFileUri = (id) => `${BASE_DIR}${id}.mp4`;
const getSnapshotUri = (id) => `${BASE_DIR}${id}.snapshot`;
const getDoneMarkerUri = (id) => `${BASE_DIR}${id}.done`;

// ─── Download State Machine ───────────────────────────────────────────────────
const DL_STATE = {
  IDLE: "IDLE",
  CHECKING: "CHECKING",
  DOWNLOADING: "DOWNLOADING",
  PAUSED: "PAUSED",
  DONE: "DONE",
  ERROR: "ERROR",
};

// ─── Dummy Cast ───────────────────────────────────────────────────────────────
const DUMMY_CAST = [
  { id: 1, name: "Bliss", img: "https://i.pravatar.cc/150?u=1" },
  { id: 2, name: "Mosto", img: "https://i.pravatar.cc/150?u=2" },
  { id: 3, name: "May", img: "https://i.pravatar.cc/150?u=3" },
  { id: 4, name: "Shary", img: "https://i.pravatar.cc/150?u=4" },
  { id: 5, name: "Ses", img: "https://i.pravatar.cc/150?u=5" },
  { id: 6, name: "Rino", img: "https://i.pravatar.cc/150?u=6" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatBytes = (bytes) => {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatDuration = (minutes) => {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const ProgressRing = ({ progress, size = 44, strokeWidth = 3 }) => (
  <View style={{ width: size, height: size, position: "relative" }}>
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: "rgba(255,140,0,0.25)",
      }}
    />
    <View
      style={{
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={styles.ringText}>{Math.round(progress * 100)}%</Text>
    </View>
  </View>
);

const MetaPill = ({
  icon: Icon,
  label,
  value,
  accentColor = colors.accent,
}) => (
  <View style={styles.metaPill}>
    {Icon && <Icon size={12} color={accentColor} />}
    <View>
      <Text style={styles.metaPillLabel}>{label}</Text>
      <Text style={styles.metaPillValue}>{value}</Text>
    </View>
  </View>
);

const SectionHeading = ({ title, rightNode }) => (
  <View style={styles.sectionRow}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {rightNode}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PlayerScreen({ route }) {
  const { movie } = route.params;
  const navigation = useNavigation();

  // Stable per-movie paths (won't change between renders)
  const MOVIE_FILE_URI = useRef(getMovieFileUri(movie.id)).current;
  const SNAPSHOT_URI = useRef(getSnapshotUri(movie.id)).current;
  const DONE_MARKER_URI = useRef(getDoneMarkerUri(movie.id)).current;

  // ── State ──
  const [localUri, setLocalUri] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [downloadState, setDownloadState] = useState(DL_STATE.CHECKING);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false); // Fix #4
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const downloadResumable = useRef(null);

  // Fix #2 — first 10 recommendations, current movie excluded
  const recommendations = MOVIES.filter((m) => m.id !== movie.id).slice(0, 10);

  // ── Video Player ──
  const activeUri = localUri ?? movie.link;
  const player = useVideoPlayer({ uri: activeUri }, (p) => {
    p.loop = false;
  });

  // Fix #4 — "playingChange" in expo-video ≥ 2.x passes an event object.
  // Guard both shapes (bare boolean from older builds, object from newer ones).
  useEffect(() => {
    const sub = player.addListener("playingChange", (eventOrBool) => {
      const playing =
        typeof eventOrBool === "boolean"
          ? eventOrBool
          : eventOrBool?.isPlaying ?? false;
      setIsVideoPlaying(playing);
    });
    return () => sub?.remove();
  }, [player]);

  // ── Init: verify directory + download completeness ──
  useEffect(() => {
    const init = async () => {
      try {
        // 1. Ensure storage directory exists
        const dirInfo = await FileSystem.getInfoAsync(BASE_DIR);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(BASE_DIR, {
            intermediates: true,
          });
        }

        // Fix #1 — Check BOTH the mp4 AND the ".done" marker in parallel
        const [fileInfo, markerInfo] = await Promise.all([
          FileSystem.getInfoAsync(MOVIE_FILE_URI),
          FileSystem.getInfoAsync(DONE_MARKER_URI),
        ]);

        if (fileInfo.exists && markerInfo.exists) {
          // ✅ Fully downloaded — both file and completion marker present
          setLocalUri(MOVIE_FILE_URI);
          setDownloadState(DL_STATE.DONE);
          animateBanner();
          return;
        }

        if (fileInfo.exists && !markerInfo.exists) {
          // ⚠️ Partial/corrupt file (crash during download) — delete it
          await FileSystem.deleteAsync(MOVIE_FILE_URI, { idempotent: true });
        }

        // 3. Check for a paused download snapshot
        const snapInfo = await FileSystem.getInfoAsync(SNAPSHOT_URI);
        if (snapInfo.exists) {
          try {
            const snapRaw = await FileSystem.readAsStringAsync(SNAPSHOT_URI);
            const snapData = JSON.parse(snapRaw);
            downloadResumable.current = FileSystem.createDownloadResumable(
              movie.link,
              MOVIE_FILE_URI,
              {},
              progressCallback,
              snapData
            );
            setDownloadState(DL_STATE.PAUSED);
          } catch (_) {
            // Corrupt snapshot — discard and let user start fresh
            await FileSystem.deleteAsync(SNAPSHOT_URI, { idempotent: true });
            setDownloadState(DL_STATE.IDLE);
          }
        } else {
          setDownloadState(DL_STATE.IDLE);
        }

        animateBanner();
      } catch (e) {
        console.error("[PlayerScreen] init error:", e);
        setDownloadState(DL_STATE.IDLE);
        animateBanner();
      }
    };

    init();

    return () => {
      // On unmount while actively downloading → save snapshot so it can be resumed
      if (downloadResumable.current) {
        saveSnapshotOnUnmount();
      }
    };
  }, []);

  const animateBanner = () => {
    Animated.timing(bannerOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const saveSnapshotOnUnmount = async () => {
    try {
      const snapshot = await downloadResumable.current.pauseAsync();
      if (snapshot?.resumeData) {
        await FileSystem.writeAsStringAsync(
          SNAPSHOT_URI,
          JSON.stringify(snapshot.resumeData)
        );
      }
    } catch (_) {}
  };

  // ── Progress Callback ──
  const progressCallback = useCallback((progressData) => {
    const { totalBytesWritten, totalBytesExpectedToWrite } = progressData;
    const pct =
      totalBytesExpectedToWrite > 0
        ? totalBytesWritten / totalBytesExpectedToWrite
        : 0;
    setDownloadProgress(pct);
    setDownloadedBytes(totalBytesWritten);
    setTotalBytes(totalBytesExpectedToWrite);
  }, []);

  // ── Download Actions ──
  const startDownload = async () => {
    setErrorMsg(null);
    setDownloadState(DL_STATE.DOWNLOADING);
    setDownloadProgress(0);
    setDownloadedBytes(0);
    setTotalBytes(0);

    downloadResumable.current = FileSystem.createDownloadResumable(
      movie.link,
      MOVIE_FILE_URI,
      {},
      progressCallback
    );

    try {
      const result = await downloadResumable.current.downloadAsync();

      if (result?.uri) {
        // Fix #1 — Write the ".done" marker ONLY after successful completion
        await FileSystem.writeAsStringAsync(DONE_MARKER_URI, "1");
        await FileSystem.deleteAsync(SNAPSHOT_URI, { idempotent: true });
        setLocalUri(result.uri);
        setDownloadState(DL_STATE.DONE);
      } else {
        throw new Error("Download returned no URI");
      }
    } catch (e) {
      if (
        e?.message?.toLowerCase().includes("cancelled") ||
        e?.code === "ERR_TASK_CANCELLED"
      ) {
        return; // User triggered cancel — cancelDownload() handles cleanup
      }
      console.error("[PlayerScreen] download error:", e);
      setErrorMsg("Download failed. Check your connection and try again.");
      setDownloadState(DL_STATE.ERROR);
    }
  };

  const pauseDownload = async () => {
    if (!downloadResumable.current) return;
    try {
      const snapshot = await downloadResumable.current.pauseAsync();
      if (snapshot?.resumeData) {
        await FileSystem.writeAsStringAsync(
          SNAPSHOT_URI,
          JSON.stringify(snapshot.resumeData)
        );
      }
      setDownloadState(DL_STATE.PAUSED);
    } catch (e) {
      console.error("[PlayerScreen] pause error:", e);
    }
  };

  const resumeDownload = async () => {
    if (!downloadResumable.current) return;
    setErrorMsg(null);
    setDownloadState(DL_STATE.DOWNLOADING);
    try {
      const result = await downloadResumable.current.resumeAsync();
      if (result?.uri) {
        // Fix #1 — also write marker on resume completion
        await FileSystem.writeAsStringAsync(DONE_MARKER_URI, "1");
        await FileSystem.deleteAsync(SNAPSHOT_URI, { idempotent: true });
        setLocalUri(result.uri);
        setDownloadState(DL_STATE.DONE);
      }
    } catch (e) {
      console.error("[PlayerScreen] resume error:", e);
      setErrorMsg("Resume failed. Try downloading again.");
      setDownloadState(DL_STATE.ERROR);
    }
  };

  const cancelDownload = async () => {
    if (!downloadResumable.current) return;
    try {
      await downloadResumable.current.cancelAsync();
    } catch (_) {}
    downloadResumable.current = null;
    // Remove partial file, snapshot, and any accidental marker
    await Promise.all([
      FileSystem.deleteAsync(MOVIE_FILE_URI, { idempotent: true }),
      FileSystem.deleteAsync(SNAPSHOT_URI, { idempotent: true }),
      FileSystem.deleteAsync(DONE_MARKER_URI, { idempotent: true }),
    ]);
    setDownloadProgress(0);
    setDownloadedBytes(0);
    setTotalBytes(0);
    setDownloadState(DL_STATE.IDLE);
  };

  const deleteLocalFile = async () => {
    await Promise.all([
      FileSystem.deleteAsync(MOVIE_FILE_URI, { idempotent: true }),
      FileSystem.deleteAsync(DONE_MARKER_URI, { idempotent: true }),
      FileSystem.deleteAsync(SNAPSHOT_URI, { idempotent: true }),
    ]);
    downloadResumable.current = null;
    setLocalUri(null);
    setDownloadProgress(0);
    setDownloadState(DL_STATE.IDLE);
  };

  // ── Video Controls (Fix #4) ──
  // Read player.playing directly to avoid stale closure; don't rely solely on state.
  const togglePlayPause = useCallback(() => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player]);

  const handleBannerPress = () => {
    setShowVideoPlayer(true);
    // Small delay so VideoView mounts before we call play
    setTimeout(() => player.play(), 80);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // ── Render ──
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── 1. Banner / Video Area ── */}
        <Animated.View
          style={[styles.bannerContainer, { opacity: bannerOpacity }]}
        >
          {showVideoPlayer ? (
            <VideoView
              player={player}
              style={styles.videoView}
              contentFit="cover"
              allowsFullscreen
              allowsPictureInPicture
              nativeControls={true} // We manage play/pause ourselves
            />
          ) : (
            <>
              <Image
                source={{ uri: movie.image }}
                style={styles.bannerImage}
                resizeMode="cover"
              />
              <View style={styles.playOverlay}>
                <TouchableOpacity
                  style={styles.playCircle}
                  onPress={handleBannerPress}
                  activeOpacity={0.85}
                >
                  <Play
                    fill="white"
                    color="white"
                    size={28}
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
                {localUri && (
                  <View style={styles.offlineBadge}>
                    <HardDrive size={12} color="#4ADE80" />
                    <Text style={styles.offlineBadgeText}>Offline Ready</Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Back button — always on top */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft color="white" size={26} />
          </TouchableOpacity>

          {/*
           * Fix #4 — Play/Pause button.
           * - Rendered inside bannerContainer so `position: absolute` coords are
           *   relative to the video area (bottom: 16, left: 16).
           * - zIndex: 10 ensures it paints above VideoView on both iOS and Android.
           * - Icon driven by `isVideoPlaying` state which is kept in sync via the
           *   "playingChange" listener above.
           */}
          {showVideoPlayer && (
            <TouchableOpacity
              style={styles.videoControlBtn}
              onPress={togglePlayPause}
              activeOpacity={0.8}
            >
              {isVideoPlaying ? (
                <Pause fill="white" color="white" size={20} />
              ) : (
                <Play
                  fill="white"
                  color="white"
                  size={20}
                  style={{ marginLeft: 2 }}
                />
              )}
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* ── Content ── */}
        <View style={styles.contentPadding}>
          {/* ── 2. Title & Metadata ── */}
          <Text style={styles.movieTitle} numberOfLines={2}>
            {movie.title || "Untitled Movie"}
          </Text>

          <View style={styles.metaRow}>
            <MetaPill label="Release" value={movie.year || "2024"} />
            <MetaPill
              icon={Star}
              label="Rating"
              value={movie.rating ? `${movie.rating}/10` : "8.2/10"}
              accentColor="#FF8C00"
            />
            <MetaPill
              label="Duration"
              value={formatDuration(movie.duration || 120)}
            />
            <MetaPill label="Genre" value={movie.genre || "Action"} />
          </View>

          <Text style={styles.description} numberOfLines={4}>
            {movie.description ||
              "An epic adventure across multiple dimensions where heroes and villains collide in ways no one could have predicted. A must-watch for fans of the genre."}
          </Text>

          {/* ── 3. Download Management ── */}
          <SectionHeading title="Storage" />
          <DownloadSection
            state={downloadState}
            progress={downloadProgress}
            downloadedBytes={downloadedBytes}
            totalBytes={totalBytes}
            errorMsg={errorMsg}
            localUri={localUri}
            onStart={startDownload}
            onPause={pauseDownload}
            onResume={resumeDownload}
            onCancel={cancelDownload}
            onDelete={deleteLocalFile}
          />

          {/* ── 4. Cast ── */}
          <SectionHeading title="Cast" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.castScrollContent}
          >
            {(movie.cast || DUMMY_CAST).map((person) => (
              <TouchableOpacity
                key={person.id}
                style={styles.castMember}
                activeOpacity={0.75}
              >
                <Image source={{ uri: person.img }} style={styles.castAvatar} />
                <Text style={styles.castName} numberOfLines={1}>
                  {person.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── 5. Recommendations ── */}
          {/* Fix #3 — Browse navigates to Search screen */}
          {/* Fix #2 — first 10 real movies from MOVIES data, excluding current */}
          <SectionHeading
            title="You May Also Like"
            rightNode={
              <TouchableOpacity
                style={styles.searchBtn}
                activeOpacity={0.75}
                onPress={() => {
                  navigation.navigate("MainTabs", { screen: "Search" });
                }}
              >
                <Search color="white" size={14} />
                <Text style={styles.searchBtnText}>Browse</Text>
              </TouchableOpacity>
            }
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recommendScroll}
          >
            {recommendations.map((m) => (
              <MovieCard
                key={m.id}
                movie={m}
                width={SCREEN_WIDTH * 0.38}
                onPress={() => navigation.push("Player", { movie: m })}
              />
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Download Section Sub-Component ──────────────────────────────────────────
function DownloadSection({
  state,
  progress,
  downloadedBytes,
  totalBytes,
  errorMsg,
  localUri,
  onStart,
  onPause,
  onResume,
  onCancel,
  onDelete,
}) {
  switch (state) {
    case DL_STATE.CHECKING:
      return (
        <View style={[styles.dlCard, styles.dlCardRow]}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.dlStatusText}>Checking local storage…</Text>
        </View>
      );

    case DL_STATE.IDLE:
      return (
        <TouchableOpacity
          style={[styles.dlCard, styles.dlCardRow, styles.dlCardAccent]}
          onPress={onStart}
          activeOpacity={0.8}
        >
          <View style={styles.dlIconWrap}>
            <Download color="#FF8C00" size={20} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.dlActionTitle}>Download for Offline</Text>
            <Text style={styles.dlActionSub}>Watch without internet</Text>
          </View>
          {/* <Wifi color={GRAY} size={16} /> */}
        </TouchableOpacity>
      );

    case DL_STATE.DOWNLOADING:
      return (
        <View style={styles.dlCard}>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.round(progress * 100)}%` },
              ]}
            />
          </View>
          <View style={[styles.dlCardRow, { marginTop: 12 }]}>
            <ProgressRing progress={progress} size={48} strokeWidth={3} />
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={styles.dlActionTitle}>Downloading…</Text>
              <Text style={styles.dlActionSub}>
                {formatBytes(downloadedBytes)} /{" "}
                {totalBytes > 0 ? formatBytes(totalBytes) : "—"}
              </Text>
            </View>
            <View style={styles.dlActions}>
              <TouchableOpacity
                style={styles.dlActionBtn}
                onPress={onPause}
                activeOpacity={0.75}
              >
                <Pause color="white" size={16} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dlActionBtn, styles.dlCancelBtn]}
                onPress={onCancel}
                activeOpacity={0.75}
              >
                <XCircle color="#FF4444" size={16} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );

    case DL_STATE.PAUSED:
      return (
        <View style={styles.dlCard}>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                styles.progressBarPaused,
                { width: `${Math.round(progress * 100)}%` },
              ]}
            />
          </View>
          <View style={[styles.dlCardRow, { marginTop: 12 }]}>
            <View
              style={[
                styles.dlIconWrap,
                { backgroundColor: "rgba(255,140,0,0.1)" },
              ]}
            >
              <Pause color="#FF8C00" size={18} />
            </View>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={styles.dlActionTitle}>
                Paused — {Math.round(progress * 100)}% done
              </Text>
              <Text style={styles.dlActionSub}>Tap resume to continue</Text>
            </View>
            <View style={styles.dlActions}>
              <TouchableOpacity
                style={[styles.dlActionBtn, styles.dlResumeBtn]}
                onPress={onResume}
                activeOpacity={0.75}
              >
                <Play
                  fill="white"
                  color="white"
                  size={16}
                  style={{ marginLeft: 2 }}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dlActionBtn, styles.dlCancelBtn]}
                onPress={onCancel}
                activeOpacity={0.75}
              >
                <XCircle color="#FF4444" size={16} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );

    case DL_STATE.DONE:
      return (
        <View style={styles.dlCard}>
          <View style={styles.dlCardRow}>
            <View
              style={[
                styles.dlIconWrap,
                { backgroundColor: "rgba(74,222,128,0.12)" },
              ]}
            >
              <CheckCircle color="#4ADE80" size={20} />
            </View>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={[styles.dlActionTitle, { color: "#4ADE80" }]}>
                Saved Offline
              </Text>
              <Text style={styles.dlActionSub}>Stored in movies_orbit</Text>
            </View>
            <TouchableOpacity
              onPress={onDelete}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.75}
            >
              <XCircle color={GRAY} size={20} />
            </TouchableOpacity>
          </View>
        </View>
      );

    case DL_STATE.ERROR:
      return (
        <View style={styles.dlCard}>
          <View style={styles.dlCardRow}>
            <View
              style={[
                styles.dlIconWrap,
                { backgroundColor: "rgba(255,68,68,0.12)" },
              ]}
            >
              <AlertCircle color="#FF4444" size={20} />
            </View>
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={[styles.dlActionTitle, { color: "#FF6B6B" }]}>
                Download Failed
              </Text>
              <Text style={styles.dlActionSub} numberOfLines={2}>
                {errorMsg || "An unexpected error occurred."}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.dlActionBtn, styles.dlResumeBtn]}
              onPress={onStart}
              activeOpacity={0.75}
            >
              <Download color="white" size={14} />
            </TouchableOpacity>
          </View>
        </View>
      );

    default:
      return null;
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ACCENT = "#FF8C00";
const BG = "#0E0E10";
const CARD_BG = "#1A1A1E";
const GRAY = "#7A7A8C";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  contentPadding: { paddingHorizontal: 20, paddingTop: 6 },

  // ── Banner ──
  bannerContainer: {
    width: "100%",
    height: BANNER_HEIGHT,
    position: "relative",
    backgroundColor: "#111",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  videoView: {
    width: "100%",
    height: "100%",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.28)",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  playCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ACCENT,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  offlineBadge: {
    position: "absolute",
    bottom: 18,
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
  },
  offlineBadgeText: {
    color: "#4ADE80",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  backBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 14 : 20,
    left: 16,
    zIndex: 10, // Above video layer
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 14,
    padding: 6,
  },
  // Fix #4 — correct positioning + zIndex
  videoControlBtn: {
    position: "absolute",
    bottom: 16,
    left: 16,
    zIndex: 10, // Must be above VideoView
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 14,
    padding: 9,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 8, // Android equivalent
  },

  // ── Title & Meta ──
  movieTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 22,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  metaRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    flexWrap: "wrap",
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: CARD_BG,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  metaPillLabel: {
    color: GRAY,
    fontSize: 10,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metaPillValue: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  description: {
    color: "#9090A0",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 16,
  },

  // ── Sections ──
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 28,
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },

  // ── Cast ──
  castScrollContent: { paddingBottom: 4, gap: 16 },
  castMember: { alignItems: "center", width: 68 },
  castAvatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#2A2A32",
    borderWidth: 2,
    borderColor: "rgba(255,140,0,0.2)",
  },
  castName: {
    color: GRAY,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 7,
    textAlign: "center",
  },

  // ── Download Card ──
  dlCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  dlCardRow: { flexDirection: "row", alignItems: "center" },
  dlCardAccent: { borderColor: "rgba(255,140,0,0.2)" },
  dlIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,140,0,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  dlActionTitle: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  dlActionSub: { color: GRAY, fontSize: 12, marginTop: 2 },
  dlStatusText: { color: GRAY, fontSize: 13, marginLeft: 10 },
  dlActions: { flexDirection: "row", gap: 8 },
  dlActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#2A2A34",
    justifyContent: "center",
    alignItems: "center",
  },
  dlCancelBtn: { backgroundColor: "rgba(255,68,68,0.1)" },
  dlResumeBtn: { backgroundColor: ACCENT },

  // Progress Bar
  progressBarBg: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: ACCENT,
    borderRadius: 2,
  },
  progressBarPaused: { backgroundColor: "#7A7A8C" },

  // Ring
  ringText: { color: ACCENT, fontSize: 11, fontWeight: "800" },

  // ── Search / Browse ──
  searchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: CARD_BG,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  searchBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },

  // ── Recommendations (Fix #2 — horizontal scroll) ──
  recommendScroll: {
    gap: 12,
    paddingBottom: 8,
  },
});
