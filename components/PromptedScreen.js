import React, { useState } from 'react';
import { View, TextInput, StyleSheet, ScrollView } from 'react-native';
import Colors from '../constants/Colors';

const PromptedScreen = () => {
  const [text, setText] = useState(
    "So how does the nasometer make you feel...?"
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.contentContainer}>
        <TextInput
          style={styles.textInput}
          multiline
          value={text}
          onChangeText={setText}
          placeholder="Enter text to read..."
          textAlignVertical="top"
        />
        {/* Add LiveScreen recording functionality here */}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  contentContainer: {
    padding: 20,
    flex: 1,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.lightNavalBlue,
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
    height: 200,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    textAlignVertical: 'top',
  },
});

export default PromptedScreen;