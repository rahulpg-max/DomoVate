import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView,
  StatusBar, Platform, Dimensions, ActivityIndicator, Alert, Modal, FlatList
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";

const { width, height } = Dimensions.get('window');

// Default Wattage Ratings (In case user hasn't set custom)
const DEFAULT_WATTS = {
  ac: 1500,
  geyser: 2000,
  heater: 2000,
  fridge: 250,
  tv: 100,
  fan: 75,
  light: 9,
  bulb: 9,
  pc: 200,
  default: 10
};

const THEMES = {
  dark: {
    bg: "#000000",
    contentBg: "#000000",
    headerBg: "#000000",
    footerBg: "#000000",
    cardBg: "#121212",
    cardBorder: "#333",
    text: "#FFFFFF",
    headerText: "#FFD700",
    subText: "#A8A8A8",
    accent: "#FFD700",
    danger: "#ED4956",
    modalBg: "#1E1E1E"
  },
  light: {
    bg: "#FFFFFF",
    contentBg: "#F9F9F9",
    headerBg: "#FFFFFF",
    footerBg: "#FFFFFF",
    cardBg: "#FFFFFF",
    cardBorder: "#DBDBDB",
    text: "#000000",
    headerText: "#FFD700",
    subText: "#8E8E8E",
    accent: "#FFD700",
    danger: "#ED4956",
    modalBg: "#FFFFFF"
  }
};

const TRANSLATIONS = {
  EN: {
    portfolio: "Energy Portfolio",
    total: "Total Consumption",
    units: "Wh",
    active: "Active Devices",
    cost: "Est. Cost",
    breakdown: "Device Breakdown",
    rated: "Rated",
    noDevices: "No devices connected.",
    resetTitle: "Reset Statistics",
    resetMsg: "Clear all consumption data?",
    cancel: "Cancel",
    reset: "Reset",
    activity: "Activity Log (24h)",
    toggles: "Toggles",
    duration: "Duration",
    close: "Close"
  },
  HIN: {
    portfolio: "ऊर्जा पोर्टफोलियो",
    total: "कुल खपत",
    units: "Wh",
    active: "सक्रिय उपकरण",
    cost: "अनुमानित लागत",
    breakdown: "उपकरण विवरण",
    rated: "रेटेड",
    noDevices: "कोई उपकरण नहीं जुड़ा।",
    resetTitle: "आंकड़े रीसेट करें",
    resetMsg: "क्या आप सारा डेटा मिटाना चाहते हैं?",
    cancel: "रद्द करें",
    reset: "रीसेट",
    activity: "गतिविधि (24 घंटे)",
    toggles: "टोगल",
    duration: "अवधि",
    close: "बंद करें"
  }
};

