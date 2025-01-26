import React, { useState } from 'react';
import { View, TouchableOpacity, Image, StyleSheet, Text } from 'react-native';
import Colors from '../constants/Colors';

const MainScreen = () => {
  const [showImage, setShowImage] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setShowImage(true)}
      >
        <Text style={styles.buttonText}>Do smth</Text>
      </TouchableOpacity>
      
      {showImage && (
        <Image
          source={require('../assets/test.png')}
          style={styles.image}
        />
      )}
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
  button: {
    backgroundColor: Colors.lightNavalBlue,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 20,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
  },
  image: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
});

export default MainScreen;