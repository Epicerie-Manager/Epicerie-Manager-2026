'use client';

import React, { useState } from 'react';
import { ChevronRight, LogOut, Upload, Home, Users, Zap, ShoppingCart, Wrench, Activity, Menu, X } from 'lucide-react';

export default function ManagerDashboard() {
  const [currentPage, setCurrentPage] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const manager = {
    name: 'Rachid Ben Daoud',
    agency: 'Boucles de Seine Nord - Villeneuve-la-Garenne',
    technicianCount: 8,
    equipmentCount: 24,
    complianceRate: 85
  };

  return (
    <div style={styles.app}>
      {/* ============================================================================
          SIDEBAR
          ============================================================================ */}
      <aside style={{ ...styles.sidebar, ...(sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed) }}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.sidebarLogo}>🛠️ GRDF</h2>
          <button 
            onClick={() => setSidebarOpen(false)} 
            style={styles.sidebarCloseBtn}
          >
            <X size={20} />
          </button>
        </div>

        <nav style={styles.sidebarNav}>
          <NavItem 
            icon="🏠" 
            label="Accueil" 
            active={currentPage === 'home'}
            onClick={() => { setCurrentPage('home'); setSidebarOpen(false); }}
          />
          <NavItem 
            icon="🌍" 
            label="Terrain" 
            active={currentPage === 'terrain'}
            onClick={() => { setCurrentPage('terrain'); setSidebarOpen(false); }}
          />
          <NavItem 
            icon="🔧" 
            label="Maintenance" 
            active={currentPage === 'maintenance'}
            onClick={() => { setCurrentPage('maintenance'); setSidebarOpen(false); }}
          />
          <NavItem 
            icon="👥" 
            label="Clientèle" 
            active={currentPage === 'clientele'}
            onClick={() => { setCurrentPage('clientele'); setSidebarOpen(false); }}
          />
          <NavItem 
            icon="🛠️" 
            label="Matériel" 
            active={currentPage === 'materiel'}
            onClick={() => { setCurrentPage('materiel'); setSidebarOpen(false); }}
          />
          <NavItem 
            icon="📊" 
            label="Suivi" 
            active={currentPage === 'suivi'}
            onClick={() => { setCurrentPage('suivi'); setSidebarOpen(false); }}
          />
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userCard}>
            <div style={styles.userAvatar}>RC</div>
            <div style={styles.userInfo}>
              <p style={styles.userName}>{manager.name}</p>
              <p style={styles.userRole}>Manager</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ============================================================================
          MAIN CONTENT
          ============================================================================ */}
      <main style={styles.mainContent}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button 
              onClick={() => setSidebarOpen(true)}
              style={styles.menuButton}
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 style={styles.headerTitle}>
                {currentPage === 'home' && '🏠 Accueil'}
                {currentPage === 'terrain' && '🌍 Suivi Terrain'}
                {currentPage === 'maintenance' && '🔧 Maintenance'}
                {currentPage === 'clientele' && '👥 Clientèle'}
                {currentPage === 'materiel' && '🛠️ Matériel'}
                {currentPage === 'suivi' && '📊 Suivi'}
              </h1>
              <p style={styles.headerSubtitle}>{manager.agency}</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div style={styles.container}>
          {currentPage === 'home' && <HomePage manager={manager} onNavigate={setCurrentPage} />}
          {currentPage === 'terrain' && <TerrainPage />}
          {currentPage === 'maintenance' && <MaintenancePage />}
          {currentPage === 'clientele' && <ClientelePage />}
          {currentPage === 'materiel' && <MaterielPage />}
          {currentPage === 'suivi' && <SuiviPage />}
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// HOME PAGE
// ============================================================================

