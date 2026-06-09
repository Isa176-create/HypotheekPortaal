import React, { useState, useRef } from 'react'
import { 
  FileText, 
  Upload, 
  User, 
  Users, 
  Clock, 
  LogOut,
  LayoutDashboard,
  ShieldCheck,
  Search,
  Bell,
  ArrowLeft,
  Check,
  X,
  Eye,
  AlertCircle,
  Plus,
  Link,
  Calendar,
  ChevronRight
} from 'lucide-react'
import './App.css'

// --- Constants ---
const PIPELINE_STAGES = [
  'Intake & Documentatie',
  'Beoordeling Adviseur',
  'Aanvraag Geldverstrekker',
  'Finaal Akkoord',
  'Naar de Notaris'
];

const PHASES_BASE = [
  { id: 1, title: 'Fase 1 — Inventarisatie gesprek' },
  { id: 2, title: 'Fase 2 — Financieren van de woning' },
  { id: 3, title: 'Fase 3 — Aanvraag bij geldverstrekker' }
];

const INITIAL_DOCS = [
  { id: '1-1', phase: 1, isRequired: true, name: 'Geldig paspoort of ID-kaart (beide kanten)', status: 'missing', type: 'Identiteit' },
  { id: '1-5', phase: 1, isRequired: true, name: 'Bankafschriften laatste 3 maanden', status: 'missing', type: 'Vermogen' },
  { id: '1-6', phase: 1, isRequired: true, name: 'Overzicht lopende leningen of schulden', status: 'missing', type: 'Schulden' },
  
  { id: '2-1', phase: 2, isRequired: true, name: 'Koopovereenkomst (getekend)', status: 'missing', type: 'Woning' },
  { id: '2-2', phase: 2, isRequired: true, name: 'Taxatierapport (NWWI-gevalideerd)', status: 'missing', type: 'Woning' },
  { id: '2-3', phase: 2, isRequired: true, name: 'Energielabel van de woning', status: 'missing', type: 'Woning' },
  
  { id: '3-1', phase: 3, isRequired: true, name: 'Documenten Fase 1 & 2 actueel (<3 mnd)', status: 'missing', type: 'Controle' },
  { id: '3-2', phase: 3, isRequired: true, name: 'NHG-aanvraagformulier (indien van toepassing)', status: 'missing', type: 'Aanvraag' },
  { id: '3-3', phase: 3, isRequired: true, name: 'Getekende hypotheekofferte', status: 'missing', type: 'Aanvraag' },
];

const WORK_SITUATIONS = {
  loondienst: {
    title: 'Inkomen: Loondienst',
    docs: [
      { name: 'Arbeidscontract', type: 'Inkomen' },
      { name: 'Laatste 3 loonstroken', type: 'Inkomen' },
      { name: 'Werkgeversverklaring', type: 'Inkomen' },
      { name: 'Jaaropgave laatste jaar', type: 'Inkomen' }
    ]
  },
  zzp: {
    title: "Inkomen: Ondernemer",
    docs: [
      { name: 'Jaarrekeningen laatste 3 jaar (winst- en verliesrekening)', type: 'Onderneming' },
      { name: 'Aangiften inkomstenbelasting laatste 3 jaar', type: 'Onderneming' },
      { name: 'Belastingaanslagen laatste 3 jaar', type: 'Onderneming' },
      { name: 'KvK-uittreksel (niet ouder dan 6 maanden)', type: 'Onderneming' },
      { name: 'Inkomensverklaring Ondernemer (IVO) van erkend bureau', type: 'Onderneming' },
      { name: 'Financiële prognose huidig jaar', type: 'Onderneming' },
      { name: 'Zakelijke bankafschriften laatste 3 maanden', type: 'Onderneming' }
    ]
  }
};

const HOUSING_SITUATIONS = {
  starter: {
    title: 'Doel: Starter (eerste koopwoning)',
    docs: [
      { name: 'Bewijs van eigen inbreng', type: 'Vermogen' },
      { name: 'Schenkingsverklaring ouders (indien van toepassing)', type: 'Vermogen' },
      { name: 'Overzicht studieschuld bij DUO (indien van toepassing)', type: 'Schulden' },
      { name: 'Verklaring geen eerder gebruik startersvrijstelling', type: 'Verklaring' }
    ]
  },
  oversluiten: {
    title: 'Doel: Oversluiten',
    docs: [
      { name: 'Meest recente hypotheekoverzicht van huidige geldverstrekker', type: 'Hypotheek' },
      { name: 'Overzicht openstaande hypotheekschuld', type: 'Hypotheek' },
      { name: 'Recente WOZ-beschikking', type: 'Woning' },
      { name: 'Taxatierapport van de woning (niet ouder dan 6 maanden)', type: 'Woning' },
      { name: 'Opgave eventuele boeterente van huidige geldverstrekker', type: 'Hypotheek' },
      { name: 'Bewijs van overwaarde (indien in te zetten bij nieuwe hypotheek)', type: 'Vermogen' }
    ]
  },
  tweedewoning: {
    title: 'Doel: Tweede woning kopen',
    docs: [
      { name: 'Hypotheekoverzicht van huidige (eerste) woning', type: 'Hypotheek' },
      { name: 'Recente WOZ-beschikking huidige woning', type: 'Woning' },
      { name: 'Bewijs van overwaarde huidige woning (indien als eigen inbreng)', type: 'Vermogen' },
      { name: 'Huurcontract of verhuurinkomsten (indien woning verhuurd gaat worden)', type: 'Inkomen' },
      { name: 'Bankafschriften waaruit overwaarde of spaargeld blijkt', type: 'Vermogen' }
    ]
  }
};

