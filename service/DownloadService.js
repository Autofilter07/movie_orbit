import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as MediaLibrary from "expo-media-library";
import * as Notifications from "expo-notifications";
import { Alert, AppState } from "react-native";

const MOVIE_FOLDER = FileSystem.documentDirectory + "MoviesOrbit/";

export const DownloadService = {
  activeDownload: null,

  async initFolder() {
    try {
      const dir = await FileSystem.getInfoAsync(MOVIE_FOLDER);

      if (!dir.exists) {
        await FileSystem.makeDirectoryAsync(MOVIE_FOLDER, {
          intermediates: true,
        });
      }
    } catch (e) {
      console.error("initFolder error:", e);
    }
  },

  getFilePath(movie) {
    return (
      MOVIE_FOLDER + movie.title.replace(/\s/g, "_").toLowerCase() + ".mp4"
    );
  },

  async isDownloading(movie) {
    try {
      if (!this.activeDownload) return false;
      return this.activeDownload.movie.link === movie.link;
    } catch {
      return false;
    }
  },

  async isDownloaded(movie) {
    try {
      const fileUri = this.getFilePath(movie);

      try {
        const file = await FileSystem.getInfoAsync(fileUri);
        if (file.exists) return true;
      } catch (e) {
        console.error("FileSystem check error:", e);
      }

      try {
        const hasPermission = await this.requestMediaLibraryPermission();

        if (!hasPermission) return false;

        const album = await MediaLibrary.getAlbumAsync("MoviesOrbit");

        if (album) {
          const assets = await MediaLibrary.getAssetsAsync({
            album,
            mediaType: "video",
            // first: 1000,
          });

          const target = assets.assets.find(
            (a) =>
              a.filename ===
              movie.title.replace(/\s/g, "_").toLowerCase() + ".mp4"
          );

          if (target) return true;
        }
      } catch (e) {
        console.error("MediaLibrary check error:", e);
      }

      return false;
    } catch (error) {
      console.error("isDownloaded error:", error);
      return false;
    }
  },

  async getProgress(movie) {
    try {
      const saved = await AsyncStorage.getItem(`download_${movie.link}`);
      if (!saved) return 0;

      const data = JSON.parse(saved);
      return Math.floor(data.progress * 100);
    } catch (e) {
      console.error("getProgress error:", e);
      return 0;
    }
  },

  async startDownload(movie, onProgress) {
    try {
      await this.initFolder();

      const fileUri = this.getFilePath(movie);
      const fileName = movie.title.replace(/\s/g, "_").toLowerCase() + ".mp4";

      // ==============================
      // ✅ Check in App Folder
      // ==============================
      try {
        const exists = await FileSystem.getInfoAsync(fileUri);

        if (exists.exists) {
          Alert.alert(
            "Already Downloaded",
            "Movie already exists in MoviesOrbit folder"
          );
          return "ALREADY_DOWNLOADED";
        }
      } catch (e) {
        console.error("FileSystem check error:", e);
      }

      // ==============================
      // ✅ Check in Internal Storage (MediaLibrary)
      // ==============================
      try {
        const hasPermission = await this.requestMediaLibraryPermission();

        if (!hasPermission) return false;

        const album = await MediaLibrary.getAlbumAsync("MoviesOrbit");

        if (album) {
          const assets = await MediaLibrary.getAssetsAsync({
            album,
            mediaType: "video",
            // first: 1000,
          });

          const target = assets.assets.find((a) => a.filename === fileName);

          if (target) {
            Alert.alert(
              "Already Downloaded",
              "Movie already exists in internal storage (MoviesOrbit album)"
            );

            return "ALREADY_DOWNLOADED";
          }
        }
      } catch (e) {
        console.error("MediaLibrary duplicate check error:", e);
      }

      // ==============================
      // ✅ Active Download Check
      // ==============================
      if (this.activeDownload) {
        if (this.activeDownload.movie.link === movie.link) {
          if (this.activeDownload.status === "DOWNLOADING") {
            await this.pauseDownload(movie);
            Alert.alert("Download paused");
            return "PAUSED";
          }

          if (this.activeDownload.status === "PAUSED") {
            await this.resumeDownload(movie);
            Alert.alert("Download resumed");
            return "RESUMED";
          }
        }

        Alert.alert("Another file is downloading.");
        return "BUSY";
      }

      Alert.alert("Downloading started.");

      // ==============================
      // Progress Callback
      // ==============================
      const progressCallback = async (downloadProgress) => {
        try {
          const progress =
            downloadProgress.totalBytesWritten /
            downloadProgress.totalBytesExpectedToWrite;

          const percent = Math.floor(progress * 100);

          if (onProgress) onProgress(percent);

          if (this.activeDownload) this.activeDownload.progress = percent;

          await AsyncStorage.setItem(
            `download_${movie.link}`,
            JSON.stringify({
              movie,
              progress,
              fileUri,
              status: "DOWNLOADING",
            })
          );
        } catch (e) {
          console.error("progressCallback error:", e);
        }
      };

      // ==============================
      // Create Download
      // ==============================
      const resumable = FileSystem.createDownloadResumable(
        movie.link,
        fileUri,
        {},
        progressCallback
      );

      this.activeDownload = {
        movie,
        progress: 0,
        status: "DOWNLOADING",
        resumable,
      };

      this.handleAppStateChange(movie);

      const result = await resumable.downloadAsync();

      if (result) {
        await this.saveToInternalStorage(result.uri, movie.title);

        await AsyncStorage.removeItem(`download_${movie.link}`);

        const hasNotificationPermission =
          await this.requestNotificationPermission();

        if (hasNotificationPermission) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Download Complete 🎬",
              body: movie.title,
            },
            trigger: null,
          });
        }

        this.activeDownload = null;

        return "DONE";
      }
    } catch (e) {
      console.error("Download error:", e);
      this.activeDownload = null;
      return "ERROR";
    }
  },

  handleAppStateChange(movie) {
    try {
      AppState.addEventListener("change", async (state) => {
        if (state === "background" || state === "inactive") {
          if (this.activeDownload) {
            try {
              await this.activeDownload.resumable.pauseAsync();

              await AsyncStorage.setItem(
                `download_${movie.link}`,
                JSON.stringify({
                  movie,
                  progress: this.activeDownload.progress / 100,
                  fileUri: this.getFilePath(movie),
                  status: "PAUSED",
                })
              );

              this.activeDownload = null;

              console.info("Download paused on app close");
            } catch (e) {
              console.error("AppState pause error:", e);
            }
          }
        }
      });
    } catch (e) {
      console.error("handleAppStateChange error:", e);
    }
  },

  async restoreDownload(onProgress) {
    try {
      const keys = await AsyncStorage.getAllKeys();

      const downloadKey = keys.find((k) => k.startsWith("download_"));

      if (!downloadKey) return;

      const saved = await AsyncStorage.getItem(downloadKey);

      if (!saved) return;

      const data = JSON.parse(saved);

      const { movie, fileUri } = data;

      const resumable = FileSystem.createDownloadResumable(
        movie.link,
        fileUri,
        {},
        async (progressData) => {
          const progress =
            progressData.totalBytesWritten /
            progressData.totalBytesExpectedToWrite;

          if (onProgress) onProgress(Math.floor(progress * 100));

          await AsyncStorage.setItem(
            `download_${movie.link}`,
            JSON.stringify({
              movie,
              progress,
              fileUri,
              status: "DOWNLOADING",
            })
          );
        }
      );

      this.activeDownload = {
        movie,
        progress: data.progress * 100,
        status: "PAUSED",
        resumable,
      };

      console.info("Download restored");
    } catch (e) {
      console.error("restoreDownload error:", e);
    }
  },

  async pauseDownload(movie) {
    try {
      if (!this.activeDownload) return false;

      if (this.activeDownload.movie.link !== movie.link) return false;

      await this.activeDownload.resumable.pauseAsync();

      this.activeDownload.status = "PAUSED";

      await AsyncStorage.setItem(
        `download_${movie.link}`,
        JSON.stringify({
          movie,
          progress: this.activeDownload.progress / 100,
          fileUri: this.getFilePath(movie),
          status: "PAUSED",
        })
      );

      return true;
    } catch (e) {
      console.error("Pause error:", e);
      return false;
    }
  },

  async resumeDownload(movie) {
    try {
      if (!this.activeDownload) return false;

      if (this.activeDownload.movie.link !== movie.link) return false;

      this.activeDownload.status = "DOWNLOADING";

      await this.activeDownload.resumable.resumeAsync();

      return true;
    } catch (e) {
      console.error("Resume error:", e);
      return false;
    }
  },

  async cancelDownload(movie) {
    try {
      if (!this.activeDownload) return false;

      if (this.activeDownload.movie.link !== movie.link) return false;

      await this.activeDownload.resumable.pauseAsync();

      const path = this.getFilePath(movie);

      const file = await FileSystem.getInfoAsync(path);

      if (file.exists) {
        await FileSystem.deleteAsync(path);
      }

      await AsyncStorage.removeItem(`download_${movie.link}`);

      this.activeDownload = null;

      return true;
    } catch (e) {
      console.error("Cancel error:", e);
      return false;
    }
  },

  async saveToInternalStorage(uri, title) {
    try {
      const hasPermission = await this.requestMediaLibraryPermission();

      if (!hasPermission) return false;

      const asset = await MediaLibrary.createAssetAsync(uri);

      let album = await MediaLibrary.getAlbumAsync("MoviesOrbit");

      if (!album) {
        await MediaLibrary.createAlbumAsync("MoviesOrbit", asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }
    } catch (e) {
      console.error("Media save error:", e);
    }
  },

  async deleteDownload(movie) {
    try {
      let fileDeleted = false;
      let mediaDeleted = false;
      let storageDeleted = false;

      const fileUri = this.getFilePath(movie);
      const fileName = movie.title.replace(/\s/g, "_").toLowerCase() + ".mp4";

      // ==============================
      // 📁 Delete from FileSystem
      // ==============================
      try {
        const file = await FileSystem.getInfoAsync(fileUri);

        if (file.exists) {
          await FileSystem.deleteAsync(fileUri);
          fileDeleted = true;
        }
      } catch (e) {
        console.error("FileSystem delete error:", e);
      }

      // ==============================
      // 📂 Delete from MediaLibrary
      // ==============================
      try {
        const hasPermission = await this.requestMediaLibraryPermission();

        if (!hasPermission) return false;

        const album = await MediaLibrary.getAlbumAsync("MoviesOrbit");

        if (album) {
          const assets = await MediaLibrary.getAssetsAsync({
            album,
            mediaType: "video",
            // first: 1000,
          });

          const target = assets.assets.find((a) => a.filename === fileName);

          if (target) {
            await MediaLibrary.deleteAssetsAsync([target.id]);
            mediaDeleted = true;
          }
        }
      } catch (e) {
        console.error("MediaLibrary delete error:", e);
      }

      // ==============================
      // 🧹 Remove AsyncStorage
      // ==============================
      try {
        await AsyncStorage.removeItem(`download_${movie.link}`);
        storageDeleted = true;
      } catch (e) {
        console.error("AsyncStorage delete error:", e);
      }

      // ==============================
      // ✅ Final Result
      // ==============================
      if (fileDeleted || mediaDeleted) {
        console.info("Delete successful");
        return true;
      }

      console.info("Nothing deleted");
      return false;
    } catch (e) {
      console.error("Delete error:", e);
      return false;
    }
  },

  async clearAllDownloads() {
    try {
      await this.initFolder();

      // 🧹 Delete MoviesOrbit folder (App storage)
      try {
        const dir = await FileSystem.getInfoAsync(MOVIE_FOLDER);

        if (dir.exists) {
          await FileSystem.deleteAsync(MOVIE_FOLDER, {
            idempotent: true,
          });
        }
      } catch (e) {
        console.error("FileSystem clear error:", e);
      }

      // 🧹 Delete MediaLibrary album and videos
      try {
        const hasPermission = await this.requestMediaLibraryPermission();

        if (!hasPermission) return false;

        const album = await MediaLibrary.getAlbumAsync("MoviesOrbit");

        if (album) {
          const assets = await MediaLibrary.getAssetsAsync({
            album,
            mediaType: "video",
            // first: 1000,
          });

          if (assets.assets.length > 0) {
            const ids = assets.assets.map((a) => a.id);
            await MediaLibrary.deleteAssetsAsync(ids);
          }

          await MediaLibrary.deleteAlbumsAsync([album.id], true);
        }
      } catch (e) {
        console.error("MediaLibrary clear error:", e);
      }

      // 🧹 Clear AsyncStorage
      try {
        const keys = await AsyncStorage.getAllKeys();

        const downloadKeys = keys.filter((k) => k.startsWith("download_"));

        if (downloadKeys.length > 0) {
          await AsyncStorage.multiRemove(downloadKeys);
        }
      } catch (e) {
        console.error("AsyncStorage clear error:", e);
      }

      this.activeDownload = null;

      console.info("MoviesOrbit fully cleared");

      return true;
    } catch (e) {
      console.error("Clear error:", e);
      return false;
    }
  },
  async requestMediaLibraryPermission() {
    try {
      const permission = await MediaLibrary.getPermissionsAsync();

      // If already granted
      if (permission.status === "granted") {
        return true;
      }

      // Ask permission
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status === "granted") {
        return true;
      }

      Alert.alert(
        "Permission Required",
        "Please allow Media Library permission to save and access downloaded movies."
      );

      return false;
    } catch (e) {
      console.error("Permission error:", e);
      return false;
    }
  },
  async requestNotificationPermission() {
    try {
      const { status } = await Notifications.getPermissionsAsync();

      if (status === "granted") return true;

      const { status: newStatus } =
        await Notifications.requestPermissionsAsync();

      if (newStatus === "granted") return true;

      Alert.alert(
        "Permission Required",
        "Please allow notification permission to receive download updates."
      );

      return false;
    } catch (e) {
      console.error("Notification permission error:", e);
      return false;
    }
  },
};
