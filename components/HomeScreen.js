import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { supabase } from '../utils/supabaseClient';

const HomeScreen = ({ navigation }) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchPatients();
    setRefreshing(false);
  }, []);

  const fetchPatients = async () => {
    try {
      // Get current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user logged in');

      // Fetch patients assigned to the logged-in clinician
      const { data, error } = await supabase
        .from('patient')
        .select(`
          mrn,
          full_name,
          dob,
          created_at,
          gender,
          patient_data(
            created_at
          )
        `)
        .eq('assigned_clinician', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process the data to get the last test date
      const processedPatients = data.map(patient => ({
        mrn: patient.mrn,
        name: patient.full_name,
        testsCount: patient.patient_data?.length || 0,
        lastTestDate: patient.patient_data?.[0]?.created_at || null,
        dob: patient.dob,
        gender: patient.gender
      }));

      setPatients(processedPatients);
    } catch (error) {
      console.error('Error fetching patients:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No tests yet';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={Colors.lightNavalBlue} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Patient List</Text>
      </View>
      
      <ScrollView 
        style={styles.patientList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.lightNavalBlue]}
            tintColor={Colors.lightNavalBlue}
          />
        }
      >
        {patients.length === 0 ? (
          <Text style={styles.noPatients}>No patients assigned yet</Text>
        ) : (
          patients.map((patient) => (
            <TouchableOpacity 
              key={patient.mrn}
              style={styles.patientCard}
              onPress={() => navigation.navigate('PatientDetails', { patient })}
            >
              <Text style={styles.patientName}>{patient.name}</Text>
              <Text style={styles.patientInfo}>
                MRN: {patient.mrn} • DOB: {formatDate(patient.dob)}
              </Text>
              <View style={styles.patientDetails}>
                <Text style={styles.detailText}>
                  {patient.testsCount} tests
                </Text>
                <Text style={styles.detailText}>
                  Last test: {formatDate(patient.lastTestDate)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddPatient')}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    backgroundColor: Colors.lightNavalBlue,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
  },
  patientList: {
    flex: 1,
    padding: 15,
  },
  patientCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.lightNavalBlue,
    marginBottom: 5,
  },
  patientDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailText: {
    color: '#666',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 15,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.lightNavalBlue,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  popup: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  popupText: {
    marginLeft: 12,
    fontSize: 16,
    color: Colors.lightNavalBlue,
    fontWeight: '500',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPatients: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  patientInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
});

export default HomeScreen;