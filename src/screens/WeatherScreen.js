import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator,
  StyleSheet, SafeAreaView, Alert, StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

const THEME = {
  dark: { bg: "#000000", card: "#121212", text: "#FFFFFF", sub: "#A8A8A8", border: "#333", input: "#222" },
  light: { bg: "#F2F2F2", card: "#FFFFFF", text: "#000000", sub: "#666666", border: "#DDD", input: "#E0E0E0" }
};

export default function WeatherScreen({ navigation }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  React.useEffect(() => {
    AsyncStorage.getItem("THEME_MODE").then(val => {
      setDarkMode(val === "dark");
    });
  }, []);

  const colors = darkMode ? THEME.dark : THEME.light;

  const searchLocation = async () => {
    if (query.length < 3) return;
    setLoading(true);
    try {
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=10&language=en&format=json`);
      const data = await response.json();
      if (data.results) {
        setResults(data.results);
      } else {
        setResults([]);
        Alert.alert("No results", "City not found.");
      }
    } catch (e) {
      Alert.alert("Error", "Check internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const saveLocation = async (item) => {
    const config = {
      name: item.name,
      admin1: item.admin1, 
      country: item.country,
      latitude: item.latitude,
      longitude: item.longitude,
      active: true
    };
    await AsyncStorage.setItem("WEATHER_CONFIG", JSON.stringify(config));
    Alert.alert("Success", `${item.name} saved!`, [
      { text: "OK", onPress: () => navigation.goBack() }
    ]);
  };

  const removeWeather = async () => {
    await AsyncStorage.removeItem("WEATHER_CONFIG");
    Alert.alert("Removed", "Weather widget disabled.", [
        { text: "OK", onPress: () => navigation.goBack() }
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{padding: 10}}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Weather Setup</Text>
        <View style={{width: 40}} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.label, {color: colors.sub}]}>Enter City Name</Text>
        <View style={[styles.searchRow, {backgroundColor: colors.input, borderColor: colors.border}]}>
          <TextInput 
            style={[styles.input, {color: colors.text}]}
            placeholder="e.g. Indore, New York, London"
            placeholderTextColor={colors.sub}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={searchLocation}
          />
          <TouchableOpacity onPress={searchLocation} style={styles.searchBtn}>
             <Ionicons name="search" size={24} color="#0095F6" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0095F6" style={{marginTop: 20}} />
        ) : (
          <FlatList 
            data={results}
            keyExtractor={(item) => item.id.toString()}
            style={{marginTop: 10}}
            renderItem={({item}) => (
              <TouchableOpacity style={[styles.itemCard, {backgroundColor: colors.card, borderColor: colors.border}]} onPress={() => saveLocation(item)}>
                <View>
                  <Text style={[styles.cityName, {color: colors.text}]}>{item.name}</Text>
                  <Text style={[styles.regionName, {color: colors.sub}]}>
                    {item.admin1 ? `${item.admin1}, ` : ''}{item.country}
                  </Text>
                </View>
                <Ionicons name="cloud-upload-outline" size={24} color="#0095F6" />
              </TouchableOpacity>
            )}
          />
        )}
        
        <TouchableOpacity style={styles.removeBtn} onPress={removeWeather}>
            <Text style={{color: "#ED4956", fontWeight: "600"}}>Disable/Remove Weather</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
  title: { fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1, padding: 20 },
  label: { marginBottom: 10, fontSize: 14 },
  searchRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, height: 50 },
  input: { flex: 1, height: '100%', fontSize: 16 },
  searchBtn: { padding: 5 },
  itemCard: { padding: 15, borderRadius: 10, borderWidth: 1, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cityName: { fontSize: 18, fontWeight: 'bold' },
  regionName: { fontSize: 14, marginTop: 2 },
  removeBtn: { marginTop: 20, padding: 15, alignItems: 'center', justifyContent: 'center' }
});