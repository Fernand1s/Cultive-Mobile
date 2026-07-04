import { createStackNavigator } from '@react-navigation/stack';
import Login from '../screens/Login';
import TabRoutes from './tab.routers';

const Stack = createStackNavigator();

export function StackRoutes() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="HomeTabs" component={TabRoutes} />
    </Stack.Navigator>
  );
}

// <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />