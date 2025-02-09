import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Colors from '../constants/Colors';

const HomeScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>nasomEATR</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Live')}>
        <Text style={styles.buttonText}>live</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Prompted')}>
        <Text style={styles.buttonText}>prompted</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Test')}>
        <Text style={styles.buttonText}>test</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 24,
    marginBottom: 40,
  },
  button: {
    backgroundColor: Colors.lightNavalBlue,
    width: Dimensions.get('window').width * 0.6,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
  },
});

export default HomeScreen;