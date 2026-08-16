// native-stack em vez de stack: usa as primitivas nativas do react-native-screens
// e dispensa o react-native-gesture-handler, cuja versão transitiva não bate com
// a compilada no Expo Go.
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

import { useAuth } from '../../contexts/AuthContext';
import { cores } from '../../theme';
import Login from '../screens/Login';
import Configuracao from '../screens/post_login/perfil_screens/Configuracao';
import Dados_Pessoais from '../screens/post_login/perfil_screens/Dados_Pessoais';
import Seguranca from '../screens/post_login/perfil_screens/Seguranca';
import Suporte from '../screens/post_login/perfil_screens/Suporte';
import Notificacoes from '../screens/post_login/perfil_screens/Notificacoes';
import TabRoutes from './tab.routers';

const Stack = createNativeStackNavigator();

/** Splash exibido enquanto a sessão salva é restaurada do aparelho. */
function Carregando() {
  return (
    <View style={styles.splash}>
      <Image
        source={require('../../assets/images/logo2.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#fff" />
    </View>
  );
}

export function StackRoutes() {
  const { autenticado, carregando } = useAuth();

  if (carregando) return <Carregando />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!autenticado ? (
        // Sem sessão: só existe a tela de login (não há cadastro no app).
        <Stack.Screen name="Login" component={Login} />
      ) : (
        <>
          <Stack.Screen name="HomeTabs" component={TabRoutes} />
          <Stack.Screen name="DadosPessoais" component={Dados_Pessoais} />
          <Stack.Screen name="Seguranca" component={Seguranca} />
          <Stack.Screen name="Configuracoes" component={Configuracao} />
          <Stack.Screen name="Notificacoes" component={Notificacoes} />
          <Stack.Screen name="Suporte" component={Suporte} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: cores.verdeEscuro,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  logo: {
    width: 260,
    height: 220,
  },
});
