import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  Platform,
  PermissionsAndroid,
  StatusBar,
  TextInput
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";
import Zeroconf from 'react-native-zeroconf';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { useFocusEffect } from '@react-navigation/native';

const zeroconf = new Zeroconf();

const THEMES = {
  dark: { bg: "#000000", headerBg: "#000000", cardBg: "#121212", text: "#FFFFFF", subText: "#A8A8A8", accent: "#FFD700", border: "#262626", modalBg: "#1E1E1E", success: "#FFD700", btnText: "#000000", inputBg: "#262626" },
  light: { bg: "#FFFFFF", headerBg: "#FFFFFF", cardBg: "#FFFFFF", text: "#000000", subText: "#8E8E8E", accent: "#FFD700", border: "#DBDBDB", modalBg: "#FFFFFF", success: "#FFD700", btnText: "#000000", inputBg: "#EFEFEF" }
};

const TRANSLATIONS = {
  EN: { title: "Add Device", scan: "Scan", scanning: "Scanning...", stop: "Stop", manual: "Add by IP", ipPlace: "e.g. 192.168.33.1", add: "Add", found: "Devices Found", noDev: "No devices found yet.", save: "Save Device", area: "Assign Area", name: "Device Name", invalidFile: "Invalid File", jsonArray: "JSON must be an array", importDone: "Import Done", devAdded: "devices added", goToDash: "Go to Dashboard", error: "Error", failImport: "Failed to import file", importJSON: "Import JSON" },
  HIN: { title: "डिवाइस जोड़ें", scan: "स्कैन करें", scanning: "खोज रहा हूँ...", stop: "रोकें", manual: "IP से जोड़ें", ipPlace: "जैसे 192.168.33.1", add: "जोड़ें", found: "मिले उपकरण", noDev: "कोई डिवाइस नहीं मिला।", save: "सेव करें", area: "एरिया चुनें", name: "डिवाइस का नाम", invalidFile: "अमान्य फाइल", jsonArray: "JSON एक array होना चाहिए", importDone: "आयात पूर्ण", devAdded: "डिवाइस जोड़े गए", goToDash: "डैशबोर्ड पर जाएं", error: "त्रुटि", failImport: "फाइल आयात करने में विफल", importJSON: "JSON आयात" }
};

