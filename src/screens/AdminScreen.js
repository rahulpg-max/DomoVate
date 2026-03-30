import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, FlatList, Modal,
  TextInput, Alert, StyleSheet, SafeAreaView, ActivityIndicator, Platform, ScrollView, StatusBar,
  PermissionsAndroid
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Zeroconf from "react-native-zeroconf";
import Ionicons from "react-native-vector-icons/Ionicons";
import QRCode from 'react-native-qrcode-svg'; 
import { useFocusEffect } from '@react-navigation/native';

const THEMES = {
  dark: {
    bg: "#000000",
    headerBg: "#000000",
    inputBg: "#262626",
    cardBg: "#121212",
    text: "#FFFFFF",
    subText: "#A8A8A8",
    iconDefault: "#FFFFFF",
    accent: "#0095F6",
    border: "#262626",
    modalBg: "#262626",
    placeholder: "#888"
  },
  light: {
    bg: "#FFFFFF",
    headerBg: "#FFFFFF",
    inputBg: "#EFEFEF",
    cardBg: "#FFFFFF",
    text: "#000000",
    subText: "#8E8E8E",
    iconDefault: "#000000",
    accent: "#0095F6",
    border: "#DBDBDB",
    modalBg: "#FFFFFF",
    placeholder: "#999"
  }
};

const TRANSLATIONS = {
  EN: {
    admin: "Admin Panel",
    scan: "Scan Devices",
    scanning: "Scanning...",
    manage: "Manage Areas",
    discovered: "Discovered Devices",
    found: "found",
    add: "Add",
    noDev: "No devices found recently.",
    ensure: "Ensure devices are ON and connected to Wi-Fi.",
    searching: "Searching for ESP32/8266...",
    addNew: "Add New Device",
    devName: "Device Name",
    devType: "Device Type",
    assign: "Assign Area",
    newArea: "New Area",
    enterArea: "Enter New Area Name",
    cancel: "Cancel",
    save: "Save Device",
    setupQR: "Setup QR Code",
    scanQR: "Scan this from a new device at Login Screen to import Dashboard setup.",
    close: "Close",
    permTitle: "Permission Denied",
    permMsg: "Nearby Devices & Location permissions required.",
    err: "Error",
    failSave: "Failed to save device.",
    success: "Success",
    addedTo: "added to",
    info: "Info",
    exists: "Device already in this area."
  },
  HIN: {
    admin: "एडमिन पैनल",
    scan: "डिवाइस स्कैन करें",
    scanning: "स्कैनिंग...",
    manage: "एरिया प्रबंधित करें",
    discovered: "खोजे गए उपकरण",
    found: "मिले",
    add: "जोड़ें",
    noDev: "हाल ही में कोई उपकरण नहीं मिला।",
    ensure: "सुनिश्चित करें कि डिवाइस चालू हैं और वाई-फाई से जुड़े हैं।",
    searching: "ESP32/8266 खोज रहा है...",
    addNew: "नया डिवाइस जोड़ें",
    devName: "डिवाइस का नाम",
    devType: "डिवाइस का प्रकार",
    assign: "एरिया चुनें",
    newArea: "नया एरिया",
    enterArea: "नये एरिया का नाम डालें",
    cancel: "रद्द करें",
    save: "सेव करें",
    setupQR: "सेटअप QR कोड",
    scanQR: "डैशबोर्ड सेटअप आयात करने के लिए इसे लॉगिन स्क्रीन पर स्कैन करें।",
    close: "बंद करें",
    permTitle: "अनुमति अस्वीकृत",
    permMsg: "नजदीकी डिवाइस और लोकेशन की अनुमति आवश्यक है।",
    err: "त्रुटि",
    failSave: "डिवाइस सेव करने में विफल।",
    success: "सफल",
    addedTo: "में जोड़ा गया",
    info: "जानकारी",
    exists: "डिवाइस पहले से इस एरिया में है।"
  }
};

