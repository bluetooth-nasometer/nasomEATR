import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';

const SessionsScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Sessions</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingTop: 60,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    padding: 20,
  },
});

export default SessionsScreen;