function HomePage({ manager, onNavigate }) {
  return (
    <div>
      {/* Stats globales */}
      <div style={styles.statsGrid}>
        <StatCard icon="🧑‍🔧" label="Techniciens" value={manager.technicianCount} color="#0066cc" />
        <StatCard icon="🛠️" label="Équipements" value={manager.equipmentCount} color="#ff9500" />
        <StatCard icon="✓" label="Conformité" value={`${manager.complianceRate}%`} color="#22c55e" />
        <StatCard icon="📈" label="Status" value="Actif" color="#003d7a" />
      </div>

      {/* Cartes accueil */}
      <div style={styles.homeGrid}>
        <HomeCard 
          icon="🌍" 
          title="Suivi Terrain" 
          description="Gestion des visites terrain réalisées"
          onClick={() => onNavigate('terrain')}
        />
        <HomeCard 
          icon="🔧" 
          title="Maintenance" 
          description="Suivi des interventions de maintenance"
          onClick={() => onNavigate('maintenance')}
        />
        <HomeCard 
          icon="👥" 
          title="Clientèle" 
          description="Indicateurs satisfaction et PI vaines"
          onClick={() => onNavigate('clientele')}
        />
        <HomeCard 
          icon="🛠️" 
          title="Matériel" 
          description="Gestion du gros outillage"
          onClick={() => onNavigate('materiel')}
        />
      </div>

      {/* Section import */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>📥 Importer vos données</h2>
        </div>
        <div style={styles.importGrid}>
          <ImportBox 
            title="Terrain"
            description="Fichier Excel visites terrain"
            color="#0066cc"
          />
          <ImportBox 
            title="Maintenance"
            description="Fichier confirmations ordres SAP"
            color="#ff9500"
          />
          <ImportBox 
            title="Clientèle"
            description="Fichier PI Vaines"
            color="#22c55e"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TERRAIN PAGE
// ============================================================================

function TerrainPage() {
  const [fileData, setFileData] = useState(null);

  return (
    <div>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>📥 Importer fichier Excel</h2>
          <p style={styles.cardMeta}>Visites terrain réalisées</p>
        </div>

        <div style={styles.fileUploadZone}>
          <Upload size={40} style={{ color: '#0066cc', marginBottom: 12 }} />
          <p style={styles.uploadText}>Cliquez ou glissez un fichier Excel</p>
          <p style={styles.uploadSubtext}>Format: .xlsx (colonnes: Date, Technicien, Type visite, Localisation, etc)</p>
          <button style={styles.uploadButton}>Sélectionner fichier</button>
        </div>
      </div>

      {/* Preview données */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>📊 Données importées</h2>
          <span style={styles.cardMeta}>15 visites</span>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Technicien</th>
                <th style={styles.th}>Type Visite</th>
                <th style={styles.th}>Localisation</th>
                <th style={styles.th}>Durée</th>
              </tr>
            </thead>
            <tbody>
              <tr style={styles.tr}>
                <td style={styles.td}>14/04/2026</td>
                <td style={styles.td}><strong>ABIR Bilal</strong></td>
                <td style={styles.td}>Vérification accès</td>
                <td style={styles.td}>Paris 12e</td>
                <td style={styles.td}>1h30</td>
              </tr>
              <tr style={styles.tr}>
                <td style={styles.td}>14/04/2026</td>
                <td style={styles.td}><strong>BRIET Dylan</strong></td>
                <td style={styles.td}>Inspection robinet</td>
                <td style={styles.td}>Paris 13e</td>
                <td style={styles.td}>45 min</td>
              </tr>
              <tr style={styles.tr}>
                <td style={styles.td}>13/04/2026</td>
                <td style={styles.td}><strong>BENALLOU Radouane</strong></td>
                <td style={styles.td}>Relevé consomm.</td>
                <td style={styles.td}>Villebon</td>
                <td style={styles.td}>2h</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Synthèse par technicien */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>📈 Synthèse par technicien</h2>
        </div>

        <div style={styles.summaryGrid}>
          <SummaryBox name="ABIR Bilal" visites={4} duree="8h45" />
          <SummaryBox name="BRIET Dylan" visites={3} duree="6h15" />
          <SummaryBox name="BENALLOU Radouane" visites={5} duree="12h30" />
          <SummaryBox name="AIT MANSOUR Myriam" visites={3} duree="7h" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAINTENANCE PAGE
// ============================================================================

function MaintenancePage() {
  return (
    <div>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>📥 Importer fichier Excel</h2>
          <p style={styles.cardMeta}>Confirmations ordres SAP</p>
        </div>

        <div style={styles.fileUploadZone}>
          <Upload size={40} style={{ color: '#ff9500', marginBottom: 12 }} />
          <p style={styles.uploadText}>Cliquez ou glissez un fichier Excel</p>
          <p style={styles.uploadSubtext}>Format: SAP CICM (Confirmations ordres travail)</p>
          <button style={styles.uploadButton}>Sélectionner fichier</button>
        </div>
      </div>

      {/* Tableau maintenance */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>🔧 Confirmations ordres</h2>
          <span style={styles.cardMeta}>128 ordres</span>
        </div>

        <div style={styles.filterBar}>
          <select style={styles.select}>
            <option>-- Tous statuts --</option>
            <option>Clôturé techniquement</option>
            <option>En cours</option>
            <option>Planifié</option>
          </select>
          <select style={styles.select}>
            <option>-- Tous techniciens --</option>
            <option>ABIR Bilal</option>
            <option>BRIET Dylan</option>
            <option>BENALLOU Radouane</option>
          </select>
          <input type="date" style={styles.select} defaultValue="2026-04-14" />
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Ordre</th>
                <th style={styles.th}>Technicien</th>
                <th style={styles.th}>Objet</th>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>Statut</th>
                <th style={styles.th}>Heure fin</th>
              </tr>
            </thead>
            <tbody>
              <tr style={styles.tr}>
                <td style={styles.td}>24/07/2025</td>
                <td style={styles.td}><strong>20000019321</strong></td>
                <td style={styles.td}>ALEXANDRE JOUANNE</td>
                <td style={styles.td}>Robinet 13.1</td>
                <td style={styles.td}>Problème fermeture/ouverture coffret</td>
                <td style={styles.td}><span style={{ ...styles.badge, background: '#dcfce7', color: '#22c55e' }}>Clôturé</span></td>
                <td style={styles.td}>12:28</td>
              </tr>
              <tr style={styles.tr}>
                <td style={styles.td}>24/07/2025</td>
                <td style={styles.td}><strong>20000019321</strong></td>
                <td style={styles.td}>ALEXANDRE JOUANNE</td>
                <td style={styles.td}>Robinet 13.1</td>
                <td style={styles.td}>Problème fermeture/ouverture coffret</td>
                <td style={styles.td}><span style={{ ...styles.badge, background: '#dcfce7', color: '#22c55e' }}>Clôturé</span></td>
                <td style={styles.td}>12:30</td>
              </tr>
              <tr style={styles.tr}>
                <td style={styles.td}>02/07/2025</td>
                <td style={styles.td}><strong>20000020455</strong></td>
                <td style={styles.td}>ALEXANDRE JOUANNE</td>
                <td style={styles.td}>Tuyauterie</td>
                <td style={styles.td}>Accès impossible à la CI</td>
                <td style={styles.td}><span style={{ ...styles.badge, background: '#dcfce7', color: '#22c55e' }}>Clôturé</span></td>
                <td style={styles.td}>13:03</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* KPIs Maintenance */}
      <div style={styles.statsGrid}>
        <KpiCard icon="✓" label="Ordres clôturés" value="98%" color="#22c55e" />
        <KpiCard icon="⏳" label="Temps moyen" value="2.5h" color="#0066cc" />
        <KpiCard icon="🔧" label="Préventifs" value="42%" color="#ff9500" />
        <KpiCard icon="❌" label="Correctifs" value="58%" color="#ef4444" />
      </div>
    </div>
  );
}

// ============================================================================
// CLIENTELE PAGE
// ============================================================================

function ClientelePage() {
  return (
    <div>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>📥 Importer fichier Excel</h2>
          <p style={styles.cardMeta}>PI Vaines 2025</p>
        </div>

        <div style={styles.fileUploadZone}>
          <Upload size={40} style={{ color: '#22c55e', marginBottom: 12 }} />
          <p style={styles.uploadText}>Cliquez ou glissez un fichier Excel</p>
          <p style={styles.uploadSubtext}>Format: PI Vaines (Taux intervention, satisfaction client)</p>
          <button style={styles.uploadButton}>Sélectionner fichier</button>
        </div>
      </div>

      {/* KPIs Clientèle */}
      <div style={styles.statsGrid}>
        <KpiCard icon="📊" label="PI Vaines" value="8.5%" color="#ef4444" />
        <KpiCard icon="❌" label="Taux IDR" value="3.2%" color="#f59e0b" />
        <KpiCard icon="👤" label="Client absent" value="12%" color="#0066cc" />
        <KpiCard icon="✓" label="Rendu RDV" value="94.5%" color="#22c55e" />
      </div>

      {/* Détail par technicien */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>👥 Indicateurs par technicien</h2>
          <span style={styles.cardMeta}>8 techniciens</span>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Technicien</th>
                <th style={styles.th}>Interventions</th>
                <th style={styles.th}>PI Vaines %</th>
                <th style={styles.th}>IDR %</th>
                <th style={styles.th}>Client Absent %</th>
                <th style={styles.th}>Rendu RDV %</th>
              </tr>
            </thead>
            <tbody>
              <tr style={styles.tr}>
                <td style={styles.td}><strong>THELINEAU (TG BOA)</strong></td>
                <td style={styles.td}>10</td>
                <td style={styles.td}><span style={{ color: '#ef4444' }}>8.5%</span></td>
                <td style={styles.td}><span style={{ color: '#f59e0b' }}>0%</span></td>
                <td style={styles.td}><span style={{ color: '#0066cc' }}>0%</span></td>
                <td style={styles.td}><span style={{ color: '#22c55e' }}>100%</span></td>
              </tr>
              <tr style={styles.tr}>
                <td style={styles.td}><strong>AMRANE</strong></td>
                <td style={styles.td}>6</td>
                <td style={styles.td}><span style={{ color: '#22c55e' }}>0%</span></td>
                <td style={styles.td}><span style={{ color: '#22c55e' }}>0%</span></td>
                <td style={styles.td}><span style={{ color: '#22c55e' }}>0%</span></td>
                <td style={styles.td}><span style={{ color: '#22c55e' }}>100%</span></td>
              </tr>
              <tr style={styles.tr}>
                <td style={styles.td}><strong>BENZAID</strong></td>
                <td style={styles.td}>8</td>
                <td style={styles.td}><span style={{ color: '#f59e0b' }}>5.2%</span></td>
                <td style={styles.td}><span style={{ color: '#f59e0b' }}>2.1%</span></td>
                <td style={styles.td}><span style={{ color: '#f59e0b' }}>8.3%</span></td>
                <td style={styles.td}><span style={{ color: '#22c55e' }}>96.7%</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MATERIEL PAGE
// ============================================================================

function MaterielPage() {
  return (
    <div>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>🛠️ Gros Outillage</h2>
          <span style={styles.cardMeta}>75 équipements</span>
        </div>

        <div style={styles.filterBar}>
          <input 
            type="text" 
            placeholder="Rechercher équipement..." 
            style={styles.searchInput}
          />
          <select style={styles.select}>
            <option>-- Tous statuts --</option>
            <option>✓ OK</option>
            <option>✗ NOK</option>
            <option>À vérifier</option>
          </select>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Marque</th>
                <th style={styles.th}>Modèle</th>
                <th style={styles.th}>N° Instrument</th>
                <th style={styles.th}>Technicien</th>
                <th style={styles.th}>Statut</th>
                <th style={styles.th}>Dernier Contrôle</th>
              </tr>
            </thead>
            <tbody>
              <tr style={styles.tr}>
                <td style={styles.td}>#001</td>
                <td style={styles.td}><strong>HONEYWELL</strong></td>
                <td style={styles.td}>BW CLIP 2 ANS</td>
                <td style={styles.td}>018629</td>
                <td style={styles.td}>ABIR Bilal</td>
                <td style={styles.td}><span style={{ ...styles.badge, background: '#dcfce7', color: '#22c55e' }}>✓ OK</span></td>
                <td style={styles.td}>21/11/2023</td>
              </tr>
              <tr style={styles.tr}>
                <td style={styles.td}>#002</td>
                <td style={styles.td}><strong>TD WILLIAMSON</strong></td>
                <td style={styles.td}>/</td>
                <td style={styles.td}>06D0364 Mab</td>
                <td style={styles.td}>BRIET Dylan</td>
                <td style={styles.td}><span style={{ ...styles.badge, background: '#dcfce7', color: '#22c55e' }}>✓ OK</span></td>
                <td style={styles.td}>21/11/2023</td>
              </tr>
              <tr style={styles.tr}>
                <td style={styles.td}>#003</td>
                <td style={styles.td}><strong>BOSCH</strong></td>
                <td style={styles.td}>/</td>
                <td style={styles.td}>120611</td>
                <td style={styles.td}>BENALLOU Radouane</td>
                <td style={styles.td}><span style={{ ...styles.badge, background: '#fee2e2', color: '#ef4444' }}>✗ NOK</span></td>
                <td style={styles.td}>18/12/2018</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <KpiCard icon="✓" label="Conformes" value="68" color="#22c55e" />
        <KpiCard icon="✗" label="Non conformes" value="5" color="#ef4444" />
        <KpiCard icon="❓" label="À vérifier" value="2" color="#f59e0b" />
        <KpiCard icon="🛠️" label="Total" value="75" color="#0066cc" />
      </div>
    </div>
  );
}

// ============================================================================
// SUIVI PAGE (À CONSTRUIRE)
// ============================================================================

function SuiviPage() {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>📊 Suivi Consolidé</h2>
        <p style={styles.cardMeta}>À construire - Synthèse de tous les onglets</p>
      </div>
      <div style={styles.emptyState}>
        <p style={styles.emptyText}>Cet onglet agrégera les données de tous les autres onglets.</p>
        <p style={styles.emptyText}>À construire une fois les autres onglets finalisés.</p>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTS RÉUTILISABLES
// ============================================================================

function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.navItem,
        ...(active && styles.navItemActive)
      }}
    >
      <span style={{ fontSize: 20, marginRight: 10 }}>{icon}</span>
      {label}
    </button>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{ ...styles.statCard, borderLeftColor: color }}>
      <span style={{ fontSize: 28 }}>{icon}</span>
      <p style={styles.statLabel}>{label}</p>
      <p style={{ ...styles.statValue, color }}>{value}</p>
    </div>
  );
}

function HomeCard({ icon, title, description, onClick }) {
  return (
    <button
      onClick={onClick}
      style={styles.homeCard}
    >
      <span style={{ fontSize: 32, marginBottom: 12 }}>{icon}</span>
      <h3 style={styles.homeCardTitle}>{title}</h3>
      <p style={styles.homeCardDesc}>{description}</p>
      <div style={styles.homeCardArrow}>
        <ChevronRight size={20} />
      </div>
    </button>
  );
}

function ImportBox({ title, description, color }) {
  return (
    <div style={{ ...styles.importBox, borderLeftColor: color }}>
      <p style={styles.importBoxTitle}>{title}</p>
      <p style={styles.importBoxDesc}>{description}</p>
      <button style={{ ...styles.importBoxButton, color }}>
        Importer →
      </button>
    </div>
  );
}

function SummaryBox({ name, visites, duree }) {
  return (
    <div style={styles.summaryBox}>
      <p style={styles.summaryName}>{name}</p>
      <div style={styles.summaryStats}>
        <div>
          <p style={styles.summaryLabel}>Visites</p>
          <p style={styles.summaryValue}>{visites}</p>
        </div>
        <div>
          <p style={styles.summaryLabel}>Durée</p>
          <p style={styles.summaryValue}>{duree}</p>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, color }) {
  return (
    <div style={styles.kpiCard}>
      <span style={{ fontSize: 24, marginRight: 10 }}>{icon}</span>
      <div>
        <p style={styles.kpiLabel}>{label}</p>
        <p style={{ ...styles.kpiValue, color }}>{value}</p>
      </div>
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  app: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f9fafb'
  },

  // Sidebar
  sidebar: {
    background: 'linear-gradient(135deg, #003d7a 0%, #0066cc 100%)',
    color: 'white',
    width: 280,
    padding: '20px 0',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    position: 'fixed',
    height: '100vh',
    left: 0,
    top: 0,
    overflowY: 'auto',
    transition: 'transform 0.3s',
    zIndex: 100
  },
  sidebarOpen: {
    transform: 'translateX(0)'
  },
  sidebarClosed: {
    transform: 'translateX(-100%)'
  },
  sidebarHeader: {
    padding: '0 20px',
    marginBottom: 30,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sidebarLogo: {
    fontSize: 20,
    fontWeight: 700,
    margin: 0
  },
  sidebarCloseBtn: {
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    padding: 8,
    borderRadius: 4,
    display: 'none'
  },
  sidebarNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '0 12px',
    marginBottom: 30
  },
  navItem: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    color: 'white',
    padding: '12px 16px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s'
  },
  navItemActive: {
    background: 'rgba(255, 149, 0, 0.9)',
    boxShadow: '0 4px 12px rgba(255, 149, 0, 0.3)'
  },
  sidebarFooter: {
    padding: '0 20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.2)',
    paddingTop: 20
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6
  },
  userAvatar: {
    width: 40,
    height: 40,
    background: '#ff9500',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: 12,
    fontWeight: 600,
    margin: 0
  },
  userRole: {
    fontSize: 11,
    opacity: 0.8,
    margin: '4px 0 0 0'
  },

  // Main content
  mainContent: {
    flex: 1,
    marginLeft: 280,
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    background: 'linear-gradient(135deg, #003d7a 0%, #0066cc 100%)',
    color: 'white',
    padding: '20px 30px',
    borderBottom: '4px solid #ff9500',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 20
  },
  menuButton: {
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    padding: 8,
    borderRadius: 4,
    display: 'none'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 700,
    margin: 0
  },
  headerSubtitle: {
    fontSize: 13,
    opacity: 0.9,
    marginTop: 4
  },
  container: {
    flex: 1,
    padding: 30,
    overflowY: 'auto'
  },

  // Cards
  card: {
    background: 'white',
    borderRadius: 8,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    marginBottom: 24,
    overflow: 'hidden'
  },
  cardHeader: {
    padding: 20,
    borderBottom: '1px solid #f3f4f6',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#003d7a',
    margin: 0
  },
  cardMeta: {
    fontSize: 12,
    color: '#6b7280',
    background: '#f3f4f6',
    padding: '4px 10px',
    borderRadius: 4
  },

  // Stats
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 16,
    marginBottom: 24
  },
  statCard: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 16,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8
  },
  statLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    margin: 0
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    margin: 0
  },

  // Home
  homeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 20,
    marginBottom: 30
  },
  homeCard: {
    background: 'white',
    border: '2px solid #e5e7eb',
    borderRadius: 8,
    padding: 24,
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  homeCardTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#003d7a',
    margin: '12px 0 8px 0'
  },
  homeCardDesc: {
    fontSize: 13,
    color: '#6b7280',
    margin: 0,
    marginBottom: 16
  },
  homeCardArrow: {
    marginTop: 'auto',
    color: '#0066cc'
  },

  // Import
  importGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 20,
    padding: 20
  },
  importBox: {
    border: '2px solid #e5e7eb',
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 16,
    background: '#f9fafb'
  },
  importBoxTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#003d7a',
    margin: '0 0 4px 0'
  },
  importBoxDesc: {
    fontSize: 12,
    color: '#6b7280',
    margin: '0 0 12px 0'
  },
  importBoxButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 12,
    padding: 0
  },

  // File upload
  fileUploadZone: {
    padding: 40,
    border: '2px dashed #d1d5db',
    borderRadius: 8,
    textAlign: 'center',
    background: '#fafbff',
    margin: 20
  },
  uploadText: {
    fontSize: 14,
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 4px 0'
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    margin: '0 0 16px 0'
  },
  uploadButton: {
    background: '#0066cc',
    color: 'white',
    border: 'none',
    padding: '10px 24px',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13
  },

  // Filters
  filterBar: {
    padding: 16,
    background: '#f9fafb',
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    borderBottom: '1px solid #e5e7eb'
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 13,
    fontFamily: 'inherit',
    minWidth: 150
  },
  searchInput: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 13,
    fontFamily: 'inherit',
    flex: 1,
    minWidth: 200
  },

  // Table
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13
  },
  th: {
    padding: 12,
    textAlign: 'left',
    background: '#f9fafb',
    borderBottom: '2px solid #e5e7eb',
    fontWeight: 600,
    color: '#374151'
  },
  tr: {
    borderBottom: '1px solid #e5e7eb'
  },
  td: {
    padding: 12
  },
  badge: {
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase'
  },

  // Summary
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
    padding: 20
  },
  summaryBox: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 16
  },
  summaryName: {
    fontSize: 14,
    fontWeight: 700,
    color: '#003d7a',
    margin: '0 0 12px 0'
  },
  summaryStats: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6b7280',
    textTransform: 'uppercase',
    margin: 0
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 700,
    color: '#0066cc',
    margin: '4px 0 0 0'
  },

  // KPI
  kpiCard: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 16,
    display: 'flex',
    alignItems: 'center'
  },
  kpiLabel: {
    fontSize: 12,
    color: '#6b7280',
    margin: 0
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: 700,
    margin: '4px 0 0 0'
  },

  // Empty state
  emptyState: {
    padding: 40,
    textAlign: 'center',
    color: '#9ca3af'
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    margin: '0 0 8px 0'
  },

  // Responsive
  '@media (max-width: 768px)': {
    sidebar: {
      width: '100%'
    },
    mainContent: {
      marginLeft: 0
    },
    menuButton: {
      display: 'block'
    },
    sidebarCloseBtn: {
      display: 'block'
    }
  }
};
