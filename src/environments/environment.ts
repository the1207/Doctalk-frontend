export const environment = {
  production: false,
  apiUrl: 'https://doctalk-backend-production-f3bf5a40.up.railway.app/api',
  firebase: {
    apiKey: 'AIzaSyBSBlBsrFVPgo_w1BjeT7j0aMt8J6zOdHw',
    authDomain: 'doctalk-6863b.firebaseapp.com',
    projectId: 'doctalk-6863b',
    storageBucket: 'doctalk-6863b.firebasestorage.app',
    messagingSenderId: '560333830011',
    appId: '1:560333830011:web:d6134667a9233ed100efde',
    measurementId: 'G-WZEQTVQ65Z'
  },
  appCheck: {
    debugToken: '550e8400-e29b-41d4-a716-446655440000',
    enabled: true
  },
  aiConfig: {
    defaultInferenceMode: 'prefer_on_device',
    fallbackModel: 'gemini-2.0-flash',
    onDeviceModel: 'gemini-nano'
  }
};
