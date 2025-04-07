import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  ScrollView,
  Alert,
  Animated,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import Colors from '../constants/Colors';
import HeaderBar from './common/HeaderBar';
import { supabase } from '../utils/supabaseClient';

const TestScreen = ({ navigation, route }) => {
  const { nasalMic, oralMic, patient } = route.params || {};
  
  // Step management
  const [currentStep, setCurrentStep] = useState(0);
  const steps = ['Nasal Recording', 'Oral Recording', 'Review'];
  
  // Recording state management
  const [recording, setRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);
  
  // Audio recording objects
  const [audioRecording, setAudioRecording] = useState(null);
  
  // Audio data storage
  const [nasalRecording, setNasalRecording] = useState(null);
  const [oralRecording, setOralRecording] = useState(null);
  
  // Playback states and objects
  const [nasalSound, setNasalSound] = useState(null);
  const [oralSound, setOralSound] = useState(null);
  const [isPlayingNasal, setIsPlayingNasal] = useState(false);
  const [isPlayingOral, setIsPlayingOral] = useState(false);
  
  // Animation value for recording indicator
  const [pulseAnim] = useState(new Animated.Value(1));
  
  // Permission state
  const [hasPermission, setHasPermission] = useState(false);

  // Add loading state
  const [loading, setLoading] = useState(false);

  // Request microphone permissions when component mounts
  useEffect(() => {
    (async () => {
      await requestMicrophonePermission();
    })();
    
    return () => {
      // Clean up recordings and sounds when component unmounts
      if (audioRecording) {
        audioRecording.stopAndUnloadAsync();
      }
      if (nasalSound) {
        nasalSound.unloadAsync();
      }
      if (oralSound) {
        oralSound.unloadAsync();
      }
    };
  }, []);

  // Setup pulse animation
  useEffect(() => {
    if (recording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
    
    return () => {
      Animated.timing(pulseAnim).stop();
    };
  }, [recording]);

  // Timer management
  useEffect(() => {
    if (recording) {
      const interval = setInterval(() => {
        setTimer(prevTimer => prevTimer + 1);
      }, 1000);
      setTimerInterval(interval);
    } else if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [recording]);

  // Request microphone permission
  const requestMicrophonePermission = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Microphone access is required for recording audio.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        // Initialize Audio session for recording
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      }
    } catch (err) {
      console.error('Failed to get microphone permission', err);
      Alert.alert('Error', 'Failed to access microphone');
    }
  };

  const handleBackPress = () => {
    if (recording || nasalRecording || oralRecording) {
      Alert.alert(
        "Leave Test?",
        "Any unsaved recordings will be lost.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Leave", onPress: () => navigation.goBack() }
        ]
      );
    } else {
      navigation.goBack();
    }
  };
  
  // Start recording function with real audio recording
  const startRecording = async () => {
    if (!hasPermission) {
      await requestMicrophonePermission();
      if (!hasPermission) return;
    }
    
    try {
      setTimer(0);
      
      // Create a new Audio Recording
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      
      setAudioRecording(recording);
      setRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording');
    }
  };
  
  // Stop recording with real audio
  const stopRecording = async () => {
    try {
      if (!audioRecording) return;
      
      setRecording(false);
      
      // Stop the recording
      await audioRecording.stopAndUnloadAsync();
      
      // Get the recording URI
      const uri = audioRecording.getURI();
      
      // Save the recording data based on current step
      if (currentStep === 0) {
        setNasalRecording({
          duration: timer,
          timestamp: new Date().toISOString(),
          uri: uri
        });
      } else if (currentStep === 1) {
        setOralRecording({
          duration: timer,
          timestamp: new Date().toISOString(),
          uri: uri
        });
      }
      
      // Reset the recording object
      setAudioRecording(null);
    } catch (err) {
      console.error('Failed to stop recording', err);
      Alert.alert('Error', 'Failed to save recording');
      setAudioRecording(null);
      setRecording(false);
    }
  };
  
  // Play nasal recording
  const togglePlayNasal = async () => {
    if (isPlayingNasal) {
      // Stop playback
      if (nasalSound) {
        await nasalSound.stopAsync();
        setIsPlayingNasal(false);
      }
    } else {
      try {
        // If sound isn't loaded yet, load it
        let sound = nasalSound;
        if (!sound) {
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: nasalRecording.uri },
            { shouldPlay: true }
          );
          sound = newSound;
          setNasalSound(sound);
        } else {
          // Otherwise just play it
          await sound.playFromPositionAsync(0);
        }
        
        setIsPlayingNasal(true);
        
        // When sound finishes playing
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setIsPlayingNasal(false);
          }
        });
      } catch (err) {
        console.error('Failed to play nasal recording', err);
        Alert.alert('Error', 'Failed to play recording');
      }
    }
  };
  
  // Play oral recording
  const togglePlayOral = async () => {
    if (isPlayingOral) {
      // Stop playback
      if (oralSound) {
        await oralSound.stopAsync();
        setIsPlayingOral(false);
      }
    } else {
      try {
        // If sound isn't loaded yet, load it
        let sound = oralSound;
        if (!sound) {
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: oralRecording.uri },
            { shouldPlay: true }
          );
          sound = newSound;
          setOralSound(sound);
        } else {
          // Otherwise just play it
          await sound.playFromPositionAsync(0);
        }
        
        setIsPlayingOral(true);
        
        // When sound finishes playing
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setIsPlayingOral(false);
          }
        });
      } catch (err) {
        console.error('Failed to play oral recording', err);
        Alert.alert('Error', 'Failed to play recording');
      }
    }
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const nextStep = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
      setTimer(0);
    }
  };
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setTimer(0);
    }
  };
  
  // Upload audio file to Supabase Storage
  const uploadAudioToStorage = async (uri, fileName) => {
    try {
      // Read the audio file as base64
      const fileContent = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      // Upload to the patients_audio bucket
      const { data, error } = await supabase
        .storage
        .from('patients_audio')
        .upload(fileName, fileContent, {
          contentType: 'audio/mp3',
          upsert: true
        });
      
      if (error) throw error;
      
      // Get the public URL
      const { data: publicURLData } = supabase
        .storage
        .from('patients_audio')
        .getPublicUrl(fileName);
      
      return publicURLData.publicUrl;
    } catch (err) {
      console.error('Error uploading audio file:', err);
      throw err;
    }
  };
  
  // Modified save function to upload audio and save URLs
  const saveTestResults = async () => {
    try {
      if (!nasalRecording || !oralRecording) {
        Alert.alert("Error", "Both recordings must be completed before saving");
        return;
      }
      
      // Start loading state
      setLoading(true);
      
      const testDate = new Date().toISOString();
      const timestamp = Date.now();
      
      // Create unique filenames for the audio files
      const nasalFileName = `${patient.mrn}_nasal_${timestamp}.mp3`;
      const oralFileName = `${patient.mrn}_oral_${timestamp}.mp3`;
      
      // Upload both recordings to storage
      const nasalAudioUrl = await uploadAudioToStorage(nasalRecording.uri, nasalFileName);
      const oralAudioUrl = await uploadAudioToStorage(oralRecording.uri, oralFileName);
      
      // Calculate mock nasalance score (in a real app, this would be from actual analysis)
      const nasalanceScore = Math.floor(Math.random() * 40) + 20;
      
      // if for testData should be patient.mrn (as first few digits) concatenate with timestamp (final should be an integer)
      const testDataId = parseInt(`${patient.mrn}${timestamp}`);

      const testData = {
        
        id: testDataId,
        mrn: patient?.mrn,
        created_at: testDate,
        avg_nasalance_score: nasalanceScore,
        nasal_audio: nasalAudioUrl,
        oral_audio: oralAudioUrl,
        nasalance_data: JSON.stringify({
          score: nasalanceScore,
          nasal_device: nasalMic?.name || 'Internal Microphone',
          oral_device: oralMic?.name || 'Internal Microphone',
          duration: nasalRecording.duration + oralRecording.duration,
          recording_date: testDate
        })
      };
      
      // Insert into the patient_data table
      const { error } = await supabase
        .from('patient_data')
        .insert(testData);
      
      if (error) throw error;
      
      Alert.alert(
        "Success",
        "Test results and audio recordings saved successfully",
        [{ text: "OK", onPress: () => navigation.navigate('PatientDetail', { patient }) }]
      );
    } catch (error) {
      console.error("Error saving test results:", error);
      Alert.alert("Error", "Failed to save test results. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const renderStepIndicator = () => {
    return (
      <View style={styles.stepIndicator}>
        {steps.map((step, index) => (
          <View key={index} style={styles.stepContainer}>
            <View style={[
              styles.stepDot,
              currentStep === index ? styles.activeDot : null,
              currentStep > index ? styles.completedDot : null
            ]}>
              {currentStep > index ? (
                <Ionicons name="checkmark" size={14} color="white" />
              ) : (
                <Text style={
                  currentStep === index ? styles.activeStepNumber : styles.stepNumber
                }>{index + 1}</Text>
              )}
            </View>
            <Text style={[
              styles.stepLabel,
              currentStep === index ? styles.activeStepLabel : null
            ]}>{step}</Text>
          </View>
        ))}
      </View>
    );
  };
  
  const renderRecordingControls = () => {
    return (
      <View style={styles.recordingControls}>
        {recording ? (
          <TouchableOpacity 
            style={styles.stopButton} 
            onPress={stopRecording}
          >
            <Ionicons name="square" size={24} color="white" />
            <Text style={styles.buttonText}>Stop Recording</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.recordButton}
            onPress={startRecording}
          >
            <Animated.View style={{
              transform: [{ scale: pulseAnim }]
            }}>
              <Ionicons name="radio-button-on" size={24} color="white" />
            </Animated.View>
            <Text style={styles.buttonText}>Start Recording</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };
  
  const renderNasalRecording = () => {
    return (
      <View style={styles.recordingContainer}>
        <View style={styles.microphoneInfo}>
          <Ionicons name="mic" size={40} color={Colors.lightNavalBlue} />
          <Text style={styles.recordingTitle}>Nasal Microphone Recording</Text>
          <Text style={styles.instructions}>
            Position the nasal microphone and record the subject reading the provided passage
          </Text>
        </View>
        
        <View style={styles.timerContainer}>
          <Text style={styles.timer}>{formatTime(timer)}</Text>
          {recording && (
            <Animated.View 
              style={[
                styles.recordingIndicator,
                { transform: [{ scale: pulseAnim }] }
              ]}
            />
          )}
        </View>
        
        {renderRecordingControls()}
        
        {nasalRecording && !recording && (
          <TouchableOpacity 
            style={styles.nextButton}
            onPress={nextStep}
          >
            <Text style={styles.nextButtonText}>Continue to Oral Recording</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        )}
      </View>
    );
  };
  
  const renderOralRecording = () => {
    return (
      <View style={styles.recordingContainer}>
        <View style={styles.microphoneInfo}>
          <Ionicons name="mic-outline" size={40} color={Colors.lightNavalBlue} />
          <Text style={styles.recordingTitle}>Oral Microphone Recording</Text>
          <Text style={styles.instructions}>
            Position the oral microphone and record the subject reading the same passage
          </Text>
        </View>
        
        <View style={styles.timerContainer}>
          <Text style={styles.timer}>{formatTime(timer)}</Text>
          {recording && (
            <Animated.View 
              style={[
                styles.recordingIndicator,
                { transform: [{ scale: pulseAnim }] }
              ]}
            />
          )}
        </View>
        
        {renderRecordingControls()}
        
        <View style={styles.navigationRow}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={prevStep}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.lightNavalBlue} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          
          {oralRecording && !recording && (
            <TouchableOpacity 
              style={styles.nextButton}
              onPress={nextStep}
            >
              <Text style={styles.nextButtonText}>Review Recordings</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };
  
  const renderReview = () => {
    return (
      <View style={styles.reviewContainer}>
        <Text style={styles.reviewTitle}>Review Recordings</Text>
        
        {/* Nasal Recording Review */}
        <View style={styles.recordingReview}>
          <View style={styles.recordingInfo}>
            <Text style={styles.recordingTypeLabel}>Nasal Recording</Text>
            <Text style={styles.recordingDuration}>Duration: {formatTime(nasalRecording?.duration || 0)}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.playButton}
            onPress={togglePlayNasal}
            disabled={loading}
          >
            <Ionicons 
              name={isPlayingNasal ? "pause" : "play"} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
        </View>
        
        {/* Oral Recording Review */}
        <View style={styles.recordingReview}>
          <View style={styles.recordingInfo}>
            <Text style={styles.recordingTypeLabel}>Oral Recording</Text>
            <Text style={styles.recordingDuration}>Duration: {formatTime(oralRecording?.duration || 0)}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.playButton}
            onPress={togglePlayOral}
            disabled={loading}
          >
            <Ionicons 
              name={isPlayingOral ? "pause" : "play"} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
        </View>
        
        <View style={styles.navigationRow}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={prevStep}
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.lightNavalBlue} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.saveButton, loading && styles.disabledButton]}
            onPress={saveTestResults}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="white" />
                <Text style={[styles.saveButtonText, { marginLeft: 8 }]}>Saving...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.saveButtonText}>Save Results</Text>
                <Ionicons name="save-outline" size={20} color="white" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  const renderCurrentStep = () => {
    switch(currentStep) {
      case 0:
        return renderNasalRecording();
      case 1:
        return renderOralRecording();
      case 2:
        return renderReview();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar 
        title="Nasalance Test"
        onBack={handleBackPress}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Patient info */}
        <Text style={styles.patientName}>{patient?.full_name || 'Unknown Patient'}</Text>
        <Text style={styles.patientDetail}>MRN: {patient?.mrn || 'N/A'}</Text>
        
        {renderStepIndicator()}
        
        {renderCurrentStep()}
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
    paddingBottom: 40
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
  
  // Step indicator styles
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
    paddingHorizontal: 10,
  },
  stepContainer: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeDot: {
    backgroundColor: Colors.lightNavalBlue,
  },
  completedDot: {
    backgroundColor: '#4caf50',
  },
  stepNumber: {
    color: '#666',
    fontWeight: 'bold',
  },
  activeStepNumber: {
    color: 'white',
    fontWeight: 'bold',
  },
  stepLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  activeStepLabel: {
    color: Colors.lightNavalBlue,
    fontWeight: 'bold',
  },
  
  // Recording container styles
  recordingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    marginTop: 10,
    paddingHorizontal: 15,
  },
  microphoneInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginTop: 10,
    marginBottom: 8,
  },
  instructions: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  
  // Timer styles
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  timer: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
  },
  recordingIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f44336',
    marginLeft: 16,
  },
  
  // Recording controls
  recordingControls: {
    marginTop: 10,
    marginBottom: 20,
  },
  recordButton: {
    backgroundColor: '#f44336',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#f44336',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
  
  // Navigation buttons
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  nextButton: {
    backgroundColor: Colors.lightNavalBlue,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginRight: 8,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  backButtonText: {
    color: Colors.lightNavalBlue,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  
  // Review styles
  reviewContainer: {
    paddingVertical: 20,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    marginTop: 10,
    paddingHorizontal: 15,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginBottom: 20,
    textAlign: 'center',
  },
  recordingReview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recordingInfo: {
    flex: 1,
  },
  recordingTypeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginBottom: 5,
  },
  recordingDuration: {
    fontSize: 14,
    color: '#666',
  },
  playButton: {
    backgroundColor: Colors.lightNavalBlue,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginRight: 8,
  },
  disabledButton: {
    backgroundColor: '#a5d6a7', // Lighter green
    opacity: 0.8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TestScreen;
