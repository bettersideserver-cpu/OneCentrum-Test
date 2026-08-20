// firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {

    apiKey: "AIzaSyApGLdCcFTXoQbpkLI0Mk-ay4ETSpUTvL8",

    authDomain: "admin-test-56e22.firebaseapp.com",

    projectId: "admin-test-56e22",

    storageBucket: "admin-test-56e22.firebasestorage.app",

    messagingSenderId: "352334520733",

    appId: "1:352334520733:web:2248ead2826bbb25624f74"

};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export { db };