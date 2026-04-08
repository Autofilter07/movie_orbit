import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Download,
  FolderArchive,
  PlayCircle,
  Trash2,
} from "lucide-react-native";
import * as FileSystem from "expo-file-system/legacy";
import colors from "../theme/colors";
import { DownloadService } from "../service/DownloadService";

// Import your shared download service here
// If you haven't made one, this screen will poll for active downloads

export default function DownloadsScreen({ navigation }) {
  const MOVIE_FOLDER = FileSystem.documentDirectory + "MoviesOrbit/";
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const [downloads, setDownloads] = useState([]);
  const [activeDownloads, setActiveDownloads] = useState([]);

  // --- RESPONSIVE GRID CALCULATION ---
  const SCREEN_PADDING = 20;
  const COLUMN_GAP = 15;
  const NUM_COLUMNS = SCREEN_WIDTH > 600 ? 4 : 2;
  const CARD_WIDTH =
    (SCREEN_WIDTH - SCREEN_PADDING * 2 - COLUMN_GAP * (NUM_COLUMNS - 1)) /
    NUM_COLUMNS;

  // downloasd screen sync
  useEffect(() => {
    DownloadService.initFolder();
    fetchDownloads();

    const interval = setInterval(() => {
      setActiveDownloads(Object.values(DownloadService.activeDownload || {}));
      fetchDownloads();
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const fetchDownloads = async () => {
    try {
      const dir = await FileSystem.getInfoAsync(MOVIE_FOLDER);

      if (!dir.exists) {
        setDownloads([]);
        return;
      }

      const files = await FileSystem.readDirectoryAsync(MOVIE_FOLDER);

      const data = files.map((f) => ({
        filename: f,
        uri: MOVIE_FOLDER + f,
      }));

      setDownloads(data);
    } catch (e) {
      console.log("Fetch error:", e);
    }
  };

  const handleDelete = (item) => {
    Alert.alert("Delete Movie", `Remove ${item.filename}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const success = await DownloadService.deleteDownload(item.uri);

          if (success) {
            fetchDownloads();
          }
        },
      },
    ]);
  };

  const renderActiveItem = ({ item }) => (
    <View style={[styles.card, { width: CARD_WIDTH, opacity: 0.7 }]}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.movie.image }} style={styles.thumbnail} />

        <View style={styles.playOverlay}>
          <ActivityIndicator color={colors.primary} />
        </View>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={async () => {
            Alert.alert("Cancel Download", item.movie.title, [
              { text: "Cancel" },
              {
                text: "Stop",
                style: "destructive",
                onPress: async () => {
                  await DownloadService.cancelDownload(item.movie);
                },
              },
            ]);
          }}
        >
          <Trash2 size={18} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.title}>{item.movie.title}</Text>

        <Text style={styles.progressText}>
          Downloading {Math.round(item.progress * 100)}%
        </Text>
      </View>
    </View>
  );

  const renderLibraryItem = useCallback(
    ({ item }) => (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.card, { width: CARD_WIDTH }]}
        onPress={() =>
          navigation.push("Player", {
            movie: {
              title: item.filename,
              image: item.uri,
              link: item.uri,
            },
          })
        }
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.uri }}
            style={styles.thumbnail}
            resizeMode="cover"
          />

          <View style={styles.playOverlay}>
            <PlayCircle size={32} color="white" strokeWidth={1.5} />
          </View>

          {/* DELETE BUTTON */}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item)}
          >
            <Trash2 size={18} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {item.filename}
          </Text>

          <Text style={styles.sizeText}>Offline Video</Text>
        </View>
      </TouchableOpacity>
    ),
    [CARD_WIDTH, navigation]
  );

  // Combine lists for the UI
  const allData = [...activeDownloads, ...downloads];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Downloads</Text>
          <Text style={styles.headerSubtitle}>
            {allData.length} items total
          </Text>
        </View>
        <Download size={24} color={colors.primary} />
      </View>

      {allData.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.iconCircle}>
            <FolderArchive size={40} color={colors.gray} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>No downloads found</Text>
          <Text style={styles.emptySubtitle}>
            Movies you download will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          key={NUM_COLUMNS}
          data={allData}
          keyExtractor={(item, index) =>
            item.movie ? item.movie.link : item.filename + index
          }
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) =>
            item.movie
              ? renderActiveItem({ item })
              : renderLibraryItem({ item })
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: { color: "white", fontSize: 28, fontWeight: "bold" },
  headerSubtitle: { color: colors.gray, fontSize: 14, marginTop: 4 },
  listContent: { paddingHorizontal: 20 },
  row: { justifyContent: "flex-start", gap: 15, marginBottom: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 15,
    overflow: "hidden",
    elevation: 5,
  },
  imageContainer: { width: "100%", height: 120, position: "relative" },
  thumbnail: { width: "100%", height: "100%" },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  infoContainer: { padding: 10 },
  title: { color: "white", fontSize: 14, fontWeight: "600" },
  sizeText: {
    color: colors.primary,
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  progressText: { color: colors.primary, fontSize: 10, marginTop: 2 },
  centered: {
    flex: 1,
    justifyContent: "center",
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
  emptySubtitle: { color: colors.gray, fontSize: 14, textAlign: "center" },
  emptyText: { color: colors.gray, fontSize: 16 },
  deleteBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 6,
    borderRadius: 20,
  },
});
