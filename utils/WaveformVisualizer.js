import React from 'react';
import { View, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';

const WaveformVisualizer = ({ amplitude = 0 }) => {
  // Create 20 bars for the waveform
  const bars = Array.from({ length: 20 }, (_, index) => {
    // Create varying heights based on position and amplitude
    const baseHeight = 3 + Math.abs(index - 10) * 2; // Base height curve
    const height = baseHeight + (amplitude * 20); // Amplify by current audio level
    
    return (
      <View
        key={index}
        style={[
          styles.bar,
          { 
            height,
            opacity: amplitude > 0 ? 1 : 0.3
          }
        ]}
      />
    );
  });

  return (
    <View style={styles.container}>
      {bars}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginTop: 10,
  },
  bar: {
    width: 3,
    backgroundColor: Colors.lightNavalBlue,
    borderRadius: 2,
  },
});

export default WaveformVisualizer;
