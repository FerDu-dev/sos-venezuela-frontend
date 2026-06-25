import React, { useState, useEffect } from 'react';
import {
  getPersons,
  addPerson,
  updatePersonStatus,
  getPets,
  addPet,
  updatePetStatus,
  getCenters,
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

  // Cargar datos
  const loadData = async () => {
    const fetchedPersons = await getPersons();
    const fetchedPets = await getPets();
    const fetchedCenters = await getCenters();
    const fetchedMetrics = await getMetrics();

    setPersons(fetchedPersons);
    setPets(fetchedPets);
    setCenters(fetchedCenters);
    setMetrics(fetchedMetrics);
  };

  useEffect(() => {
    loadData();
  }, []);

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
      estado: 'Caracas', municipio: '', sector: '',
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
      collar: 'No', estado: 'Caracas', municipio: '', sector: '',
      señas: '', contactoNombre: '', contactoTelefono: ''
    });
    setPetPhoto(null);
    setPetPhotoPreview(null);

    await loadData();
    alert("Mascota registrada con éxito.");
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
        <div className="app-logo">
          <span className="logo-icon">🚨</span>
          <span className="logo-text">Ayuda Venezuela</span>
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

        <button
          onClick={() => {
            if (activeTab === 'mascotas') {
              setReportFormTab('pet');
            } else {
              setReportFormTab('person');
            }
            setShowReportModal(true);
          }}
          className="btn-report-header"
        >
          <span className="fab-icon" style={{ marginRight: '4px' }}>✚</span>
          <span>Reportar Caso</span>
        </button>
      </header>

      {/* CONTENIDO DINÁMICO */}
      <main className="app-content">

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
                <div className="dashboard-metrics">
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
              <div className="card" style={{ background: 'var(--color-danger-light)', borderColor: 'var(--color-danger)', textAlign: 'center', padding: '20px' }}>
                <h4 style={{ color: 'var(--color-danger)', marginBottom: '8px', fontSize: '15px' }}>¿Tienes un familiar o amigo no localizado?</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Registra sus datos en nuestro censo cívico. Voluntarios y brigadas usan esta base de datos.</p>
                <button onClick={() => setShowPersonModal(true)} className="btn btn-primary">
                  ➕ Registrar Persona Desaparecida
                </button>
              </div>

              <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
                <h4 style={{ marginBottom: '8px', fontSize: '14px' }}>¿Perdiste una mascota durante el sismo?</h4>
                <button onClick={() => setShowPetModal(true)} className="btn btn-secondary" style={{ color: 'var(--color-warning)', borderColor: 'var(--color-warning)' }}>
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
              </div>

              <div className="records-list">
                {filteredCenters.length > 0 ? (
                  filteredCenters.map(c => (
                    <div key={c.id} className="card">
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
                        <a href={c.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ flex: 1, minHeight: '40px', padding: '6px' }}>
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

      </main>

      {/* --- TAB BAR INFERIOR --- */}
      <nav className="app-tabbar">
        <button className={`tab-item ${activeTab === 'inicio' ? 'active' : ''}`} onClick={() => { setActiveTab('inicio'); setSearchQuery(''); }}>
          <span className="tab-icon">🏠</span>
          <span>Inicio</span>
        </button>
        <button className={`tab-item ${activeTab === 'personas' ? 'active' : ''}`} onClick={() => { setActiveTab('personas'); setSearchQuery(''); }}>
          <span className="tab-icon">👥</span>
          <span>Personas</span>
        </button>
        <button className={`tab-item ${activeTab === 'acopio' ? 'active' : ''}`} onClick={() => { setActiveTab('acopio'); setSearchQuery(''); }}>
          <span className="tab-icon">📦</span>
          <span>Acopio</span>
        </button>
        <button className={`tab-item ${activeTab === 'mascotas' ? 'active' : ''}`} onClick={() => { setActiveTab('mascotas'); setSearchQuery(''); }}>
          <span className="tab-icon">🐾</span>
          <span>Mascotas</span>
        </button>
        <button className={`tab-item ${activeTab === 'emergencias' ? 'active' : ''}`} onClick={() => { setActiveTab('emergencias'); setSearchQuery(''); }}>
          <span className="tab-icon">📞</span>
          <span>Emergencias</span>
        </button>
      </nav>

      {/* --- MODAL DETALLE DE REGISTRO --- */}
      {selectedRecord && (
        <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Ficha de Información</h3>
              <button className="modal-close" onClick={() => setSelectedRecord(null)}>×</button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              {renderAvatar(selectedRecord, recordType === 'pet')}
              <h2 style={{ marginTop: '8px', fontSize: '20px' }}>{selectedRecord.nombre}</h2>
              <span className={`record-badge badge-${selectedRecord.estatus.toLowerCase()}`} style={{ display: 'inline-block', padding: '4px 12px' }}>
                {selectedRecord.estatus}
              </span>
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
              ) : (
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

            <button className="btn btn-secondary" style={{ marginTop: '12px' }} onClick={() => setSelectedRecord(null)}>
              Cerrar Ficha
            </button>

          </div>
        </div>
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

      {/* Botón Flotante de Acción (FAB) Estilo Cruz Roja (Siempre visible en todas las vistas) */}
      <button
        className="fab"
        onClick={() => {
          // Auto-detectar pestaña activa para pre-seleccionar el formulario adecuado
          if (activeTab === 'mascotas') {
            setReportFormTab('pet');
          } else {
            setReportFormTab('person');
          }
          setShowReportModal(true);
        }}
        title="Reportar Desaparición"
      >
        <span className="fab-icon">✚</span>
        <span>Reportar</span>
      </button>
    </>

  );
}