export default function EnergyScreen({ navigation }) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState([]);
  const [totalWh, setTotalWh] = useState("0");
  const [estCost, setEstCost] = useState("0");
  const [activeCount, setActiveCount] = useState(0);
  const [language, setLanguage] = useState("EN");
  
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [hourlyStats, setHourlyStats] = useState([]);

  const colors = isDarkMode ? THEMES.dark : THEMES.light;
  const t = TRANSLATIONS[language] || TRANSLATIONS.EN;
  const intervalRef = useRef(null);

  useEffect(() => {
    loadSettings();
    // Real-time calculation loop (every 5 seconds)
    intervalRef.current = setInterval(() => {
        calculateRealConsumption();
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const loadSettings = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("THEME_MODE");
      if (savedTheme) setIsDarkMode(savedTheme === "dark");
      
      const savedLang = await AsyncStorage.getItem("LANGUAGE");
      if (savedLang) setLanguage(savedLang);

      await calculateRealConsumption();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getDevicePower = (name, type) => {
    const n = (name || "").toLowerCase();
    const ty = (type || "").toLowerCase();
    
    if (n.includes("ac") || ty.includes("ac")) return DEFAULT_WATTS.ac;
    if (n.includes("geyser") || n.includes("heater")) return DEFAULT_WATTS.geyser;
    if (n.includes("fridge")) return DEFAULT_WATTS.fridge;
    if (n.includes("tv") || ty.includes("tv")) return DEFAULT_WATTS.tv;
    if (n.includes("fan") || ty.includes("fan")) return DEFAULT_WATTS.fan;
    if (n.includes("bulb") || n.includes("light") || ty.includes("light")) return DEFAULT_WATTS.light;
    return DEFAULT_WATTS.default;
  };

  const getHourKey = (timestamp) => {
      const d = new Date(timestamp);
      return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}-${d.getHours()}`;
  };

  const calculateRealConsumption = async () => {
    try {
      const devsRaw = await AsyncStorage.getItem("DEVICES");
      const statesRaw = await AsyncStorage.getItem("DEVICE_STATES");
      const logsRaw = await AsyncStorage.getItem("DEVICE_USAGE_LOGS");
      const hourlyRaw = await AsyncStorage.getItem("DEVICE_HOURLY_LOGS");
      
      const devices = devsRaw ? JSON.parse(devsRaw) : [];
      const states = statesRaw ? JSON.parse(statesRaw) : {};
      const usageLogs = logsRaw ? JSON.parse(logsRaw) : {};
      const hourlyLogs = hourlyRaw ? JSON.parse(hourlyRaw) : {};

      let totalWattsAccumulated = 0;
      let active = 0;
      const currentTimestamp = Date.now();
      const currentHourKey = getHourKey(currentTimestamp);

      const processedData = devices.map(d => {
        const id = d.id || d.name;
        const isOn = !!states[id];
        const watts = getDevicePower(d.name, d.type);
        
        // Initialize logs if not present
        if (!usageLogs[id]) {
            usageLogs[id] = { totalMilliseconds: 0, lastUpdate: currentTimestamp };
        }
        if (!hourlyLogs[id]) {
            hourlyLogs[id] = {};
        }
        if (!hourlyLogs[id][currentHourKey]) {
            hourlyLogs[id][currentHourKey] = 0;
        }

        let totalMs = usageLogs[id].totalMilliseconds;

        // If device is ON, calculate time difference since last check and add to total
        if (isOn) {
            active++;
            const lastUpdate = usageLogs[id].lastUpdate || currentTimestamp;
            const timeDiff = currentTimestamp - lastUpdate;
            
            // Only add valid time diffs (prevent huge jumps if app was closed for days)
            // Limit jump to 1 minute max per cycle to be safe, or check app state
            if (timeDiff > 0 && timeDiff < 60000) { 
                totalMs += timeDiff;
                hourlyLogs[id][currentHourKey] += timeDiff;
            } else if (timeDiff >= 60000) {
                // If diff is large (app backgrounded), we assume it was ON only if we handle background tasks properly.
                // For this simple version, we add a capped amount or reset lastUpdate.
                // Here we just update timestamp to now to resume counting.
            }
        }
        
        // Update timestamp for next cycle
        usageLogs[id].lastUpdate = currentTimestamp;
        usageLogs[id].totalMilliseconds = totalMs;
        
        const hoursUsed = totalMs / (1000 * 60 * 60);
        const whConsumed = watts * hoursUsed; 
        
        totalWattsAccumulated += whConsumed;

        return {
          ...d,
          watts: watts,
          hoursUsed: hoursUsed,
          hoursDisplay: formatDuration(totalMs),
          consumptionWh: whConsumed.toFixed(1) 
        };
      });

      // Save updated logs back to storage
      await AsyncStorage.setItem("DEVICE_USAGE_LOGS", JSON.stringify(usageLogs));
      await AsyncStorage.setItem("DEVICE_HOURLY_LOGS", JSON.stringify(hourlyLogs));

      setUsageData(processedData);
      setTotalWh(totalWattsAccumulated.toFixed(0));
      
      // Cost calculation (approx 8 INR per kWh)
      const unitsKwh = totalWattsAccumulated / 1000;
      setEstCost((unitsKwh * 8).toFixed(2));
      setActiveCount(active);

    } catch (e) {
      console.log(e);
    }
  };

  const formatDuration = (ms) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)));
    
    if(hours > 0) return `${hours}h ${minutes}m`;
    if(minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const resetUsageStats = async () => {
      Alert.alert(
          t.resetTitle,
          t.resetMsg,
          [
              { text: t.cancel, style: "cancel" },
              { 
                  text: t.reset, 
                  style: "destructive", 
                  onPress: async () => {
                      await AsyncStorage.removeItem("DEVICE_USAGE_LOGS");
                      await AsyncStorage.removeItem("DEVICE_HOURLY_LOGS");
                      calculateRealConsumption();
                  }
              }
          ]
      );
  };

  const openDeviceDetail = async (device) => {
      setSelectedDevice(device);
      const id = device.id || device.name;
      
      try {
          const hourlyRaw = await AsyncStorage.getItem("DEVICE_HOURLY_LOGS");
          const hourlyLogs = hourlyRaw ? JSON.parse(hourlyRaw) : {};
          const deviceLogs = hourlyLogs[id] || {};
          
          const stats = [];
          const now = new Date();
          
          // Generate last 24 hours stats
          for(let i=0; i<24; i++) {
              const d = new Date(now.getTime() - (i * 60 * 60 * 1000));
              const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}-${d.getHours()}`;
              const ms = deviceLogs[key] || 0;
              const minutes = Math.floor(ms / 60000);
              
              stats.push({
                  hour: `${d.getHours().toString().padStart(2, '0')}:00`,
                  active: minutes > 0,
                  toggles: 0,
                  duration: minutes
              });
          }
          setHourlyStats(stats);
      } catch(e) {
          setHourlyStats([]);
      }
      
      setDetailModalVisible(true);
  };

  const renderTimelineItem = ({ item }) => (
      <View style={[styles.timelineItem, { borderColor: colors.cardBorder }]}>
          <Text style={{color: colors.subText, width: 50, fontSize: 12}}>{item.hour}</Text>
          
          <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10}}>
             <View style={{flexDirection: 'row', alignItems: 'center'}}>
                 <View style={[styles.dot, {backgroundColor: item.active || item.duration > 0 ? colors.accent : '#333'}]} />
                 <Text style={{color: colors.text, marginLeft: 10, fontSize: 13}}>
                     {item.duration > 0 ? `${item.duration} min active` : 'Idle'}
                 </Text>
             </View>
          </View>
      </View>
  );

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.bg }}><ActivityIndicator size="large" color={colors.accent} /></View>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.headerBg} />

      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.cardBorder }]}>
        <View style={styles.headerLeft}>
            <Ionicons name="flash" size={24} color={colors.accent} style={{marginRight: 10}} />
            <Text style={[styles.headerTitle, { color: colors.headerText }]}>{t.portfolio}</Text>
        </View>
        <View style={{flexDirection: 'row'}}>
            <TouchableOpacity onPress={resetUsageStats} style={{marginRight: 15}}>
                <Ionicons name="refresh-circle-outline" size={26} color={colors.danger} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsDarkMode(!isDarkMode)}>
                <Ionicons name="moon" size={24} color={colors.text} />
            </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} style={{backgroundColor: colors.contentBg}}>
        
        <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? "#121212" : "#FFF", borderColor: colors.accent }]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                <View>
                    <Text style={{ color: colors.subText, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{t.total}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 5 }}>
                        <Text style={{ fontSize: 38, fontWeight: 'bold', color: colors.text }}>{totalWh}</Text>
                        <Text style={{ fontSize: 16, color: colors.accent, fontWeight: 'bold', marginBottom: 6, marginLeft: 5 }}>Wh</Text>
                    </View>
                </View>
                <View style={styles.costBadge}>
                    <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 14 }}>₹ {estCost}</Text>
                </View>
            </View>
            <View style={styles.divider} />
            <Text style={{ color: colors.subText, fontSize: 13 }}>{activeCount} {t.active} currently consuming power.</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.breakdown}</Text>

        {usageData.length === 0 ? (
             <Text style={{color: colors.subText, textAlign: 'center', marginTop: 20}}>{t.noDevices}</Text>
        ) : (
            usageData.sort((a,b) => parseFloat(b.consumptionWh) - parseFloat(a.consumptionWh)).map((item, index) => (
                <TouchableOpacity 
                    key={index} 
                    style={[styles.deviceRow, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
                    onPress={() => openDeviceDetail(item)}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={[styles.iconBox, { backgroundColor: "rgba(255, 215, 0, 0.1)" }]}>
                            <Ionicons name="flash-outline" size={18} color={colors.accent} />
                        </View>
                        <View style={{ marginLeft: 15 }}>
                            <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 15 }}>{item.name}</Text>
                            <Text style={{ color: colors.subText, fontSize: 11 }}>{t.rated}: {item.watts}W</Text>
                        </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: colors.accent, fontWeight: 'bold', fontSize: 16 }}>{item.consumptionWh} Wh</Text>
                        <Text style={{ color: colors.subText, fontSize: 11 }}>{item.hoursDisplay}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.subText} style={{marginLeft: 10}} />
                </TouchableOpacity>
            ))
        )}
      </ScrollView>

      <Modal visible={detailModalVisible} animationType="slide" transparent={true} onRequestClose={() => setDetailModalVisible(false)}>
          <View style={styles.modalContainer}>
              <View style={[styles.modalContent, {backgroundColor: colors.modalBg}]}>
                  {selectedDevice && (
                      <>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={[styles.modalTitle, {color: colors.accent}]}>{selectedDevice.name}</Text>
                                <Text style={{color: colors.subText, fontSize: 12}}>{selectedDevice.type} • {selectedDevice.watts}W</Text>
                            </View>
                            <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.modalStatsRow, {borderColor: colors.cardBorder}]}>
                             <View style={styles.statItem}>
                                 <Text style={{color: colors.subText, fontSize: 12}}>{t.total}</Text>
                                 <Text style={{color: colors.text, fontSize: 18, fontWeight: 'bold'}}>{selectedDevice.consumptionWh} Wh</Text>
                             </View>
                             <View style={[styles.statItem, {borderLeftWidth: 1, borderColor: colors.cardBorder, paddingLeft: 20}]}>
                                 <Text style={{color: colors.subText, fontSize: 12}}>{t.duration}</Text>
                                 <Text style={{color: colors.text, fontSize: 18, fontWeight: 'bold'}}>{selectedDevice.hoursDisplay}</Text>
                             </View>
                        </View>

                        <Text style={{color: colors.text, fontWeight: 'bold', marginBottom: 15, marginTop: 10}}>{t.activity}</Text>

                        <FlatList 
                            data={hourlyStats}
                            renderItem={renderTimelineItem}
                            keyExtractor={(item) => item.hour}
                            style={{maxHeight: height * 0.4}}
                            showsVerticalScrollIndicator={false}
                        />
                      </>
                  )}
              </View>
          </View>
      </Modal>

      <View style={[styles.footer, { backgroundColor: colors.footerBg, borderTopColor: colors.cardBorder }]}>
          <View style={styles.footerGroupLeft}>
            <TouchableOpacity style={styles.footerBtn}>
                <Ionicons name="flash" size={26} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerBtn} onPress={() => navigation.navigate("Dashboard", {view: "favorites"})}>
                <Ionicons name="heart-outline" size={26} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.centerBtnWrap}>
            <TouchableOpacity style={[styles.centerBtn, { backgroundColor: colors.accent }]} onPress={() => navigation.navigate("Dashboard", {view: "home"})}>
               <Ionicons name="home-outline" size={30} color={isDarkMode ? "#000" : "#fff"} />
            </TouchableOpacity>
          </View>
          <View style={styles.footerGroupRight}>
            <TouchableOpacity style={styles.footerBtn} onPress={() => navigation.navigate("MasterControl")}>
                <Ionicons name="search-outline" size={26} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerBtn} onPress={() => navigation.navigate("Dashboard", {view: "settings"})}>
                <Ionicons name="settings-outline" size={26} color={colors.text} />
            </TouchableOpacity>
          </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 60, flexDirection: 'row', justifyContent: "space-between", alignItems: 'center', paddingHorizontal: 20, borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: "bold", fontFamily: Platform.OS === 'ios' ? 'Georgia-Bold' : 'serif' },
  
  summaryCard: { padding: 25, borderRadius: 20, marginBottom: 25, borderWidth: 1, elevation: 5 },
  costBadge: { backgroundColor: '#FFD700', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 15 },
  
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15, marginTop: 5 },
  
  deviceRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, alignItems: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  closeBtn: { backgroundColor: '#FFD700', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  
  modalStatsRow: { flexDirection: 'row', paddingVertical: 15, borderTopWidth: 1, borderBottomWidth: 1, marginBottom: 15 },
  statItem: { flex: 1 },
  
  timelineItem: { flexDirection: 'row', alignItems: 'center', height: 50, borderLeftWidth: 1, marginLeft: 10, paddingLeft: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },

  footer: { position: 'absolute', bottom: 0, width: width, height: 70, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingBottom: 5 },
  footerGroupLeft: { flexDirection: 'row', justifyContent: 'space-evenly', width: '40%' },
  footerGroupRight: { flexDirection: 'row', justifyContent: 'space-evenly', width: '40%', marginLeft: 'auto' },
  footerBtn: { alignItems: 'center', justifyContent: 'center', width: 50, height: '100%' },
  
  centerBtnWrap: { position: 'absolute', bottom: 25, left: (width / 2) - 32, width: 64, height: 64, zIndex: 10 },
  centerBtn: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65, elevation: 8 },
});