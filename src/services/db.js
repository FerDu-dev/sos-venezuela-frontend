// Importar Firebase SDKs dinámicamente si se configura, de lo contrario usar LocalStorage
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Configuración de Firebase - Reemplazar con las credenciales reales
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// Determinar si Firebase está configurado
const isFirebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

let db = null;
let storage = null;

if (isFirebaseConfigured) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    storage = getStorage(app);
    // Limitar los reintentos de Storage a 2 segundos para evitar que la UI se congele
    storage.maxUploadRetryTime = 2000;
    storage.maxOperationRetryTime = 2000;
    console.log("Firebase inicializado con éxito.");
  } catch (error) {
    console.error("Error inicializando Firebase. Usando base de datos simulada local.", error);
    alert("Error de inicialización de Firebase: " + error.message);
  }
}

// ---------------- MOCK DATA SEED (Lienzo Limpio) ----------------
const initialPersons = [];
const initialPets = [];
const initialCenters = [];


// Helper para iniciar LocalStorage si está vacío y forzar reseteo de mock data previo
function seedLocalStorage() {
  // Si detecta datos mock antiguos, forzar limpieza por única vez
  if (!localStorage.getItem("sos_disaster_reset_v1")) {
    localStorage.removeItem("sama_persons");
    localStorage.removeItem("sama_pets");
    localStorage.removeItem("sama_centers");
    localStorage.removeItem("sama_emergencia_seeded");
    
    // Iniciar con arreglos vacíos
    localStorage.setItem("sama_persons", JSON.stringify(initialPersons));
    localStorage.setItem("sama_pets", JSON.stringify(initialPets));
    localStorage.setItem("sama_centers", JSON.stringify(initialCenters));
    localStorage.setItem("sos_disaster_reset_v1", "true");
  }
}


// Inicializar de inmediato si estamos en ambiente cliente (navegador)
if (typeof window !== "undefined") {
  seedLocalStorage();
}

// ---------------- MÉTODOS DE LA BASE DE DATOS (FIREBASE / LOCALFALLBACK) ----------------

// 1. OBTENER PERSONAS
export async function getPersons() {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, "personas_desaparecidas"), orderBy("fechaReporte", "desc"));
      const snapshot = await getDocs(q);
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list.length > 0 ? list : getLocalPersons(); // Fallback si Firebase está vacío
    } catch (e) {
      console.error("Error leyendo Firestore, usando mock local", e);
      return getLocalPersons();
    }
  } else {
    return getLocalPersons();
  }
}

function getLocalPersons() {
  return JSON.parse(localStorage.getItem("sama_persons") || "[]");
}

// 2. REGISTRAR PERSONA
export async function addPerson(personData) {
  const newPerson = {
    ...personData,
    fechaReporte: new Date().toISOString(),
    estatus: personData.estatus || "Desaparecido"
  };

  if (isFirebaseConfigured && db) {
    try {
      // Subir foto a storage si es base64 o blob
      if (personData.fotoFile && storage) {
        try {
          const photoRef = ref(storage, `personas/${Date.now()}_${personData.nombre.replace(/\s+/g, "_")}.webp`);
          await uploadBytes(photoRef, personData.fotoFile);
          newPerson.foto = await getDownloadURL(photoRef);
        } catch (storageErr) {
          console.error("Storage no activo o error de plan. Usando fallback de foto en base64.", storageErr);
          // Si falla, guardar base64 directo en Firestore (las fotos vienen ya muy comprimidas y pequeñas)
          if (personData.fotoBase64) {
            newPerson.foto = personData.fotoBase64;
          }
        }
      } else if (personData.fotoBase64) {
        newPerson.foto = personData.fotoBase64;
      }
      
      // Eliminar binarios para evitar problemas al escribir en Firestore
      delete newPerson.fotoFile;
      delete newPerson.fotoBase64;

      const docRef = await addDoc(collection(db, "personas_desaparecidas"), newPerson);
      return { id: docRef.id, ...newPerson };
    } catch (e) {
      console.error("Error escribiendo Firestore, guardando local", e);
      alert("Error al registrar persona en Firestore: " + e.message);
      return addLocalPerson(newPerson);
    }
  } else {
    // Si se provee base64 de la foto comprimida, usarla en localstorage
    if (personData.fotoBase64) {
      newPerson.foto = personData.fotoBase64;
      delete personData.fotoFile;
      delete newPerson.fotoBase64;
    }
    return addLocalPerson(newPerson);
  }
}

