import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import HeaderBar from './common/HeaderBar';
import Button from './common/Button';
import WaveformVisualizer from '../utils/WaveformVisualizer';

const StatusCard = ({ title, isConnected, isPairing, amplitude }) => {
  const getBackgroundColor = () => {
    if (isPairing) return '#E3F2FD'; // light blue
    if (isConnected) return '#E8F5E9'; // light green
    return '#EEEEEE'; // gray
  };

  const getStatusText = () => {
    if (isPairing) return 'Pairing...';
    if (isConnected) return 'Connected';
    return 'Not Connected';
  };

  return (
    <View style={[styles.card, { backgroundColor: getBackgroundColor() }]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.iconContainer}>
        <Ionicons name="mic" size={24} color="#333" style={styles.icon} />
        <Ionicons name="bluetooth" size={24} color="#333" style={styles.icon} />
      </View>
      <Text style={styles.statusText}>{getStatusText()}</Text>
      <WaveformVisualizer amplitude={amplitude} />
    </View>
  );
};

const CalibrationScreen = ({ navigation, route }) => {
  const patient = route.params?.patient;
  const [recording, setRecording] = useState(null);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordedAudioUri, setRecordedAudioUri] = useState(null);
  const [upperAmplitude, setUpperAmplitude] = useState(0);
  const [lowerAmplitude, setLowerAmplitude] = useState(0);
  const [activeTest, setActiveTest] = useState(null);

  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, []);

  const cleanupResources = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
      }
      if (sound) {
        await sound.unloadAsync();
      }
    } catch (error) {
      console.error('Error cleaning up:', error);
    }
  };

  const startRecording = async (micType) => {
    try {
      await cleanupResources();
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          const amplitude = status.metering || 0;
          const normalizedAmplitude = Math.min(Math.max(amplitude + 60, 0) / 60, 1);
          if (micType === 'upper') {
            setUpperAmplitude(normalizedAmplitude);
          } else {
            setLowerAmplitude(normalizedAmplitude);
          }
        },
         100
      );

      setRecording(recording);
      setActiveTest(micType);
      setRecordedAudioUri(null); // Clear previous recording
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordedAudioUri(uri);
      setRecording(null);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }

    setActiveTest(null);
    setUpperAmplitude(0);
    setLowerAmplitude(0);
  };

  const playRecording = async () => {
    try {
      if (!recordedAudioUri) return;

      // Unload previous sound if exists
      if (sound) {
        await sound.unloadAsync();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recordedAudioUri },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });

      await newSound.playAsync();
    } catch (error) {
      console.error('Failed to play recording:', error);
      setIsPlaying(false);
    }
  };

  const handleTestMic = async (type) => {
    if (activeTest === type) {
      await stopRecording();
    } else {
      if (recording) {
        await stopRecording();
      }
      await startRecording(type);
    }
  };

  return (
    <View style={styles.container}>
      <HeaderBar 
        title="Calibration"
        onBack={() => navigation.goBack()}
      />
      
      <View style={styles.content}>
        <StatusCard 
          title="Nasal/Upper Mic"
          isConnected={false}
          isPairing={false}
          amplitude={upperAmplitude}
        />
        
        <StatusCard 
          title="Oral/Lower Mic"
          isConnected={false}
          isPairing={false}
          amplitude={lowerAmplitude}
        />
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.testControls}>
          <View style={styles.buttonRow}>
            <Button
              title={activeTest === 'upper' ? "Stop Test" : "Test Nasal"}
              icon={activeTest === 'upper' ? "stop" : "mic-outline"}
              onPress={() => handleTestMic('upper')}
              style={styles.rowButton}
              variant={activeTest === 'upper' ? "secondary" : "primary"}
            />
            <Button
              title={activeTest === 'lower' ? "Stop Test" : "Test Oral"}
              icon={activeTest === 'lower' ? "stop" : "mic-outline"}
              onPress={() => handleTestMic('lower')}
              style={styles.rowButton}
              variant={activeTest === 'lower' ? "secondary" : "primary"}
            />
          </View>
          
          {recordedAudioUri && (
            <Button
              title={isPlaying ? "Playing..." : "Play Recording"}
              onPress={playRecording}
              disabled={isPlaying}
              icon={isPlaying ? "pause" : "play"}
              style={styles.fullWidthButton}
              variant="secondary"
            />
          )}

          <Button
            title="Test Both Mics"
            icon="mic-outline"
            onPress={() => {}}
            variant="secondary"
            style={styles.fullWidthButton}
            disabled={true}
          />
        </View>

        {/* Only show continue button if accessed from patient detail */}
        {patient && (
          <>
            <View style={styles.divider} />
            <View style={styles.navigationContainer}>
              <Button
                title="Continue to Evaluation"
                onPress={() => navigation.navigate('Test', { patient })}
                variant="primary"
                style={styles.continueButton}
                icon="arrow-forward"
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    gap: 20,
  },
  card: {
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginBottom: 15,
  },
  iconContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 15,
  },
  icon: {
    opacity: 0.7,
  },
  statusText: {
    fontSize: 16,
    color: '#666',
  },
  controlsContainer: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  testControls: {
    padding: 20,
    gap: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rowButton: {
    flex: 1,
  },
  fullWidthButton: {
    width: '100%',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginHorizontal: 20,
  },
  navigationContainer: {
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  continueButton: {
    width: '100%',
  },
});

export default CalibrationScreen;
