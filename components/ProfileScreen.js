import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { supabase } from '../utils/supabaseClient';
import SettingsItem from './common/SettingsItem';
import LoadingIndicator from './common/LoadingIndicator';
import Button from './common/Button';

const ProfileScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      const { data, error } = await supabase
        .from('clinician')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserData(data);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigation.replace('Login');
    } catch (error) {
      Alert.alert('Error signing out', error.message);
    }
  };

  const settingsSections = [
    {
      label: 'Account',
      items: [
        { icon: 'person-outline', text: 'Edit Profile' },
        { icon: 'lock-closed-outline', text: 'Change Password' }
      ]
    },
    {
      label: 'Data Management',
      items: [
        { icon: 'download-outline', text: 'Export Patient Data' },
        { icon: 'sync-outline', text: 'Backup Settings' }
      ]
    },
    {
      label: 'App Settings',
      items: [
        { icon: 'options-outline', text: 'Calibration Settings' },
        { icon: 'recording-outline', text: 'Recording Preferences' },
        { icon: 'notifications-outline', text: 'Notifications' }
      ]
    },
    {
      label: 'Help & Support',
      items: [
        { icon: 'help-circle-outline', text: 'User Guide' },
        { icon: 'information-circle-outline', text: 'About nasomEATR' }
      ]
    }
  ];

  if (loading) {
    return <LoadingIndicator text="Loading profile..." fullScreen />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.lightNavalBlue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* User Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{userData?.full_name || '---'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{userData?.email || '---'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Username</Text>
            <Text style={styles.value}>{userData?.username || '---'}</Text>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Settings</Text>
          
          {settingsSections.map(section => (
            <React.Fragment key={section.label}>
              <Text style={styles.sectionLabel}>{section.label}</Text>
              {section.items.map(item => (
                <SettingsItem
                  key={item.text}
                  icon={item.icon}
                  text={item.text}
                  onPress={() => {}} // Add specific handlers as needed
                />
              ))}
            </React.Fragment>
          ))}
        </View>

        {/* Sign Out Button */}
        <Button
          title="Sign Out"
          icon="exit-outline"
          onPress={handleSignOut}
          variant="primary"
          size="large"
          style={styles.signOutButton}
        />
      </ScrollView>
    </View>
  );
};

// Keep existing styles but remove settingItem and settingText styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: Colors.white,
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 16,
    color: Colors.lightNavalBlue,
    fontWeight: '500',
  },
  signOutButton: {
    marginTop: 20,
    marginBottom: 40,
    marginHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
    fontWeight: '500',
  },
});

export default ProfileScreen;