function addLocalPerson(newPerson) {
  const list = getLocalPersons();
  const id = "p_local_" + Date.now();
  const created = { id, ...newPerson };
  list.unshift(created);
  localStorage.setItem("sama_persons", JSON.stringify(list));
  return created;
}

// 3. CAMBIAR ESTATUS (LOCALIZADO/DESAPARECIDO) CON DATOS DEL LOCALIZADOR
export async function updatePersonStatus(personId, newStatus, finderData = null) {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, "personas_desaparecidas", personId);
      const updateData = { estatus: newStatus };
      if (finderData) {
        updateData.localizadorNombre = finderData.nombre;
        updateData.localizadorTelefono = finderData.telefono;
        updateData.localizadorUbicacion = finderData.ubicacion;
        updateData.localizadorNotas = finderData.notas;
        updateData.fechaLocalizacion = new Date().toISOString();
      }
      await updateDoc(docRef, updateData);
      return true;
    } catch (e) {
      console.error("Error actualizando Firestore, usando local", e);
      return updateLocalPersonStatus(personId, newStatus, finderData);
    }
  } else {
    return updateLocalPersonStatus(personId, newStatus, finderData);
  }
}

function updateLocalPersonStatus(personId, newStatus, finderData) {
  const list = getLocalPersons();
  const index = list.findIndex(p => p.id === personId);
  if (index !== -1) {
    list[index].estatus = newStatus;
    if (finderData) {
      list[index].localizadorNombre = finderData.nombre;
      list[index].localizadorTelefono = finderData.telefono;
      list[index].localizadorUbicacion = finderData.ubicacion;
      list[index].localizadorNotas = finderData.notas;
      list[index].fechaLocalizacion = new Date().toISOString();
    }
    localStorage.setItem("sama_persons", JSON.stringify(list));
    return true;
  }
  return false;
}


// 4. OBTENER MASCOTAS
export async function getPets() {
  if (isFirebaseConfigured && db) {
    try {
      const q = query(collection(db, "mascotas_desaparecidas"), orderBy("fechaReporte", "desc"));
      const snapshot = await getDocs(q);
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list.length > 0 ? list : getLocalPets();
    } catch (e) {
      console.error("Error leyendo Firestore", e);
      return getLocalPets();
    }
  } else {
    return getLocalPets();
  }
}

function getLocalPets() {
  return JSON.parse(localStorage.getItem("sama_pets") || "[]");
}

// 5. REGISTRAR MASCOTA
export async function addPet(petData) {
  const newPet = {
    ...petData,
    fechaReporte: new Date().toISOString(),
    estatus: petData.estatus || "Desaparecido"
  };

  if (isFirebaseConfigured && db) {
    try {
      if (petData.fotoFile && storage) {
        try {
          const photoRef = ref(storage, `mascotas/${Date.now()}_${petData.nombre.replace(/\s+/g, "_")}.webp`);
          await uploadBytes(photoRef, petData.fotoFile);
          newPet.foto = await getDownloadURL(photoRef);
        } catch (storageErr) {
          console.error("Storage no activo o error de plan. Usando fallback de foto en base64.", storageErr);
          if (petData.fotoBase64) {
            newPet.foto = petData.fotoBase64;
          }
        }
      } else if (petData.fotoBase64) {
        newPet.foto = petData.fotoBase64;
      }

      delete newPet.fotoFile;
      delete newPet.fotoBase64;

      const docRef = await addDoc(collection(db, "mascotas_desaparecidas"), newPet);
      return { id: docRef.id, ...newPet };
    } catch (e) {
      console.error("Error escribiendo Firestore, guardando local", e);
      alert("Error al registrar mascota en Firestore: " + e.message);
      return addLocalPet(newPet);
    }
  } else {
    if (petData.fotoBase64) {
      newPet.foto = petData.fotoBase64;
      delete petData.fotoFile;
      delete newPet.fotoBase64;
    }
    return addLocalPet(newPet);
  }
}

function addLocalPet(newPet) {
  const list = getLocalPets();
  const id = "m_local_" + Date.now();
  const created = { id, ...newPet };
  list.unshift(created);
  localStorage.setItem("sama_pets", JSON.stringify(list));
  return created;
}

