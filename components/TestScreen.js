import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import Colors from '../constants/Colors';

const TestScreen = () => {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const cleanupRecording = async () => {
    try {
      if (recording) {
        const status = await recording.getStatusAsync();
        if (status.isRecording) {
          await recording.stopAndUnloadAsync();
        }
        setRecording(null);
      }
    } catch (error) {
      console.error('Failed to cleanup recording', error);
    }
  };

  useEffect(() => {
    requestPermissions();
    return () => {
      cleanupRecording();
    };
  }, []);

  const requestPermissions = async () => {
    try {
      // Request both audio and media library permissions
      const audioStatus = await Audio.requestPermissionsAsync();
      const mediaStatus = await MediaLibrary.requestPermissionsAsync();
      
      if (audioStatus.status !== 'granted' || mediaStatus.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'This app needs access to your microphone and storage to record audio.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const startRecording = async () => {
    try {
      // Clean up any existing recording first
      if (recording) {
        await cleanupRecording();
      }
      
      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      // Create new recording instance
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });

      await newRecording.startAsync();
      setRecording(newRecording);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false); // Set this first to prevent multiple stops
      const uri = recording.getURI();
      const status = await recording.getStatusAsync();
      
      if (status.isRecording) {
        await recording.stopAndUnloadAsync();
      }
      
      // Create a timestamp for unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('nasomEATR', asset, false);

      Alert.alert(
        'Recording Saved',
        'Recording has been saved to your device Audio/ folder',
        [{ text: 'OK' }]
      );

      setRecording(null);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
      setRecording(null);
      setIsRecording(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isRecording && styles.stopButton]}
        onPress={isRecording ? stopRecording : startRecording}
      >
        <Text style={styles.buttonText}>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  button: {
    backgroundColor: Colors.lightNavalBlue,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    width: '80%',
  },
  stopButton: {
    backgroundColor: '#FF6B6B',
  },
  buttonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default TestScreen;
