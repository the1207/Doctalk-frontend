export const environment = {
  production: true,
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
    debugToken: 'DOCTALK-HYBRID-AI-DEBUG-TOKEN-2026',
    enabled: true
  },
  aiConfig: {
    defaultInferenceMode: 'prefer_on_device',
    fallbackModel: 'gemini-2.0-flash',
    onDeviceModel: 'gemini-nano'
  }
};
