import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

const dummyPatients = [
  {
    id: 1,
    name: 'John Smith',
    testsCount: 5,
    lastTestDate: '2024-01-15',
  },
  {
    id: 2,
    name: 'Sarah Johnson',
    testsCount: 3,
    lastTestDate: '2024-01-12',
  },
  {
    id: 3,
    name: 'Michael Brown',
    testsCount: 8,
    lastTestDate: '2024-01-10',
  },
];

const HomeScreen = ({ navigation }) => {
  const handleAddPatient = () => {
    navigation.navigate('AddPatient');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Patient List</Text>
      </View>
      
      <ScrollView style={styles.patientList}>
        {dummyPatients.map((patient) => (
          <TouchableOpacity 
            key={patient.id}
            style={styles.patientCard}
            onPress={() => {/* Handle patient selection */}}
          >
            <Text style={styles.patientName}>{patient.name}</Text>
            <View style={styles.patientDetails}>
              <Text style={styles.detailText}>
                {patient.testsCount} tests
              </Text>
              <Text style={styles.detailText}>
                Last test: {formatDate(patient.lastTestDate)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddPatient}
      >
        <Ionicons 
          name="add" 
          size={30} 
          color="white" 
        />
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
    backgroundColor: Colors.lightNavalBlue,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
  },
  patientList: {
    flex: 1,
    padding: 15,
  },
  patientCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginBottom: 5,
  },
  patientDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailText: {
    color: '#666',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 15,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.lightNavalBlue,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  popup: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  popupText: {
    marginLeft: 12,
    fontSize: 16,
    color: Colors.lightNavalBlue,
    fontWeight: '500',
  },
});

export default HomeScreen;