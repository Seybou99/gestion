// Variables globales
global.__DEV__ = true;
global.__fbBatchedBridgeConfig = {};

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock Alert
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  StyleSheet: {
    create: jest.fn((styles) => styles),
  },
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  ActivityIndicator: 'ActivityIndicator',
}));

// Mock Expo modules
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
  FontAwesome: 'FontAwesome',
}));

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
  useRoute: () => ({
    params: {},
  }),
}));

// Mock @react-navigation/bottom-tabs
jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: 'Navigator',
    Screen: 'Screen',
  }),
}));

// Mock @react-navigation/elements
jest.mock('@react-navigation/elements', () => ({
  HeaderBackButton: 'HeaderBackButton',
}));

// Mock @react-native-picker/picker
jest.mock('@react-native-picker/picker', () => ({
  Picker: 'Picker',
}));

// Mock react-native-webview
jest.mock('react-native-webview', () => ({
  WebView: 'WebView',
}));

// Mock react-native-worklets
jest.mock('react-native-worklets', () => ({
  runOnJS: jest.fn((fn) => fn),
  runOnUI: jest.fn((fn) => fn),
}));

// Mock fetch
global.fetch = jest.fn();

// Global test timeout
jest.setTimeout(10000);
