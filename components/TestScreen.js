import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import HeaderBar from './common/HeaderBar';
import { supabase } from '../utils/supabaseClient';

const TestScreen = ({ navigation, route }) => {
  const { nasalMic, oralMic, patient } = route.params || {};
  const [recording, setRecording] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleBackPress = () => {
    if (testResult || recording) {
      Alert.alert(
        "Leave Test?",
        "Any unsaved data will be lost.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Leave", onPress: () => navigation.goBack() }
        ]
      );
    } else {
      navigation.goBack();
    }
  };
  
  const startRecording = () => {
    setRecording(true);
    
    // Auto-stop after 2 seconds to show results
    setTimeout(() => {
      setRecording(false);
      
      // Generate a random nasalance score between 20-60%
      const nasalanceScore = Math.floor(Math.random() * 40) + 20;
      
      setTestResult({
        nasalance_score: nasalanceScore,
        duration: 2,
        date: new Date().toISOString()
      });
    }, 2000);
  };
  
  const saveTestResults = async () => {
    if (!testResult) return;
    
    try {
      const testDate = new Date().toISOString();
      
      const testData = {
        id: testDate,
        created_at: testDate,
        duration: testResult.duration,
        nasalance_score: testResult.nasalance_score,
        patient_id: patient?.mrn || 'unknown',
        nasal_device: nasalMic?.name || 'mock-nasal',
        oral_device: oralMic?.name || 'mock-oral'
      };
      
      const { error } = await supabase
        .from('patient_data')
        .insert(testData);
      
      if (error) throw error;
      
      Alert.alert(
        "Success",
        "Test results saved successfully",
        [{ text: "OK", onPress: () => navigation.navigate('PatientDetail', { patient }) }]
      );
    } catch (error) {
      console.error("Error saving test results:", error);
      Alert.alert("Error", "Failed to save test results. Please try again.");
    }
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar 
        title="Nasalance Test"
        onBack={handleBackPress}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Patient info */}
        <Text style={styles.patientName}>{patient?.name || 'Unknown Patient'}</Text>
        <Text style={styles.patientDetail}>MRN: {patient?.mrn || 'N/A'}</Text>
        
        {/* Device info */}
        <View style={styles.deviceSection}>
          <Text style={styles.sectionTitle}>Assigned Devices</Text>
          <Text style={styles.deviceText}>• Nasal Mic: {nasalMic?.name || "Not assigned"}</Text>
          <Text style={styles.deviceText}>• Oral Mic: {oralMic?.name || "Not assigned"}</Text>
          <Text style={styles.mockText}>Using mock devices for demonstration</Text>
        </View>
        
        {/* Test area */}
        <View style={styles.testSection}>
          {!testResult ? (
            <>
              {recording ? (
                <View style={styles.recordingStatus}>
                  <Text style={styles.recordingText}>RECORDING...</Text>
                </View>
              ) : null}
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={startRecording}
                disabled={recording}
              >
                <Text style={styles.buttonText}>
                  {recording ? "Recording..." : "Start Test"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.resultTitle}>Test Results</Text>
              
              <View style={styles.resultSection}>
                <Text style={styles.resultLabel}>Nasalance Score:</Text>
                <Text style={styles.resultValue}>{testResult.nasalance_score}%</Text>
              </View>
              
              <View style={styles.resultSection}>
                <Text style={styles.resultLabel}>Test Duration:</Text>
                <Text style={styles.resultValue}>{formatTime(testResult.duration)}</Text>
              </View>
              
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.discardButton]}
                  onPress={() => setTestResult(null)}
                >
                  <Text style={styles.buttonText}>Discard</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={saveTestResults}
                >
                  <Text style={styles.buttonText}>Save Results</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  patientName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
  },
  patientDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  deviceSection: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  deviceText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#333',
  },
  mockText: {
    fontSize: 12,
    color: '#ff9800',
    fontStyle: 'italic',
    marginTop: 8,
  },
  testSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  recordingStatus: {
    marginBottom: 20,
  },
  recordingText: {
    color: '#f44336',
    fontWeight: 'bold',
    fontSize: 18,
  },
  actionButton: {
    backgroundColor: Colors.lightNavalBlue,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginBottom: 20,
  },
  resultSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
    width: '100%',
  },
  resultLabel: {
    fontSize: 16,
    color: '#555',
  },
  resultValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 30,
  },
  discardButton: {
    backgroundColor: '#9e9e9e',
    flex: 1,
    marginRight: 10,
  },
  saveButton: {
    flex: 1,
    marginLeft: 10,
  },
});

export default TestScreen;
