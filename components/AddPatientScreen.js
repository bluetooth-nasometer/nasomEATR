import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../constants/Colors';
import HeaderBar from './common/HeaderBar';
import PatientFormFields from './common/PatientFormFields';
import { supabase } from '../utils/supabaseClient';
import uuid from 'react-native-uuid';
import { Ionicons } from '@expo/vector-icons';
import Button from './common/Button';

const AddPatientScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [mrn, setMrn] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Generate a unique filename
      const fileExt = uri.substring(uri.lastIndexOf('.') + 1);
      const fileName = `${uuid.v4()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase storage
      const { data, error: uploadError } = await supabase.storage
        .from('patient_photos')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('patient_photos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const checkMRNUnique = async (mrn) => {
    const { data, error } = await supabase
      .from('patient')
      .select('mrn')
      .eq('mrn', mrn)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !data;
  };

  const validateDate = (text, type) => {
    const num = parseInt(text);
    switch (type) {
      case 'year':
        if (num > 0 && num <= new Date().getFullYear()) {
          setYear(text);
        }
        break;
      case 'month':
        if (num >= 1 && num <= 12) {
          setMonth(text);
        }
        break;
      case 'day':
        if (num >= 1 && num <= 31) {
          setDay(text);
        }
        break;
    }
  };

  const handleDateChange = (text, type) => {
    validateDate(text, type);
  };

  const handleSubmit = async () => {
    if (!name || !gender || !year || !month || !day || !mrn) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      // Get current clinician's ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      // Upload image if exists
      let pictureUrl = null;
      if (image) {
        pictureUrl = await uploadImage(image);
      }

      // Create patient record
      const { error: insertError } = await supabase
        .from('patient')
        .insert([{
          mrn: parseInt(mrn),
          full_name: name,
          dob: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
          gender: gender,
          assigned_clinician: user.id,
          picture_url: pictureUrl
        }]);

      if (insertError) throw insertError;

      Alert.alert('Success', 'Patient added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const calculateProgress = () => {
    let progress = 0;
    if (name) progress += 20;
    if (gender) progress += 20;
    if (mrn) progress += 20;
    if (year && month && day) progress += 20;
    if (image) progress += 20;
    return progress;
  };

  return (
    <View style={styles.container}>
      <HeaderBar 
        title="Add New Patient" 
        onBack={() => navigation.goBack()}
        rightComponent={
          <Button
            title="Save"
            onPress={handleSubmit}
            variant="ghost"
            size="small"
            disabled={loading}
            textStyle={styles.saveButtonText}
          />
        }
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {loading ? 'Saving...' : 'Fill in patient details'}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${calculateProgress()}%` }
              ]} 
            />
          </View>
        </View>

        <View style={styles.formContainer}>
          <PatientFormFields
            name={name}
            setName={setName}
            gender={gender}
            setGender={setGender}
            birthDate={{ month, day, year }}
            onDateChange={handleDateChange}
            image={image}
            onImagePick={pickImage}
            mrn={mrn}
            setMrn={setMrn}
          />
        </View>

        <View style={styles.submitContainer}>
          <Button
            title={loading ? 'Adding Patient...' : 'Add Patient'}
            onPress={handleSubmit}
            disabled={loading}
            loading={loading}
            size="large"
            style={styles.submitButton}
          />
          <Text style={styles.disclaimer}>
            By adding this patient, you confirm you have the necessary permissions
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  progressContainer: {
    padding: 20,
    paddingBottom: 0,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#eee',
    borderRadius: 3,
    marginTop: 10, // Added margin top instead of margin bottom
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.lightNavalBlue,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    padding: 20,
  },
  submitContainer: {
    padding: 20,
    paddingTop: 0,
  },
  submitButton: {
    width: '100%',
    marginBottom: 12,
  },
  disclaimer: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  saveButtonText: {
    color: Colors.lightNavalBlue,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddPatientScreen;
