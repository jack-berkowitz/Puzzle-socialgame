import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import WebViewScreen from './src/screens/WebViewScreen';
import PuzzleMapScreen from './src/screens/PuzzleMapScreen';
import PuzzleScreen from './src/screens/PuzzleScreen';
import { colors } from './src/theme/colors';

const Stack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator
          initialRouteName="Web"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen
            name="Web"
            component={WebViewScreen}
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="PuzzleMap"
            component={PuzzleMapScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="Puzzle"
            component={PuzzleScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
