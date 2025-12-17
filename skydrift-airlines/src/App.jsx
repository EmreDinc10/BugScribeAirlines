import React, { useEffect, useState } from 'react';
import { Plane, Calendar, CreditCard, User, AlertTriangle, ChevronRight, Search, MapPin } from 'lucide-react';
import { generateAssistantChat, generateIssueDraft } from './llm';
import html2canvas from 'html2canvas';

// --- Mock Data ---
const FLIGHTS = [
  { id: 1, airline: 'SkyDrift', time: '08:00 AM - 10:30 AM', duration: '2h 30m', price: 120, route: 'IST -> LHR' },
  { id: 2, airline: 'SkyDrift', time: '02:00 PM - 04:45 PM', duration: '2h 45m', price: 145, route: 'IST -> LHR' },
  { id: 3, airline: 'SkyDrift', time: '08:00 PM - 10:30 PM', duration: '2h 30m', price: 95, route: 'IST -> LHR' },
];

const STORAGE_KEY = 'bugscribe_session';

export default function App() {
  const [step, setStep] = useState('search'); // search, results, details, payment, crash
  const [loading, setLoading] = useState(false);
  const [cardNumberError, setCardNumberError] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [chatError, setChatError] = useState('');
  const [reportError, setReportError] = useState('');
  const [issueDraft, setIssueDraft] = useState(null);
  const [screenshots, setScreenshots] = useState([]);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [networkLogs, setNetworkLogs] = useState([]);
  const [selectedFlightId, setSelectedFlightId] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm BugScribe Assistant. Ask me about this flow or report a bug."
    }
  ]);
  
  // Form State (This is the data we want to lose to prove a point)
  const [formData, setFormData] = useState({
    from: 'Istanbul (IST)',
    to: 'London (LHR)',
    date: '',
    passengers: 1,
    firstName: '',
    lastName: '',
    passport: '',
    email: '',
    cardNumber: '',
    expiry: '',
    cvv: ''
  });

  const addChatMessage = (role, content) => {
    setChatMessages((msgs) => [...msgs, { role, content }]);
  };

  const capShots = (arr) => (arr.length > 3 ? arr.slice(arr.length - 3) : arr);

  const captureScreenshot = async ({ download = false } = {}) => {
    try {
      const canvas = await html2canvas(document.body, { logging: false, useCORS: true, scale: 1 });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      const shot = { dataUrl, capturedAt: Date.now() };
      const nextList = capShots([...screenshots, shot]);
      setScreenshots(nextList);
      if (download) downloadLatestScreenshot(nextList);
      return nextList;
    } catch (err) {
      console.warn('Screenshot failed', err);
      return screenshots;
    }
  };

  const downloadLatestScreenshot = (shotList) => {
    const latest = shotList?.[shotList.length - 1];
    if (!latest?.dataUrl) return;
    const a = document.createElement('a');
    a.href = latest.dataUrl;
    a.download = `bugscribe-shot-${latest.capturedAt || Date.now()}.jpg`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Capture console and network logs (lightweight, capped)
  useEffect(() => {
    const cap = (arr) => (arr.length > 30 ? arr.slice(arr.length - 30) : arr);

    const originalConsole = { ...console };
    const wrap = (level) => (...args) => {
      setConsoleLogs((logs) =>
        cap([...logs, { level, message: args.map((a) => String(a)).join(' '), at: Date.now() }])
      );
      originalConsole[level](...args);
    };
    console.log = wrap('log');
    console.error = wrap('error');
    console.warn = wrap('warn');
    console.info = wrap('info');

    const nativeFetch = window.fetch;
    window.fetch = async (...args) => {
      const started = performance.now();
      const [input, init = {}] = args;
      const url = typeof input === 'string' ? input : input.url;
      const method = init.method || (typeof input === 'object' && input.method) || 'GET';
      try {
        const res = await nativeFetch(...args);
        const duration = Math.round(performance.now() - started);
        setNetworkLogs((logs) =>
          cap([
            ...logs,
            {
              kind: 'fetch',
              url,
              method,
              status: res.status,
              duration
            }
          ])
        );
        return res;
      } catch (err) {
        setNetworkLogs((logs) =>
          cap([
            ...logs,
            {
              kind: 'fetch',
              url,
              method,
              status: 'error',
              error: String(err),
              duration: Math.round(performance.now() - started)
            }
          ])
        );
        throw err;
      }
    };

    const OriginalXHR = window.XMLHttpRequest;
    function WrappedXHR() {
      const xhr = new OriginalXHR();
      let url = '';
      let method = 'GET';
      let started = 0;

      const record = (status, error) => {
        const duration = Math.round(performance.now() - started);
        setNetworkLogs((logs) =>
          cap([
            ...logs,
            { kind: 'xhr', url, method, status, error: error ? String(error) : undefined, duration }
          ])
        );
      };

      xhr.open = function (m, u, ...rest) {
        method = m;
        url = u;
        return OriginalXHR.prototype.open.call(xhr, m, u, ...rest);
      };
      xhr.send = function (...sendArgs) {
        started = performance.now();
        xhr.addEventListener('loadend', () => record(xhr.status));
        xhr.addEventListener('error', () => record('error', 'network error'));
        return OriginalXHR.prototype.send.call(xhr, ...sendArgs);
      };
      return xhr;
    }
    window.XMLHttpRequest = WrappedXHR;

    return () => {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      console.info = originalConsole.info;
      window.fetch = nativeFetch;
      window.XMLHttpRequest = OriginalXHR;
    };
  }, []);

  // Periodic screenshots while chat is open
  useEffect(() => {
    if (!chatOpen) return undefined;
    const id = setInterval(() => {
      captureScreenshot();
    }, 5000);
    return () => clearInterval(id);
  }, [chatOpen]);

  const buildContextSummary = () => {
    const basics = [
      `Current step: ${step}`,
      `Route: ${formData.from} -> ${formData.to}`,
      `Date: ${formData.date || 'not chosen'}`,
      `Passenger: ${formData.firstName || 'N/A'} ${formData.lastName || ''}`.trim(),
      `Card error: ${cardNumberError || 'none'}`,
      screenshots.length
        ? `Screenshots: ${screenshots.length} (last is most recent; use it for visual state)`
        : 'Screenshots: none available'
    ];
    if (step === 'crash') {
      basics.push('UI crashed after payment simulation. Try reset and retry.');
    }
    return basics.join(' | ');
  };

  const buildDetailsPayload = () =>
    JSON.stringify(
      {
        step,
        formData,
        cardNumberError
      },
      null,
      2
    );

  const buildDiagnostics = () => {
    const recentConsole = consoleLogs.slice(-10).map((c) => `${c.level}: ${c.message}`).join(' | ');
    const recentNetwork = networkLogs
      .slice(-10)
      .map((n) => `${n.method || n.kind} ${n.url} -> ${n.status} (${n.duration}ms)`)
      .join(' | ');
    return [
      'Diagnostics:',
      recentConsole ? `Console: ${recentConsole}` : 'Console: none',
      recentNetwork ? `Network: ${recentNetwork}` : 'Network: none'
    ].join(' \n');
  };

  // --- Persistence helpers ---
  const loadSnapshot = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const saveSnapshot = (partial = {}) => {
    try {
      const current = loadSnapshot() || {};
      const next = {
        ...current,
        step,
        formData,
        selectedFlightId,
        ...partial
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.warn('Save snapshot failed', err);
    }
  };

  useEffect(() => {
    const saved = loadSnapshot();
    if (saved) {
      if (saved.formData) setFormData(saved.formData);
      if (saved.step) setStep(saved.step);
      if (saved.selectedFlightId) setSelectedFlightId(saved.selectedFlightId);
    }
  }, []);

  useEffect(() => {
    saveSnapshot();
  }, [formData, step, selectedFlightId]);

  const handleRestore = () => {
    const saved = loadSnapshot();
    if (!saved) {
      addChatMessage('assistant', 'No saved progress found.');
      return;
    }
    if (saved.formData) setFormData(saved.formData);
    if (saved.selectedFlightId) setSelectedFlightId(saved.selectedFlightId);
    if (saved.step) setStep(saved.step);
    addChatMessage('assistant', 'Restored your saved progress.');
  };

  const openGitHubIssue = (draft) => {
    if (!draft?.title || !draft?.body) return;
    const url = `https://github.com/EmreDinc10/BugScribeAirlines/issues/new?title=${encodeURIComponent(
      draft.title
    )}&body=${encodeURIComponent(draft.body)}`;
    window.open(url, '_blank', 'noopener');
  };

  const handleChatSend = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatBusy) return;
    const message = chatInput.trim();
    addChatMessage('user', message);
    setChatInput('');
    setChatError('');
    setChatBusy(true);

    const history = chatMessages.slice(-8).map((m) => ({ role: m.role, content: m.content }));

    captureScreenshot({ download: true })
      .then((shotList) =>
        generateAssistantChat({
          userMessage: message,
          context: [buildContextSummary(), buildDiagnostics()].join('\n'),
          history,
          images: shotList
        })
      )
      .then((reply) => addChatMessage('assistant', reply || 'Got it.'))
      .catch((err) => {
        const friendly = err?.message || 'Assistant unavailable.';
        setChatError(friendly);
        addChatMessage('assistant', 'Sorry, I could not reach the assistant.');
      })
      .finally(() => setChatBusy(false));
  };

  const handleReportBug = async () => {
    if (reportBusy) return;
    setReportError('');
    setReportBusy(true);
    try {
      const shotList = await captureScreenshot();
      const draft = await generateIssueDraft({
        context: [buildContextSummary(), buildDiagnostics()].join('\n'),
        details: buildDetailsPayload(),
        images: shotList
      });
      setIssueDraft(draft);
      addChatMessage(
        'assistant',
        `Issue draft ready: ${draft.title}\nOpening GitHub with the body prefilled.`
      );
      openGitHubIssue(draft);
    } catch (err) {
      const friendly = err?.message || 'Failed to create issue draft.';
      setReportError(friendly);
      addChatMessage('assistant', 'Could not prepare issue draft.');
    } finally {
      setReportBusy(false);
    }
  };

  // --- Handlers ---
  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API search
    console.log(`[SkyDrift] Searching flights for route: ${formData.from} to ${formData.to}`);
    setTimeout(() => {
      setLoading(false);
      setStep('results');
    }, 800);
  };

  const selectFlight = (flight) => {
    console.log(`[SkyDrift] Flight selected: ID ${flight.id}`);
    setSelectedFlightId(flight.id);
    setStep('details');
  };

  const handleDetailsSubmit = (e) => {
    e.preventDefault();
    console.log('[SkyDrift] Passenger details captured. Validating...');
    setStep('payment');
  };

  // --- THE BUGGY FUNCTION ---
  const handleFinalBooking = (e) => {
    e.preventDefault();
    
    // Validate card number - must have exactly 16 digits
    const cardNumberDigits = formData.cardNumber.replace(/\s/g, ''); // Remove spaces
    const expectedDigits = 16;
    
    if (cardNumberDigits.length !== expectedDigits) {
      const errorMessage = `Card number must contain exactly ${expectedDigits} digits. You entered ${cardNumberDigits.length} digit(s).`;
      setCardNumberError(errorMessage);
      console.error('[SkyDrift] Card Number Validation Error:', errorMessage);
      console.error(`[SkyDrift] Expected: ${expectedDigits} digits, Received: ${cardNumberDigits.length} digits`);
      return; // Prevent form submission
    }
    
    // Clear any previous errors
    setCardNumberError('');
    setLoading(true);

    console.log('[SkyDrift] Initiating transaction...');
    console.log('[SkyDrift] Payment Gateway: Connecting...');

    // Simulate network delay
    setTimeout(() => {
      // 1. Log legitimate-looking events
      console.log('[SkyDrift] Payment Gateway: Handshake successful.');
      console.warn('[SkyDrift] Warning: Response time > 500ms');

      // 2. THE CRASH
      console.error('Uncaught TypeError: Cannot read properties of undefined (reading "confirmation_code")');
      console.error('    at processBookingResponse (TransactionManager.js:402)');
      console.error('    at XMLHttpRequest.onreadystatechange (NetworkClient.js:55)');
      
      setLoading(false);
      
      // 3. Move to Crash State (Data is still in memory, but UI is broken)
      setStep('crash');
    }, 2000);
  };

  // --- Reset Function (Wipes Data) ---
  const handleReset = () => {
    // This demonstrates the "Data Loss" frustration
    setFormData({
      from: 'Istanbul (IST)',
      to: 'London (LHR)',
      date: '',
      passengers: 1,
      firstName: '',
      lastName: '',
      passport: '',
      email: '',
      cardNumber: '',
      expiry: '',
      cvv: ''
    });
    setCardNumberError('');
    setStep('search');
    console.clear();
  };

  // --- Components for Steps ---
  
  const Header = () => (
    <nav className="bg-sky-900 text-white p-4 shadow-md">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Plane className="h-6 w-6 transform -rotate-45" />
          <span className="text-xl font-bold tracking-wider">SkyDrift Airlines</span>
        </div>
        <div className="text-sm text-sky-200">Star Alliance Member</div>
      </div>
    </nav>
  );

  const ProgressBar = () => {
    const steps = ['Search', 'Flight', 'Details', 'Payment'];
    const currentIdx = ['search', 'results', 'details', 'payment', 'crash'].indexOf(step);
    
    if (step === 'crash') return null;

    return (
      <div className="max-w-2xl mx-auto mt-8 mb-8">
        <div className="flex justify-between relative">
          {/* Line */}
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 transform -translate-y-1/2"></div>
          
          {steps.map((label, idx) => (
            <div key={label} className="flex flex-col items-center bg-white px-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                idx <= currentIdx ? 'bg-sky-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {idx + 1}
              </div>
              <span className={`text-xs mt-1 ${idx <= currentIdx ? 'text-sky-800' : 'text-gray-400'}`}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
      <Header />
      <ProgressBar />

      <main className="max-w-2xl mx-auto px-4">
        
        {/* STEP 1: SEARCH */}
        {step === 'search' && (
          <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-sky-600 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Find your next adventure</h2>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">From</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input 
                      type="text" 
                      value={formData.from}
                      onChange={e => setFormData({...formData, from: e.target.value})}
                      className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">To</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input 
                      type="text" 
                      value={formData.to}
                      onChange={e => setFormData({...formData, to: e.target.value})}
                      className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none" 
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Departure</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input 
                      type="date" 
                      required
                      className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Passengers</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <select className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none bg-white">
                      <option>1 Adult</option>
                      <option>2 Adults</option>
                    </select>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-lg mt-4 flex items-center justify-center transition-all"
              >
                {loading ? 'Searching...' : 'Search Flights'}
                {!loading && <Search className="ml-2 h-5 w-5" />}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: RESULTS */}
        {step === 'results' && (
          <div className="space-y-4 animate-fade-in">
             <h2 className="text-xl font-bold text-gray-700">Select your outbound flight</h2>
             <p className="text-sm text-gray-500 mb-4">{formData.from} to {formData.to}</p>
             
             {FLIGHTS.map(flight => (
               <div key={flight.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-sky-500 cursor-pointer transition-all group" onClick={() => selectFlight(flight)}>
                 <div className="flex justify-between items-center">
                   <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 bg-sky-100 rounded-full flex items-center justify-center text-sky-700 font-bold">SD</div>
                      <div>
                        <div className="font-bold text-lg">{flight.time}</div>
                        <div className="text-sm text-gray-500">{flight.airline} • Direct</div>
                      </div>
                   </div>
                   <div className="text-right">
                      <div className="text-2xl font-bold text-gray-800">${flight.price}</div>
                      <div className="text-xs text-green-600 font-medium">Economy</div>
                   </div>
                 </div>
               </div>
             ))}
          </div>
        )}

        {/* STEP 3: DETAILS (The Input Effort) */}
        {step === 'details' && (
          <div className="bg-white p-8 rounded-xl shadow-lg animate-fade-in">
            <h2 className="text-2xl font-bold mb-6">Who is flying?</h2>
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">First Name</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. John"
                    value={formData.firstName}
                    onChange={e => setFormData({...formData, firstName: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Last Name</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. Doe"
                    value={formData.lastName}
                    onChange={e => setFormData({...formData, lastName: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" 
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Passport Number</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="U12345678"
                    value={formData.passport}
                    onChange={e => setFormData({...formData, passport: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" 
                  />
              </div>

              <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Email Address</label>
                  <input 
                    required 
                    type="email" 
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" 
                  />
              </div>

              <button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-lg mt-6">
                Continue to Payment
              </button>
            </form>
          </div>
        )}

        {/* STEP 4: PAYMENT (The Bug Trigger) */}
        {step === 'payment' && (
          <div className="bg-white p-8 rounded-xl shadow-lg animate-fade-in">
             <h2 className="text-2xl font-bold mb-6">Payment Method</h2>
             <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
               <div className="flex justify-between items-center mb-2">
                 <span className="text-gray-600">Total Amount</span>
                 <span className="text-xl font-bold">$120.00</span>
               </div>
               <div className="text-sm text-gray-500">Includes taxes and fees</div>
             </div>

             <form onSubmit={handleFinalBooking} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Card Number</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input 
                      required
                      type="text" 
                      placeholder="0000 0000 0000 0000"
                      value={formData.cardNumber}
                      onChange={e => {
                        setFormData({...formData, cardNumber: e.target.value});
                        setCardNumberError(''); // Clear error when user types
                      }}
                      className={`w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                        cardNumberError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {cardNumberError && (
                    <p className="text-red-600 text-sm mt-1 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      {cardNumberError}
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Expiry</label>
                    <input 
                      required
                      type="text" 
                      placeholder="MM/YY"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">CVV</label>
                    <input 
                      required
                      type="text" 
                      placeholder="123"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className={`w-full text-white font-bold py-4 rounded-lg mt-6 flex items-center justify-center transition-all ${
                    loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {loading ? 'Processing Transaction...' : 'Pay & Book Flight'}
                  {!loading && <ChevronRight className="ml-2 h-5 w-5" />}
                </button>
             </form>
          </div>
        )}

        {/* STEP 5: THE CRASH (The Bug) */}
        {step === 'crash' && (
          <div className="bg-white p-8 rounded-xl shadow-2xl border-t-8 border-red-600 text-center animate-bounce-in">
            <div className="flex justify-center mb-6">
              <div className="bg-red-100 p-4 rounded-full">
                <AlertTriangle className="h-12 w-12 text-red-600" />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">System Error</h1>
            <p className="text-red-600 font-mono bg-red-50 p-2 rounded mb-6 text-sm">
              Error 500: Internal Server Exception <br/>
              Request ID: req_99f8a7d
            </p>
            <p className="text-gray-600 mb-8">
              We encountered a critical error while processing your payment. 
              The transaction gateway did not return a valid confirmation code.
              Please return to the home page and try again.
            </p>

            <button 
              onClick={handleReset}
              className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors w-full"
            >
              Return to Home
            </button>
            <p className="text-xs text-gray-400 mt-4 italic">
              (Note: Returning to home will clear your current session data)
            </p>
          </div>
        )}

      </main>
      
      <footer className="mt-20 text-center text-gray-400 text-sm">
        <p>© 2025 SkyDrift Airlines. All rights reserved.</p>
        <p className="text-xs mt-1">Running Build v2.4.0-alpha (Debug Mode)</p>
      </footer>

      {/* BugScribe-style assistant launcher */}
      <button
        aria-label="Open BugScribe Assistant"
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full border border-sky-900 bg-white text-sky-900 shadow-xl text-2xl font-bold hover:bg-sky-50 transition-colors"
        style={{ zIndex: 50 }}
      >
        ?
      </button>

      {chatOpen && (
        <div
          className="fixed bottom-24 right-6 w-96 max-w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ zIndex: 50 }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <div className="font-semibold">BugScribe Assistant</div>
            <button
              className="text-slate-400 hover:text-white"
              onClick={() => setChatOpen(false)}
              aria-label="Close chat"
            >
              ×
            </button>
          </div>

          <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-80">
            {chatMessages.map((msg, idx) => (
              <div
                key={`${msg.role}-${idx}`}
                className={`max-w-[90%] text-sm leading-relaxed px-3 py-2 rounded-xl ${
                  msg.role === 'user'
                    ? 'bg-sky-600 ml-auto text-white'
                    : 'bg-slate-900 border border-slate-800'
                }`}
              >
                {msg.content}
              </div>
            ))}
          </div>

          <form onSubmit={handleChatSend} className="p-4 border-t border-slate-800 space-y-3">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleChatSend(e);
                }
              }}
              rows={3}
              placeholder="Describe what you need help with…"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={chatBusy}
                className="flex-1 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 text-white font-semibold py-2 rounded-lg transition-colors"
              >
                {chatBusy ? 'Thinking…' : 'Send'}
              </button>
              <button
                type="button"
                onClick={handleReportBug}
                disabled={reportBusy}
                className="bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                {reportBusy ? 'Preparing…' : 'Report bug'}
              </button>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleRestore}
                className="text-xs text-sky-300 hover:text-white underline"
              >
                Restore my progress
              </button>
            </div>
            {(chatError || reportError) && (
              <p className="text-xs text-rose-300">
                {chatError || reportError}
              </p>
            )}
            {issueDraft && (
              <p className="text-xs text-slate-400">
                Last draft: {issueDraft.title}
              </p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
