import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Add this import
import Colors from '../constants/Colors';
import { supabase } from '../utils/supabaseClient';

const DashboardPage = ({ navigation }) => {
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigation.replace('Login');
    } catch (error) {
      Alert.alert('Error signing out', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Dashboard</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('HomeTab')} // Changed from 'Sessions'
        >
          <Text style={styles.buttonText}>Start an Evaluation</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('HomeTab')}
        >
          <Text style={styles.buttonText}>View Patient List</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.buttonText}>Settings</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleSignOut}
      >
        <Ionicons 
          name="exit-outline" 
          size={20} 
          color={Colors.lightNavalBlue} 
          style={styles.logoutIcon}
        />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: 20,
  },
  heading: {
    fontSize: 24,
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: 28,
    marginTop: 60,
    marginBottom: 40,
    color: Colors.lightNavalBlue,
  },
  buttonContainer: {
    alignItems: 'center',
    flex: 1,
    gap: 20,
    paddingHorizontal: 20,
  },
  button: {
    width: '100%',
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  buttonText: {
    fontSize: 18,
    color: Colors.lightNavalBlue,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginBottom: 20,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    fontSize: 16,
    color: Colors.lightNavalBlue,
  },
});

export default DashboardPage;