const getClientPhases = (user) => {
  const dynamicPhases = [];
  if (user && user.workSituationTitle) {
    dynamicPhases.push({ id: 'work', title: user.workSituationTitle });
  }
  if (user && user.housingSituationTitle) {
    dynamicPhases.push({ id: 'housing', title: user.housingSituationTitle });
  }
  return [...dynamicPhases, ...PHASES_BASE];
};

// --- Persistence Helpers ---
const STORAGE_KEY = 'hp_portal_data_v6'; // force schema update

const getPortalData = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  const parsed = data ? JSON.parse(data) : { users: [], docs: {}, connections: [] };
  if (!parsed.connections) parsed.connections = [];
  
  // Backwards compatibility for new stage fields
  parsed.users = parsed.users.map(u => ({
    ...u,
    pipelineStage: u.pipelineStage || 0
  }));

  return parsed;
};

const savePortalData = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// --- Components ---
const PipelineWidget = ({ currentStage, onUpdateStage, isAdvisor }) => {
  return (
    <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1.125rem', margin: 0 }}>Hypotheek Spoorboekje</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>De globale voortgang van het hypotheekproces.</p>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {PIPELINE_STAGES.map((stage, idx) => {
          const isCompleted = idx < currentStage;
          const isActive = idx === currentStage;
          
          return (
            <React.Fragment key={stage}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: (isCompleted || isActive) ? 1 : 0.4, cursor: isAdvisor ? 'pointer' : 'default' }} onClick={() => isAdvisor && onUpdateStage && onUpdateStage(idx)}>
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', 
                  background: isCompleted ? 'var(--success)' : (isActive ? 'var(--accent)' : '#e2e8f0'), 
                  color: (isCompleted || isActive) ? 'white' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem',
                  fontWeight: 'bold', fontSize: '0.875rem', border: isActive ? '3px solid #bfdbfe' : 'none'
                }}>
                  {isCompleted ? <Check size={16} /> : (idx + 1)}
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: isActive ? 'bold' : 'normal', textAlign: 'center', maxWidth: '80px', color: 'var(--text-main)' }}>{stage}</span>
              </div>
              {idx < PIPELINE_STAGES.length - 1 && (
                <div style={{ flex: 1, height: '4px', background: isCompleted ? 'var(--success)' : '#e2e8f0', minWidth: '30px', margin: '0 10px', marginTop: '-20px' }}></div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

const Badge = ({ status }) => {
  const styles = {
    accepted: 'badge-success',
    pending: 'badge-pending',
    missing: 'badge-missing',
    rejected: 'badge-error'
  }
  const labels = {
    accepted: 'Goedgekeurd',
    pending: 'In behandeling',
    missing: 'Ontbreekt',
    rejected: 'Afgekeurd'
  }
  return <span className={`badge ${styles[status]}`}>{labels[status]}</span>
}

const Navbar = ({ user, onLogout }) => (
  <nav className="glass-card" style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ background: 'var(--accent)', padding: '0.5rem', borderRadius: '8px', color: 'white' }}>
        <ShieldCheck size={24} />
      </div>
      <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>HypotheekPortaal</h2>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
        <Bell size={20} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '1.5rem', borderLeft: '1px solid #e2e8f0' }}>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: '600' }}>{user.name}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.role === 'client' ? 'Klant' : 'Hypotheekadviseur'}</p>
        </div>
        <button onClick={onLogout} style={{ background: '#fee2e2', color: '#991b1b', padding: '0.5rem', borderRadius: '8px' }}>
          <LogOut size={18} />
        </button>
      </div>
    </div>
  </nav>
)

const DocumentPreviewModal = ({ doc, onClose }) => {
  if (!doc) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.9)', display: 'flex', flexDirection: 'column', zIndex: 999 }} className="animate-fade-in">
      <div style={{ padding: '1.5rem', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <h2 style={{ fontSize: '1.25rem' }}>[{doc.type}] {doc.name} - <span style={{color: 'var(--text-muted)', fontSize: '1rem'}}>{doc.fileName}</span></h2>
         <button onClick={onClose} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
           <X size={18} /> Sluiten
         </button>
      </div>
      <div style={{ flex: 1, padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'auto' }}>
         {doc.fileData?.startsWith('data:image') ? (
           <img src={doc.fileData} alt={doc.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: 'var(--shadow-lg)' }} />
         ) : (
           <iframe src={doc.fileData} title={doc.name} style={{ width: '100%', maxWidth: '900px', height: '100%', background: 'white', border: 'none', borderRadius: '8px', boxShadow: 'var(--shadow-lg)' }} />
         )}
      </div>
    </div>
  )
}

