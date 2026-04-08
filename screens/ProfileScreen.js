import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  User,
  Settings,
  Bell,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Star,
} from "lucide-react-native";
import colors from "../theme/colors";
import { Image } from "expo-image";

// --- DUMMY DATA (Change these easily later) ---
const USER_DATA = {
  name: "John Doe",
  email: "johndoe@example.com",
  avatar: "https://picsum.photos/id/64/200/200",
  membership: "Premium Member",
  stats: {
    watched: "128",
    favorites: "42",
  },
};

function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [isNotificationsEnabled, setIsNotificationsEnabled] =
    React.useState(true);

  // Reusable Setting Row Component
  const SettingItem = ({ icon: Icon, title, onPress, value, isSwitch }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={isSwitch}
    >
      <View style={styles.settingLeft}>
        <View style={styles.iconBox}>
          <Icon size={20} color={colors.primary} />
        </View>
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      {isSwitch ? (
        <Switch
          value={value}
          onValueChange={setIsNotificationsEnabled}
          trackColor={{ false: "#3E3E3E", true: colors.primary }}
          thumbColor="white"
        />
      ) : (
        <ChevronRight size={20} color={colors.gray} />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header / Avatar Section */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.avatarWrapper}>
          <Image
            contentFit="cover"
            cachePolicy="memory-disk"
            source={{ uri: USER_DATA.avatar }}
            style={styles.avatar}
          />
          <TouchableOpacity style={styles.editBadge}>
            <Settings size={14} color="white" />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{USER_DATA.name}</Text>
        <Text style={styles.userEmail}>{USER_DATA.email}</Text>

        <View style={styles.membershipBadge}>
          <Star size={14} color="#FFD700" fill="#FFD700" />
          <Text style={styles.membershipText}>{USER_DATA.membership}</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{USER_DATA.stats.watched}</Text>
          <Text style={styles.statLabel}>Watched</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{USER_DATA.stats.favorites}</Text>
          <Text style={styles.statLabel}>Favorites</Text>
        </View>
      </View>

      {/* Settings Menu */}
      <View style={styles.menuSection}>
        <Text style={styles.menuLabel}>Account Settings</Text>
        <SettingItem icon={User} title="Edit Profile" onPress={() => {}} />
        <SettingItem
          icon={Bell}
          title="Notifications"
          isSwitch
          value={isNotificationsEnabled}
        />
        <SettingItem
          icon={ShieldCheck}
          title="Privacy & Security"
          onPress={() => {}}
        />
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.menuLabel}>Support</Text>
        <TouchableOpacity style={styles.logoutBtn}>
          <LogOut size={20} color="#FF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export default React.memo(ProfileScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.background,
  },
  userName: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
  },
  userEmail: {
    color: colors.gray,
    fontSize: 14,
    marginTop: 4,
  },
  membershipBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  membershipText: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: colors.card,
    marginHorizontal: 20,
    marginTop: 30,
    borderRadius: 15,
    paddingVertical: 20,
    alignItems: "center",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  statLabel: {
    color: colors.gray,
    fontSize: 12,
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: "60%",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  menuSection: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  menuLabel: {
    color: colors.gray,
    fontSize: 13,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 15,
    marginLeft: 5,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  iconBox: {
    backgroundColor: "rgba(255, 51, 51, 0.1)", // Primary color low opacity
    padding: 8,
    borderRadius: 10,
  },
  settingTitle: {
    color: "white",
    fontSize: 15,
    fontWeight: "500",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 15,
    marginTop: 5,
  },
  logoutText: {
    color: "#FF4444",
    fontSize: 16,
    fontWeight: "bold",
  },
});
