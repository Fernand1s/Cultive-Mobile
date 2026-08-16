import { NavigationContainer } from '@react-navigation/native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './contexts/AuthContext';
import { SyncProvider } from './contexts/SyncContext';
import { StackRoutes } from './app/routes/stack.routes';
import { queryClient, sqlitePersister } from './services/queryClient';

export default function App() {
  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: sqlitePersister, maxAge: 1000 * 60 * 60 * 24 * 7 }}
      >
        <AuthProvider>
          <SyncProvider>
            <NavigationContainer>
              <StackRoutes />
            </NavigationContainer>
            <StatusBar style="auto" />
          </SyncProvider>
        </AuthProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}