const PhaseProgress = ({ documents }) => {
  const total = documents.length;
  if (total === 0) return null;
  const completed = documents.filter(d => d.status === 'accepted').length;
  const percent = Math.round((completed / total) * 100);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
      <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: percent === 100 ? 'var(--success)' : 'var(--accent)', transition: 'width 0.5s ease' }}></div>
      </div>
      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-muted)' }}>{percent}%</span>
    </div>
  );
}

const DocCardClient = ({ doc, isUploading, activeUploadId, triggerUpload, setPreviewDoc }) => {
  return (
    <div className="doc-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', opacity: (isUploading && activeUploadId === doc.id) ? 0.5 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ color: 'var(--accent)' }}><FileText size={24} /></div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <p style={{ fontWeight: '600' }}>{doc.name}</p>
               {doc.deadline && doc.status !== 'accepted' && (
                 <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#c2410c', background: '#ffedd5', padding: '2px 6px', borderRadius: '4px' }}>
                   <Calendar size={12} /> Deadline: {doc.deadline}
                 </span>
               )}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{doc.type} {doc.fileName && `• ${doc.fileName}`}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Badge status={doc.status} />
          {doc.fileData && (
            <button onClick={() => setPreviewDoc(doc)} className="btn-outline" style={{ padding: '0.4rem', border: 'none' }} title="Bekijk document">
              <Eye size={18} />
            </button>
          )}
          <button 
            className="btn-outline" 
            onClick={() => triggerUpload(doc.id)}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}
            disabled={doc.status === 'accepted' || isUploading}
          >
            <Upload size={14} style={{ marginRight: '6px' }} /> {(isUploading && activeUploadId === doc.id) ? 'Laden...' : (doc.status === 'missing' ? 'Upload' : 'Vervang')}
          </button>
        </div>
      </div>
      {doc.note && doc.status === 'rejected' && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', fontSize: '0.875rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
          <p><strong>Feedback Adviseur:</strong> {doc.note}</p>
        </div>
      )}
    </div>
  )
}