export default function ScanDevicesScreen({ navigation }) {
  const [scanning, setScanning] = useState(false);
  const [foundDevices, setFoundDevices] = useState([]);
  const [manualIp, setManualIp] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [customName, setCustomName] = useState("");
  const [areas, setAreas] = useState(["Living Room", "Bedroom"]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [language, setLanguage] = useState("EN");

  const colors = isDarkMode ? THEMES.dark : THEMES.light;
  const t = TRANSLATIONS[language] || TRANSLATIONS.EN;

  useFocusEffect(useCallback(() => { loadSettings(); loadAreas(); }, []));

  const loadSettings = async () => {
      const theme = await AsyncStorage.getItem("THEME_MODE");
      setIsDarkMode(theme === "dark");
      const lang = await AsyncStorage.getItem("LANGUAGE");
      setLanguage(lang || "EN");
  };

  const loadAreas = async () => {
      const raw = await AsyncStorage.getItem("AREAS_LIST");
      if(raw) setAreas(JSON.parse(raw));
  };

  const addDeviceToList = (dev) => {
      setFoundDevices(prev => {
          if (prev.find(d => d.ip === dev.ip)) return prev;
          return [...prev, dev];
      });
  };

  const startScan = async () => {
      if (Platform.OS === 'android') {
          await PermissionsAndroid.requestMultiple([
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
              PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES,
              PermissionsAndroid.PERMISSIONS.CHANGE_WIFI_MULTICAST_STATE
          ]);
      }
      setScanning(true);
      setFoundDevices([]);
      
      checkHotspot();

      try {
        zeroconf.stop();
        zeroconf.scan('http', 'tcp', 'local.');
      } catch(e){}

      setTimeout(() => setScanning(false), 10000);
  };

  const checkHotspot = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      try {
          const res = await fetch('http://192.168.33.1/settings', { signal: controller.signal });
          if (res.ok) {
              const json = await res.json();
              addDeviceToList({ name: "Shelly Hotspot", ip: "192.168.33.1", mac: json.device?.mac, type: "AP" });
          }
      } catch(e) {}
      
      try {
          const res2 = await fetch('http://192.168.33.1/rpc/Shelly.GetDeviceInfo', { signal: controller.signal });
          if(res2.ok) {
              const json = await res2.json();
              addDeviceToList({ name: json.name || "Shelly Gen2", ip: "192.168.33.1", mac: json.mac, type: "AP" });
          }
      } catch(e) {}
      
      clearTimeout(timeoutId);
  };

  useEffect(() => {
      zeroconf.on('resolved', service => {
          if (service.addresses && service.addresses.length > 0) {
              addDeviceToList({
                  name: service.name,
                  ip: service.addresses[0],
                  mac: service.txt?.mac || "UNKNOWN",
                  type: "WiFi"
              });
          }
      });
      return () => { try { zeroconf.stop(); zeroconf.removeDeviceListeners(); } catch(e){} };
  }, []);

  const handleFileUpload = async () => {
    try {
      const res = await DocumentPicker.pickSingle({ type: [DocumentPicker.types.json, DocumentPicker.types.allFiles] });
      const content = await RNFS.readFile(res.uri, 'utf8');
      let list = [];
      try { list = JSON.parse(content); } catch(e) { Alert.alert(t.invalidFile, "JSON error"); return; }

      if (!Array.isArray(list)) { Alert.alert(t.invalidFile, t.jsonArray); return; }

      const areasRaw = await AsyncStorage.getItem("AREA_DEVICES");
      const devRaw = await AsyncStorage.getItem("DEVICES");
      const stateRaw = await AsyncStorage.getItem("DEVICE_STATES");
      const areaListRaw = await AsyncStorage.getItem("AREAS_LIST");

      let areasMap = areasRaw ? JSON.parse(areasRaw) : {};
      let devices = devRaw ? JSON.parse(devRaw) : [];
      let states = stateRaw ? JSON.parse(stateRaw) : {};
      let areaList = areaListRaw ? JSON.parse(areaListRaw) : [];

      let added = 0;
      for (let d of list) {
        if (!d.name || !d.mac || !d.area) continue;
        if (devices.find(x => x.mac === d.mac)) continue;
        const id = d.mac.replace(/[:-\s]/g, "").toLowerCase();
        const dev = { id, name: d.name, ip: d.ip || "WAITING", mac: d.mac, type: d.type || "Smart Device", area: d.area };
        devices.push(dev);
        if (!areasMap[d.area]) areasMap[d.area] = [];
        if(!areasMap[d.area].find(x => x.mac === d.mac)) areasMap[d.area].push(dev);
        if (!areaList.includes(d.area)) areaList.push(d.area);
        states[id] = false;
        added++;
      }

      await AsyncStorage.setItem("DEVICES", JSON.stringify(devices));
      await AsyncStorage.setItem("AREA_DEVICES", JSON.stringify(areasMap));
      await AsyncStorage.setItem("DEVICE_STATES", JSON.stringify(states));
      await AsyncStorage.setItem("AREAS_LIST", JSON.stringify(areaList));

      Alert.alert(t.importDone, `${added} ${t.devAdded}`, [{ text: t.goToDash, onPress: () => navigation.replace("Dashboard") }]);
    } catch (e) { if (!DocumentPicker.isCancel(e)) Alert.alert(t.error, t.failImport); }
  };

  const handleManualAdd = () => {
      if(manualIp.length < 7) return Alert.alert("Error", "Invalid IP");
      setSelectedDevice({ name: "Manual Device", ip: manualIp, type: "Manual", mac: Date.now().toString() });
      setCustomName("New Device");
      setModalVisible(true);
  };

  const saveDevice = async (area) => {
      if (!selectedDevice) return;
      const cleanId = selectedDevice.mac ? selectedDevice.mac.replace(/[:-\s]/g, "").toLowerCase() : Date.now().toString();
      const newDev = { ...selectedDevice, name: customName, area, id: cleanId };
      
      const rawDevs = await AsyncStorage.getItem("DEVICES");
      const rawAreaDevs = await AsyncStorage.getItem("AREA_DEVICES");
      const rawStates = await AsyncStorage.getItem("DEVICE_STATES");
      const rawAreaList = await AsyncStorage.getItem("AREAS_LIST");

      let devs = rawDevs ? JSON.parse(rawDevs) : [];
      let areaMap = rawAreaDevs ? JSON.parse(rawAreaDevs) : {};
      let states = rawStates ? JSON.parse(rawStates) : {};
      let areaList = rawAreaList ? JSON.parse(rawAreaList) : [];

      devs = devs.filter(d => d.ip !== newDev.ip);
      devs.push(newDev);

      if(!areaMap[area]) areaMap[area] = [];
      areaMap[area].push(newDev);

      if(!areaList.includes(area)) areaList.push(area);

      states[newDev.id] = false;

      await AsyncStorage.setItem("DEVICES", JSON.stringify(devs));
      await AsyncStorage.setItem("AREA_DEVICES", JSON.stringify(areaMap));
      await AsyncStorage.setItem("DEVICE_STATES", JSON.stringify(states));
      await AsyncStorage.setItem("AREAS_LIST", JSON.stringify(areaList));

      setModalVisible(false);
      Alert.alert(t.added, `${newDev.name} added to ${area}`);
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.bg}]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.headerBg} />
      
      <View style={[styles.header, {backgroundColor: colors.headerBg, borderBottomColor: colors.border}]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={[styles.title, {color: colors.text}]}>{t.title}</Text>
        <View style={{width:24}}/>
      </View>

      <View style={styles.body}>
          <View style={[styles.manualBox, {backgroundColor: colors.cardBg, borderColor: colors.border}]}>
              <Text style={{color: colors.subText, marginBottom: 8}}>{t.manual}</Text>
              <View style={{flexDirection:'row'}}>
                  <TextInput 
                    style={[styles.input, {color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border}]} 
                    placeholder={t.ipPlace} 
                    placeholderTextColor={colors.subText}
                    value={manualIp}
                    onChangeText={setManualIp}
                  />
                  <TouchableOpacity style={[styles.addBtn, {backgroundColor: colors.accent}]} onPress={handleManualAdd}>
                      <Text style={{color: colors.btnText, fontWeight:'bold'}}>{t.add}</Text>
                  </TouchableOpacity>
              </View>
          </View>

          <View style={styles.topActionContainer}>
            <TouchableOpacity style={[styles.uploadTopBtn, {backgroundColor: colors.accent}]} onPress={handleFileUpload}>
                <Ionicons name="cloud-upload-outline" size={20} color={colors.btnText} />
                <Text style={[styles.uploadTopText, {color: colors.btnText}]}>{t.importJSON}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.scanRow}>
              <Text style={{color: colors.text, fontSize: 16, fontWeight:'bold'}}>{t.found} ({foundDevices.length})</Text>
              <TouchableOpacity onPress={() => scanning ? setScanning(false) : startScan()}>
                  <Text style={{color: colors.accent, fontWeight:'bold'}}>{scanning ? t.stop : t.scan}</Text>
              </TouchableOpacity>
          </View>

          {scanning && <ActivityIndicator size="small" color={colors.accent} style={{marginVertical: 10}} />}

          <FlatList 
            data={foundDevices}
            keyExtractor={i => i.ip}
            renderItem={({item}) => (
                <View style={[styles.item, {backgroundColor: colors.cardBg, borderColor: colors.border}]}>
                    <View>
                        <Text style={{color: colors.text, fontWeight:'bold'}}>{item.name}</Text>
                        <Text style={{color: colors.subText}}>{item.ip}</Text>
                    </View>
                    <TouchableOpacity style={{padding:8, backgroundColor: colors.accent, borderRadius: 6}} onPress={() => {setSelectedDevice(item); setCustomName(item.name); setModalVisible(true);}}>
                        <Ionicons name="add" size={20} color={colors.btnText} />
                    </TouchableOpacity>
                </View>
            )}
            ListEmptyComponent={<Text style={{color: colors.subText, textAlign:'center', marginTop: 20}}>{t.noDev}</Text>}
          />
      </View>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, {backgroundColor: colors.modalBg}]}>
                  <Text style={{color: colors.text, fontSize: 18, fontWeight:'bold', marginBottom: 15}}>{t.save}</Text>
                  <Text style={{color: colors.subText, marginBottom: 5}}>{t.name}</Text>
                  <TextInput 
                    style={[styles.input, {color: colors.text, backgroundColor: colors.inputBg, width: '100%', marginBottom: 15}]}
                    value={customName}
                    onChangeText={setCustomName}
                  />
                  <Text style={{color: colors.subText, marginBottom: 5}}>{t.area}</Text>
                  <FlatList 
                    data={areas}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    renderItem={({item}) => (
                        <TouchableOpacity style={{padding: 10, backgroundColor: colors.inputBg, marginRight: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border}} onPress={() => saveDevice(item)}>
                            <Text style={{color: colors.text}}>{item}</Text>
                        </TouchableOpacity>
                    )}
                  />
                  <TouchableOpacity style={{marginTop: 20, alignSelf:'center'}} onPress={() => setModalVisible(false)}>
                      <Text style={{color: colors.danger}}>{t.cancel}</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {flexDirection:'row', justifyContent:'space-between', padding: 16, alignItems:'center', borderBottomWidth: 1},
  title: {fontSize: 18, fontWeight: 'bold'},
  body: {padding: 16, flex: 1},
  manualBox: {padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 20},
  input: {flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, marginRight: 10},
  addBtn: {justifyContent:'center', paddingHorizontal: 20, borderRadius: 8},
  scanRow: {flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 10},
  item: {padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 10, flexDirection:'row', justifyContent:'space-between', alignItems:'center'},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent:'center', padding: 20},
  modalContent: {padding: 20, borderRadius: 16},
  topActionContainer: { marginBottom: 20 },
  uploadTopBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',paddingVertical:14,borderRadius:12},
  uploadTopText:{fontWeight:'600',marginLeft:10, fontSize: 16},
});