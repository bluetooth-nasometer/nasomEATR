import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';

const HomeScreen = ({ navigation }) => {
  const handleNavigation = () => {
    navigation.navigate('Main');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>nasomEATR</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={handleNavigation}>
        <Text style={styles.buttonText}>lets go</Text>
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
    marginBottom: 20,
  },
  button: {
    backgroundColor: Colors.lightNavalBlue,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
  },
});

export default HomeScreen;