const ConnectionsWidget = ({ user, appData, onSendInvite, onResponseInvite }) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);

  const myConnections = appData.connections.filter(c => 
    (user.role === 'client' && c.clientEmail === user.email) || 
    (user.role === 'advisor' && c.advisorEmail === user.email)
  );

  const acceptedConnections = myConnections.filter(c => c.status === 'accepted');
  const pendingInbound = myConnections.filter(c => c.status === `pending_${user.role}`);
  const pendingOutbound = myConnections.filter(c => c.status === (user.role === 'client' ? 'pending_advisor' : 'pending_client'));

  const handleInvite = (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    if (user.role === 'client' && !consentGiven) {
      return alert("Je moet expliciet akkoord gaan met de AVG privacy-voorwaarden om een adviseur toegang te geven tot jouw dossier.");
    }
    onSendInvite(user.email, inviteEmail, user.role);
    setInviteEmail('');
    setConsentGiven(false);
  };

  const ClientConsentBox = () => (
    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1rem', borderRadius: '8px', fontSize: '0.875rem', marginTop: '1rem' }}>
      <h4 style={{ color: '#166534', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ShieldCheck size={16} /> Privacy & AVG Toestemming
      </h4>
      <p style={{ color: '#15803d', marginBottom: '0.75rem', lineHeight: '1.5' }}>
        HypotheekPortaal verwerkt zeer gevoelige persoonsgegevens (zoals identiteitsbewijzen en financiële documenten). Om deze met een adviseur te delen, hebben wij je expliciete toestemming nodig:
      </p>
      <ul style={{ color: '#15803d', paddingLeft: '1.5rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <li>Mijn data mag uitsluitend worden ingezien door de gekoppelde adviseur, puur met het doel de hypotheekaanvraag te verzorgen.</li>
        <li>Ik heb het recht om mijn documenten te allen tijde te wijzigen of permanent te verwijderen uit het portaal.</li>
        <li>Na afronding (of annulering) van het hypotheektraject worden al mijn persoonsgegevens en documenten binnen 30 dagen veilig en onomkeerbaar vernietigd door de adviseur, tenzij er een wettelijke bewaartermijn geldt.</li>
      </ul>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold', color: '#166534' }}>
        <input 
          type="checkbox" 
          checked={consentGiven} 
          onChange={e => setConsentGiven(e.target.checked)}
          style={{ marginTop: '0.25rem' }}
        /> 
        Ja, ik ga uitdrukkelijk akkoord met deze verwerking van mijn persoonsgegevens en wil deze adviseur toegang geven.
      </label>
    </div>
  )

  return (
    <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Link size={20} color="var(--primary)" />
        <h3 style={{ margin: 0 }}>Koppelingen & Toegang</h3>
      </div>

      {acceptedConnections.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {acceptedConnections.map(acc => (
            <div key={acc.clientEmail + acc.advisorEmail} style={{ padding: '1rem', background: 'var(--success-light)', color: 'var(--success)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Gekoppeld met {user.role === 'client' ? 'adviseur' : 'klant'}:</strong>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>{user.role === 'client' ? acc.advisorEmail : acc.clientEmail}</p>
              </div>
              <Check size={24} />
            </div>
          ))}
          {user.role === 'client' && (
             <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>* Als de hypotheekaanvraag is afgerond worden alle gegevens veilig vernietigd volgens het AVG-beleid. Je kunt de toegang ook eerder handmatig intrekken.</p>
          )}
        </div>
      )}

      {!(user.role === 'client' && acceptedConnections.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {pendingInbound.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Inkomende Verzoeken openstaand</h4>
              {pendingInbound.map(req => (
                <div key={req.clientEmail + req.advisorEmail} style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: user.role === 'client' ? '1rem' : '0' }}>
                    <span style={{ fontSize: '0.875rem' }}>Toegangsverzoek van: {user.role === 'client' ? req.advisorEmail : req.clientEmail}</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => {
                        if (user.role === 'client' && !consentGiven) return alert("Vink eerst het Privacystatement onderaan het verzoek aan om akkoord te gaan.");
                        onResponseInvite(req.clientEmail, req.advisorEmail, true)
                      }} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'var(--success)' }}>Accepteren</button>
                      <button onClick={() => onResponseInvite(req.clientEmail, req.advisorEmail, false)} className="btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Afwijzen</button>
                    </div>
                  </div>
                  {user.role === 'client' && <ClientConsentBox />}
                </div>
              ))}
            </div>
          )}

          <div>
            <h4 style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Nieuwe persoon uitnodigen</h4>
            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="email" 
                  placeholder={`E-mailadres ${user.role === 'client' ? 'adviseur' : 'klant'}...`}
                  value={inviteEmail} 
                  onChange={e => setInviteEmail(e.target.value)}
                  className="btn-outline" 
                  style={{ flex: 1, padding: '0.5rem 1rem', borderRadius: '8px' }}
                  required 
                />
                <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Sessie Starten</button>
              </div>
              {user.role === 'client' && <ClientConsentBox />}
            </form>
          </div>
          
          {pendingOutbound.length > 0 && (
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Wachtend op acceptatie van: {pendingOutbound.map(c => user.role === 'client' ? c.advisorEmail : c.clientEmail).join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}


const ClientDashboard = ({ user, documents, appData, onUpload, onCustomUpload, onSendInvite, onResponseInvite }) => {
  const fileInputRef = useRef(null);
  const customFileInputRef = useRef(null);
  
  const [activeUploadId, setActiveUploadId] = useState(null);
  const [activeCustomPhase, setActiveCustomPhase] = useState(null);
  const [customDocName, setCustomDocName] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  const completed = documents.filter(d => d.status === 'accepted').length;
  const progress = Math.round((completed / documents.length) * 100) || 0;

  const triggerUpload = (id) => {
    setActiveUploadId(id);
    fileInputRef.current?.click();
  };

  const triggerCustomUpload = (phaseId) => {
    if (!customDocName.trim()) return alert("Vul eerst een documentnaam in.");
    setActiveCustomPhase(phaseId);
    customFileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file && activeUploadId) {
      setIsUploading(true);
      await onUpload(activeUploadId, file);
      setIsUploading(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = null;
    setActiveUploadId(null);
  };

  const handleCustomFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file && activeCustomPhase && customDocName) {
      setIsUploading(true);
      await onCustomUpload(activeCustomPhase, customDocName, file);
      setCustomDocName('');
      setIsUploading(false);
    }
    if (customFileInputRef.current) customFileInputRef.current.value = null;
    setActiveCustomPhase(null);
  };

  return (
    <div className="container animate-fade-in">
      {previewDoc && <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".pdf,.png,.jpg,.jpeg" />
      <input type="file" ref={customFileInputRef} onChange={handleCustomFileChange} style={{ display: 'none' }} accept=".pdf,.png,.jpg,.jpeg" />
      
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Hoi {user.name.split(' ')[0]}, welkom terug!</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ flex: 1, maxWidth: '300px', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.5s ease' }}></div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontWeight: '600' }}>{progress}% voltooid.</p>
        </div>
      </header>

      <div className="dashboard-grid">
        <aside className="sidebar">
          <a href="#" className="nav-item active"><LayoutDashboard size={20} /> Overzicht</a>
        </aside>

        <main>
          <PipelineWidget currentStage={user.pipelineStage || 0} isAdvisor={false} />
          
          <ConnectionsWidget user={user} appData={appData} onSendInvite={onSendInvite} onResponseInvite={onResponseInvite} />

          {getClientPhases(user).map(phase => {
            const phaseDocs = documents.filter(d => d.phase === phase.id && d.isRequired);
            const customDocs = documents.filter(d => d.phase === phase.id && !d.isRequired);
            
            return (
              <div key={phase.id} className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-light)' }}>{phase.title}</h3>
                  <PhaseProgress documents={[...phaseDocs, ...customDocs]} />
                </div>
                
                {phaseDocs.map(doc => (
                  <DocCardClient 
                    key={doc.id} doc={doc} 
                    isUploading={isUploading} 
                    activeUploadId={activeUploadId} 
                    triggerUpload={triggerUpload} 
                    setPreviewDoc={setPreviewDoc} 
                  />
                ))}

                <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                  <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Overige documenten (Fase {phase.id})</h4>
                  
                  {customDocs.map(doc => (
                    <DocCardClient 
                      key={doc.id} doc={doc} 
                      isUploading={isUploading} 
                      activeUploadId={activeUploadId} 
                      triggerUpload={triggerUpload} 
                      setPreviewDoc={setPreviewDoc} 
                    />
                  ))}
                  
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: customDocs.length > 0 ? '1rem' : '0' }}>
                    <input 
                      type="text" 
                      placeholder="Naam (e.g. Echtscheidingsconvenant)" 
                      value={activeCustomPhase === phase.id ? '' : undefined}
                      onChange={e => setCustomDocName(e.target.value)}
                      className="btn-outline"
                      style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: '8px', color: 'var(--text-main)', border: '1px dashed #cbd5e1' }}
                    />
                    <button 
                      onClick={() => triggerCustomUpload(phase.id)} 
                      className="btn-outline" 
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem' }}
                      disabled={isUploading}
                    >
                      <Plus size={16} /> Toevoegen
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </main>
      </div>
    </div>
  )
}

const ClientDossierView = ({ client, documents, onBack, onDocAction, onUpdatePipeline }) => {
  const [previewDoc, setPreviewDoc] = useState(null);
  const [rejectingDocId, setRejectingDocId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  
  const [settingDeadlineDocId, setSettingDeadlineDocId] = useState(null);
  const [deadlineDate, setDeadlineDate] = useState('');
  
  const completed = documents.filter(d => d.status === 'accepted').length;
  const progress = Math.round((completed / documents.length) * 100) || 0;

  return (
    <div className="container animate-fade-in">
      {previewDoc && <DocumentPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
      
      <header style={{ marginBottom: '2rem' }}>
        <button onClick={onBack} className="btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', border: 'none', padding: '0.5rem 0' }}>
          <ArrowLeft size={18} /> Terug naar overzicht
        </button>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Dossier: {client.name}</h1>
        <p style={{ color: 'var(--text-muted)' }}>Email: {client.email} | Voortgang: {progress}%</p>
      </header>
      
      <PipelineWidget currentStage={client.pipelineStage || 0} onUpdateStage={(s) => onUpdatePipeline(client.email, s)} isAdvisor={true} />

      {getClientPhases(client).map(phase => {
        const phaseDocs = documents.filter(d => d.phase === phase.id);
        if (phaseDocs.length === 0) return null;

        return (
          <div key={phase.id} className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-light)' }}>{phase.title}</h3>
              <PhaseProgress documents={phaseDocs} />
            </div>

            {phaseDocs.map(doc => (
              <div key={doc.id} className="doc-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ color: 'var(--accent)' }}><FileText size={24} /></div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <p style={{ fontWeight: '600' }}>{doc.name} {!doc.isRequired && <span style={{fontSize: '0.7rem', color: 'var(--primary)', background: '#e2e8f0', padding: '2px 6px', borderRadius: '12px', marginLeft: '6px'}}>Overig</span>}</p>
                        {doc.deadline && doc.status !== 'accepted' && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#c2410c', background: '#ffedd5', padding: '2px 6px', borderRadius: '4px' }}>
                            <Calendar size={12} /> Deadline: {doc.deadline}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{doc.type} {doc.fileName && `• ${doc.fileName}`}</p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <Badge status={doc.status} />
                    
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {doc.fileData ? (
                        <>
                          <button onClick={() => setPreviewDoc(doc)} className="btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
                            <Eye size={14} style={{ marginRight: '4px' }} /> Bekijk
                          </button>
                          {doc.status !== 'accepted' && rejectingDocId !== doc.id && (
                            <button onClick={() => { onDocAction(client.email, doc.id, 'accepted', null); setRejectingDocId(null); setRejectReason(''); }} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem', background: 'var(--success)' }}>
                              <Check size={14} style={{ marginRight: '4px' }} /> Goedkeuren
                            </button>
                          )}
                          {doc.status !== 'rejected' && rejectingDocId !== doc.id && (
                            <button onClick={() => setRejectingDocId(doc.id)} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem', background: 'var(--error)' }}>
                              <X size={14} style={{ marginRight: '4px' }} /> Afkeuren
                            </button>
                          )}
                        </>
                      ) : (
                         <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Nog niet aangeleverd</span>
                      )}

                      {doc.status !== 'accepted' && settingDeadlineDocId !== doc.id && (
                        <button onClick={() => setSettingDeadlineDocId(doc.id)} className="btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }} title="Deadline instellen">
                          <Calendar size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {rejectingDocId === doc.id && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Reden van afkeuring (zichtbaar voor klant)</label>
                    <textarea 
                      value={rejectReason} 
                      onChange={e => setRejectReason(e.target.value)} 
                      placeholder="Bijv. Het bankafschrift is niet volledig, zorg dat alle bladzijden zichtbaar zijn..."
                      style={{ width: '100%', minHeight: '80px', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => setRejectingDocId(null)} className="btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Annuleren</button>
                      <button 
                        onClick={() => { onDocAction(client.email, doc.id, 'rejected', rejectReason); setRejectingDocId(null); setRejectReason(''); }} 
                        className="btn-primary" 
                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', background: 'var(--error)' }}
                      >
                        Bevestig Afkeuring
                      </button>
                    </div>
                  </div>
                )}
                
                {settingDeadlineDocId === doc.id && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: '600' }}>Kies een uiterste aanleverdatum</label>
                    <input 
                      type="date" 
                      value={deadlineDate}
                      onChange={e => setDeadlineDate(e.target.value)}
                      className="btn-outline"
                      style={{ padding: '0.5rem', borderRadius: '8px' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => { setSettingDeadlineDocId(null); setDeadlineDate(''); }} className="btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Annuleren</button>
                      <button 
                        onClick={() => { onDocAction(client.email, doc.id, doc.status, null, deadlineDate); setSettingDeadlineDocId(null); setDeadlineDate(''); }} 
                        className="btn-primary" 
                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                      >
                        Sla deadline op
                      </button>
                    </div>
                  </div>
                )}
                
                {doc.note && !rejectingDocId && doc.status === 'rejected' && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', fontSize: '0.875rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                    <p><strong>Feedback Adviseur:</strong> {doc.note}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

const AdvisorDashboard = ({ user, appData, onDocAction, onSendInvite, onResponseInvite, onUpdatePipeline }) => {
  const [selectedClientEmail, setSelectedClientEmail] = useState(null);

  if (selectedClientEmail) {
    const client = appData.users.find(c => c.email === selectedClientEmail);
    const docs = appData.docs[selectedClientEmail] || [];
    return <ClientDossierView client={client} documents={docs} onBack={() => setSelectedClientEmail(null)} onDocAction={onDocAction} onUpdatePipeline={onUpdatePipeline} />
  }

  // Find all connections that are accepted for this advisor
  const acceptedConnections = appData.connections.filter(c => c.advisorEmail === user.email && c.status === 'accepted');
  const acceptedClients = appData.users.filter(u => acceptedConnections.some(c => c.clientEmail === u.email));

  return (
    <div className="container animate-fade-in">
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Adviseur Dashboard</h1>
        <p style={{ color: 'var(--text-muted)' }}>Beheer je gekoppelde klanten en hun documentatie.</p>
      </header>

      <div className="dashboard-grid">
        <aside className="sidebar">
          <a href="#" className="nav-item active"><Users size={20} /> Klanten</a>
        </aside>

        <main>
          <ConnectionsWidget user={user} appData={appData} onSendInvite={onSendInvite} onResponseInvite={onResponseInvite} />

          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3>Mijn Gekoppelde Klanten ({acceptedClients.length})</h3>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  placeholder="Zoek klant..." 
                  className="btn-outline"
                  style={{ padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '20px', width: '250px', color: 'var(--text-main)' }} 
                />
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            {acceptedClients.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Nog geen gekoppelde klanten. Stuur een uitnodiging of accepteer een inkomend verzoek.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #edf2f7', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    <th style={{ padding: '1rem' }}>Klant Naam</th>
                    <th style={{ padding: '1rem' }}>Email</th>
                    <th style={{ padding: '1rem' }}>Documenten</th>
                    <th style={{ padding: '1rem' }}>Actie</th>
                  </tr>
                </thead>
                <tbody>
                  {acceptedClients.map(client => {
                    const docs = appData.docs[client.email] || [];
                    const pending = docs.filter(d => d.status === 'pending').length;
                    return (
                      <tr key={client.email} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '1rem', fontWeight: '600' }}>
                          {client.name}
                          {pending > 0 && <span style={{ marginLeft: '8px', background: 'var(--warning)', color: 'white', padding: '2px 6px', borderRadius: '12px', fontSize: '0.7rem' }}>{pending} actie vereist</span>}
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{client.email}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ fontSize: '0.875rem' }}>{docs.filter(d => d.status === 'accepted').length} / {docs.length} voltooid</span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <button onClick={() => setSelectedClientEmail(client.email)} className="btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Dossier Openen</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

const AuthScreen = ({ onLogin, onRegister }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'client', workSituation: 'loondienst', housingSituation: 'starter' });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (isRegister) {
      if (onRegister(formData)) {
        setIsRegister(false);
        setFormData({ ...formData, password: '' });
      } else {
        setError('Email bestaat al.');
      }
    } else {
      const user = onLogin(formData.email, formData.password);
      if (!user) setError('Ongeldige email of wachtwoord.');
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }} className="animate-fade-in">
      <div className="glass-card" style={{ padding: '3rem', width: '100%', maxWidth: '420px' }}>
        <div style={{ background: 'var(--accent)', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', margin: '0 auto 1.5rem' }}>
          <ShieldCheck size={32} />
        </div>
        
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>{isRegister ? 'Account Aanmaken' : 'Inloggen'}</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          {isRegister ? 'Maak een nieuw account aan voor HypotheekPortaal' : 'Welkom terug bij HypotheekPortaal'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {isRegister && (
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Volledige Naam</label>
              <input 
                required
                className="btn-outline"
                style={{ width: '100%', color: 'var(--text-main)', padding: '0.75rem', borderRadius: '8px' }}
                placeholder="Jan Jansen"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
          )}
          
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>E-mailadres</label>
            <input 
              required
              type="email"
              className="btn-outline"
              style={{ width: '100%', color: 'var(--text-main)', padding: '0.75rem', borderRadius: '8px' }}
              placeholder="naam@voorbeeld.nl"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Wachtwoord</label>
            <input 
              required
              type="password"
              className="btn-outline"
              style={{ width: '100%', color: 'var(--text-main)', padding: '0.75rem', borderRadius: '8px' }}
              placeholder="••••••••"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          {isRegister && (
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Ik ben een...</label>
              <select 
                className="btn-outline"
                style={{ width: '100%', color: 'var(--text-main)', padding: '0.75rem', borderRadius: '8px' }}
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
              >
                <option value="client">Klant</option>
                <option value="advisor">Hypotheekadviseur</option>
              </select>
            </div>
          )}

          {isRegister && formData.role === 'client' && (
            <>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Mijn inkomenssituatie</label>
                <select 
                  className="btn-outline"
                  style={{ width: '100%', color: 'var(--text-main)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem' }}
                  value={formData.workSituation}
                  onChange={e => setFormData({...formData, workSituation: e.target.value})}
                >
                  <option value="loondienst">In loondienst</option>
                  <option value="zzp">Ondernemer</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Mijn doel</label>
                <select 
                  className="btn-outline"
                  style={{ width: '100%', color: 'var(--text-main)', padding: '0.75rem', borderRadius: '8px' }}
                  value={formData.housingSituation}
                  onChange={e => setFormData({...formData, housingSituation: e.target.value})}
                >
                  <option value="starter">Starter (eerste woning)</option>
                  <option value="oversluiten">Oversluiten</option>
                  <option value="tweedewoning">Tweede woning</option>
                </select>
              </div>
            </>
          )}

          {error && <p style={{ color: 'var(--error)', fontSize: '0.875rem', textAlign: 'center' }}>{error}</p>}

          <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', height: '50px' }}>
            {isRegister ? 'Registreren' : 'Inloggen'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {isRegister ? 'Heb je al een account?' : 'Nog geen account?'} {' '}
          <button 
            onClick={() => setIsRegister(!isRegister)} 
            style={{ background: 'none', color: 'var(--accent)', fontWeight: '600', padding: 0 }}
          >
            {isRegister ? 'Log hier in' : 'Meld je aan'}
          </button>
        </p>
      </div>
    </div>
  )
}

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [data, setData] = useState(getPortalData())

  const handleRegister = (newUser) => {
    if (data.users.find(u => u.email === newUser.email)) return false;
    
    let clientDocs = [];
    if (newUser.role === 'client') {
      clientDocs = JSON.parse(JSON.stringify(INITIAL_DOCS));
      const workDocs = WORK_SITUATIONS[newUser.workSituation]?.docs.map((d, idx) => ({
        id: `work-${idx}`,
        phase: 'work',
        isRequired: true,
        name: d.name,
        status: 'missing',
        type: d.type
      })) || [];
      const housingDocs = HOUSING_SITUATIONS[newUser.housingSituation]?.docs.map((d, idx) => ({
        id: `housing-${idx}`,
        phase: 'housing',
        isRequired: true,
        name: d.name,
        status: 'missing',
        type: d.type
      })) || [];
      
      clientDocs = [...workDocs, ...housingDocs, ...clientDocs];
      newUser.workSituationTitle = WORK_SITUATIONS[newUser.workSituation]?.title || '';
      newUser.housingSituationTitle = HOUSING_SITUATIONS[newUser.housingSituation]?.title || '';
    }

    const newData = {
      ...data,
      users: [...data.users, newUser],
      docs: { ...data.docs, [newUser.email]: clientDocs }
    };
    
    setData(newData);
    savePortalData(newData);
    return true;
  };

  const handleLogin = (email, password) => {
    const user = data.users.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUser(user);
      return user;
    }
    return null;
  };

  const handleUpload = (docId, file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result;
        const userDocs = data.docs[currentUser.email].map(doc => 
          doc.id === docId ? { ...doc, status: 'pending', fileData: base64data, fileName: file.name } : doc
        );
        const newData = { ...data, docs: { ...data.docs, [currentUser.email]: userDocs } };
        setData(newData);
        savePortalData(newData);
        resolve();
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCustomUpload = (phaseId, docName, file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result;
        const newDoc = {
          id: `custom-${Date.now()}`,
          phase: phaseId,
          isRequired: false,
          name: docName,
          status: 'pending',
          type: 'Overig',
          fileData: base64data,
          fileName: file.name
        };
        const userDocs = [...(data.docs[currentUser.email] || []), newDoc];
        const newData = { ...data, docs: { ...data.docs, [currentUser.email]: userDocs } };
        setData(newData);
        savePortalData(newData);
        resolve();
      };
      reader.readAsDataURL(file);
    });
  }

  const handleAdvisorDocAction = (clientEmail, docId, action, note, deadline) => {
    const clientDocs = data.docs[clientEmail].map(doc => {
      if (doc.id === docId) {
        return { 
          ...doc, 
          status: action, 
          note: action === 'rejected' ? note : doc.note,
          deadline: deadline !== undefined ? deadline : doc.deadline 
        };
      }
      return doc;
    });
    const newData = { ...data, docs: { ...data.docs, [clientEmail]: clientDocs } };
    setData(newData);
    savePortalData(newData);
  };
  
  const handleUpdatePipeline = (clientEmail, stageIdx) => {
    const updatedUsers = data.users.map(u => u.email === clientEmail ? { ...u, pipelineStage: stageIdx } : u);
    const newData = { ...data, users: updatedUsers };
    if (clientEmail === currentUser.email) setCurrentUser(newData.users.find(u => u.email === clientEmail));
    setData(newData);
    savePortalData(newData);
  };

  const handleSendInvite = (senderEmail, targetEmail, senderRole) => {
    const targetUser = data.users.find(u => u.email === targetEmail);
    if (!targetUser) return alert('Er is geen gebruiker gevonden met dit e-mailadres.');
    if (targetUser.role === senderRole) return alert('Je kunt alleen koppelen met iemand die een andere rol heeft (Klant ↔ Adviseur).');

    const clientEmail = senderRole === 'client' ? senderEmail : targetEmail;
    const advisorEmail = senderRole === 'advisor' ? senderEmail : targetEmail;

    const existing = data.connections.find(c => c.clientEmail === clientEmail && c.advisorEmail === advisorEmail);
    if (existing) {
      if (existing.status === 'accepted') return alert('Deze koppeling bestaat al!');
      return alert('Er is al een openstaand koppelverzoek met dit account.');
    }

    const newConnection = {
      clientEmail,
      advisorEmail,
      status: senderRole === 'client' ? 'pending_advisor' : 'pending_client'
    };

    const newData = { ...data, connections: [...data.connections, newConnection] };
    setData(newData);
    savePortalData(newData);
    alert('Uitnodiging is succesvol verstuurd!');
  };

  const handleResponseInvite = (clientEmail, advisorEmail, accept) => {
    const updated = data.connections.map(c => {
      if (c.clientEmail === clientEmail && c.advisorEmail === advisorEmail) {
        return { ...c, status: accept ? 'accepted' : 'rejected' };
      }
      return c;
    });
    const newData = { ...data, connections: updated.filter(c => c.status !== 'rejected') };
    setData(newData);
    savePortalData(newData);
  };

  return (
    <div className="App">
      {!currentUser ? (
        <AuthScreen onLogin={handleLogin} onRegister={handleRegister} />
      ) : (
        <>
          <Navbar user={currentUser} onLogout={() => setCurrentUser(null)} />
          {currentUser.role === 'client' ? (
            <ClientDashboard 
              user={currentUser} 
              documents={data.docs[currentUser.email] || []} 
              appData={data}
              onUpload={handleUpload}
              onCustomUpload={handleCustomUpload}
              onSendInvite={handleSendInvite}
              onResponseInvite={handleResponseInvite}
            />
          ) : (
            <AdvisorDashboard 
              user={currentUser}
              appData={data} 
              onDocAction={handleAdvisorDocAction}
              onSendInvite={handleSendInvite}
              onResponseInvite={handleResponseInvite}
              onUpdatePipeline={handleUpdatePipeline}
            />
          )}
        </>
      )}
    </div>
  )
}

export default App