export default function AdminScreen({ navigation }) {
  const zeroconfRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [services, setServices] = useState([]); 
  const [loading, setLoading] = useState(false);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [localName, setLocalName] = useState("");
  const [deviceType, setDeviceType] = useState("Light");
  const [areas, setAreas] = useState([]);
  const [areaSelect, setAreaSelect] = useState("new");
  const [newAreaName, setNewAreaName] = useState("");

  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrValue, setQrValue] = useState(null);

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [language, setLanguage] = useState("EN");

  const [userModalVisible, setUserModalVisible] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);

  const colors = isDarkMode ? THEMES.dark : THEMES.light;
  const t = TRANSLATIONS[language] || TRANSLATIONS.EN;

  const KEY_DEVICES = "DEVICES";
  const KEY_AREA_DEVICES = "AREA_DEVICES";
  const KEY_DEVICE_STATES = "DEVICE_STATES";
  const KEY_AREAS_LIST = "AREAS_LIST";


  

  const loadSettings = async () => {
      const savedTheme = await AsyncStorage.getItem("THEME_MODE");
      if (savedTheme) setIsDarkMode(savedTheme === "dark");
      const savedLang = await AsyncStorage.getItem("LANGUAGE");
      if (savedLang) setLanguage(savedLang);
  };

  const loadAreas = async () => {
    try {
      const rawList = await AsyncStorage.getItem(KEY_AREAS_LIST);
      if (rawList) {
          const list = JSON.parse(rawList);
          setAreas(list);
      } else {
          const rawMap = await AsyncStorage.getItem(KEY_AREA_DEVICES);
          if (rawMap) {
             const map = JSON.parse(rawMap);
             setAreas(Object.keys(map));
          }
      }
    } catch (e) { }
  };

  const ensurePermissions = async () => {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 31) {
        try {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          ]);
          if (
            granted['android.permission.NEARBY_WIFI_DEVICES'] === PermissionsAndroid.RESULTS.GRANTED &&
            granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
          ) { return true; } 
          else { return false; }
        } catch (err) { return false; }
      } else {
        try {
          const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) { return false; }
      }
    }
    return true;
  };

  const addDeviceToList = (newDev) => {
      setServices(prev => {
        const exists = prev.find(s => s.name === newDev.name || (s.addresses && s.addresses[0] === newDev.addresses[0]));
        if (exists) return prev;
        return [...prev, newDev];
      });
  };

  const checkHotspotDevice = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      try {
          const res1 = await fetch('http://192.168.33.1/settings', {method: 'GET', signal: controller.signal});
          if(res1.ok) {
              const json = await res1.json();
              addDeviceToList({
                  name: json.device.hostname || "Shelly AP (Gen1)",
                  addresses: ["192.168.33.1"],
                  host: "192.168.33.1",
                  port: 80
              });
              return;
          }
      } catch(e) {}

      try {
          const res2 = await fetch('http://192.168.33.1/rpc/Shelly.GetDeviceInfo', {method: 'GET', signal: controller.signal});
          if(res2.ok) {
              const json = await res2.json();
              addDeviceToList({
                  name: json.name || json.app || "Shelly AP (Gen2)",
                  addresses: ["192.168.33.1"],
                  host: "192.168.33.1",
                  port: 80
              });
          }
      } catch(e) {}
      
      clearTimeout(timeoutId);
  };

  const startScan = async () => {
    const ok = await ensurePermissions();
    if (!ok) {
      Alert.alert(t.permTitle, t.permMsg);
      return;
    }
    setServices([]);
    setIsScanning(true);
    setLoading(true);

    checkHotspotDevice();

    try {
      if (zeroconfRef.current) { try { zeroconfRef.current.stop(); } catch (e) {} zeroconfRef.current = null; }
      zeroconfRef.current = new Zeroconf();
      zeroconfRef.current.on("start", () => {});
      zeroconfRef.current.on("stop", () => { setIsScanning(false); setLoading(false); });
      zeroconfRef.current.on("error", (err) => { setIsScanning(false); setLoading(false); });
      zeroconfRef.current.on("resolved", (service) => {
        if (!service || !service.name) return;
        addDeviceToList(service);
      });
      zeroconfRef.current.scan("http", "tcp", "local.");
      setTimeout(() => { stopScan(); }, 10000);
    } catch (e) {
      setIsScanning(false);
      setLoading(false);
    }
  };

  const stopScan = () => {
    try {
      if (zeroconfRef.current) {
        zeroconfRef.current.stop();
        zeroconfRef.current.removeDeviceListeners();
        zeroconfRef.current = null;
      }
    } catch (e) {}
    setIsScanning(false);
    setLoading(false);
  };

  const openAddModal = (service) => {
    setSelectedService(service);
    const cleanName = service.name.replace("._http._tcp.local.", "");
    setLocalName(cleanName || "Smart Device");
    const n = cleanName.toLowerCase();
    if(n.includes("fan")) setDeviceType("Fan");
    else if(n.includes("tv")) setDeviceType("TV");
    else if(n.includes("ac")) setDeviceType("AC");
    else setDeviceType("Light");
    
    if (areas.length > 0) setAreaSelect(areas[0]);
    else setAreaSelect("new");
    setNewAreaName("");
    setAddModalVisible(true);
  };

  const saveDeviceToStorage = async () => {
    let ip = "0.0.0.0";
    if (selectedService && selectedService.addresses && selectedService.addresses.length > 0) {
        const ipv4 = selectedService.addresses.find(addr => /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(addr));
        ip = ipv4 || selectedService.addresses[0]; 
    } else if (selectedService && selectedService.host) { ip = selectedService.host; }

    const dev = {
      id: Date.now().toString(),
      name: localName || "Device",
      localName: localName || "Device",
      ip: ip,
      type: deviceType,
    };

    try {
      const raw = await AsyncStorage.getItem(KEY_DEVICES);
      const list = raw ? JSON.parse(raw) : [];
      const exists = list.find(d => d.ip === ip);
      if(!exists) {
          list.push(dev);
          await AsyncStorage.setItem(KEY_DEVICES, JSON.stringify(list));
      }

      const rawMap = await AsyncStorage.getItem(KEY_AREA_DEVICES);
      const map = rawMap ? JSON.parse(rawMap) : {};
      const targetArea = areaSelect === "new" ? (newAreaName.trim() || "Living Room") : areaSelect;
      
      if (!map[targetArea]) map[targetArea] = [];
      
      const existsInArea = map[targetArea].find(d => d.ip === ip || d.name === dev.name);
      if(!existsInArea) {
          map[targetArea].push(dev);
          await AsyncStorage.setItem(KEY_AREA_DEVICES, JSON.stringify(map));
      } else {
          Alert.alert(t.info, t.exists);
          setAddModalVisible(false);
          return;
      }

      const rawAreaList = await AsyncStorage.getItem(KEY_AREAS_LIST);
      let areaList = rawAreaList ? JSON.parse(rawAreaList) : [];
      if (!areaList.includes(targetArea)) {
          areaList.push(targetArea);
          await AsyncStorage.setItem(KEY_AREAS_LIST, JSON.stringify(areaList));
      }

      const rawStates = await AsyncStorage.getItem(KEY_DEVICE_STATES);
      const states = rawStates ? JSON.parse(rawStates) : {};
      states[dev.id] = false;
      await AsyncStorage.setItem(KEY_DEVICE_STATES, JSON.stringify(states));

      setAddModalVisible(false);
      Alert.alert(t.success, `${dev.name} ${t.addedTo} ${targetArea}`);
      loadAreas();
    } catch (e) { Alert.alert(t.err, t.failSave); }
  };

  const handleGenerateQR = async () => {
    try {
        const homeName = await AsyncStorage.getItem("home_name") || "My Home";
        const rawMap = await AsyncStorage.getItem(KEY_AREA_DEVICES);
        const areaMap = rawMap ? JSON.parse(rawMap) : {};

        const optimizedAreaMap = {};
        
        Object.keys(areaMap).forEach(area => {
            optimizedAreaMap[area] = areaMap[area].map(device => ({
                n: device.name,
                i: device.ip,
                t: device.type
            }));
        });

        const setupData = {
            h: homeName,
            a: optimizedAreaMap
        };

        const jsonString = JSON.stringify(setupData);
        setQrValue(jsonString);
        setQrModalVisible(true);

    } catch (e) {
        Alert.alert(t.err, "Could not generate QR code.");
    }
  };

  return (
    <SafeAreaView style={[styles.wrap, {backgroundColor: colors.bg}]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.headerBg} />
      
      <View style={[styles.header, {backgroundColor: colors.headerBg, borderBottomColor: colors.border}]}>
        <View style={{flexDirection:'row', alignItems:'center'}}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={26} color={colors.text} />
            </TouchableOpacity>
            <View>
                <Text style={[styles.brand, {color: colors.text}]}>DomoVate</Text>
                <Text style={[styles.sub, {color: colors.subText}]}>{t.admin}</Text>
            </View>
        </View>
        <TouchableOpacity 
        onPress={() => setUserModalVisible(true)} 
      style={[styles.iconBtn, {marginRight: 15}]}
      >
    <Ionicons name="people-outline" size={26} color={colors.text} />
      </TouchableOpacity>
        <TouchableOpacity onPress={handleGenerateQR} style={styles.iconBtn}>
            <Ionicons name="qr-code-outline" size={26} color={colors.text} />
        </TouchableOpacity>
      </View>



     <Modal visible={userModalVisible} transparent animationType="slide">
  <View style={styles.modalOverlay}>
    <View style={[styles.modalCard, {backgroundColor: colors.modalBg, height: '70%'}]}>
      <Text style={[styles.modalTitle, {color: colors.text}]}>{t.activeUsers || "Active Users"}</Text>
      
      <FlatList 
        data={activeUsers} 
        keyExtractor={item => item.id} 
        renderItem={({item}) => (
          <View style={[styles.serviceRow, {borderColor: colors.border, marginBottom: 8}]}>
            <View style={{flex:1}}>
              <Text style={{color: colors.text, fontWeight:'bold'}}>{item.name}</Text>
              <Text style={{color: colors.subText, fontSize:12}}>{item.email}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => {
                Alert.alert("Remove User", "Are you sure?", [
                  {text: "Cancel"},
                  {text: "Remove", onPress: () => firestore().collection('Users').doc(item.id).delete()}
                ]);
              }}
            >
              <Ionicons name="trash-outline" size={22} color="#ED4956" />
            </TouchableOpacity>
          </View>
        )} 
      />

      <TouchableOpacity 
        style={[styles.btnPrimary, {backgroundColor: colors.accent, marginTop: 10}]} 
        onPress={() => setUserModalVisible(false)}
      >
        <Text style={{color:'#fff'}}>{t.close}</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>


      <View style={{ flex: 1 }}>
          <View style={styles.toolsRow}>
            <TouchableOpacity 
                style={[styles.toolBtn, {backgroundColor: colors.cardBg, borderColor: colors.border}, isScanning && {borderColor: colors.accent, borderWidth: 1}]} 
                onPress={() => { setServices([]); startScan(); }}
                disabled={isScanning} 
            >
              {loading ? <ActivityIndicator size="small" color={colors.text} /> : <Ionicons name="radio-outline" size={24} color={colors.text} />}
              <Text style={[styles.toolText, {color: colors.text}]}>{isScanning ? t.scanning : t.scan}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.toolBtn, {backgroundColor: colors.cardBg, borderColor: colors.border}]} onPress={() => { stopScan(); navigation.navigate("AdminAreas"); }}>
              <Ionicons name="grid-outline" size={24} color={colors.text} />
              <Text style={[styles.toolText, {color: colors.text}]}>{t.manage}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.listContainer}>
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 10}}>
                <Text style={[styles.sectionTitle, {color: colors.text}]}>{t.discovered}</Text>
                {services.length > 0 && <Text style={{color: colors.accent}}>{services.length} {t.found}</Text>}
            </View>

            <FlatList
              data={services}
              keyExtractor={(i, index) => index.toString()}
              renderItem={({ item }) => {
                const displayIP = (item.addresses && item.addresses.length) 
                                  ? item.addresses.find(addr => /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(addr)) || item.addresses[0]
                                  : (item.host || "IP Scanning...");
                return (
                  <View style={[styles.serviceRow, {backgroundColor: colors.cardBg, borderColor: colors.border}]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.serviceName, {color: colors.text}]}>{item.name}</Text>
                      <Text style={[styles.serviceInfo, {color: colors.subText}]}>{displayIP}</Text>
                    </View>
                    <TouchableOpacity style={[styles.addBtn, {backgroundColor: colors.accent}]} onPress={() => openAddModal(item)}>
                      <Ionicons name="add" size={20} color="#fff" />
                      <Text style={{ color: "#fff", fontWeight:'bold', marginLeft: 4 }}>{t.add}</Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={{alignItems:'center', marginTop: 50}}>
                    {isScanning ? (
                        <Text style={{ color: colors.accent, marginTop: 10 }}>{t.searching}</Text>
                    ) : (
                        <>
                            <Ionicons name="search-outline" size={50} color={colors.subText} />
                            <Text style={{ color: colors.subText, marginTop: 10 }}>{t.noDev}</Text>
                            <Text style={{ color: colors.subText, fontSize: 12 }}>{t.ensure}</Text>
                        </>
                    )}
                </View>
              }
            />
          </View>
      </View>

      <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAddModalVisible(false)}>
          <View style={[styles.modalCard, {backgroundColor: colors.modalBg}]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.modalTitle, {color: colors.text}]}>{t.addNew}</Text>
            <Text style={[styles.label, {color: colors.subText}]}>{t.devName}</Text>
            <TextInput 
                value={localName} 
                onChangeText={setLocalName} 
                placeholder="e.g. Living Room Light" 
                placeholderTextColor={colors.placeholder} 
                style={[styles.input, {backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border}]} 
            />
            
            <Text style={[styles.label, {color: colors.subText}]}>{t.devType}</Text>
            <View style={{height: 50}}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {["Light","Fan","AC","TV","Socket","Motor","Heater"].map((type) => (
                    <TouchableOpacity key={type} style={[styles.typeBtn, {backgroundColor: colors.inputBg, borderColor: colors.border}, deviceType === type ? {backgroundColor: colors.accent, borderColor: colors.accent} : null]} onPress={() => setDeviceType(type)}>
                    <Text style={{ color: deviceType === type ? "#fff" : colors.subText, fontWeight: deviceType === type ? 'bold' : 'normal' }}>{type}</Text>
                    </TouchableOpacity>
                ))}
                </ScrollView>
            </View>

            <Text style={[styles.label, {color: colors.subText}]}>{t.assign}</Text>
            <View style={{height: 50}}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity style={[styles.areaChoice, {backgroundColor: colors.inputBg, borderColor: colors.border}, areaSelect === "new" ? {backgroundColor: colors.accent, borderColor: colors.accent} : null]} onPress={() => setAreaSelect("new")}>
                    <Ionicons name="add-circle-outline" size={16} color={areaSelect === "new" ? "#fff" : colors.subText} style={{marginRight:4}} />
                    <Text style={{ color: areaSelect === "new" ? "#fff" : colors.subText }}>{t.newArea}</Text>
                </TouchableOpacity>
                {areas.map((a) => (
                    <TouchableOpacity key={a} style={[styles.areaChoice, {backgroundColor: colors.inputBg, borderColor: colors.border}, areaSelect === a ? {backgroundColor: colors.accent, borderColor: colors.accent} : null]} onPress={() => setAreaSelect(a)}>
                    <Text style={{ color: areaSelect === a ? "#fff" : colors.subText }}>{a}</Text>
                    </TouchableOpacity>
                ))}
                </ScrollView>
            </View>

            {areaSelect === "new" && (
                <TextInput 
                    value={newAreaName} 
                    onChangeText={setNewAreaName} 
                    placeholder={t.enterArea}
                    placeholderTextColor={colors.placeholder} 
                    style={[styles.input, {marginTop: 10, borderColor: colors.accent, backgroundColor: colors.inputBg, color: colors.text}]} 
                />
            )}

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 20 }}>
              <TouchableOpacity style={[styles.btnGrey, { flex: 0.45, backgroundColor: colors.inputBg }]} onPress={() => setAddModalVisible(false)}>
                  <Text style={[styles.btnText, {color: colors.text}]}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnPrimary, { flex: 0.45, backgroundColor: colors.accent }]} onPress={saveDeviceToStorage}>
                  <Text style={[styles.btnText, {color: '#fff'}]}>{t.save}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={qrModalVisible} transparent animationType="fade" onRequestClose={() => setQrModalVisible(false)}>
         <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { alignItems: 'center', backgroundColor: '#fff' }]}>
                <Text style={[styles.modalTitle, {color: '#000'}]}>{t.setupQR}</Text>
                <Text style={{color: '#555', textAlign: 'center', marginBottom: 20, fontSize: 12}}>
                    {t.scanQR}
                </Text>
                
                {qrValue && (
                    <View style={{borderWidth: 5, borderColor: '#fff', borderRadius: 10}}>
                        <QRCode
                            value={qrValue}
                            size={220}
                            color="black"
                            backgroundColor="white"
                        />
                    </View>
                )}

                <TouchableOpacity 
                    style={[styles.btnPrimary, {marginTop: 25, width: '100%', backgroundColor: colors.accent}]} 
                    onPress={() => setQrModalVisible(false)}
                >
                    <Text style={[styles.btnText, {color: '#fff'}]}>{t.close}</Text>
                </TouchableOpacity>
            </View>
         </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  header: { 
      padding: 16, 
      paddingTop: Platform.OS === "android" ? 16 : 16, 
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 0.5
  },
  backBtn: { padding: 5, marginRight: 15 },
  brand: { fontSize: 22, fontWeight: "800" },
  sub: { fontSize: 12 },
  iconBtn: { padding: 5 },

  toolsRow: { flexDirection: "row", justifyContent: "space-between", padding: 15 },
  toolBtn: { padding: 15, borderRadius: 12, alignItems: "center", width: "48%", borderWidth: 1 },
  toolText: { marginTop: 8, fontSize: 14, fontWeight: '600' },

  listContainer: { flex: 1, padding: 20 },
  sectionTitle: { fontWeight: "700", fontSize: 18 },

  serviceRow: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1 },
  serviceName: { fontSize: 16, fontWeight: "700" },
  serviceInfo: { fontSize: 12, marginTop: 4 },
  addBtn: { flexDirection: 'row', alignItems:'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" },
  modalCard: { width: "90%", padding: 24, borderRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 15, textAlign:'center' },
  label: { marginTop: 15, marginBottom: 8, fontSize: 12, textTransform:'uppercase', letterSpacing: 1 },
  input: { borderWidth: 1, padding: 12, borderRadius: 10, width: "100%" },
  typeBtn: { paddingVertical: 8, paddingHorizontal: 16, marginRight: 10, borderRadius: 20, borderWidth: 1, justifyContent:'center' },
  areaChoice: { flexDirection:'row', alignItems:'center', paddingVertical: 8, paddingHorizontal: 16, marginRight: 10, borderRadius: 20, borderWidth: 1, justifyContent:'center' },
  btnPrimary: { padding: 14, borderRadius: 12, alignItems: "center" },
  btnGrey: { padding: 14, borderRadius: 12, alignItems: "center" },
  btnText: { fontWeight: "700", fontSize: 16 },
});