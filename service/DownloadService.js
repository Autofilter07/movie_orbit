import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as MediaLibrary from "expo-media-library";
import * as Notifications from "expo-notifications";

const MOVIE_FOLDER = FileSystem.documentDirectory + "MoviesOrbit/";

export const DownloadService = {
  activeDownload: null,

  async initFolder() {
    const dir = await FileSystem.getInfoAsync(MOVIE_FOLDER);

    if (!dir.exists) {
      await FileSystem.makeDirectoryAsync(MOVIE_FOLDER, {
        intermediates: true,
      });
    }
  },

  getFilePath(movie) {
    return (
      MOVIE_FOLDER + movie.title.replace(/\s/g, "_").toLowerCase() + ".mp4"
    );
  },

  async isDownloading(movie) {
    if (!this.activeDownload) return false;
    return this.activeDownload.movie.link === movie.link;
  },

  async isDownloaded(movie) {
    try {
      const path = this.getFilePath(movie);
      const file = await FileSystem.getInfoAsync(path);
      return file.exists;
    } catch (error) {
      console.log(error);
      return false;
    }
  },

  async getProgress(movie) {
    try {
      const saved = await AsyncStorage.getItem(`download_${movie.link}`);

      if (!saved) return 0;

      const data = JSON.parse(saved);

      return Math.floor(data.progress * 100);
    } catch {
      return 0;
    }
  },

  async startDownload(movie, onProgress) {
    console.log("Starting download...");

    await this.initFolder();

    if (this.activeDownload) {
      console.log("Another download is running");
      return "BUSY";
    }

    const fileUri = this.getFilePath(movie);

    const exists = await FileSystem.getInfoAsync(fileUri);

    if (exists.exists) {
      return "ALREADY_DOWNLOADED";
    }

    const progressCallback = async (downloadProgress) => {
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
        })
      );
    };

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

    try {
      const result = await resumable.downloadAsync();

      if (result) {
        await this.saveToInternalStorage(result.uri, movie.title);

        await AsyncStorage.removeItem(`download_${movie.link}`);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Download Complete 🎬",
            body: movie.title,
          },
          trigger: null,
        });

        this.activeDownload = null;

        return "DONE";
      }
    } catch (e) {
      console.log("Download error:", e);
      this.activeDownload = null;
      return "ERROR";
    }
  },

  async pauseDownload(movie) {
    try {
      if (!this.activeDownload) return false;

      if (this.activeDownload.movie.link !== movie.link) return false;

      await this.activeDownload.resumable.pauseAsync();

      this.activeDownload.status = "PAUSED";

      console.log("Download paused");

      return true;
    } catch (e) {
      console.log("Pause error:", e);
      return false;
    }
  },

  async resumeDownload(movie, onProgress) {
    try {
      if (!this.activeDownload) return false;

      if (this.activeDownload.movie.link !== movie.link) return false;

      console.log("Resuming download");

      this.activeDownload.status = "DOWNLOADING";

      await this.activeDownload.resumable.resumeAsync();

      return true;
    } catch (e) {
      console.log("Resume error:", e);
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

      console.log("Download cancelled");

      return true;
    } catch (e) {
      console.log("Cancel error:", e);
      return false;
    }
  },

  async saveToInternalStorage(uri, title) {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status !== "granted") {
        console.log("Permission denied");
        return;
      }

      const asset = await MediaLibrary.createAssetAsync(uri);

      let album = await MediaLibrary.getAlbumAsync("MoviesOrbit");

      if (!album) {
        await MediaLibrary.createAlbumAsync("MoviesOrbit", asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }
    } catch (e) {
      console.log("Media save error:", e);
    }
  },

  async deleteDownload(fileUri) {
    try {
      const file = await FileSystem.getInfoAsync(fileUri);

      if (file.exists) {
        await FileSystem.deleteAsync(fileUri);
      }

      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  },

  async clearAllDownloads() {
    try {
      await this.initFolder();

      const dir = await FileSystem.getInfoAsync(MOVIE_FOLDER);

      if (dir.exists) {
        await FileSystem.deleteAsync(MOVIE_FOLDER, {
          idempotent: true,
        });
      }

      await AsyncStorage.clear();

      this.activeDownload = null;

      console.log("MoviesOrbit folder cleared");

      return true;
    } catch (e) {
      console.log("Clear error:", e);
      return false;
    }
  },
};
