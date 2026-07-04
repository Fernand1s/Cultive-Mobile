//export { default } from './app/screens/Login';

//export { default } from 'expo-router';


import { NavigationContainer } from '@react-navigation/native';
import { StackRoutes } from './app/routes/stack.routes';

export default function App() {
  return (
    <NavigationContainer>
      <StackRoutes />
    </NavigationContainer>
  );
}