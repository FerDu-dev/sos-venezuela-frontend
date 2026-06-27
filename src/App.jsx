import React, { useState, useEffect, useRef } from 'react';
import {
  getPersons,
  addPerson,
  updatePersonStatus,
  getPets,
  addPet,
  updatePetStatus,
  getCenters,
  addCenter,
  getMetrics
} from './services/db';
import { compressImage } from './utils/imageCompressor';

// Lista de estados para filtros y formularios
const VENEZUELAN_STATES = ["Caracas", "Aragua", "Carabobo", "La Guaira"];

export default function App() {
  const [activeTab, setActiveTab] = useState('inicio');
  const [adminMode, setAdminMode] = useState(false);

  // Datos
  const [persons, setPersons] = useState([]);
  const [pets, setPets] = useState([]);
  const [centers, setCenters] = useState([]);
  const [metrics, setMetrics] = useState(null);

  // Búsqueda y Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('Todos');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [selectedSpecies, setSelectedSpecies] = useState('Todos');

  // Modales Unificados
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportFormTab, setReportFormTab] = useState('person'); // 'person' o 'pet'
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [recordType, setRecordType] = useState(null); // 'person' o 'pet'
  const [showFinderModal, setShowFinderModal] = useState(false);

  const [finderForm, setFinderForm] = useState({
    nombre: '',
    telefono: '',
    ubicacion: '',
    notas: ''
  });


  // Formulario Persona
  const [personForm, setPersonForm] = useState({
    nombre: '', edad: '', genero: 'Masculino',
    estado: '', municipio: '', sector: '',
    ultimaVez: '', señas: '',
    reportanteNombre: '', reportanteTelefono: ''
  });
  const [personPhoto, setPersonPhoto] = useState(null);
  const [personPhotoPreview, setPersonPhotoPreview] = useState(null);

  // Formulario Mascota
  const [petForm, setPetForm] = useState({
    nombre: '', especie: 'Perro', raza: '', color: '',
    collar: 'No', estado: '', municipio: '', sector: '',
    señas: '', contactoNombre: '', contactoTelefono: ''
  });
  const [petPhoto, setPetPhoto] = useState(null);
  const [petPhotoPreview, setPetPhotoPreview] = useState(null);

  // Formulario Centro de Acopio
  const [showCenterModal, setShowCenterModal] = useState(false);
  const [centerForm, setCenterForm] = useState({
    nombre: '', estado: '', municipio: '', direccion: '',
    contacto: '', horario: '', googleMapsUrl: ''
  });
  const [centerNeeds, setCenterNeeds] = useState([]);
  const [newNeedItem, setNewNeedItem] = useState('');
  const [newNeedPriority, setNewNeedPriority] = useState('alta');

  // Modal de Mapa Interactivo
  const [showMapModal, setShowMapModal] = useState(false);
  const mapRef = useRef(null);

  // Estado de carga de base de datos
  const [loadingData, setLoadingData] = useState(true);

  // Cargar datos
  const loadData = async (silent = false) => {
    if (!silent) setLoadingData(true);
    try {
      const fetchedPersons = await getPersons();
      const fetchedPets = await getPets();
      const fetchedCenters = await getCenters();
      const fetchedMetrics = await getMetrics();

      setPersons(fetchedPersons || []);
      setPets(fetchedPets || []);
      setCenters(fetchedCenters || []);
      setMetrics(fetchedMetrics || null);
    } catch (err) {
      console.error("Error al cargar datos de Firebase:", err);
    } finally {
      if (!silent) setLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Inicializar mapa interactivo para seleccionar ubicación
  useEffect(() => {
    if (!showMapModal) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      if (!window.L) return;

      const defaultLat = 10.5000;
      const defaultLng = -66.9036;
      let initialLat = defaultLat;
      let initialLng = defaultLng;

      // Intentar extraer coordenadas si ya hay un enlace de Google Maps
      if (centerForm.googleMapsUrl) {
        const match = centerForm.googleMapsUrl.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (match) {
          initialLat = parseFloat(match[1]);
          initialLng = parseFloat(match[2]);
        }
      }

      const map = window.L.map('select-map').setView([initialLat, initialLng], 14);
      mapRef.current = map;

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map);

      // Icono marcador personalizado (evita bugs de rutas de imágenes en CDNs de Leaflet)
      const markerIcon = window.L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="
          background-color: #d94141; 
          width: 18px; 
          height: 18px; 
          border-radius: 50%; 
          border: 3px solid #ffffff; 
          box-shadow: 0 0 8px rgba(0,0,0,0.5);
          position: absolute;
          top: -9px;
          left: -9px;
        "></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });

      const marker = window.L.marker([initialLat, initialLng], {
        icon: markerIcon,
        draggable: true
      }).addTo(map);

      // Actualizar marcador al hacer clic en el mapa
      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
      });

      // Función para centrar en GPS
      window.centerMapOnGPS = () => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              map.setView([latitude, longitude], 15);
              marker.setLatLng([latitude, longitude]);
            },
            (err) => {
              alert("No se pudo obtener la geolocalización: " + err.message);
            }
          );
        } else {
          alert("Tu navegador no soporta geolocalización.");
        }
      };

      // Función para guardar ubicación seleccionada
      window.saveSelectedMapLocation = () => {
        const finalPos = marker.getLatLng();
        setCenterForm(prev => ({
          ...prev,
          googleMapsUrl: `https://www.google.com/maps?q=${finalPos.lat.toFixed(6)},${finalPos.lng.toFixed(6)}`
        }));
        setShowMapModal(false);
      };

    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [showMapModal]);

  // Función para normalizar texto (quitar acentos)
  const normalizeText = (text) => {
    return text
      ? text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      : "";
  };

  // Función para obtener iniciales
  const getInitials = (name) => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/);
    const first = parts[0] ? parts[0][0] : "";
    const second = parts[1] ? parts[1][0] : "";
    return (first + second).toUpperCase();
  };

  // Extraer número de teléfono de una cadena de texto (para centros de acopio)
  const extractPhoneNumber = (text) => {
    if (!text) return null;
    const match = text.match(/(?:\+58|58)?\s?0?(?:412|414|424|416|426|2\d{2})[-.\s]?\d{3}[-.\s]?\d{4}/) || text.match(/\+?\d[\d\s.-]{6,}\d/);
    if (match) {
      const clean = match[0].replace(/[^0-9+]/g, '');
      let formatted = clean;
      if (!formatted.startsWith('+') && !formatted.startsWith('58')) {
        if (formatted.startsWith('0')) {
          formatted = formatted.substring(1);
        }
        formatted = '58' + formatted;
      } else if (formatted.startsWith('+')) {
        formatted = formatted.substring(1);
      }
      return {
        display: match[0].trim(),
        value: formatted
      };
    }
    return null;
  };

  // Obtener detalles de teléfono según el tipo de registro seleccionado
  const getRecordPhoneDetails = () => {
    if (!selectedRecord) return null;
    if (recordType === 'person') {
      const phone = selectedRecord.reportanteTelefono;
      if (!phone) return null;
      const cleanPhone = phone.replace(/[^0-9]/g, "");
      let waPhone = cleanPhone;
      if (!waPhone.startsWith('58') && (waPhone.startsWith('412') || waPhone.startsWith('414') || waPhone.startsWith('424') || waPhone.startsWith('416') || waPhone.startsWith('426'))) {
        waPhone = '58' + waPhone;
      }
      return {
        raw: phone,
        callUrl: `tel:${phone}`,
        waUrl: `https://wa.me/${waPhone}`
      };
    } else if (recordType === 'pet') {
      const phone = selectedRecord.contactoTelefono;
      if (!phone) return null;
      const cleanPhone = phone.replace(/[^0-9]/g, "");
      let waPhone = cleanPhone;
      if (!waPhone.startsWith('58') && (waPhone.startsWith('412') || waPhone.startsWith('414') || waPhone.startsWith('424') || waPhone.startsWith('416') || waPhone.startsWith('426'))) {
        waPhone = '58' + waPhone;
      }
      return {
        raw: phone,
        callUrl: `tel:${phone}`,
        waUrl: `https://wa.me/${waPhone}`
      };
    } else if (recordType === 'center') {
      const phoneInfo = extractPhoneNumber(selectedRecord.contacto);
      if (!phoneInfo) return null;
      return {
        raw: phoneInfo.display,
        callUrl: `tel:${phoneInfo.display}`,
        waUrl: `https://wa.me/${phoneInfo.value}`
      };
    }
    return null;
  };

  // --- RENDERING DE AVATARS OFFLINE/PREMIUM ---
  const renderAvatar = (record, isPet = false) => {
    const photo = record.foto;
    const name = record.nombre;

    if (photo && (photo.startsWith('http') || photo.startsWith('data:image'))) {
      return <img src={photo} alt={name} className="record-avatar" loading="lazy" />;
    }

    const initials = getInitials(name);

    // Colores UNICEF limpios y suaves
    let bgColor = '#e6f7fe';
    let textColor = '#008cc2';

    if (isPet) {
      bgColor = '#fef5ec';
      textColor = '#ea580c';
    } else {
      // Diferenciar color según el nombre para evitar monotonía
      const charCode = name.charCodeAt(0) || 0;
      if (charCode % 3 === 0) {
        bgColor = '#ebfbee';
        textColor = '#1ea86c';
      } else if (charCode % 3 === 1) {
        bgColor = '#fff5f5';
        textColor = '#d94141';
      }
    }

    return (
      <div className="avatar-placeholder" style={{ backgroundColor: bgColor, color: textColor }}>
        {initials}
      </div>
    );
  };


  // --- MANEJO DE REGISTROS ---
  const handlePhotoChange = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Comprimir imagen antes de procesar/subir
      const compressed = await compressImage(file);
      if (type === 'person') {
        setPersonPhoto(compressed.blob);
        setPersonPhotoPreview(compressed.base64);
      } else {
        setPetPhoto(compressed.blob);
        setPetPhotoPreview(compressed.base64);
      }
    } catch (error) {
      alert("Error al comprimir la foto. Intenta con otra imagen.");
      console.error(error);
    }
  };

  const handlePersonSubmit = async (e) => {
    e.preventDefault();
    if (!personForm.nombre || !personForm.municipio || !personForm.sector || !personForm.reportanteTelefono) {
      alert("Por favor completa los campos obligatorios (*)");
      return;
    }

    const docData = {
      ...personForm,
      edad: Number(personForm.edad) || "",
      fotoFile: personPhoto,
      fotoBase64: personPhotoPreview // fallback localstorage
    };

    await addPerson(docData);
    setShowReportModal(false);

    // Resetear formulario
    setPersonForm({
      nombre: '', edad: '', genero: 'Masculino',
      estado: '', municipio: '', sector: '',
      ultimaVez: '', señas: '',
      reportanteNombre: '', reportanteTelefono: ''
    });
    setPersonPhoto(null);
    setPersonPhotoPreview(null);

    await loadData();
    alert("Persona registrada con éxito.");
  };

  const handlePetSubmit = async (e) => {
    e.preventDefault();
    if (!petForm.nombre || !petForm.municipio || !petForm.sector || !petForm.contactoTelefono) {
      alert("Por favor completa los campos obligatorios (*)");
      return;
    }

    const docData = {
      ...petForm,
      fotoFile: petPhoto,
      fotoBase64: petPhotoPreview // fallback localstorage
    };

    await addPet(docData);
    setShowReportModal(false);

    setPetForm({
      nombre: '', especie: 'Perro', raza: '', color: '',
      collar: 'No', estado: '', municipio: '', sector: '',
      señas: '', contactoNombre: '', contactoTelefono: ''
    });
    setPetPhoto(null);
    setPetPhotoPreview(null);

    await loadData();
    alert("Mascota registrada con éxito.");
  };

  const handleCenterSubmit = async (e) => {
    e.preventDefault();
    if (!centerForm.nombre || !centerForm.estado || !centerForm.municipio || !centerForm.direccion || !centerForm.contacto) {
      alert("Por favor completa los campos obligatorios (*)");
      return;
    }

    const docData = {
      ...centerForm,
      necesidades: centerNeeds
    };

    await addCenter(docData);
    setShowCenterModal(false);

    // Resetear formulario
    setCenterForm({
      nombre: '', estado: '', municipio: '', direccion: '',
      contacto: '', horario: '', googleMapsUrl: ''
    });
    setCenterNeeds([]);

    await loadData();
    alert("Centro de acopio registrado con éxito.");
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCenterForm(prev => ({
          ...prev,
          googleMapsUrl: `https://www.google.com/maps?q=${latitude},${longitude}`
        }));
        alert("📍 Ubicación obtenida correctamente.");
      },
      (error) => {
        alert("No se pudo obtener la ubicación: " + error.message + ". Por favor ingresa el enlace manualmente.");
      }
    );
  };

  const handleStatusChange = async (recordId, newStatus, type, finderData = null) => {
    if (type === 'person') {
      await updatePersonStatus(recordId, newStatus, finderData);
    } else {
      await updatePetStatus(recordId, newStatus, finderData);
    }
    setSelectedRecord(null);
    await loadData();
    alert("Reportado como localizado. ¡Gracias por ayudar a reunir a una familia!");
  };

  const handleFinderSubmit = async (e) => {
    e.preventDefault();
    if (!finderForm.nombre || !finderForm.telefono || !finderForm.ubicacion) {
      alert("Por favor completa los campos obligatorios (*)");
      return;
    }
    await handleStatusChange(selectedRecord.id, 'Localizado', recordType, finderForm);
    setShowFinderModal(false);
    setFinderForm({ nombre: '', telefono: '', ubicacion: '', notas: '' });
  };


  // --- FILTROS DE BÚSQUEDA ---
  const filteredPersons = persons.filter(p => {
    const matchQuery = normalizeText(p.nombre).includes(normalizeText(searchQuery)) ||
      normalizeText(p.señas).includes(normalizeText(searchQuery)) ||
      normalizeText(p.municipio).includes(normalizeText(searchQuery)) ||
      normalizeText(p.sector).includes(normalizeText(searchQuery));

    const matchState = selectedState === 'Todos' || p.estado === selectedState;
    const matchStatus = selectedStatus === 'Todos' || p.estatus === selectedStatus;

    return matchQuery && matchState && matchStatus;
  });

  const filteredPets = pets.filter(m => {
    const matchQuery = normalizeText(m.nombre).includes(normalizeText(searchQuery)) ||
      normalizeText(m.raza).includes(normalizeText(searchQuery)) ||
      normalizeText(m.señas).includes(normalizeText(searchQuery)) ||
      normalizeText(m.municipio).includes(normalizeText(searchQuery));

    const matchState = selectedState === 'Todos' || m.estado === selectedState;
    const matchStatus = selectedStatus === 'Todos' || m.estatus === selectedStatus;
    const matchSpecies = selectedSpecies === 'Todos' || m.especie === selectedSpecies;

    return matchQuery && matchState && matchStatus && matchSpecies;
  });

  const filteredCenters = centers.filter(c => {
    const matchQuery = normalizeText(c.nombre).includes(normalizeText(searchQuery)) ||
      normalizeText(c.direccion).includes(normalizeText(searchQuery));

    const matchState = selectedState === 'Todos' || c.estado === selectedState;

    return matchQuery && matchState;
  });

  // Contactos de emergencia preestablecidos (Offline indexados por estado)
  const emergencyContacts = {
    "Caracas": [
      { cargo: "Protección Civil Nacional", telf: "0212-6311543", desc: "Coordinación central" },
      { cargo: "Bomberos de Distrito Capital", telf: "0212-5454545", desc: "Estación Central" },
      { cargo: "VEN 911 Caracas", telf: "911", desc: "Número único de emergencias" },
      { cargo: "Cruz Roja Venezolana", telf: "0212-5782187", desc: "Sede central" }
    ],
    "Aragua": [
      { cargo: "Protección Civil Aragua", telf: "0243-2422222", desc: "Atención regional" },
      { cargo: "Bomberos de Aragua", telf: "0243-2350050", desc: "Maracay Centro" },
      { cargo: "Corporación de Salud Aragua", telf: "0243-2413554", desc: "Hospital Central de Maracay" }
    ],
    "Carabobo": [
      { cargo: "Protección Civil Carabobo", telf: "0241-8586333", desc: "Emergencias Valencia" },
      { cargo: "Bomberos de Valencia", telf: "0241-8321855", desc: "Estación Branger" },
      { cargo: "Sede Cruz Roja Carabobo", telf: "0241-8575003", desc: "Valencia" }
    ],
    "La Guaira": [
      { cargo: "Protección Civil Vargas", telf: "0212-3311122", desc: "La Guaira" },
      { cargo: "Bomberos del Estado Vargas", telf: "0212-3324444", desc: "Maiquetía" },
      { cargo: "Hospital José María Vargas", telf: "0212-3521360", desc: "La Guaira" }
    ]
  };

  const isPersonFormValid = personForm.nombre.trim() !== '' && personForm.sector.trim() !== '' && personForm.estado !== '';
  const isPetFormValid = petForm.nombre.trim() !== '' && petForm.sector.trim() !== '' && petForm.estado !== '';
  const isFinderFormValid = finderForm.nombre.trim() !== '' && finderForm.telefono.trim() !== '' && finderForm.ubicacion.trim() !== '';
  const isCenterFormValid = centerForm.nombre.trim() !== '' && centerForm.estado !== '' && centerForm.municipio.trim() !== '' && centerForm.direccion.trim() !== '' && centerForm.contacto.trim() !== '';

  return (
    <>
      {/* Indicador de Modo Administrador de Pruebas */}
      {adminMode && (
        <div className="admin-mode-indicator">
          ⚠️ MODO MODERADOR ACTIVO (Puedes cambiar estados a Localizado)
        </div>
      )}

      {/* HEADER */}
      <header className="app-header">
        <div className="app-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/sama-logo.png" alt="SAMA Logo" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
          <span className="logo-text">Centros Ayuda Venezuela</span>
        </div>

        {/* Navegación Desktop */}
        <nav className="desktop-nav">
          <button className={`desktop-nav-item ${activeTab === 'inicio' ? 'active' : ''}`} onClick={() => { setActiveTab('inicio'); setSearchQuery(''); }}>
            <span className="nav-icon">🏠</span>
            <span>Inicio</span>
          </button>
          <button className={`desktop-nav-item ${activeTab === 'personas' ? 'active' : ''}`} onClick={() => { setActiveTab('personas'); setSearchQuery(''); }}>
            <span className="nav-icon">👥</span>
            <span>Personas</span>
          </button>
          <button className={`desktop-nav-item ${activeTab === 'acopio' ? 'active' : ''}`} onClick={() => { setActiveTab('acopio'); setSearchQuery(''); }}>
            <span className="nav-icon">📦</span>
            <span>Acopio</span>
          </button>
          <button className={`desktop-nav-item ${activeTab === 'mascotas' ? 'active' : ''}`} onClick={() => { setActiveTab('mascotas'); setSearchQuery(''); }}>
            <span className="nav-icon">🐾</span>
            <span>Mascotas</span>
          </button>
          <button className={`desktop-nav-item ${activeTab === 'emergencias' ? 'active' : ''}`} onClick={() => { setActiveTab('emergencias'); setSearchQuery(''); }}>
            <span className="nav-icon">📞</span>
            <span>Emergencias</span>
          </button>
        </nav>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => {
              if (activeTab === 'acopio') {
                setShowCenterModal(true);
              } else {
                setActiveTab('acopio');
                setSearchQuery('');
              }
            }}
            className={`btn-report-header ${activeTab === 'acopio' ? 'btn-header-green' : 'btn-header-unicef'}`}
          >
            {activeTab === 'acopio' ? (
              <>
                <span className="fab-icon" style={{ marginRight: '4px' }}>✚</span>
                <span>Registrar Centro</span>
              </>
            ) : (
              <>
                <span className="fab-icon" style={{ marginRight: '4px' }}>📦</span>
                <span>Ver Acopios</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              setReportFormTab('person');
              setShowReportModal(true);
            }}
            className="btn-report-header"
          >
            <span className="fab-icon" style={{ marginRight: '4px' }}>✚</span>
            <span>Reportar Caso</span>
          </button>
        </div>
      </header>

      {/* CONTENIDO DINÁMICO */}
      <main className="app-content">
        {loadingData ? (
          <div className="card" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px 24px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-card)',
            marginTop: '20px'
          }}>
            <div className="spinner-loader"></div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
              Cargando información actualizada...
            </h3>

          </div>
        ) : (
          <>
            {/* PESTAÑA 1: INICIO (DASHBOARD) */}
            {activeTab === 'inicio' && (
              <div className="dashboard-layout">
                <div className="dashboard-main">
                  <div className="alert-banner">
                    <span className="alert-icon">⚠️</span>
                    <div className="alert-body">
                      <h4>ESTADO DE ALERTA NACIONAL</h4>
                      <p>Terremoto afectó la región centro-norte. Redes congestionadas. Prioriza reportar personas desaparecidas y compartir información oficial.</p>
                    </div>
                  </div>

                  <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '700' }}>Panel de Monitoreo en Tiempo Real</h3>

                  {metrics ? (
                    <div className="dashboard-metrics" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                      <div className="metric-card" style={{ background: 'var(--color-success-light, #ebfbee)', borderColor: 'var(--color-success, #12b886)' }}>
                        <div className="metric-value success" style={{ color: 'var(--color-success, #2b8a3e)' }}>{metrics.centros ? metrics.centros.total : 0}</div>
                        <div className="metric-label" style={{ fontWeight: '700', color: 'var(--color-success, #2b8a3e)' }}>Centros de Acopio Activos</div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-value danger">{metrics.personas.desaparecidas}</div>
                        <div className="metric-label">Personas Desaparecidas</div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-value success">{metrics.personas.localizadas}</div>
                        <div className="metric-label">Personas Localizadas</div>
                        <span className="rate-badge">Tasa Éxito: {metrics.personas.tasaExito}%</span>
                      </div>
                      <div className="metric-card">
                        <div className="metric-value info">{metrics.mascotas.desaparecidas}</div>
                        <div className="metric-label">Mascotas Perdidas</div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-value success">{metrics.mascotas.localizadas}</div>
                        <div className="metric-label">Mascotas Halladas</div>
                      </div>
                    </div>
                  ) : (
                    <p style={{ textAlign: 'center', padding: '16px' }}>Cargando métricas...</p>
                  )}

                  {/* Centros de Acopio Activos Recientes */}
                  <div className="card" style={{ marginBottom: '16px', borderColor: 'var(--color-success-light, #ebfbee)' }}>
                    <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '700', color: 'var(--color-success, #2b8a3e)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      📦 Centros de Acopio Activos Recientes
                    </h4>
                    <div className="records-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                      {centers.slice(0, 3).map(c => (
                        <div key={c.id} className="card" onClick={() => { setSelectedRecord(c); setRecordType('center'); }} style={{ cursor: 'pointer', border: '1px solid var(--color-border)', margin: 0, padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'var(--bg-app)' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <h5 style={{ fontSize: '13px', fontWeight: '700', margin: 0 }}>{c.nombre}</h5>
                              <span className="record-badge" style={{
                                fontSize: '9px',
                                padding: '2px 8px',
                                backgroundColor: 'var(--color-success-light)',
                                color: 'var(--color-success)'
                              }}>Activo</span>
                            </div>
                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 6px 0', textAlign: 'left' }}>
                              📍 {c.direccion} ({c.estado})
                            </p>
                            <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: '0 0 10px 0', textAlign: 'left' }}>
                              📞 {c.contacto} | 🕒 {c.horario || 'No especificado'}
                            </p>
                          </div>
                          <div>
                            <h6 style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: '0 0 4px 0', fontWeight: '700', textAlign: 'left' }}>Insumos Críticos:</h6>
                            <div className="supplies-grid" style={{ gap: '4px', justifyContent: 'flex-start' }}>
                              {c.necesidades.slice(0, 3).map((n, idx) => (
                                <div key={idx} className={`supply-item supply-${n.prioridad}`} style={{ padding: '2px 8px', fontSize: '9px' }}>
                                  <span>{n.item}</span>
                                </div>
                              ))}
                              {c.necesidades.length > 3 && (
                                <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>+{c.necesidades.length - 3} más</span>
                              )}
                              {c.necesidades.length === 0 && (
                                <span style={{ fontSize: '9px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Sin necesidades urgentes</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {centers.length === 0 && (
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', padding: '16px', gridColumn: '1 / -1' }}>
                          No hay centros de acopio registrados aún.
                        </p>
                      )}
                    </div>
                    <button onClick={() => setActiveTab('acopio')} className="btn btn-secondary" style={{ marginTop: '16px', minHeight: '40px', padding: '8px' }}>
                      Ver todos los centros de acopio ({centers.length}) →
                    </button>
                  </div>

                  {/* Contactos de Emergencia Rápidos */}
                  <div className="card" style={{ marginBottom: '16px', borderColor: 'var(--color-danger-light)' }}>
                    <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '700', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🚨 Contactos de Emergencia Rápidos
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                      <div className="emergency-contact-card" style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-app)', border: '1px solid var(--color-border)', borderRadius: '8px', margin: 0 }}>
                        <div style={{ textAlign: 'left' }}>
                          <h5 style={{ fontSize: '11px', margin: '0 0 2px 0', fontWeight: '700' }}>VEN 911</h5>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Nacional</span>
                        </div>
                        <a href="tel:911" className="btn-call" style={{ width: '28px', height: '28px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Llamar a VEN 911">
                          📞
                        </a>
                      </div>
                      <div className="emergency-contact-card" style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-app)', border: '1px solid var(--color-border)', borderRadius: '8px', margin: 0 }}>
                        <div style={{ textAlign: 'left' }}>
                          <h5 style={{ fontSize: '11px', margin: '0 0 2px 0', fontWeight: '700' }}>Bomberos</h5>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Caracas</span>
                        </div>
                        <a href="tel:02125454545" className="btn-call" style={{ width: '28px', height: '28px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Llamar a Bomberos">
                          📞
                        </a>
                      </div>
                      <div className="emergency-contact-card" style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-app)', border: '1px solid var(--color-border)', borderRadius: '8px', margin: 0 }}>
                        <div style={{ textAlign: 'left' }}>
                          <h5 style={{ fontSize: '11px', margin: '0 0 2px 0', fontWeight: '700' }}>Protección Civil</h5>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Nacional</span>
                        </div>
                        <a href="tel:02126311543" className="btn-call" style={{ width: '28px', height: '28px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Llamar a PC">
                          📞
                        </a>
                      </div>
                      <div className="emergency-contact-card" style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-app)', border: '1px solid var(--color-border)', borderRadius: '8px', margin: 0 }}>
                        <div style={{ textAlign: 'left' }}>
                          <h5 style={{ fontSize: '11px', margin: '0 0 2px 0', fontWeight: '700' }}>Cruz Roja</h5>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Nacional</span>
                        </div>
                        <a href="tel:02125782187" className="btn-call" style={{ width: '28px', height: '28px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Llamar a Cruz Roja">
                          📞
                        </a>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('emergencias')} className="btn btn-secondary" style={{ marginTop: '12px', minHeight: '32px', height: '32px', padding: '4px', fontSize: '11px' }}>
                      Ver todos los números por estado →
                    </button>
                  </div>

                  {/* Registro secundario de personas */}
                  <div className="card">
                    <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '700' }}>Últimas personas reportadas</h4>
                    <div className="records-list">
                      {persons.slice(0, 3).map(p => (
                        <div key={p.id} className="record-card" onClick={() => { setSelectedRecord(p); setRecordType('person'); }} style={{ cursor: 'pointer', padding: '8px', borderRadius: '8px', background: 'var(--bg-app)' }}>
                          {renderAvatar(p)}
                          <div className="record-info">
                            <div className="record-header">
                              <span className="record-name">{p.nombre}</span>
                              <span className={`record-badge badge-${p.estatus.toLowerCase()}`}>{p.estatus}</span>
                            </div>
                            <div className="record-details">
                              <span>Última vez: <strong>{p.sector}, {p.estado}</strong></span>
                              <span>Fecha: {new Date(p.fechaReporte).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setActiveTab('personas')} className="btn btn-secondary" style={{ marginTop: '12px', minHeight: '40px', padding: '8px' }}>
                      Ver todos los reportes ({persons.length}) →
                    </button>
                  </div>
                </div>

                <aside className="dashboard-sidebar">
                  <div className="card" style={{ background: 'var(--color-success-light, #ebfbee)', borderColor: 'var(--color-success, #12b886)', textAlign: 'center', padding: '20px', marginBottom: '16px' }}>
                    <h4 style={{ color: 'var(--color-success, #2b8a3e)', marginBottom: '8px', fontSize: '15px' }}>¿Conoces un Centro de Acopio activo?</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Registra un punto de recolección de donaciones para indicar qué insumos necesitan.</p>
                    <button onClick={() => setShowCenterModal(true)} className="btn btn-success">
                      ➕ Registrar Centro de Acopio
                    </button>
                  </div>

                  <div className="card" style={{ background: 'var(--color-danger-light)', borderColor: 'var(--color-danger)', textAlign: 'center', padding: '20px', marginBottom: '16px' }}>
                    <h4 style={{ color: 'var(--color-danger)', marginBottom: '8px', fontSize: '15px' }}>¿Tienes un familiar o amigo no localizado?</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Registra sus datos en nuestro censo cívico. Voluntarios y brigadas usan esta base de datos.</p>
                    <button onClick={() => { setReportFormTab('person'); setShowReportModal(true); }} className="btn btn-primary">
                      ➕ Registrar Persona Desaparecida
                    </button>
                  </div>

                  <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
                    <h4 style={{ marginBottom: '8px', fontSize: '14px' }}>¿Perdiste una mascota durante el sismo?</h4>
                    <button onClick={() => { setReportFormTab('pet'); setShowReportModal(true); }} className="btn btn-secondary" style={{ color: 'var(--color-warning)', borderColor: 'var(--color-warning)' }}>
                      🐾 Registrar Mascota Extraviada
                    </button>
                  </div>
                </aside>
              </div>
            )}

            {/* PESTAÑA 2: PERSONAS (BUSCADOR / LISTADO) */}
            {activeTab === 'personas' && (
              <div className="page-layout">
                <aside className="page-sidebar">
                  <h4 className="sidebar-title">Filtros de Búsqueda</h4>

                  <div className="sidebar-group">
                    <h5>Estado</h5>
                    <div className="filter-tabs">
                      <span
                        className={`filter-pill ${selectedState === 'Todos' ? 'active' : ''}`}
                        onClick={() => setSelectedState('Todos')}
                      >
                        Todos los Estados
                      </span>
                      {VENEZUELAN_STATES.map(s => (
                        <span
                          key={s}
                          className={`filter-pill ${selectedState === s ? 'active' : ''}`}
                          onClick={() => setSelectedState(s)}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="sidebar-group" style={{ marginTop: '16px' }}>
                    <h5>Estatus</h5>
                    <div className="filter-tabs">
                      <span
                        className={`filter-pill ${selectedStatus === 'Todos' ? 'active' : ''}`}
                        onClick={() => setSelectedStatus('Todos')}
                      >
                        Cualquier Estatus
                      </span>
                      <span
                        className={`filter-pill ${selectedStatus === 'Desaparecido' ? 'active' : ''}`}
                        onClick={() => setSelectedStatus('Desaparecido')}
                      >
                        🔴 Desaparecidos
                      </span>
                      <span
                        className={`filter-pill ${selectedStatus === 'Localizado' ? 'active' : ''}`}
                        onClick={() => setSelectedStatus('Localizado')}
                      >
                        🟢 Localizados
                      </span>
                    </div>
                  </div>
                </aside>

                <div className="page-main-content">
                  <div className="search-wrapper">
                    <input
                      type="text"
                      placeholder="Buscar por nombre, sector o señas..."
                      className="input-field"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-primary btn-action-top"
                      onClick={() => {
                        setReportFormTab('person');
                        setShowReportModal(true);
                      }}
                    >
                      ➕ Reportar Persona
                    </button>
                  </div>

                  <div className="records-list">
                    {filteredPersons.length > 0 ? (
                      filteredPersons.map(p => (
                        <div key={p.id} className="card record-card" onClick={() => { setSelectedRecord(p); setRecordType('person'); }} style={{ cursor: 'pointer' }}>
                          {renderAvatar(p)}
                          <div className="record-info">
                            <div className="record-header">
                              <span className="record-name">{p.nombre}</span>
                              <span className={`record-badge badge-${p.estatus.toLowerCase()}`}>{p.estatus}</span>
                            </div>
                            <div className="record-details">
                              <span>Edad: <strong>{p.edad ? `${p.edad} años` : 'No especificada'}</strong></span>
                              <span>Última vez en: <strong>{p.sector} ({p.estado})</strong></span>
                              <span>Señas: {p.señas.substring(0, 50)}{p.señas.length > 50 ? '...' : ''}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>No se encontraron reportes con estos criterios.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PESTAÑA 3: CENTROS DE ACOPIO */}
            {activeTab === 'acopio' && (
              <div className="page-layout">
                <aside className="page-sidebar">
                  <h4 className="sidebar-title">Filtros de Búsqueda</h4>
                  <div className="sidebar-group">
                    <h5>Estado</h5>
                    <div className="filter-tabs">
                      <span
                        className={`filter-pill ${selectedState === 'Todos' ? 'active' : ''}`}
                        onClick={() => setSelectedState('Todos')}
                      >
                        Todos los Estados
                      </span>
                      {VENEZUELAN_STATES.map(s => (
                        <span
                          key={s}
                          className={`filter-pill ${selectedState === s ? 'active' : ''}`}
                          onClick={() => setSelectedState(s)}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </aside>

                <div className="page-main-content">
                  <div className="search-wrapper">
                    <input
                      type="text"
                      placeholder="Buscar centro de acopio por nombre o sector..."
                      className="input-field"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-success btn-action-top"
                      onClick={() => setShowCenterModal(true)}
                    >
                      ➕ Registrar Centro
                    </button>
                  </div>

                  <div className="records-list">
                    {filteredCenters.length > 0 ? (
                      filteredCenters.map(c => (
                        <div key={c.id} className="card" onClick={() => { setSelectedRecord(c); setRecordType('center'); }} style={{ cursor: 'pointer' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h4 style={{ fontSize: '15px', fontWeight: '700' }}>{c.nombre}</h4>
                            <span className={`record-badge`} style={{
                              backgroundColor: c.estatus === 'Activo' ? 'var(--color-success-light)' : 'var(--color-danger-light)',
                              color: c.estatus === 'Activo' ? 'var(--color-success)' : 'var(--color-danger)'
                            }}>
                              {c.estatus}
                            </span>
                          </div>

                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            📍 {c.direccion} ({c.estado})
                          </p>
                          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                            📞 Contacto: {c.contacto} | 🕒 Horario: {c.horario}
                          </p>

                          <h5 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>Insumos Requeridos:</h5>
                          <div className="supplies-grid">
                            {c.necesidades.map((n, idx) => (
                              <div key={idx} className={`supply-item supply-${n.prioridad}`}>
                                <span>{n.item}</span>
                              </div>
                            ))}
                          </div>

                          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                            <a href={c.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" onClick={(e) => e.stopPropagation()} style={{ flex: 1, minHeight: '40px', padding: '6px' }}>
                              🗺️ Ver Ruta en Maps
                            </a>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>No se encontraron centros de acopio.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PESTAÑA 4: MASCOTAS */}
            {activeTab === 'mascotas' && (
              <div className="page-layout">
                <aside className="page-sidebar">
                  <h4 className="sidebar-title">Filtros de Búsqueda</h4>

                  <div className="sidebar-group">
                    <h5>Estado</h5>
                    <div className="filter-tabs">
                      <span
                        className={`filter-pill ${selectedState === 'Todos' ? 'active' : ''}`}
                        onClick={() => setSelectedState('Todos')}
                      >
                        Todos los Estados
                      </span>
                      {VENEZUELAN_STATES.map(s => (
                        <span
                          key={s}
                          className={`filter-pill ${selectedState === s ? 'active' : ''}`}
                          onClick={() => setSelectedState(s)}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="sidebar-group" style={{ marginTop: '16px' }}>
                    <h5>Especie</h5>
                    <div className="filter-tabs">
                      <span
                        className={`filter-pill ${selectedSpecies === 'Todos' ? 'active' : ''}`}
                        onClick={() => setSelectedSpecies('Todos')}
                      >
                        Todas las Especies
                      </span>
                      <span
                        className={`filter-pill ${selectedSpecies === 'Perro' ? 'active' : ''}`}
                        onClick={() => setSelectedSpecies('Perro')}
                      >
                        🐶 Perros
                      </span>
                      <span
                        className={`filter-pill ${selectedSpecies === 'Gato' ? 'active' : ''}`}
                        onClick={() => setSelectedSpecies('Gato')}
                      >
                        🐱 Gatos
                      </span>
                    </div>
                  </div>
                </aside>

                <div className="page-main-content">
                  <div className="search-wrapper">
                    <input
                      type="text"
                      placeholder="Buscar por mascota, raza o color..."
                      className="input-field"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-warning btn-action-top"
                      onClick={() => {
                        setReportFormTab('pet');
                        setShowReportModal(true);
                      }}
                    >
                      ➕ Reportar Mascota
                    </button>
                  </div>

                  <div className="records-list">
                    {filteredPets.length > 0 ? (
                      filteredPets.map(m => (
                        <div key={m.id} className="card record-card" onClick={() => { setSelectedRecord(m); setRecordType('pet'); }} style={{ cursor: 'pointer' }}>
                          {renderAvatar(m, true)}
                          <div className="record-info">
                            <div className="record-header">
                              <span className="record-name">{m.nombre}</span>
                              <span className={`record-badge badge-${m.estatus.toLowerCase()}`}>{m.estatus}</span>
                            </div>
                            <div className="record-details">
                              <span>Especie/Raza: <strong>{m.especie} ({m.raza || 'Mestizo'})</strong></span>
                              <span>Ubicación: <strong>{m.sector} ({m.estado})</strong></span>
                              <span>Color: {m.color} | Collar: {m.collar}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>No se encontraron mascotas extraviadas.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PESTAÑA 5: CONTACTOS DE EMERGENCIA */}
            {activeTab === 'emergencias' && (
              <div>
                <div className="card" style={{ background: 'var(--color-info-light)', borderColor: 'var(--color-info)', marginBottom: '16px' }}>
                  <h4 style={{ color: 'var(--color-info)', marginBottom: '4px', fontSize: '14px' }}>Guía Rápida de Primeros Auxilios Terremoto</h4>
                  <ul style={{ fontSize: '11px', color: 'var(--text-secondary)', paddingLeft: '16px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <li><strong>No uses ascensores</strong> bajo ninguna circunstancia. Usa las escaleras.</li>
                    <li><strong>Ubica zonas seguras</strong> alejadas de vidrios, postes o fachadas caídas.</li>
                    <li><strong>Raciona el agua potable</strong> de inmediato y desconecta el gas en tu hogar.</li>
                    <li><strong>Cierra la llave de paso</strong> si hay fugas de agua.</li>
                  </ul>
                </div>

                <h3 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: '700' }}>Directorio Telefónico Directo</h3>

                {Object.keys(emergencyContacts).map(state => (
                  <div key={state} className="card" style={{ padding: '12px' }}>
                    <h4 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '6px', marginBottom: '8px', color: 'var(--color-danger)', fontSize: '14px' }}>
                      📍 Estado {state}
                    </h4>
                    <div className="emergency-grid">
                      {emergencyContacts[state].map((contact, idx) => (
                        <div key={idx} className="emergency-contact-card">
                          <div className="emergency-contact-info">
                            <h4>{contact.cargo}</h4>
                            <p>{contact.desc}</p>
                            <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{contact.telf}</strong>
                          </div>
                          <a href={`tel:${contact.telf.replace(/-/g, "")}`} className="btn-call" title={`Llamar a ${contact.cargo}`}>
                            📞
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* FOOTER */}
            <footer style={{
              marginTop: '40px',
              padding: '24px 16px',
              borderTop: '1px solid var(--color-border)',
              textAlign: 'center',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              lineHeight: '1.6'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                by SAMA LOGISTICA 3 C.A / Fernando Duno
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <a
                  href="https://instagram.com/samalogistica"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'var(--color-unicef)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontWeight: '700'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '4px' }}>
                    <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.444-.048-3.298c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z" />
                  </svg>
                  @samalogistica
                </a>
              </div>
            </footer>
          </>
        )}

      </main>

      {/* --- TAB BAR INFERIOR --- */}
      <nav className="app-tabbar" style={{ overflow: 'visible' }}>
        {/* Inicio */}
        <button className={`tab-item ${activeTab === 'inicio' ? 'active' : ''}`} onClick={() => { setActiveTab('inicio'); setSearchQuery(''); }}>
          <span className="tab-icon">🏠</span>
          <span>Inicio</span>
        </button>

        {/* Personas */}
        <button className={`tab-item ${activeTab === 'personas' ? 'active' : ''}`} onClick={() => { setActiveTab('personas'); setSearchQuery(''); }}>
          <span className="tab-icon">👥</span>
          <span>Personas</span>
        </button>

        {/* Acopio - Botón Prominente Destacado */}
        <button
          className={`tab-item ${activeTab === 'acopio' ? 'active' : ''}`}
          onClick={() => { setActiveTab('acopio'); setSearchQuery(''); }}
          style={{ position: 'relative', overflow: 'visible' }}
        >
          <div
            style={{
              backgroundColor: activeTab === 'acopio' ? 'var(--color-success)' : '#c2f2d9',
              color: activeTab === 'acopio' ? '#ffffff' : 'var(--color-success)',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: activeTab === 'acopio'
                ? '0 4px 10px rgba(30, 184, 120, 0.35)'
                : '0 2px 8px rgba(30, 184, 120, 0.25)',
              transform: 'translateY(-14px)',
              position: 'absolute',
              top: '2px',
              border: '3px solid var(--bg-card)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              fontSize: '18px'
            }}
          >
            📦
          </div>
          <span style={{
            marginTop: '28px',
            color: 'var(--color-success)',
            fontWeight: activeTab === 'acopio' ? '800' : '700'
          }}>
            Acopio
          </span>
        </button>

        {/* Mascotas */}
        <button className={`tab-item ${activeTab === 'mascotas' ? 'active' : ''}`} onClick={() => { setActiveTab('mascotas'); setSearchQuery(''); }}>
          <span className="tab-icon">🐾</span>
          <span>Mascotas</span>
        </button>

        {/* Emergencias */}
        <button className={`tab-item ${activeTab === 'emergencias' ? 'active' : ''}`} onClick={() => { setActiveTab('emergencias'); setSearchQuery(''); }}>
          <span className="tab-icon">📞</span>
          <span>Emergencias</span>
        </button>
      </nav>

      {/* --- MODAL DETALLE DE REGISTRO --- */}
      {selectedRecord && (
        (() => {
          const phoneDetails = getRecordPhoneDetails();
          return (
            <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
              <div className="modal-content" style={{ display: 'flex', flexDirection: 'column', maxHeight: '85vh', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header" style={{ flexShrink: 0 }}>
                  <h3 className="modal-title">Ficha de Información</h3>
                  <button className="modal-close" onClick={() => setSelectedRecord(null)}>×</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '8px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    {recordType === 'center' ? (
                      <div className="avatar-placeholder" style={{ backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)', margin: '0 auto', fontSize: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%' }}>
                        📦
                      </div>
                    ) : (
                      renderAvatar(selectedRecord, recordType === 'pet')
                    )}
                    <h2 style={{ marginTop: '8px', fontSize: '20px' }}>{selectedRecord.nombre}</h2>
                    {recordType === 'center' ? (
                      <span
                        className="record-badge"
                        style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          backgroundColor: selectedRecord.estatus === 'Activo' ? 'var(--color-success-light)' : 'var(--color-danger-light)',
                          color: selectedRecord.estatus === 'Activo' ? 'var(--color-success)' : 'var(--color-danger)'
                        }}
                      >
                        {selectedRecord.estatus || 'Activo'}
                      </span>
                    ) : (
                      <span className={`record-badge badge-${selectedRecord.estatus.toLowerCase()}`} style={{ display: 'inline-block', padding: '4px 12px' }}>
                        {selectedRecord.estatus}
                      </span>
                    )}
                  </div>

                  <div className="card" style={{ fontSize: '13px', textAlign: 'left' }}>
                    {recordType === 'person' ? (
                      <>
                        <p style={{ marginBottom: '6px' }}><strong>Edad:</strong> {selectedRecord.edad ? `${selectedRecord.edad} años` : 'Desconocida'}</p>
                        <p style={{ marginBottom: '6px' }}><strong>Género:</strong> {selectedRecord.genero}</p>
                        <p style={{ marginBottom: '6px' }}><strong>Último lugar visto:</strong> {selectedRecord.sector}, {selectedRecord.municipio}, {selectedRecord.estado}</p>
                        <p style={{ marginBottom: '6px' }}><strong>Señas particulares:</strong> {selectedRecord.señas}</p>

                        <div style={{ marginTop: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                          <p style={{ marginBottom: '4px' }}><strong>Familiar Contacto:</strong> {selectedRecord.reportanteNombre}</p>
                          <p><strong>Teléfono:</strong> <a href={`tel:${selectedRecord.reportanteTelefono}`} style={{ color: 'var(--color-info)' }}>{selectedRecord.reportanteTelefono}</a></p>
                        </div>
                      </>
                    ) : recordType === 'pet' ? (
                      <>
                        <p style={{ marginBottom: '6px' }}><strong>Especie:</strong> {selectedRecord.especie}</p>
                        <p style={{ marginBottom: '6px' }}><strong>Raza:</strong> {selectedRecord.raza || 'Mestizo'}</p>
                        <p style={{ marginBottom: '6px' }}><strong>Color:</strong> {selectedRecord.color}</p>
                        <p style={{ marginBottom: '6px' }}><strong>Collar:</strong> {selectedRecord.collar}</p>
                        <p style={{ marginBottom: '6px' }}><strong>Ubicación de pérdida:</strong> {selectedRecord.sector}, {selectedRecord.municipio}, {selectedRecord.estado}</p>
                        <p style={{ marginBottom: '6px' }}><strong>Señas particulares / Detalles:</strong> {selectedRecord.señas}</p>

                        <div style={{ marginTop: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                          <p style={{ marginBottom: '4px' }}><strong>Contacto Dueño:</strong> {selectedRecord.contactoNombre}</p>
                          <p><strong>Teléfono:</strong> <a href={`tel:${selectedRecord.contactoTelefono}`} style={{ color: 'var(--color-info)' }}>{selectedRecord.contactoTelefono}</a></p>
                        </div>
                      </>
                    ) : (
                      // recordType === 'center'
                      <>
                        <p style={{ marginBottom: '6px' }}><strong>Dirección:</strong> {selectedRecord.direccion}</p>
                        <p style={{ marginBottom: '6px' }}><strong>Municipio:</strong> {selectedRecord.municipio}</p>
                        <p style={{ marginBottom: '6px' }}><strong>Estado:</strong> {selectedRecord.estado}</p>
                        <p style={{ marginBottom: '6px' }}><strong>Horario:</strong> {selectedRecord.horario || 'No especificado'}</p>

                        <div style={{ marginTop: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                          <p style={{ marginBottom: '4px' }}><strong>Contacto / Responsable:</strong> {selectedRecord.contacto}</p>
                          {selectedRecord.contacto && selectedRecord.contacto.match(/\d+/) && (
                            <p style={{ marginBottom: '4px' }}>
                              <strong>Teléfono:</strong> <a href={`tel:${selectedRecord.contacto.replace(/[^0-9+]/g, "")}`} style={{ color: 'var(--color-info)' }}>{selectedRecord.contacto}</a>
                            </p>
                          )}
                        </div>

                        {selectedRecord.googleMapsUrl && (
                          <div style={{ marginTop: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '12px', display: 'flex' }}>
                            <a href={selectedRecord.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minHeight: '36px', height: '36px', width: '100%', fontSize: '12px', textDecoration: 'none' }}>
                              🗺️ Ver Ruta en Google Maps
                            </a>
                          </div>
                        )}

                        <div style={{ marginTop: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                          <h4 style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>📋 Insumos Requeridos</h4>
                          {selectedRecord.necesidades && selectedRecord.necesidades.length > 0 ? (
                            <div className="supplies-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                              {selectedRecord.necesidades.map((n, idx) => (
                                <div key={idx} className={`supply-item supply-${n.prioridad}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                                  <span>{n.item}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Sin necesidades registradas actualmente.</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Datos del Localizador si fue encontrado */}
                  {selectedRecord.estatus === 'Localizado' && selectedRecord.localizadorNombre && (
                    <div className="card" style={{ marginTop: '12px', background: 'var(--color-success-light)', borderColor: 'var(--color-success)', borderStyle: 'solid', padding: '12px', fontSize: '13px', textAlign: 'left' }}>
                      <h4 style={{ color: 'var(--color-success)', fontWeight: '800', marginBottom: '6px', fontSize: '14px' }}>🤝 Datos de Reencuentro</h4>
                      <p style={{ marginBottom: '4px' }}><strong>Encontrado por:</strong> {selectedRecord.localizadorNombre}</p>
                      <p style={{ marginBottom: '4px' }}><strong>Ubicación actual:</strong> {selectedRecord.localizadorUbicacion}</p>
                      {selectedRecord.localizadorNotas && <p style={{ marginBottom: '4px' }}><strong>Estado/Notas:</strong> {selectedRecord.localizadorNotas}</p>}
                      {selectedRecord.fechaLocalizacion && <p style={{ marginBottom: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>Reportado el {new Date(selectedRecord.fechaLocalizacion).toLocaleString()}</p>}

                      <div style={{ marginTop: '10px', borderTop: '1px solid rgba(30, 184, 120, 0.2)', paddingTop: '10px' }}>
                        <p style={{ fontWeight: '700', marginBottom: '6px', fontSize: '12px' }}>Contactar a quien lo localizó:</p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <a href={`tel:${selectedRecord.localizadorTelefono}`} className="btn btn-secondary" style={{ flex: 1, minHeight: '36px', height: '36px', padding: '4px', fontSize: '12px' }}>
                            📞 Llamar
                          </a>
                          <a href={`https://wa.me/${selectedRecord.localizadorTelefono.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ flex: 1, minHeight: '36px', height: '36px', padding: '4px', fontSize: '12px', backgroundColor: '#25D366' }}>
                            💬 WhatsApp
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Acción Pública de Localización (Cualquier usuario puede reportar hallazgo) */}
                  {selectedRecord.estatus === 'Desaparecido' && (
                    <div style={{ marginTop: '16px' }}>
                      <button
                        onClick={() => setShowFinderModal(true)}
                        className="btn btn-success"
                      >
                        🤝 ¡Lo encontré! / Reportar Localización
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer Fijo con Acciones de Contacto Principal */}
                {phoneDetails && (
                  <div style={{ flexShrink: 0, borderTop: '1px solid var(--color-border)', paddingTop: '12px', background: 'var(--bg-card)' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a
                        href={phoneDetails.callUrl}
                        className="btn btn-secondary"
                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minHeight: '40px', height: '40px', fontSize: '13px', textDecoration: 'none' }}
                      >
                        📞 Llamar ({phoneDetails.raw})
                      </a>
                      <a
                        href={phoneDetails.waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minHeight: '40px', height: '40px', fontSize: '13px', textDecoration: 'none', backgroundColor: '#25D366' }}
                      >
                        💬 WhatsApp
                      </a>
                    </div>
                  </div>
                )}

              </div>
            </div>
          );
        })()
      )}

      {/* --- MODAL DE REGISTRO UNIFICADO (PERSONAS Y MASCOTAS CON PESTAÑAS) --- */}
      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>

            {/* Cabecera del Modal con Pestañas de Formulario */}
            <div className="modal-header" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'stretch', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="modal-title" style={{ fontSize: '16px' }}>Nuevo Reporte de Búsqueda</h3>
                <button className="modal-close" onClick={() => setShowReportModal(false)}>×</button>
              </div>

              <div className="filter-tabs" style={{ margin: 0, justifyContent: 'center', gap: '8px' }}>
                <span
                  className={`filter-pill ${reportFormTab === 'person' ? 'active-red' : ''}`}
                  onClick={() => setReportFormTab('person')}
                  style={{ cursor: 'pointer' }}
                >
                  👤 Persona
                </span>
                <span
                  className={`filter-pill ${reportFormTab === 'pet' ? 'active-red' : ''}`}
                  onClick={() => setReportFormTab('pet')}
                  style={{ cursor: 'pointer' }}
                >
                  🐶 Mascota
                </span>
              </div>
            </div>

            {reportFormTab === 'person' ? (
              <form onSubmit={handlePersonSubmit}>
                <div className="form-group">
                  <label className="form-label">Nombre Completo *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej: Juan Vicente Pérez"
                    required
                    value={personForm.nombre}
                    onChange={(e) => setPersonForm({ ...personForm, nombre: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Edad Aproximada</label>
                    <input
                      type="number"
                      className="input-field"
                      placeholder="Ej: 34"
                      value={personForm.edad}
                      onChange={(e) => setPersonForm({ ...personForm, edad: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Género</label>
                    <select
                      className="select-field"
                      style={{ width: '100%' }}
                      value={personForm.genero}
                      onChange={(e) => setPersonForm({ ...personForm, genero: e.target.value })}
                    >
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Estado *</label>
                  <select
                    className="select-field"
                    style={{ width: '100%' }}
                    value={personForm.estado}
                    onChange={(e) => setPersonForm({ ...personForm, estado: e.target.value })}
                  >
                    <option value="">Selecciona un Estado...</option>
                    {VENEZUELAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Municipio *</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Ej: Girardot"
                      required
                      value={personForm.municipio}
                      onChange={(e) => setPersonForm({ ...personForm, municipio: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sector / Lugar Visto *</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Ej: Av. Las Delicias"
                      required
                      value={personForm.sector}
                      onChange={(e) => setPersonForm({ ...personForm, sector: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Fecha y Hora Último Avistamiento</label>
                  <input
                    type="datetime-local"
                    className="input-field"
                    value={personForm.ultimaVez}
                    onChange={(e) => setPersonForm({ ...personForm, ultimaVez: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Características / Ropa que vestía *</label>
                  <textarea
                    className="input-field"
                    style={{ height: '70px', resize: 'none' }}
                    placeholder="Ej: Suéter rojo, cicatriz en mano, estatura 1.70m..."
                    required
                    value={personForm.señas}
                    onChange={(e) => setPersonForm({ ...personForm, señas: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Foto de la persona (Comprimida en navegador)</label>
                  <div className="image-upload-preview" onClick={() => document.getElementById('person-photo-input').click()}>
                    {personPhotoPreview ? (
                      <img src={personPhotoPreview} alt="Preview" />
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>📷 Toca para subir foto</span>
                    )}
                  </div>
                  <input
                    type="file"
                    id="person-photo-input"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handlePhotoChange(e, 'person')}
                  />
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px', marginTop: '16px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Datos de Contacto del Reportante (Familiar)</h4>

                  <div className="form-group">
                    <label className="form-label">Nombre del Contacto *</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Ej: Clara Pérez (Esposa)"
                      required
                      value={personForm.reportanteNombre}
                      onChange={(e) => setPersonForm({ ...personForm, reportanteNombre: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Teléfono / WhatsApp *</label>
                    <input
                      type="tel"
                      className="input-field"
                      placeholder="Ej: +58 412-1234567"
                      required
                      value={personForm.reportanteTelefono}
                      onChange={(e) => setPersonForm({ ...personForm, reportanteTelefono: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '24px' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!isPersonFormValid}
                    style={{
                      width: '100%',
                      backgroundColor: isPersonFormValid ? '#e03131' : '#cbd5e1',
                      color: isPersonFormValid ? '#ffffff' : '#64748b',
                      cursor: isPersonFormValid ? 'pointer' : 'not-allowed',
                      opacity: isPersonFormValid ? 1 : 0.8
                    }}
                  >
                    Registrar Persona
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePetSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Nombre Mascota *</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Ej: Toby"
                      required
                      value={petForm.nombre}
                      onChange={(e) => setPetForm({ ...petForm, nombre: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Especie</label>
                    <select
                      className="select-field"
                      style={{ width: '100%' }}
                      value={petForm.especie}
                      onChange={(e) => setPetForm({ ...petForm, especie: e.target.value })}
                    >
                      <option value="Perro">Perro</option>
                      <option value="Gato">Gato</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Raza / Tipo</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Ej: Poodle, Mestizo"
                      value={petForm.raza}
                      onChange={(e) => setPetForm({ ...petForm, raza: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Color *</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Ej: Blanco con manchas negras"
                      required
                      value={petForm.color}
                      onChange={(e) => setPetForm({ ...petForm, color: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">¿Lleva collar?</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej: Sí, collar verde sin placa"
                    value={petForm.collar}
                    onChange={(e) => setPetForm({ ...petForm, collar: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Estado *</label>
                  <select
                    className="select-field"
                    style={{ width: '100%' }}
                    value={petForm.estado}
                    onChange={(e) => setPetForm({ ...petForm, estado: e.target.value })}
                  >
                    <option value="">Selecciona un Estado...</option>
                    {VENEZUELAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Municipio *</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Ej: Chacao"
                      required
                      value={petForm.municipio}
                      onChange={(e) => setPetForm({ ...petForm, municipio: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sector / Zona extravío *</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Ej: Altamira Sur"
                      required
                      value={petForm.sector}
                      onChange={(e) => setPetForm({ ...petForm, sector: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Detalles / Señas particulares</label>
                  <textarea
                    className="input-field"
                    style={{ height: '70px', resize: 'none' }}
                    placeholder="Ej: Rabo corto, muy temeroso, responde al nombre de Toby..."
                    value={petForm.señas}
                    onChange={(e) => setPetForm({ ...petForm, señas: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Foto de la mascota (Comprimida en navegador)</label>
                  <div className="image-upload-preview" onClick={() => document.getElementById('pet-photo-input').click()}>
                    {petPhotoPreview ? (
                      <img src={petPhotoPreview} alt="Preview" />
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>📷 Toca para subir foto</span>
                    )}
                  </div>
                  <input
                    type="file"
                    id="pet-photo-input"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handlePhotoChange(e, 'pet')}
                  />
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px', marginTop: '16px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Datos de Contacto del Dueño</h4>

                  <div className="form-group">
                    <label className="form-label">Nombre Dueño *</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Ej: Pedro Salazar"
                      required
                      value={petForm.contactoNombre}
                      onChange={(e) => setPetForm({ ...petForm, contactoNombre: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Teléfono / WhatsApp *</label>
                    <input
                      type="tel"
                      className="input-field"
                      placeholder="Ej: +58 424-7778899"
                      required
                      value={petForm.contactoTelefono}
                      onChange={(e) => setPetForm({ ...petForm, contactoTelefono: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '24px' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!isPetFormValid}
                    style={{
                      width: '100%',
                      backgroundColor: isPetFormValid ? '#e03131' : '#cbd5e1',
                      color: isPetFormValid ? '#ffffff' : '#64748b',
                      cursor: isPetFormValid ? 'pointer' : 'not-allowed',
                      opacity: isPetFormValid ? 1 : 0.8
                    }}
                  >
                    Registrar Mascota
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL REGISTRO LOCALIZADOR (QUIEN ENCUENTRA) --- */}
      {showFinderModal && selectedRecord && (
        <div className="modal-overlay" onClick={() => setShowFinderModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">¿Encontraste a {selectedRecord.nombre}?</h3>
              <button className="modal-close" onClick={() => setShowFinderModal(false)}>×</button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', textAlign: 'left' }}>
              Por favor ingresa tus datos de contacto. Esto permitirá que sus familiares se comuniquen contigo directamente para coordinar el reencuentro.
            </p>

            <form onSubmit={handleFinderSubmit}>
              <div className="form-group">
                <label className="form-label">Tu Nombre o Nombre de Institución *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ej: Brigada de Rescate Aragua / Vecino Juan Pérez"
                  required
                  value={finderForm.nombre}
                  onChange={(e) => setFinderForm({ ...finderForm, nombre: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Teléfono / WhatsApp de Contacto *</label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="Ej: +58 412-1234567"
                  required
                  value={finderForm.telefono}
                  onChange={(e) => setFinderForm({ ...finderForm, telefono: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">¿Dónde se encuentra actualmente? *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ej: Refugio Escuela Básica Ribas / Resguardado en mi casa"
                  required
                  value={finderForm.ubicacion}
                  onChange={(e) => setFinderForm({ ...finderForm, ubicacion: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notas sobre su estado físico o de salud</label>
                <textarea
                  className="input-field"
                  style={{ height: '70px', resize: 'none' }}
                  placeholder="Ej: Sano y salvo, con fatiga pero comiendo bien, bajo atención paramédica..."
                  value={finderForm.notas}
                  onChange={(e) => setFinderForm({ ...finderForm, notas: e.target.value })}
                />
              </div>

              <div style={{ marginTop: '24px' }}>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={!isFinderFormValid}
                  style={{
                    width: '100%',
                    backgroundColor: isFinderFormValid ? 'var(--color-success)' : '#cbd5e1',
                    color: isFinderFormValid ? '#ffffff' : '#64748b',
                    cursor: isFinderFormValid ? 'pointer' : 'not-allowed',
                    opacity: isFinderFormValid ? 1 : 0.8
                  }}
                >
                  Confirmar Localización
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DE REGISTRO DE CENTRO DE ACOPIO --- */}
      {showCenterModal && (
        <div className="modal-overlay" onClick={() => setShowCenterModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Registrar Centro de Acopio</h3>
              <button className="modal-close" onClick={() => setShowCenterModal(false)}>×</button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', textAlign: 'left' }}>
              Registra un punto de recolección de ayuda humanitaria e insumos para los afectados.
            </p>

            <form onSubmit={handleCenterSubmit}>
              <div className="form-group">
                <label className="form-label">Nombre del Centro *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ej: Cruz Roja Seccional Caracas / Colegio San Ignacio"
                  required
                  value={centerForm.nombre}
                  onChange={(e) => setCenterForm({ ...centerForm, nombre: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Estado *</label>
                  <select
                    className="select-field"
                    style={{ width: '100%' }}
                    value={centerForm.estado}
                    onChange={(e) => setCenterForm({ ...centerForm, estado: e.target.value })}
                  >
                    <option value="">Selecciona un Estado...</option>
                    {VENEZUELAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Municipio *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej: Chacao"
                    required
                    value={centerForm.municipio}
                    onChange={(e) => setCenterForm({ ...centerForm, municipio: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Dirección Exacta *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ej: Av. Francisco de Miranda, al lado de la estación de servicio..."
                  required
                  value={centerForm.direccion}
                  onChange={(e) => setCenterForm({ ...centerForm, direccion: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Teléfono / Contacto *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej: 0412-1234567"
                    required
                    value={centerForm.contacto}
                    onChange={(e) => setCenterForm({ ...centerForm, contacto: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Horario de Atención</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej: 8:00 AM - 5:00 PM"
                    value={centerForm.horario}
                    onChange={(e) => setCenterForm({ ...centerForm, horario: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Ubicación Geográfica (Opcional)</label>
                <div className="flex-row-responsive">
                  <input
                    type="url"
                    className="input-field"
                    placeholder="Enlace o coordenadas de ubicación..."
                    value={centerForm.googleMapsUrl}
                    onChange={(e) => setCenterForm({ ...centerForm, googleMapsUrl: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowMapModal(true)}
                    style={{ width: 'auto', minHeight: '48px', padding: '0 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', backgroundColor: 'var(--color-unicef-light)', color: 'var(--color-unicef)', border: '1px solid var(--color-unicef)' }}
                  >
                    📍 Seleccionar en Mapa
                  </button>
                </div>
              </div>

              {/* Dynamic Needs Sub-form */}
              <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '20px', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Insumos Requeridos</h4>

                <div className="flex-row-responsive" style={{ marginBottom: '12px' }}>
                  <input
                    type="text"
                    className="input-field"
                    style={{ flex: 2, minHeight: '38px', padding: '8px 12px', fontSize: '13px' }}
                    placeholder="Ej: Agua potable, Enlatados..."
                    value={newNeedItem}
                    onChange={(e) => setNewNeedItem(e.target.value)}
                  />
                  <select
                    className="select-field"
                    style={{ flex: 1, minHeight: '38px', padding: '8px 12px', fontSize: '13px' }}
                    value={newNeedPriority}
                    onChange={(e) => setNewNeedPriority(e.target.value)}
                  >
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: 'auto', minHeight: '38px', padding: '0 16px', fontSize: '13px' }}
                    onClick={() => {
                      if (newNeedItem.trim() !== '') {
                        setCenterNeeds([...centerNeeds, { item: newNeedItem.trim(), prioridad: newNeedPriority }]);
                        setNewNeedItem('');
                      }
                    }}
                  >
                    ➕ Agregar
                  </button>
                </div>

                <div className="supplies-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {centerNeeds.map((n, idx) => (
                    <div key={idx} className={`supply-item supply-${n.prioridad}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                      <span>{n.item}</span>
                      <button
                        type="button"
                        className="supply-delete-btn"
                        onClick={() => setCenterNeeds(centerNeeds.filter((_, i) => i !== idx))}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {centerNeeds.length === 0 && (
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Ninguno agregado aún.</span>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '24px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!isCenterFormValid}
                  style={{
                    width: '100%',
                    backgroundColor: isCenterFormValid ? 'var(--color-unicef)' : '#cbd5e1',
                    color: isCenterFormValid ? '#ffffff' : '#64748b',
                    cursor: isCenterFormValid ? 'pointer' : 'not-allowed',
                    opacity: isCenterFormValid ? 1 : 0.8
                  }}
                >
                  Registrar Centro de Acopio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Botón Flotante de Acción (FAB) - Estilo Cruz Roja (Siempre visible en todas las vistas en móvil) */}
      <button
        className="fab"
        onClick={() => {
          setReportFormTab('person');
          setShowReportModal(true);
        }}
        title="Reportar Caso (Desaparecido / Mascota)"
      >
        <span className="fab-icon">✚</span>
        <span>Reportar Caso</span>
      </button>

      {/* Modal de Mapa Interactivo */}
      {showMapModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowMapModal(false)}>
          <div className="modal-content" style={{ maxWidth: '500px', width: '90%', padding: '20px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '0 0 12px 0', borderBottom: '1px solid var(--color-border)' }}>
              <h3 className="modal-title" style={{ fontSize: '16px', fontWeight: '700' }}>Seleccionar en el Mapa</h3>
              <button className="modal-close" onClick={() => setShowMapModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '16px 0 0 0' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4' }}>
                📍 Haz clic o arrastra el marcador rojo para señalar la ubicación del centro de acopio.
              </p>

              {/* Contenedor del Mapa */}
              <div
                id="select-map"
                style={{
                  height: '320px',
                  width: '100%',
                  backgroundColor: '#e9ecef',
                  borderRadius: '8px',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)',
                  border: '1px solid var(--color-border)',
                  position: 'relative'
                }}
              ></div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => window.centerMapOnGPS && window.centerMapOnGPS()}
                style={{ flex: 1, minHeight: '40px', fontSize: '13px' }}
              >
                🛰️ Centrar en mi GPS
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.saveSelectedMapLocation && window.saveSelectedMapLocation()}
                style={{ flex: 1, minHeight: '40px', fontSize: '13px', backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }}
              >
                Confirmar Ubicación
              </button>
            </div>
          </div>
        </div>
      )}
    </>

  );
}

