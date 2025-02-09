import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import AudioVisualizer from '../utils/AudioVisualizer';
import { AudioHandler } from '../utils/AudioHandler';


const LiveScreen = () => {
  const {
    isRecording,
    timer,
    splData,
    nasalSplData,
    nasalanceData,
    stats,
    startRecording,
    stopRecording
  } = AudioHandler();

  return (
    <View style={styles.container}>
      <AudioVisualizer 
        splData={splData}
        nasalSplData={nasalSplData}
        nasalanceData={nasalanceData}
        stats={stats}
        timer={timer}
      />
      
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
  // Layout
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: 20,
  },
  
  // Timer
  timerContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  timer: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
  },
  
  // Graph
  graphTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginTop: 10,
    marginLeft: 20,
  },

  // Stats
  statsContainer: {
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginVertical: 10,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: Colors.lightNavalBlue,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    marginVertical: 5,
    fontSize: 14,
  },

  // Button
  button: {
    backgroundColor: Colors.lightNavalBlue,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 40,
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

export default LiveScreen;