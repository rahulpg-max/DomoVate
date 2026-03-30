import React, { useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, FlatList, Modal, TextInput, Alert, StyleSheet, SafeAreaView, StatusBar, Platform, ScrollView
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { useFocusEffect } from '@react-navigation/native';

const THEMES = {
  dark: { bg: "#000000", headerBg: "#000000", inputBg: "#262626", cardBg: "#121212", text: "#FFFFFF", subText: "#A8A8A8", iconDefault: "#FFFFFF", accent: "#FFD700", danger: "#ED4956", border: "#262626", modalBg: "#262626", placeholder: "#888", activePill: "#FFD700", pillBg: "#262626", btnText: "#000000" },
  light: { bg: "#FFFFFF", headerBg: "#FFFFFF", inputBg: "#EFEFEF", cardBg: "#FFFFFF", text: "#000000", subText: "#8E8E8E", iconDefault: "#000000", accent: "#FFD700", danger: "#ED4956", border: "#DBDBDB", modalBg: "#FFFFFF", placeholder: "#999", activePill: "#FFD700", pillBg: "#EFEFEF", btnText: "#000000" }
};

const TRANSLATIONS = {
  EN: { manageAreas: "Manage Areas", importFile: "Import Devices (JSON/XML)", createRooms: "Create rooms or import from file.", devices: "Devices", noAreas: "No areas found.", tapCreate: "Tap '+' to create a room.", rename: "Rename Area", newArea: "New Area", enterName: "e.g. Kitchen, Bedroom...", cancel: "Cancel", save: "Save", addDev: "Add New Device", devNamePlace: "Device Name (e.g. Tube Light)", addNew: "+ Add Device", devsIn: "Devices in", noDevs: "No devices yet.", manage: "Manage Devices", invalidFile: "Invalid File", importSuccess: "Import Successful", importMsg: "new devices added. Dashboard will auto-scan IPs.", deleteTitle: "Delete Area?", deleteMsg: "Deleting this area will remove all devices inside it.", delete: "Delete", invalidName: "Invalid Name", shortName: "Area name too short.", exists: "Area already exists.", devNameReq: "Please enter a device name.", success: "Success", devAdded: "Device Added!", ipPlace: "IP Address (Optional)", macPlace: "MAC Address (Optional)" },
  HIN: { manageAreas: "एरिया प्रबंधित करें", importFile: "डिवाइस आयात करें (JSON/XML)", createRooms: "कमरे बनाएं या फाइल से आयात करें।", devices: "उपकरण", noAreas: "कोई एरिया नहीं मिला।", tapCreate: "नया बनाने के लिए '+' दबाएं।", rename: "एरिया का नाम बदलें", newArea: "नया एरिया", enterName: "जैसे: रसोई, शयनकक्ष...", cancel: "रद्द करें", save: "सेव करें", addDev: "नया डिवाइस जोड़ें", devNamePlace: "डिवाइस का नाम (जैसे: ट्यूब लाइट)", addNew: "+ डिवाइस जोड़ें", devsIn: "में डिवाइस", noDevs: "कोई डिवाइस नहीं।", manage: "डिवाइस प्रबंधित करें", invalidFile: "अमान्य फाइल", importSuccess: "आयात सफल", importMsg: "नए डिवाइस जोड़े गए। डैशबोर्ड ऑटो-स्कैन करेगा।", deleteTitle: "एरिया हटाएं?", deleteMsg: "इस एरिया को हटाने से इसके सभी डिवाइस हट जाएंगे।", delete: "हटाएं", invalidName: "अमान्य नाम", shortName: "नाम बहुत छोटा है।", exists: "एरिया पहले से मौजूद है।", devNameReq: "कृपया डिवाइस का नाम दर्ज करें।", success: "सफल", devAdded: "डिवाइस जोड़ा गया!", ipPlace: "IP पता (वैकल्पिक)", macPlace: "MAC पता (वैकल्पिक)" }
};

export default function AdminAreasScreen({ navigation }) {
  const [areas, setAreas] = useState([]);
  const [areaDevicesMap, setAreaDevicesMap] = useState({}); 
  const [areaModalVisible, setAreaModalVisible] = useState(false);
  const [isEditingArea, setIsEditingArea] = useState(false);
  const [currentAreaName, setCurrentAreaName] = useState(""); 
  const [areaInput, setAreaInput] = useState("");
  const [deviceModalVisible, setDeviceModalVisible] = useState(false);
  const [selectedAreaForDevice, setSelectedAreaForDevice] = useState(null);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [newDeviceType, setNewDeviceType] = useState("Light"); 
  const [newDeviceIP, setNewDeviceIP] = useState("");
  const [newDeviceMAC, setNewDeviceMAC] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [language, setLanguage] = useState("EN");

  const DEVICE_TYPES = ["Light", "Fan", "AC", "TV", "Socket", "Fridge", "Motor"];
  const colors = isDarkMode ? THEMES.dark : THEMES.light;
  const t = TRANSLATIONS[language] || TRANSLATIONS.EN;

  useFocusEffect(useCallback(() => { loadSettings(); loadData(); }, []));

  const loadSettings = async () => {
      const savedTheme = await AsyncStorage.getItem("THEME_MODE");
      if (savedTheme) setIsDarkMode(savedTheme === "dark");
      const savedLang = await AsyncStorage.getItem("LANGUAGE");
      if (savedLang) setLanguage(savedLang);
  };

  const loadData = async () => {
    try {
      const rawMap = await AsyncStorage.getItem("AREA_DEVICES");
      const map = rawMap ? JSON.parse(rawMap) : {};
      const rawList = await AsyncStorage.getItem("AREAS_LIST");
      let list = rawList ? JSON.parse(rawList) : [];
      const mapKeys = Object.keys(map);
      let updated = false;
      mapKeys.forEach(k => { if(!list.includes(k)){ list.push(k); updated = true; } });
      if(updated){ await AsyncStorage.setItem("AREAS_LIST", JSON.stringify(list)); }
      setAreas(list);
      setAreaDevicesMap(map);
    } catch (e) {}
  };

  const getCleanId = (rawId) => {
      if (!rawId) return "";
      const strId = String(rawId).trim();
      if (/^\d+$/.test(strId)) {
          try {
              /* global BigInt */
              let hex = BigInt(strId).toString(16);
              return hex.toLowerCase();
          } catch(e) { return strId; }
      }
      return strId.replace(/[^a-fA-F0-9]/g, "").toLowerCase();
  };

  const parseXML = (xmlString) => {
    const devices = [];
    const deviceRegex = /<device>([\s\S]*?)<\/device>/g;
    let match;
    while ((match = deviceRegex.exec(xmlString)) !== null) {
        const content = match[1];
        const name = (content.match(/<name>\s*(.*?)\s*<\/name>/) || [])[1];
        const mac = (content.match(/<mac>\s*(.*?)\s*<\/mac>/) || [])[1];
        const area = (content.match(/<area>\s*(.*?)\s*<\/area>/) || [])[1];
        const type = (content.match(/<type>\s*(.*?)\s*<\/type>/) || [])[1];
        const ip = (content.match(/<ip>\s*(.*?)\s*<\/ip>/) || [])[1]; 
        if (mac && area) {
            devices.push({ name: name || "Unknown Device", ip: ip || null, area: area, mac: mac, type: type || "Light" });
        }
    }
    return devices;
  };

  const handleImportFile = async () => {
    try {
        const res = await DocumentPicker.pickSingle({ type: [DocumentPicker.types.allFiles] });
        const content = await RNFS.readFile(res.uri, 'utf8');
        let list = [];
        if (res.name.toLowerCase().endsWith('.xml')) { list = parseXML(content); } 
        else { try { list = JSON.parse(content); } catch(e) { Alert.alert(t.invalidFile, "Format error"); return; } }
        
        if (!Array.isArray(list) || list.length === 0) { Alert.alert(t.invalidFile, "No valid devices found."); return; }

        const rawAreas = await AsyncStorage.getItem("AREAS_LIST");
        const rawMap = await AsyncStorage.getItem("AREA_DEVICES");
        const rawDevs = await AsyncStorage.getItem("DEVICES");
        const rawStates = await AsyncStorage.getItem("DEVICE_STATES");
        let currentAreas = rawAreas ? JSON.parse(rawAreas) : [];
        let currentMap = rawMap ? JSON.parse(rawMap) : {};
        let currentAllDevs = rawDevs ? JSON.parse(rawDevs) : [];
        let currentStates = rawStates ? JSON.parse(rawStates) : {};
        let addedCount = 0;

        for (let d of list) {
            if (!d.mac || !d.area) continue;
            
            const cleanMac = getCleanId(d.mac); 
            
            const existsIndex = currentAllDevs.findIndex(x => x.mac === d.mac || x.id === cleanMac);
            const newDev = {
                id: cleanMac,
                name: d.name || `Device ${cleanMac.slice(-4)}`,
                ip: d.ip && d.ip !== "" ? d.ip : null,
                mac: d.mac,
                cleanMac: cleanMac,
                type: d.type || "Smart Device",
                area: d.area
            };
            if (existsIndex > -1) { currentAllDevs[existsIndex] = newDev; } 
            else { currentAllDevs.push(newDev); }
            if (!currentAreas.includes(d.area)) { currentAreas.push(d.area); currentMap[d.area] = []; }
            if (!currentMap[d.area]) currentMap[d.area] = [];
            const mapIndex = currentMap[d.area].findIndex(x => x.mac === d.mac || x.id === cleanMac);
            if(mapIndex > -1){ currentMap[d.area][mapIndex] = newDev; } 
            else { currentMap[d.area].push(newDev); }
            if(currentStates[cleanMac] === undefined) currentStates[cleanMac] = false;
            addedCount++;
        }
        await AsyncStorage.setItem("AREAS_LIST", JSON.stringify(currentAreas));
        await AsyncStorage.setItem("AREA_DEVICES", JSON.stringify(currentMap));
        await AsyncStorage.setItem("DEVICES", JSON.stringify(currentAllDevs));
        await AsyncStorage.setItem("DEVICE_STATES", JSON.stringify(currentStates));
        loadData();
        Alert.alert(t.importSuccess, `${addedCount} ${t.importMsg}`);
    } catch (e) { if (!DocumentPicker.isCancel(e)) console.warn(e); }
  };

  const handleAddArea = () => { setIsEditingArea(false); setAreaInput(""); setAreaModalVisible(true); };
  const handleEditArea = (areaName) => { setIsEditingArea(true); setCurrentAreaName(areaName); setAreaInput(areaName); setAreaModalVisible(true); };
  const handleDeleteArea = (areaName) => {
    Alert.alert(t.deleteTitle, t.deleteMsg, [
        { text: t.cancel, style: "cancel" },
        { text: t.delete, style: "destructive", onPress: async () => {
            try {
              const newList = areas.filter(a => a !== areaName);
              setAreas(newList);
              await AsyncStorage.setItem("AREAS_LIST", JSON.stringify(newList));
              const newMap = { ...areaDevicesMap };
              delete newMap[areaName];
              setAreaDevicesMap(newMap);
              await AsyncStorage.setItem("AREA_DEVICES", JSON.stringify(newMap));
            } catch (e) {}
          }}
      ]);
  };
  const handleSaveArea = async () => {
    if (areaInput.trim().length < 2) { Alert.alert(t.invalidName, t.shortName); return; }
    const newName = areaInput.trim();
    let newList = [...areas];
    let newMap = { ...areaDevicesMap };
    try {
      if (isEditingArea) {
        const index = newList.indexOf(currentAreaName);
        if (index !== -1) newList[index] = newName;
        if (newMap[currentAreaName]) { newMap[newName] = newMap[currentAreaName]; delete newMap[currentAreaName]; }
      } else {
        if (newList.includes(newName)) { Alert.alert(t.invalidName, t.exists); return; }
        newList.push(newName);
        if (!newMap[newName]) newMap[newName] = [];
      }
      setAreas(newList);
      setAreaDevicesMap(newMap);
      await AsyncStorage.setItem("AREAS_LIST", JSON.stringify(newList));
      await AsyncStorage.setItem("AREA_DEVICES", JSON.stringify(newMap));
      setAreaModalVisible(false);
    } catch (e) {}
  };
  const openDeviceManager = (areaName) => { 
      setSelectedAreaForDevice(areaName); 
      setNewDeviceName(""); 
      setNewDeviceType("Light"); 
      setNewDeviceIP("");
      setNewDeviceMAC("");
      setDeviceModalVisible(true); 
  };
  const handleAddDevice = async () => {
    if (newDeviceName.trim().length < 2) { Alert.alert(t.invalidName, t.devNameReq); return; }
    
    const finalIP = newDeviceIP.trim() !== "" ? newDeviceIP.trim() : null;
    const finalMAC = newDeviceMAC.trim() !== "" ? newDeviceMAC.trim() : null;
    
    const deviceID = finalMAC ? getCleanId(finalMAC) : Date.now().toString();

    const newDevice = { 
        id: deviceID, 
        name: newDeviceName.trim(), 
        type: newDeviceType, 
        ip: finalIP, 
        mac: finalMAC,
        localName: newDeviceName.trim() 
    };

    try {
      const newMap = { ...areaDevicesMap };
      if (!newMap[selectedAreaForDevice]) newMap[selectedAreaForDevice] = [];
      newMap[selectedAreaForDevice].push(newDevice);
      setAreaDevicesMap(newMap);
      await AsyncStorage.setItem("AREA_DEVICES", JSON.stringify(newMap));
      const rawDevs = await AsyncStorage.getItem("DEVICES");
      const allDevs = rawDevs ? JSON.parse(rawDevs) : [];
      allDevs.push(newDevice);
      await AsyncStorage.setItem("DEVICES", JSON.stringify(allDevs));
      const rawStates = await AsyncStorage.getItem("DEVICE_STATES");
      const states = rawStates ? JSON.parse(rawStates) : {};
      states[newDevice.id] = false;
      await AsyncStorage.setItem("DEVICE_STATES", JSON.stringify(states));
      setNewDeviceName("");
      setNewDeviceIP("");
      setNewDeviceMAC("");
      Alert.alert(t.success, t.devAdded);
    } catch (e) {}
  };
  const handleDeleteDevice = async (deviceId) => {
    try {
      const newMap = { ...areaDevicesMap };
      const areaList = newMap[selectedAreaForDevice] || [];
      const updatedList = areaList.filter(d => (d.id || d.name) !== deviceId);
      newMap[selectedAreaForDevice] = updatedList;
      setAreaDevicesMap(newMap);
      await AsyncStorage.setItem("AREA_DEVICES", JSON.stringify(newMap));
    } catch (e) {}
  };
  const getIconForType = (type) => {
     switch(type) {
         case "Fan": return "aperture-outline";
         case "AC": return "snow-outline";
         case "TV": return "tv-outline";
         case "Socket": return "power-outline";
         case "Fridge": return "cube-outline";
         default: return "bulb-outline";
     }
  };

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.bg}]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.headerBg} />
      <View style={[styles.header, {backgroundColor: colors.headerBg, borderBottomColor: colors.border}]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>{t.manageAreas}</Text>
        <View style={{ width: 40 }} /> 
      </View>
      <View style={{paddingHorizontal: 20, marginTop: 15}}>
          <TouchableOpacity style={[styles.importBtn, {backgroundColor: colors.accent, borderColor: colors.border}]} onPress={handleImportFile}>
              <Ionicons name="cloud-download-outline" size={20} color={colors.btnText} />
              <Text style={[styles.importText, {color: colors.btnText}]}>{t.importFile}</Text>
          </TouchableOpacity>
      </View>
      <Text style={[styles.subText, {color: colors.subText}]}>{t.createRooms}</Text>
      <FlatList
        data={areas}
        keyExtractor={(item) => item}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        renderItem={({ item }) => {
            const devCount = areaDevicesMap[item] ? areaDevicesMap[item].length : 0;
            return (
              <View style={[styles.card, {backgroundColor: colors.cardBg, borderColor: colors.border}]}>
                <View style={styles.cardHeader}>
                    <View style={styles.cardIconBox}><Ionicons name="grid-outline" size={24} color={colors.accent} /></View>
                    <View style={{flex: 1}}>
                        <Text style={[styles.cardTitle, {color: colors.text}]}>{item}</Text>
                        <Text style={[styles.cardSub, {color: colors.subText}]}>{devCount} {t.devices}</Text>
                    </View>
                    <View style={styles.actions}>
                        <TouchableOpacity style={[styles.actionBtn, {backgroundColor: colors.inputBg}]} onPress={() => handleEditArea(item)}><Ionicons name="pencil" size={18} color={colors.subText} /></TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, {backgroundColor: colors.inputBg}]} onPress={() => handleDeleteArea(item)}><Ionicons name="trash-outline" size={18} color={colors.danger} /></TouchableOpacity>
                    </View>
                </View>
                <TouchableOpacity style={[styles.manageDevBtn, {backgroundColor: colors.inputBg}]} onPress={() => openDeviceManager(item)}>
                    <Text style={[styles.manageDevText, {color: colors.accent}]}>{t.manage}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.accent} />
                </TouchableOpacity>
              </View>
            );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="home-outline" size={50} color={colors.subText} />
            <Text style={[styles.emptyText, {color: colors.subText}]}>{t.noAreas}</Text>
            <Text style={[styles.emptySub, {color: colors.subText}]}>{t.tapCreate}</Text>
          </View>
        }
      />
      <TouchableOpacity style={[styles.fab, {backgroundColor: colors.accent}]} onPress={handleAddArea}><Ionicons name="add" size={30} color={colors.btnText} /></TouchableOpacity>
      <Modal visible={areaModalVisible} transparent animationType="fade" onRequestClose={() => setAreaModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAreaModalVisible(false)}>
          <View style={[styles.modalContent, {backgroundColor: colors.modalBg}]}>
            <Text style={[styles.modalTitle, {color: colors.text}]}>{isEditingArea ? t.rename : t.newArea}</Text>
            <TextInput style={[styles.input, {backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border}]} placeholder={t.enterName} placeholderTextColor={colors.placeholder} value={areaInput} onChangeText={setAreaInput} autoFocus />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.btnCancel, {backgroundColor: colors.inputBg}]} onPress={() => setAreaModalVisible(false)}><Text style={[styles.btnTextCancel, {color: colors.text}]}>{t.cancel}</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btnSave, {backgroundColor: colors.accent}]} onPress={handleSaveArea}><Text style={[styles.btnTextSave, {color: colors.btnText}]}>{t.save}</Text></TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal visible={deviceModalVisible} animationType="slide" onRequestClose={() => setDeviceModalVisible(false)}>
        <SafeAreaView style={[styles.fullScreenModal, {backgroundColor: colors.bg}]}>
            <View style={[styles.fsHeader, {borderBottomColor: colors.border}]}>
                <TouchableOpacity onPress={() => setDeviceModalVisible(false)} style={styles.backBtn}><Ionicons name="close" size={26} color={colors.text} /></TouchableOpacity>
                <Text style={[styles.fsTitle, {color: colors.text}]}>{selectedAreaForDevice}</Text>
                <View style={{width:40}}/>
            </View>
            <View style={{flex: 1, padding: 20}}>
                <Text style={[styles.sectionTitle, {color: colors.subText}]}>{t.addDev}</Text>
                <View style={[styles.addDeviceBox, {backgroundColor: colors.cardBg}]}>
                    <TextInput style={[styles.inputSmall, {backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border}]} placeholder={t.devNamePlace} placeholderTextColor={colors.placeholder} value={newDeviceName} onChangeText={setNewDeviceName} />
                    
                    <TextInput 
                        style={[styles.inputSmall, {backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border}]} 
                        placeholder={t.ipPlace} 
                        placeholderTextColor={colors.placeholder} 
                        value={newDeviceIP} 
                        onChangeText={setNewDeviceIP} 
                        keyboardType="numeric"
                    />
                    
                    <TextInput 
                        style={[styles.inputSmall, {backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border}]} 
                        placeholder={t.macPlace} 
                        placeholderTextColor={colors.placeholder} 
                        value={newDeviceMAC} 
                        onChangeText={setNewDeviceMAC} 
                    />

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>
                        {DEVICE_TYPES.map(type => (
                            <TouchableOpacity key={type} style={[styles.typePill, {backgroundColor: colors.pillBg, borderColor: colors.border}, newDeviceType === type && {backgroundColor: colors.activePill, borderColor: colors.activePill}]} onPress={() => setNewDeviceType(type)}>
                                <Ionicons name={getIconForType(type)} size={16} color={newDeviceType === type ? colors.btnText : colors.subText} style={{marginRight: 5}}/>
                                <Text style={{color: newDeviceType === type ? colors.btnText : colors.subText}}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <TouchableOpacity style={[styles.btnAddDevice, {backgroundColor: colors.accent}]} onPress={handleAddDevice}><Text style={{color: colors.btnText, fontWeight: 'bold'}}>{t.addNew}</Text></TouchableOpacity>
                </View>
                <Text style={[styles.sectionTitle, {marginTop: 30, color: colors.subText}]}>{t.devsIn} {selectedAreaForDevice}</Text>
                <FlatList 
                    data={areaDevicesMap[selectedAreaForDevice] || []}
                    keyExtractor={(item, index) => item.id || index.toString()}
                    renderItem={({item}) => (
                        <View style={[styles.deviceRow, {backgroundColor: colors.cardBg, borderColor: colors.border}]}>
                            <View style={{flexDirection:'row', alignItems:'center', flex:1}}>
                                <View style={[styles.smallIconBox, {backgroundColor: colors.inputBg}]}><Ionicons name={getIconForType(item.type || "Light")} size={20} color={colors.accent} /></View>
                                <View style={{marginLeft: 10, flex: 1}}>
                                    <Text style={[styles.devName, {color: colors.text}]}>{item.name}</Text>
                                    <Text style={[styles.devSub, {color: colors.subText}]}>{item.type}</Text>
                                    <Text style={[styles.devSub, {color: colors.subText, fontSize: 11}]}>IP: {item.ip || 'null'}</Text>
                                    <Text style={[styles.devSub, {color: colors.subText, fontSize: 11}]}>MAC: {item.mac || 'null'}</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => handleDeleteDevice(item.id || item.name)}><Ionicons name="trash-outline" size={20} color={colors.danger} /></TouchableOpacity>
                        </View>
                    )}
                    ListEmptyComponent={<Text style={{color: colors.subText, textAlign:'center', marginTop: 20}}>{t.noDevs}</Text>}
                />
            </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: Platform.OS === 'android' ? 16 : 16, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  backBtn: { padding: 5 },
  importBtn: { padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 5, borderWidth: 1 },
  importText: { fontWeight: 'bold', marginLeft: 10, fontSize: 16 },
  subText: { textAlign: 'center', marginVertical: 10, paddingHorizontal: 20 },
  card: { padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardIconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardTitle: { fontSize: 18, fontWeight: '600' },
  cardSub: { fontSize: 12 },
  actions: { flexDirection: 'row' },
  actionBtn: { padding: 10, marginLeft: 8, borderRadius: 8 },
  manageDevBtn: { marginTop: 15, padding: 10, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  manageDevText: { fontWeight: '600', marginRight: 5 },
  fab: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 10 },
  emptyBox: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 18, marginTop: 10, fontWeight: '600' },
  emptySub: { marginTop: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', padding: 25, borderRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 25 },
  modalBtns: { flexDirection: 'row', justifyContent: 'space-between' },
  btnCancel: { flex: 0.45, padding: 14, borderRadius: 12, alignItems: 'center' },
  btnSave: { flex: 0.45, padding: 14, borderRadius: 12, alignItems: 'center' },
  btnTextCancel: { fontWeight: '600' },
  btnTextSave: { fontWeight: '700' },
  fullScreenModal: { flex: 1 },
  fsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1 },
  fsTitle: { fontSize: 20, fontWeight: '700' },
  sectionTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', marginBottom: 15 },
  addDeviceBox: { padding: 15, borderRadius: 16 },
  inputSmall: { padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1 },
  typePill: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginRight: 10, borderWidth: 1 },
  btnAddDevice: { padding: 12, borderRadius: 10, alignItems: 'center' },
  deviceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1 },
  smallIconBox: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  devName: { fontSize: 16, fontWeight: '600' },
  devSub: { fontSize: 12 },
});