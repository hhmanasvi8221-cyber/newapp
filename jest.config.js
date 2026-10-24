module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^@react-native-firebase/auth$': '<rootDir>/__mocks__/firebaseAuth.ts',
    '^@react-native-firebase/firestore$':
      '<rootDir>/__mocks__/firebaseFirestore.ts',
    '^@react-native-firebase/functions$':
      '<rootDir>/__mocks__/firebaseFunctions.ts',
  },
};
