// Service worker cho Firebase Cloud Messaging trên web.
//
// File này BẮT BUỘC nằm ở gốc thư mục web (cùng cấp index.html) và tên đúng là
// "firebase-messaging-sw.js" — plugin firebase_messaging_web tự đăng ký nó để
// nhận push khi tab đang đóng / chạy nền.
//
// Các khóa dưới đây là cấu hình web công khai (khớp firebase_options.dart) —
// không phải bí mật.

importScripts(
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js',
);
importScripts(
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js',
);

firebase.initializeApp({
  apiKey: 'AIzaSyDSm3EqAznUTmbGAswLaysxO5li6kgCAi0',
  authDomain: 'money-manager-f9487.firebaseapp.com',
  projectId: 'money-manager-f9487',
  storageBucket: 'money-manager-f9487.firebasestorage.app',
  messagingSenderId: '835169690756',
  appId: '1:835169690756:web:644dcad2c89763be334ed1',
});

const messaging = firebase.messaging();

// Push nhận khi app chạy nền / tab đóng.
messaging.onBackgroundMessage((message) => {
  const notification = message.notification || {};
  self.registration.showNotification(notification.title || 'spendPals', {
    body: notification.body || '',
    icon: '/icons/Icon-192.png',
  });
});
