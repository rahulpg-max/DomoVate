import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import UniversalPinScreen from "../screens/UniversalPinScreen";
import HomeNameSetupScreen from "../screens/HomeNameSetup";
import SetupPinStep1 from "../screens/SetupPinStep1";
import SetupPinStep2 from "../screens/SetupPinStep2";
import SetupSecurityScreen from "../screens/SetupSecurityScreen";
import EnterHomePinScreen from "../screens/EnterHomePinScreen";
import ForgotPinScreen from "../screens/ForgotPinScreen"; 
import DashboardScreen from "../screens/DashboardScreen";
import MasterControlScreen from "../screens/MasterControlScreen";
import AdminScreen from "../screens/AdminScreen";
import ScanDevicesScreen from "../screens/ScanDevicesScreen";
import AdminAreasScreen from "../screens/AdminAreasScreen";
import PrivacyScreen from "../screens/PrivacyScreen";
import HelpScreen from "../screens/HelpScreen";
import AboutScreen from "../screens/AboutScreen";
import WeatherScreen from "../screens/WeatherScreen";
import EnergyScreen from "../screens/EnergyScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    try {
      const isSetup = await AsyncStorage.getItem("is_setup_complete");
      setInitialRoute(isSetup === "true" ? "Dashboard" : "UniversalPin");
      
    } catch (error) {
      setInitialRoute("UniversalPin");
    }
  };

  if (initialRoute === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A6CFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="UniversalPin" component={UniversalPinScreen} />
        <Stack.Screen name="HomeNameSetup" component={HomeNameSetupScreen} />
        <Stack.Screen name="SetupPinStep1" component={SetupPinStep1} />
        <Stack.Screen name="SetupPinStep2" component={SetupPinStep2} />
        <Stack.Screen name="SetupSecurity" component={SetupSecurityScreen} />
        
        <Stack.Screen name="EnterHomePin" component={EnterHomePinScreen} />
        <Stack.Screen name="ForgotPin" component={ForgotPinScreen} />
        
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="EnergyScreen" component={EnergyScreen} />
        <Stack.Screen name="MasterControl" component={MasterControlScreen} />
        <Stack.Screen name="AdminScreen" component={AdminScreen} />
        <Stack.Screen name="ScanDevices" component={ScanDevicesScreen} />
        <Stack.Screen name="AdminAreas" component={AdminAreasScreen} />
        
        <Stack.Screen name="WeatherScreen" component={WeatherScreen} />
        <Stack.Screen name="PrivacyScreen" component={PrivacyScreen} />
        <Stack.Screen name="HelpScreen" component={HelpScreen} />
        <Stack.Screen name="AboutScreen" component={AboutScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { 
    flex: 1, 
    backgroundColor: "#050919", 
    justifyContent: "center", 
    alignItems: "center" 
  }
});