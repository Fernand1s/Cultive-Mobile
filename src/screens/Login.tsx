import { StatusBar } from 'expo-status-bar';
import { Image, ImageBackground, StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native';

export default function Login() {
  return (
    <ImageBackground
      source={require('../../assets/images/CultiveBackgroud.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <Image
          source={require('../../assets/images/logo2.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.login_container}>
          <Text style={styles.text}>Acesse o painel de gestão agrícola.</Text>
          <View style={styles.input_container}>
         
              <TextInput style={styles.input_email} placeholder="E-mail Corporativo"></TextInput>

              <TextInput style={styles.input_senha} secureTextEntry={true} placeholder="Senha"></TextInput>
            
            <TouchableOpacity style={styles.button_entrar}>
              <Text style={{ color: '#fff', fontSize: 16 }}>Entrar no Sistema</Text>
            </TouchableOpacity>

            <Text style={{ color: '#000', fontSize: 14, marginTop: 10 }}>Esqueceu sua senha?</Text>
            
          </View>
        </View>
        
        <StatusBar style="auto" />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 83, 45, 0.80)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  logo: {
    width: 380,
    height: 380,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.9,
    shadowRadius: 15,
    elevation: 10,
  },
  text: {
    color: '#000',
    opacity: 0.7,
    fontSize: 18,
    textAlign: 'center',
  },
  login_container: {
    width: 400,
    height: 400,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input_container: {
    width: '100%',
    
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input_email: {
    width: '90%',
    height: 50,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#ccc',
    marginBottom: 10,
    color: '#000',
    opacity: 0.7,
  },
  input_senha: {
    width: '90%',
    height: 50,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#ccc',
    color: '#000',
    opacity: 0.7,
  },
  button_entrar: {
    width: '90%',
    height: 50,
    marginTop: 20,
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
