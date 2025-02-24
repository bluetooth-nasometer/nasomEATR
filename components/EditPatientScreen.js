import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Alert } from 'react-native';
import Colors from '../constants/Colors';
import { supabase } from '../utils/supabaseClient';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import HeaderBar from './common/HeaderBar';
import PatientFormFields from './common/PatientFormFields';
import LoadingIndicator from './common/LoadingIndicator';

const EditPatientScreen = ({ route, navigation }) => {
  const { patient } = route.params;
  const [name, setName] = useState(patient.full_name);
  const [gender, setGender] = useState(patient.gender);
  const [mrn, setMrn] = useState(patient.mrn.toString());
  const [image, setImage] = useState(patient.picture_url ? { uri: patient.picture_url } : null);
  const [loading, setLoading] = useState(false);
  const [birthDate, setBirthDate] = useState({
    year: new Date(patient.dob).getFullYear().toString(),
    month: (new Date(patient.dob).getMonth() + 1).toString().padStart(2, '0'),
    day: new Date(patient.dob).getDate().toString().padStart(2, '0')
  });

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setImage({
        uri: result.assets[0].uri,
        base64: result.assets[0].base64,
        isNew: true
      });
    }
  };

  const handleDateChange = (text, type) => {
    validateDate(text, type);
  };

  const uploadNewImage = async () => {
    if (!image?.isNew) return patient.picture_url;

    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `${cleanName}_${dateStr}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('patient_photos')
      .upload(fileName, decode(image.base64), {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('patient_photos')
      .getPublicUrl(fileName);

    return publicUrl;
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

      let pictureUrl = patient.picture_url;
      if (image?.isNew) {
        pictureUrl = await uploadNewImage();
      }

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
          picture_url: pictureUrl,
          dob: dob,
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
            image={image}
            onImagePick={handleImagePick}
            mrn={mrn}
            mrnEditable={false}
            setMrn={setMrn}
          />
        </View>
      </ScrollView>
    </View>
  );
};

// Simplified styles since form field styles are now in PatientFormFields
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
