import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { WifiOff } from 'lucide-react-native';

import { useAuth } from '../../contexts/AuthContext';
import { useNetworkStatus, podeSincronizar } from '../../hooks/useNetworkStatus';

export default function Login() {
  const { entrar } = useAuth();
  const rede = useNetworkStatus();
  const online = podeSincronizar(rede);

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const handleLogin = async () => {
    if (enviando) return;

    if (!email.trim() || !senha) {
      setErro('Informe o e-mail e a senha para entrar.');
      return;
    }

    setErro(null);
    setEnviando(true);
    try {
      // A navegação acontece sozinha: o AuthProvider troca a pilha de rotas
      // assim que a sessão passa a existir.
      await entrar(email, senha);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/images/CultiveBackgroud.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={require('../../assets/images/logo2.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <View style={styles.login_container}>
            <Text style={styles.text}>Acesse o painel de gestão agrícola.</Text>

            {!online && (
              <View style={styles.aviso_offline}>
                <WifiOff size={16} color="#B45309" />
                <Text style={styles.aviso_offline_texto}>
                  Sem conexão — entrando com os dados salvos no aparelho.
                </Text>
              </View>
            )}

            <View style={styles.input_container}>
              <TextInput
                style={styles.input_email}
                placeholder="E-mail Corporativo"
                placeholderTextColor="#8A8A8A"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!enviando}
                returnKeyType="next"
              />

              <TextInput
                style={styles.input_senha}
                placeholder="Senha"
                placeholderTextColor="#8A8A8A"
                secureTextEntry
                value={senha}
                onChangeText={setSenha}
                autoCapitalize="none"
                textContentType="password"
                editable={!enviando}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />

              {erro && <Text style={styles.erro}>{erro}</Text>}

              <TouchableOpacity
                style={[styles.button_entrar, enviando && styles.button_desabilitado]}
                onPress={handleLogin}
                disabled={enviando}
                accessibilityRole="button"
              >
                {enviando ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 16 }}>Entrar no Sistema</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.link_senha}>Esqueceu sua senha?</Text>
            </View>
          </View>
        </ScrollView>

        <StatusBar style="light" />
      </KeyboardAvoidingView>
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
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 24,
  },
  logo: {
    width: 300,
    height: 260,
    marginBottom: 4,
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
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aviso_offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 16,
  },
  aviso_offline_texto: {
    flex: 1,
    color: '#B45309',
    fontSize: 12,
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
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#ccc',
    marginBottom: 10,
    color: '#000',
  },
  input_senha: {
    width: '90%',
    height: 50,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#ccc',
    color: '#000',
  },
  erro: {
    width: '90%',
    color: '#DC2626',
    fontSize: 13,
    marginTop: 12,
  },
  button_entrar: {
    width: '90%',
    height: 50,
    marginTop: 20,
    backgroundColor: '#16A34A',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button_desabilitado: {
    opacity: 0.7,
  },
  link_senha: {
    color: '#000',
    fontSize: 14,
    marginTop: 14,
  },
});
