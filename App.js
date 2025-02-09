import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './components/HomeScreen';
import LiveScreen from './components/LiveScreen';
import PromptedScreen from './components/PromptedScreen';
import TestScreen from './components/TestScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Live" 
          component={LiveScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Prompted" 
          component={PromptedScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Test" 
          component={TestScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}