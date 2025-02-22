import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import Colors from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

const PatientDetailScreen = ({ route, navigation }) => {
  const { patient } = route.params;
  
  // Dummy test data
  const tests = [
    {
      id: 1,
      date: '2024-01-15',
      duration: '2:30',
      avgNasalance: '45%'
    },
    {
      id: 2,
      date: '2024-01-10',
      duration: '1:45',
      avgNasalance: '42%'
    },
    {
      id: 3,
      date: '2024-01-05',
      duration: '3:15',
      avgNasalance: '48%'
    },
  ];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <View style={styles.container}>
      {/* Updated Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.lightNavalBlue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patient Profile</Text>
      </View>

      <ScrollView>
        {/* Patient Info Card - existing code */}
        <View style={styles.profileCard}>
          <Image
            source={patient.picture_url ? { uri: patient.picture_url } : require('../assets/splash-icon.png')}
            style={styles.profileImage}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{patient.name || patient.full_name}</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>MRN</Text>
                <Text style={styles.infoValue}>{patient.mrn}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Gender</Text>
                <Text style={styles.infoValue}>{patient.gender}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>DOB</Text>
                <Text style={styles.infoValue}>{formatDate(patient.dob)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* New Average Nasalance Score Box */}
        <View style={styles.scoreBox}>
          <Text style={styles.scoreNumber}>45%</Text>
          <Text style={styles.scoreLabel}>Avg. Nasalance</Text>
          <Text style={styles.scoreDate}>Score from 01/15/2024</Text>
        </View>

        {/* Graph Section */}
        <View style={styles.graphSection}>
          <Text style={styles.sectionTitle}>Nasalance over time</Text>
          <View style={styles.graph}>
            {/* Graph placeholder */}
            <View style={styles.graphPlaceholder}>
              <Text style={styles.placeholderText}>Graph will be displayed here</Text>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        {/* Tests History */}
        <View style={styles.testsSection}>
          <Text style={styles.sectionTitle}>Test History</Text>
          {tests.map((test) => (
            <TouchableOpacity 
              key={test.id} 
              style={styles.testCard}
              onPress={() => {}}
            >
              <View style={styles.testInfo}>
                <Text style={styles.testDate}>{formatDate(test.date)}</Text>
                <Text style={styles.testDetails}>
                  Duration: {test.duration} • Avg. Nasalance: {test.avgNasalance}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('NewTest', { patient })}
      >
        <Ionicons name="add" size={24} color="white" />
        <Text style={styles.addButtonText}>New Test</Text>
      </TouchableOpacity>
    </View>
  );
};

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
  // New styles for score box
  scoreBox: {
    margin: 20,
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  scoreDate: {
    fontSize: 14,
    color: '#888',
  },
  // Updated existing styles
  profileCard: {
    margin: 20,
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center', // Add this to center the content
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ddd',
    marginBottom: 15,
    alignSelf: 'center', // Add this to ensure image is centered
  },
  profileInfo: {
    width: '100%',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginBottom: 15,
    textAlign: 'center',
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  graphSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginBottom: 15,
  },
  graphPlaceholder: {
    height: 200,
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
  },
  divider: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.lightNavalBlue,
    marginHorizontal: 4,
    opacity: 0.5,
  },
  testsSection: {
    padding: 20,
  },
  testCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 10,
  },
  testInfo: {
    flex: 1,
  },
  testDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginBottom: 5,
  },
  testDetails: {
    fontSize: 14,
    color: '#666',
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightNavalBlue,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default PatientDetailScreen;