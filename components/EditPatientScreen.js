import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Alert } from 'react-native';
import Colors from '../constants/Colors';
import { supabase } from '../utils/supabaseClient';
import HeaderBar from './common/HeaderBar';
import PatientFormFields from './common/PatientFormFields';
import LoadingIndicator from './common/LoadingIndicator';

const EditPatientScreen = ({ route, navigation }) => {
  const { patient } = route.params;
  const [name, setName] = useState(patient.full_name);
  const [gender, setGender] = useState(patient.gender);
  const [mrn, setMrn] = useState(patient.mrn.toString());
  const [loading, setLoading] = useState(false);
  const [birthDate, setBirthDate] = useState({
    year: new Date(patient.dob).getFullYear().toString(),
    month: (new Date(patient.dob).getMonth() + 1).toString().padStart(2, '0'),
    day: new Date(patient.dob).getDate().toString().padStart(2, '0')
  });

  // Demographic fields
  const [firstLanguage, setFirstLanguage] = useState(patient.first_language || '');
  const [secondLanguage, setSecondLanguage] = useState(patient.second_language || '');
  const [ethnicity, setEthnicity] = useState(patient.ethnicity || '');
  const [race, setRace] = useState(patient.race || '');
  const [country, setCountry] = useState(patient.country || '');

  const handleDateChange = (text, type) => {
    validateDate(text, type);
  };

  const validateDate = (text, type) => {
    const num = parseInt(text);
    let isValid = false;
    
    switch (type) {
      case 'year':
        if (num > 0 && num <= new Date().getFullYear()) {
          setBirthDate(prev => ({ ...prev, year: text }));
          isValid = true;
        }
        break;
      case 'month':
        if (num >= 1 && num <= 12) {
          setBirthDate(prev => ({ ...prev, month: text.padStart(2, '0') }));
          isValid = true;
        }
        break;
      case 'day':
        if (num >= 1 && num <= 31) {
          setBirthDate(prev => ({ ...prev, day: text.padStart(2, '0') }));
          isValid = true;
        }
        break;
    }
    return isValid;
  };

  const handleSave = async () => {
    if (!name || !gender || !birthDate.year || !birthDate.month || !birthDate.day) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      const dob = new Date(
        parseInt(birthDate.year),
        parseInt(birthDate.month) - 1,
        parseInt(birthDate.day),
        12, 0, 0
      ).toISOString().split('T')[0];

      const { error } = await supabase
        .from('patient')
        .update({
          full_name: name,
          gender,
          picture_url: patient.picture_url, // Keep existing picture URL if any
          dob: dob,
          first_language: firstLanguage || null,
          second_language: secondLanguage || null,
          ethnicity: ethnicity || null,
          race: race || null,
          country: country || null
        })
        .eq('mrn', patient.mrn);

      if (error) throw error;

      Alert.alert('Success', 'Patient updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const rightComponent = (
    <TouchableOpacity onPress={handleSave} disabled={loading}>
      <Text style={[styles.saveButton, loading && styles.buttonDisabled]}>
        {loading ? 'Saving...' : 'Save'}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingIndicator text="Saving changes..." fullScreen />;
  }

  return (
    <View style={styles.container}>
      <HeaderBar 
        title="Edit Patient" 
        onBack={() => navigation.goBack()}
        rightComponent={rightComponent}
      />
      
      <ScrollView style={styles.container}>
        <View style={styles.form}>
          <PatientFormFields
            name={name}
            setName={setName}
            gender={gender}
            setGender={setGender}
            birthDate={birthDate}
            onDateChange={handleDateChange}
            mrn={mrn}
            mrnEditable={false}
            setMrn={setMrn}
            firstLanguage={firstLanguage}
            setFirstLanguage={setFirstLanguage}
            secondLanguage={secondLanguage}
            setSecondLanguage={setSecondLanguage}
            ethnicity={ethnicity}
            setEthnicity={setEthnicity}
            race={race}
            setRace={setRace}
            country={country}
            setCountry={setCountry}
          />
        </View>
      </ScrollView>
    </View>
  );
};

// Styles unchanged
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  form: {
    padding: 20,
  },
  saveButton: {
    color: Colors.lightNavalBlue,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  }
});

export default EditPatientScreen;
