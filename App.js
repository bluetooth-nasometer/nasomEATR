import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState, Platform } from 'react-native';
import LoginScreen from './components/LoginScreen';
import SignupScreen from './components/SignupScreen';
import DashboardPage from './components/DashboardPage';
// HomeScreen -> PatientListScreen
import PatientListScreen from './components/PatientListScreen';
import SessionsScreen from './components/SessionsScreen';
import ProfileScreen from './components/ProfileScreen';
import AddPatientScreen from './components/AddPatientScreen';
import PatientDetailScreen from './components/PatientDetailScreen';
import EditPatientScreen from './components/EditPatientScreen';
import TestScreen from './components/TestScreen';
import TestDetailScreen from './components/TestDetailScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const appState = useRef(AppState.currentState);
  
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content"/>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="Dashboard" component={DashboardPage} />
          <Stack.Screen name="HomeTab" component={PatientListScreen} />
          <Stack.Screen name="Sessions" component={SessionsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="AddPatient" component={AddPatientScreen} />
          <Stack.Screen name="PatientDetail" component={PatientDetailScreen} />
          <Stack.Screen name="EditPatient" component={EditPatientScreen} />
          <Stack.Screen name="Test" component={TestScreen} />
          <Stack.Screen name="TestDetail" component={TestDetailScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}