// 6. ACTUALIZAR ESTATUS MASCOTA CON DATOS DEL LOCALIZADOR
export async function updatePetStatus(petId, newStatus, finderData = null) {
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, "mascotas_desaparecidas", petId);
      const updateData = { estatus: newStatus };
      if (finderData) {
        updateData.localizadorNombre = finderData.nombre;
        updateData.localizadorTelefono = finderData.telefono;
        updateData.localizadorUbicacion = finderData.ubicacion;
        updateData.localizadorNotas = finderData.notas;
        updateData.fechaLocalizacion = new Date().toISOString();
      }
      await updateDoc(docRef, updateData);
      return true;
    } catch (e) {
      console.error("Error actualizando mascota en Firestore", e);
      return updateLocalPetStatus(petId, newStatus, finderData);
    }
  } else {
    return updateLocalPetStatus(petId, newStatus, finderData);
  }
}

function updateLocalPetStatus(petId, newStatus, finderData) {
  const list = getLocalPets();
  const index = list.findIndex(m => m.id === petId);
  if (index !== -1) {
    list[index].estatus = newStatus;
    if (finderData) {
      list[index].localizadorNombre = finderData.nombre;
      list[index].localizadorTelefono = finderData.telefono;
      list[index].localizadorUbicacion = finderData.ubicacion;
      list[index].localizadorNotas = finderData.notas;
      list[index].fechaLocalizacion = new Date().toISOString();
    }
    localStorage.setItem("sama_pets", JSON.stringify(list));
    return true;
  }
  return false;
}


// 7. OBTENER CENTROS DE ACOPIO
export async function getCenters() {
  if (isFirebaseConfigured && db) {
    try {
      const snapshot = await getDocs(collection(db, "centros_acopio"));
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list.length > 0 ? list : getLocalCenters();
    } catch (e) {
      console.error("Error leyendo Firestore", e);
      return getLocalCenters();
    }
  } else {
    return getLocalCenters();
  }
}

function getLocalCenters() {
  return JSON.parse(localStorage.getItem("sama_centers") || "[]");
}

// 8. OBTENER ESTADÍSTICAS / MÉTRICAS CONSOLIDADAS
export async function getMetrics() {
  // Calculado dinámicamente a partir de la lista para mantenerlo simple y preciso
  const persons = await getPersons();
  const pets = await getPets();
  const centers = await getCenters();

  const totalDesaparecidos = persons.filter(p => p.estatus === "Desaparecido").length;
  const totalLocalizados = persons.filter(p => p.estatus === "Localizado").length;
  const totalGeneral = persons.length;

  const totalMascotasDesaparecidas = pets.filter(m => m.estatus === "Desaparecido").length;
  const totalMascotasLocalizadas = pets.filter(m => m.estatus === "Localizado").length;

  return {
    personas: {
      total: totalGeneral,
      desaparecidas: totalDesaparecidos,
      localizadas: totalLocalizados,
      tasaExito: totalGeneral > 0 ? Math.round((totalLocalizados / totalGeneral) * 100) : 0
    },
    mascotas: {
      total: pets.length,
      desaparecidas: totalMascotasDesaparecidas,
      localizadas: totalMascotasLocalizadas
    },
    centros: {
      total: centers.length
    }
  };
}

// 9. REGISTRAR CENTRO DE ACOPIO
export async function addCenter(centerData) {
  const newCenter = {
    ...centerData,
    estatus: centerData.estatus || "Activo",
    fechaReporte: new Date().toISOString()
  };

  if (isFirebaseConfigured && db) {
    try {
      const docRef = await addDoc(collection(db, "centros_acopio"), newCenter);
      return { id: docRef.id, ...newCenter };
    } catch (e) {
      console.error("Error escribiendo Firestore, guardando local", e);
      alert("Error al registrar centro en Firestore: " + e.message);
      return addLocalCenter(newCenter);
    }
  } else {
    return addLocalCenter(newCenter);
  }
}

function addLocalCenter(newCenter) {
  const list = getLocalCenters();
  const id = "c_local_" + Date.now();
  const created = { id, ...newCenter };
  list.unshift(created);
  localStorage.setItem("sama_centers", JSON.stringify(list));
  return created;
}

