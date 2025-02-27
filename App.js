import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './components/LoginScreen';
import SignupScreen from './components/SignupScreen';
import DashboardPage from './components/DashboardPage';
import HomeScreen from './components/HomeScreen';
import SessionsScreen from './components/SessionsScreen';
import ProfileScreen from './components/ProfileScreen';
import AddPatientScreen from './components/AddPatientScreen';
import PatientDetailScreen from './components/PatientDetailScreen';
import EditPatientScreen from './components/EditPatientScreen';
import CalibrationScreen from './components/CalibrationScreen';
import TestScreen from './components/TestScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Dashboard" component={DashboardPage} />
        <Stack.Screen name="HomeTab" component={HomeScreen} />
        <Stack.Screen name="Sessions" component={SessionsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="AddPatient" component={AddPatientScreen} />
        <Stack.Screen name="PatientDetail" component={PatientDetailScreen} />
        <Stack.Screen name="EditPatient" component={EditPatientScreen} />
        <Stack.Screen name="Calibration" component={CalibrationScreen} />
        <Stack.Screen name="Test" component={TestScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}