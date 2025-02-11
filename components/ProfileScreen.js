import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

const ProfileScreen = ({ navigation }) => {
  // Dummy user data - replace with actual user data later
  const user = {
    name: "Dr. ___",
    email: "___@___.___",
    role: "Speech Pathologist",
    organization: "CHOC",
    avatarUrl: null // Add default avatar image path here
  };

  const SettingSection = ({ title, icon, onPress, showBadge }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={24} color={Colors.lightNavalBlue} />
      </View>
      <Text style={styles.settingText}>{title}</Text>
      <View style={styles.settingRight}>
        {showBadge && <View style={styles.badge} />}
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.profileHeader}>
          <Image
            source={user.avatarUrl || require('../assets/splash-icon.png')}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.role}>{user.role}</Text>
            <Text style={styles.organization}>{user.organization}</Text>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="pencil" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Settings Sections */}
      <View style={styles.settingsContainer}>
        {/* Account Settings */}
        <Text style={styles.sectionTitle}>Account</Text>
        <SettingSection 
          title="Personal Information" 
          icon="person-outline" 
          onPress={() => {}}
        />
        <SettingSection 
          title="Security" 
          icon="shield-outline" 
          onPress={() => {}}
        />
        <SettingSection 
          title="Linked Accounts" 
          icon="link-outline" 
          onPress={() => {}}
        />

        {/* App Preferences */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <SettingSection 
          title="App Theme" 
          icon="color-palette-outline" 
          onPress={() => {}}
        />
        <SettingSection 
          title="Notifications" 
          icon="notifications-outline" 
          onPress={() => {}}
          showBadge={true}
        />
        <SettingSection 
          title="Language" 
          icon="language-outline" 
          onPress={() => {}}
        />

        {/* Data Management */}
        <Text style={styles.sectionTitle}>Data</Text>
        <SettingSection 
          title="Export Data" 
          icon="download-outline" 
          onPress={() => {}}
        />
        <SettingSection 
          title="Backup Settings" 
          icon="cloud-upload-outline" 
          onPress={() => {}}
        />
        <SettingSection 
          title="Storage Management" 
          icon="folder-outline" 
          onPress={() => {}}
        />

        {/* Help & Support */}
        <Text style={styles.sectionTitle}>Support</Text>
        <SettingSection 
          title="Help Center" 
          icon="help-circle-outline" 
          onPress={() => {}}
        />
        <SettingSection 
          title="Contact Support" 
          icon="mail-outline" 
          onPress={() => {}}
        />
        <SettingSection 
          title="About nasomEATR" 
          icon="information-circle-outline" 
          onPress={() => {}}
        />

        {/* Sign Out */}
        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={() => navigation.replace('Login')}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    backgroundColor: Colors.lightNavalBlue,
    paddingTop: 60,
    paddingBottom: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ddd',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 20,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  role: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
  },
  organization: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.8,
  },
  editButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 20,
  },
  settingsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginTop: 25,
    marginBottom: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingIcon: {
    width: 40,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'red',
    marginRight: 10,
  },
  signOutButton: {
    marginTop: 30,
    marginBottom: 50,
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#ff6b6b',
    alignItems: 'center',
  },
  signOutText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;
