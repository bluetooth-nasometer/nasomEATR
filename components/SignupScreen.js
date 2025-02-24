import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Dimensions,
  Alert 
} from 'react-native';
import Colors from '../constants/Colors';
import { supabase } from '../utils/supabaseClient';
import LoadingIndicator from './common/LoadingIndicator';
import Button from './common/Button';

const SignupScreen = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!email || !password || !fullName || !username) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      
      // 1. Create auth user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            username: username,
          }
        }
      });

      if (authError) throw authError;

      // 2. Insert into clinician table using auth user's UUID
      const { error: insertError } = await supabase
        .from('clinician')
        .insert([
          {
            id: authData.user.id,  // Using UUID from auth
            email: email,
            username: username,
            full_name: fullName,
          }
        ]);

      if (insertError) {
        // If clinician insert fails, clean up auth user
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw insertError;
      }

      Alert.alert(
        'Success', 
        'Please check your email for verification link',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );

    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingIndicator text="Creating account..." fullScreen />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      
      <Button 
        title={loading ? 'Creating Account...' : 'Sign Up'}
        onPress={handleSignup}
        disabled={loading}
        loading={loading}
        size="large"
        style={styles.button}
      />
      
      <Button 
        title="Already have an account? Sign in"
        onPress={() => navigation.goBack()}
        variant="ghost"
        style={styles.loginLink}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 50,
    color: Colors.lightNavalBlue,
  },
  input: {
    width: Dimensions.get('window').width * 0.8,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.lightNavalBlue,
    borderRadius: 25,
    paddingHorizontal: 20,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    width: Dimensions.get('window').width * 0.8,
    marginTop: 20,
  },
  loginLink: {
    marginTop: 20,
  },
});

export default SignupScreen;
