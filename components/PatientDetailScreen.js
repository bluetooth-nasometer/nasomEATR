import React, { useState, useEffect } from 'react';
import { CSVLink, CSVDownload } from "react-csv"; // inserted for CSV export

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

  const [isDownloading, setIsDownloading] = useState(false);
  const [csvData, setCsvData] = useState([
    ["#", "Date Test was administered", "Average Nasalance"]
  ]);
  
  const handleExport = async () => {
    try {
      // Start loading state
      //setIsDownloading(true);
      
      // Fetch all test data for this patient
      const { data, error } = await supabase
        .from('patient_data')
        .select('*')
        .eq('mrn', patientData.mrn)
        .order('created_at', { ascending: true });
  
      if (error) throw error;
      
      // Create a new array with headers
      const newCsvData = [
        ["#", "Date Test was administered", "Average Nasalance"]
      ];
      
      let count = 1;
      // Add each test record to the CSV data
      data.forEach(record => {
        // Format the date for better readability
        const formattedDate = formatDate(record.created_at);
        // Get nasalance score with 1 decimal place or 'N/A'
        const nasalance = record.avg_nasalance_score?.toFixed(1) || 'N/A';
        newCsvData.push([count, formattedDate, nasalance]);
        count++;
      });
            // Update state with the new CSV data
      setCsvData(newCsvData);
      console.log('CSV data prepared:', newCsvData);
      setIsDownloading(true);
      // Keep isDownloading true to trigger the CSVDownload component
      // The timeout will happen after data is prepared
      setTimeout(() => setIsDownloading(false), 1000);
      count = 1;

    } 
    catch (error) {
      console.error('Error preparing CSV data:', error);
      Alert.alert('Error', 'Failed to export patient records');
      setIsDownloading(false); // Make sure to reset loading state on error
    } 
  };

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
        .eq('mrn', patientData.mrn)
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

//const formatDuration = (seconds) => {
//  // Handle null, undefined, or invalid values
//  if (!seconds || seconds === 0 || isNaN(seconds)) {
//    return 'N/A';
//  }
//
//  const totalSeconds = Math.round(seconds); // round to nearest whole second just for display
//  const minutes = Math.floor(totalSeconds / 60);
//  const remainingSeconds = totalSeconds % 60;
//
//  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
//};

// Alt approach - show decimal seconds as total second & minutes:
const formatDurationAlt = (seconds) => {
  if (!seconds || seconds === 0 || isNaN(seconds)) {
    return 'N/A';
  }

  // under 60 seconds, show seconds with 1 decimal
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  //  convert to minutes:seconds for longer durations
  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

  const getDuration = (test) => {
    // Handle if nasalance_data is already an object
    if (test.nasalance_data && typeof test.nasalance_data === 'object') {
      return test.nasalance_data.duration || 0;
    }

    // Handle if nasalance_data is a JSON string that needs parsing
    if (test.nasalance_data && typeof test.nasalance_data === 'string') {
      try {
        const parsed = JSON.parse(test.nasalance_data);
        return parsed.duration || 0;
      } catch (e) {
        console.warn('(PatientDetailScreen - getDuration)Failed to parse nasalance_data:', e);
        return 0;
      }
    }

    // Fallback
    return test.duration || 0;
  };

  const showEditOptions = () => {
    Alert.alert(
      'Patient Profile',
      'What would you like to do?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Patient',
          onPress: confirmDelete,
          style: 'destructive',
        },
        {
          text: 'Edit Profile',
          onPress: handleEditProfile,
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

  // Add a demographic information section to display the new fields
  const renderDemographicInfo = () => {
    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Demographic Information</Text>
        </View>
        
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>First Language:</Text>
            <Text style={styles.infoValue}>{patientData.first_language || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Second Language:</Text>
            <Text style={styles.infoValue}>{patientData.second_language || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Ethnicity:</Text>
            <Text style={styles.infoValue}>{patientData.ethnicity || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Race:</Text>
            <Text style={styles.infoValue}>{patientData.race || 'N/A'}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Country of Origin:</Text>
            <Text style={styles.infoValue}>{patientData.country || 'N/A'}</Text>
          </View>
        </View>
      </View>
    );
  };

  const startNewTest = () => {
    // Create mock device information since we're bypassing calibration
    const mockNasalMic = { name: 'Mock Nasal Microphone', id: 'nasal-mock-id' };
    const mockOralMic = { name: 'Mock Oral Microphone', id: 'oral-mock-id' };
    
    // Navigate directly to TestScreen with all required parameters
    navigation.navigate('Test', { 
      patient: patientData, 
      nasalMic: mockNasalMic, 
      oralMic: mockOralMic 
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.lightNavalBlue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patient Profile</Text>
        <TouchableOpacity 
          style={styles.moreButton}
          onPress={showEditOptions}
        >
          <Ionicons name="ellipsis-vertical" size={24} color={Colors.lightNavalBlue} />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <PatientCard 
          patient={patientData}
          formatDate={formatDate}
        />

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{testHistory.length}</Text>
            <Text style={styles.statLabel}>Total Tests</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {averageNasalance ? `${averageNasalance}%` : '---'}
            </Text>
            <Text style={styles.statLabel}>Avg. Nasalance</Text>
          </View>
        </View>

        {/* Add Demographic Info Section */}
        {renderDemographicInfo()}

        {/* Graph Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nasalance over time</Text>
            <TouchableOpacity>
              <Ionicons name="analytics-outline" size={20} color={Colors.lightNavalBlue} />
            </TouchableOpacity>
          </View>
          <View style={styles.graphPlaceholder}>
            <Text style={styles.placeholderText}>Graph will be displayed here</Text>
          </View>
        </View>

        {/* Tests History */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Test History</Text>
            <TouchableOpacity>
              <Button
                title="Export"
                icon="download-outline"
                onPress={handleExport}
                size="small"
              />
              {/* <Ionicons name="filter-outline" size={20} color={Colors.lightNavalBlue} /> */}
            </TouchableOpacity>
          </View>
          {isDownloading && <CSVDownload data={csvData} filename={"patient_test_history.csv"} />}

          {loading ? (
            <LoadingIndicator text="Loading tests..." />
          ) : testHistory.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="document-text-outline" size={48} color="#666" />
              <Text style={styles.emptyStateText}>No tests recorded yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Start a new test by tapping the button below
              </Text>
            </View>
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
                    Duration: {formatDurationAlt(getDuration(test))} •
                    Nasalance: {test.avg_nasalance_score?.toFixed(1) || 'N/A'}%
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Notes Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
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

      <Button
        title="New Test"
        icon="add"
        onPress={startNewTest}
        style={styles.addButton}
        size="large"
      />
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
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginLeft: 10,
  },
  moreButton: {
    padding: 5,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  statsCard: {
    margin: 20,
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#eee',
    marginHorizontal: 20,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  sectionCard: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    backgroundColor: Colors.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  emptyStateContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  emptyStateText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    fontStyle: 'italic',
    marginTop: 10,
  },
  emptyStateSubtext: {
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
    marginTop: 5,
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
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
  savingIndicator: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  infoGrid: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
  },
  infoItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoLabel: {
    flex: 2,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  infoValue: {
    flex: 3,
    fontSize: 14,
    color: Colors.lightNavalBlue,
  },
});

export default PatientDetailScreen;