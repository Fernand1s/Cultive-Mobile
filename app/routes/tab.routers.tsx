import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Cultivos from '../screens/post_login/tabs/cultivos_tab';
import Estoque from '../screens/post_login/tabs/estoque_tab';
import Tarefas from '../screens/post_login/tabs/tarefas_tab';
import Relatorios from '../screens/post_login/tabs/relatorios_tab';
import Perfil from '../screens/post_login/tabs/perfil_tab';
import { Warehouse, Box, CheckSquare, BarChart3, User, Wheat, UserRound } from 'lucide-react-native';

const Tab = createBottomTabNavigator();

export default function TabRoutes() {
  return (
    <Tab.Navigator
      initialRouteName="Cultivos"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          height: Platform.OS === 'ios' ? 78 : 66,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
          shadowColor: 'transparent',
        },
        tabBarBackground: () => (
          <View
            style={{
              flex: 1,
              marginTop: Platform.OS === 'ios' ? 0 : -10,
              marginBottom: Platform.OS === 'ios' ? 0 : -10,

              //borderTopLeftRadius: 22,
              //borderTopRightRadius: 22,
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={['#20E512', '#0C321F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          </View>
        ),
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
        tabBarIcon: ({ color, size, focused }) => {
          const iconSize = focused ? 28 : 24;
          switch (route.name) {
            case 'Cultivos':
              return <Wheat size={iconSize} color={color} />;
            case 'Estoque':
              return <Warehouse size={iconSize} color={color} />;
            case 'Tarefas':
              return <CheckSquare size={iconSize} color={color} />;
            case 'Relatorios':
              return <BarChart3 size={iconSize} color={color} />;
            case 'Perfil':
              return <UserRound size={iconSize} color={color} />;
            default:
              return null;
          }
        },
      })}
    >
      <Tab.Screen name="Cultivos" component={Cultivos} />
      <Tab.Screen name="Estoque" component={Estoque} />
      <Tab.Screen name="Tarefas" component={Tarefas} />
      <Tab.Screen name="Relatorios" component={Relatorios} />
      <Tab.Screen name="Perfil" component={Perfil} />
    </Tab.Navigator>
  );
}