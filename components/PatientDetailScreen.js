import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import Colors from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabaseClient';
import HeaderBar from './common/HeaderBar';
import PatientCard from './common/PatientCard';
import LoadingIndicator from './common/LoadingIndicator';
import Button from './common/Button';

const PatientDetailScreen = ({ route, navigation }) => {
  const [patientData, setPatientData] = useState(route.params.patient);
  const [testHistory, setTestHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [averageNasalance, setAverageNasalance] = useState(null);
  const [notes, setNotes] = useState(route.params.patient.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesChanged, setNotesChanged] = useState(false);

  useEffect(() => {
    fetchTestHistory();
    // Initialize notes from patient data
    setNotes(patientData.notes || '');
  }, []);

  // Add debounced save function for notes
  useEffect(() => {
    if (notesChanged) {
      const timeoutId = setTimeout(saveNotes, 1000); // 1 second delay
      return () => clearTimeout(timeoutId);
    }
  }, [notes]);

  const fetchTestHistory = async () => {
    try {
      // Fetch all test data for this patient
      const { data, error } = await supabase
        .from('patient_data')
        .select('*')
        .eq('id', patientData.mrn)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate average nasalance from all tests
      if (data && data.length > 0) {
        const totalNasalance = data.reduce((sum, test) => sum + (test.nasalance_score || 0), 0);
        const avg = (totalNasalance / data.length).toFixed(1);
        setAverageNasalance(avg);
      }

      setTestHistory(data || []);
    } catch (error) {
      console.error('Error fetching test history:', error);
      Alert.alert('Error', 'Failed to load test history');
    } finally {
      setLoading(false);
    }
  };

  const saveNotes = async () => {
    if (!notesChanged) return;
    
    try {
      setSavingNotes(true);
      const { error } = await supabase
        .from('patient')
        .update({ notes: notes })
        .eq('mrn', patientData.mrn);

      if (error) throw error;
      setNotesChanged(false);
    } catch (error) {
      console.error('Error saving notes:', error);
      Alert.alert('Error', 'Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleNotesChange = (text) => {
    setNotes(text);
    setNotesChanged(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const showEditOptions = () => {
    Alert.alert(
      'Patient Profile',
      'What would you like to do?',
      [
        {
          text: 'Edit Profile',
          onPress: handleEditProfile,
        },
        {
          text: 'Delete Patient',
          onPress: confirmDelete,
          style: 'destructive',
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleEditProfile = () => {
    navigation.navigate('EditPatient', { patient: patientData });
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete Patient',
      'Are you sure? This will permanently delete all patient data and cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: deletePatient,
        },
      ]
    );
  };

  const deletePatient = async () => {
    try {
      // First delete patient's photo if exists
      if (patientData.picture_url) {
        const fileName = patientData.picture_url.split('/').pop();
        await supabase.storage
          .from('patient_photos')
          .remove([fileName]);
      }

      // Delete patient (this will cascade delete patient_data due to foreign key constraint)
      const { error } = await supabase
        .from('patient')
        .delete()
        .eq('mrn', patientData.mrn);

      if (error) throw error;

      Alert.alert('Success', 'Patient deleted successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error deleting patient:', error);
      Alert.alert('Error', 'Failed to delete patient');
    }
  };

  const getProfileImage = () => {
    // Check that picture_url exists and is not null/empty
    if (patientData?.picture_url && patientData.picture_url.trim() !== '') {
      return { uri: patientData.picture_url };
    }
    console.log('Using default photo'); // Debug log
    return require('../assets/splash-icon.png');
  };

  // Add a function to refresh patient data
  const refreshPatientData = async () => {
    try {
      const { data, error } = await supabase
        .from('patient')
        .select('*')
        .eq('mrn', patientData.mrn)
        .single();

      if (error) throw error;
      if (data) {
        setPatientData(data); // Update the entire patient object
        setNotes(data.notes || '');
      }
    } catch (error) {
      console.error('Error refreshing patient data:', error);
    }
  };

  // Add focus listener to refresh data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshPatientData();
    });

    return unsubscribe;
  }, [navigation]);

  const rightComponent = (
    <Button
      icon="ellipsis-vertical"
      variant="ghost"
      size="small"
      onPress={showEditOptions}
    />
  );

  return (
    <View style={styles.container}>
      <HeaderBar 
        title="Patient Profile" 
        onBack={() => navigation.goBack()}
        rightComponent={rightComponent}
      />
      
      <ScrollView>
        <PatientCard 
          patient={patientData}
          formatDate={formatDate}
        />

        {/* Updated Average Nasalance Score Box */}
        {averageNasalance && (
          <View style={styles.scoreBox}>
            <Text style={styles.scoreNumber}>{averageNasalance}%</Text>
            <Text style={styles.scoreLabel}>Avg. Nasalance</Text>
            <Text style={styles.scoreDate}>
              Based on {testHistory.length} test{testHistory.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

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

        {/* Updated Tests History */}
        <View style={styles.testsSection}>
          <Text style={styles.sectionTitle}>Test History</Text>
          {loading ? (
            <LoadingIndicator text="Loading tests..." />
          ) : testHistory.length === 0 ? (
            <Text style={styles.noTestsText}>No tests recorded yet</Text>
          ) : (
            testHistory.map((test) => (
              <TouchableOpacity 
                key={test.id} 
                style={styles.testCard}
                onPress={() => navigation.navigate('TestDetail', { test })}
              >
                <View style={styles.testInfo}>
                  <Text style={styles.testDate}>{formatDate(test.created_at)}</Text>
                  <Text style={styles.testDetails}>
                    Duration: {formatDuration(test.duration || 0)} • 
                    Nasalance: {test.nasalance_score?.toFixed(1) || 'N/A'}%
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Notes Section */}
        <View style={styles.notesSection}>
          <View style={styles.notesTitleRow}>
            <Text style={styles.sectionTitle}>Notes</Text>
            {savingNotes && (
              <Text style={styles.savingIndicator}>Saving...</Text>
            )}
          </View>
          <TextInput
            style={styles.notesInput}
            multiline
            placeholder="Add notes about this patient..."
            value={notes}
            onChangeText={handleNotesChange}
            textAlignVertical="top"
          />
        </View>

      </ScrollView>

      {/* FAB */}
      <Button
        title="New Test"
        icon="add"
        onPress={() => navigation.navigate('NewTest', { patient: patientData })}
        style={styles.addButton}
        size="large"
      />
    </View>
  );
};

// Update these styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
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
  profileCard: null, // Remove this
  profileImage: null, // Remove this
  profileInfo: null, // Remove this
  name: null, // Remove this
  infoGrid: null, // Remove this
  infoItem: null, // Remove this
  infoLabel: null, // Remove this
  infoValue: null, // Remove this
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
    marginTop: 4,
  },
  noTestsText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    fontStyle: 'italic',
    marginTop: 20,
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
  },
  editButton: {
    padding: 8,
  },
  notesSection: {
    padding: 20,
    marginBottom: 20,
  },
  notesTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  savingIndicator: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 15,
    minHeight: 120,
    backgroundColor: '#f8f9fa',
    fontSize: 16,
    lineHeight: 24,
  },
});

export default PatientDetailScreen;