import React, { useEffect, useRef, useState } from 'react';
import { Plane, Calendar, CreditCard, User, AlertTriangle, ChevronRight, Search, MapPin, CheckCircle } from 'lucide-react';
import { generateAssistantChat, generateIssueDraft } from './llm';
import html2canvas from 'html2canvas';

// --- Mock Data ---
const FLIGHTS = [
  { id: 1, airline: 'SkyDrift', time: '06:00 AM - 08:15 AM', duration: '2h 15m', price: 125, route: 'IST -> LHR', class: 'Economy' },
  { id: 2, airline: 'SkyDrift', time: '08:00 AM - 10:30 AM', duration: '2h 30m', price: 120, route: 'IST -> LHR', class: 'Economy' },
  { id: 3, airline: 'SkyDrift', time: '10:15 AM - 12:45 PM', duration: '2h 30m', price: 135, route: 'IST -> LHR', class: 'Economy' },
  { id: 4, airline: 'SkyDrift', time: '02:00 PM - 04:45 PM', duration: '2h 45m', price: 145, route: 'IST -> LHR', class: 'Economy' },
  { id: 5, airline: 'SkyDrift', time: '04:30 PM - 07:00 PM', duration: '2h 30m', price: 150, route: 'IST -> LHR', class: 'Business' },
  { id: 6, airline: 'SkyDrift', time: '06:00 PM - 08:30 PM', duration: '2h 30m', price: 140, route: 'IST -> LHR', class: 'Economy' },
  { id: 7, airline: 'SkyDrift', time: '08:00 PM - 10:30 PM', duration: '2h 30m', price: 95, route: 'IST -> LHR', class: 'Economy' },
  { id: 8, airline: 'SkyDrift', time: '10:45 PM - 01:15 AM+1', duration: '2h 30m', price: 110, route: 'IST -> LHR', class: 'Economy' },
];

// Business rules
const MAX_BOOKING_DAYS = 60; // Maximum days in advance for booking
const USD_TO_TL_RATE = 30; // Exchange rate: 1 USD = 30 TL (approximate)

const STORAGE_KEY = 'bugscribe_session';

// Currency conversion - intended behavior based on user location
const getUserLocation = () => {
  // Simulate location detection - in real app this would use geolocation API
  // For demo: Assume user is in Turkey (TR) if route includes IST
  return 'TR'; // Always TR for this demo scenario
};

const formatPrice = (priceUSD, showBoth = false) => {
  const location = getUserLocation();
  if (location === 'TR') {
    const priceTL = Math.round(priceUSD * USD_TO_TL_RATE);
    const formattedTL = new Intl.NumberFormat('tr-TR', { 
      style: 'currency', 
      currency: 'TRY',
      minimumFractionDigits: 0 
    }).format(priceTL);
    
    if (showBoth) {
      return `${formattedTL} ($${priceUSD})`;
    }
    return formattedTL;
  }
  return `$${priceUSD}`;
};

export default function App() {
  const appRef = useRef(null);
  const [step, setStep] = useState('search'); // search, results, details, payment, success
  const [loading, setLoading] = useState(false);
  const [cardNumberError, setCardNumberError] = useState('');
  const [dateError, setDateError] = useState('');
  const [paymentDateError, setPaymentDateError] = useState('');
  const [searchResults, setSearchResults] = useState([]);
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
      const target = appRef.current || document.body;
      // Wait for fonts/layout to settle
      if (document.fonts?.ready) {
        await document.fonts.ready.catch(() => {});
      }
      await new Promise((r) => setTimeout(r, 120));

      const dpr = Math.min(window.devicePixelRatio || 1.5, 3.2);
      const canvas = await html2canvas(target, {
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff',
        scale: dpr
      });
      const dataUrl = canvas.toDataURL('image/png');
      const shot = { dataUrl, capturedAt: Date.now() };
      let nextList = [];
      setScreenshots((prev) => {
        const arr = capShots([...prev, shot]);
        nextList = arr;
        return arr;
      });
      if (!nextList.length) {
        nextList = capShots([...screenshots, shot]);
      }
    if (download && typeof window !== 'undefined' && window.navigator?.userAgent) {
      // download functionality removed per request
    }
      return nextList;
    } catch (err) {
      console.warn('Screenshot failed', err);
      return screenshots;
    }
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

  // Auto-suggest when chat opens with payment date error
  useEffect(() => {
    if (chatOpen && paymentDateError) {
      // Check if suggestion already exists to avoid duplicates
      const hasSuggestion = chatMessages.some(msg => 
        msg.content.includes('Did you check the dates?')
      );
      if (!hasSuggestion) {
        const suggestion = "BugScribe Suggestion: Did you check the dates? The selected departure date may be in the past or invalid. Your booking details (date, route, passenger info) will be included in any bug report.";
        addChatMessage('assistant', suggestion);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen, paymentDateError]);

  const buildContextSummary = () => {
    const basics = [
      `Current step: ${step}`,
      `Route: ${formData.from} -> ${formData.to}`,
      `Date: ${formData.date || 'not chosen'}`,
      `Passenger: ${formData.firstName || 'N/A'} ${formData.lastName || ''}`.trim(),
      `Card error: ${cardNumberError || 'none'}`,
      `Date error: ${dateError || 'none'}`,
      `Payment date error: ${paymentDateError || 'none'}`,
      screenshots.length
        ? `Screenshots: ${screenshots.length} (last is most recent; use it for visual state)`
        : 'Screenshots: none available'
    ];
    if (step === 'success') {
      basics.push('Payment completed successfully. Booking confirmed.');
    }
    if (step === 'results' && searchResults.length === 0) {
      basics.push('Search returned no results (empty state shown).');
    }
    if (paymentDateError) {
      basics.push('Payment blocked: Unable to create booking. Departure date is in the past. BugScribe suggestion: Did you check the dates?');
      if (selectedFlightId) {
        const selectedFlight = FLIGHTS.find(f => f.id === selectedFlightId);
        if (selectedFlight) {
          const location = getUserLocation();
          if (location === 'TR') {
            basics.push(`Selected Flight: ${selectedFlight.time}, ${selectedFlight.class}, ${formatPrice(selectedFlight.price)} (converted from $${selectedFlight.price} USD)`);
          } else {
            basics.push(`Selected Flight: ${selectedFlight.time}, ${selectedFlight.class}, $${selectedFlight.price}`);
          }
        }
      }
    }
    // Add currency conversion info if user is in TR
    if (getUserLocation() === 'TR' && step === 'results' && searchResults.length > 0) {
      basics.push('Currency conversion: Prices displayed in Turkish Lira (TL) - INTENDED BEHAVIOR based on user location (TR)');
    }
    return basics.join(' | ');
  };

  const buildDetailsPayload = () => {
    const selectedFlight = selectedFlightId ? FLIGHTS.find(f => f.id === selectedFlightId) : null;
    return JSON.stringify(
      {
        step,
        formData,
        cardNumberError,
        dateError,
        paymentDateError,
        searchResultsCount: searchResults.length,
        selectedFlightId,
        selectedFlight: selectedFlight ? {
          id: selectedFlight.id,
          time: selectedFlight.time,
          duration: selectedFlight.duration,
          price: selectedFlight.price,
          class: selectedFlight.class,
          route: selectedFlight.route
        } : null
      },
      null,
      2
    );
  };

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

  // --- Date validation helpers ---
  const validateDateRange = (dateString) => {
    if (!dateString) {
      setDateError('');
      return true;
    }

    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + MAX_BOOKING_DAYS);

    // Check if date is in the past
    if (selectedDate < today) {
      const errorMsg = 'Departure date cannot be in the past. Please select a future date.';
      setDateError(errorMsg);
      console.warn(`[SkyDrift] Date validation failed: Past date selected. Selected: ${dateString}, Today: ${today.toISOString().split('T')[0]}`);
      return false;
    }

    // Check if date exceeds maximum booking window
    if (selectedDate > maxDate) {
      const daysOver = Math.ceil((selectedDate - maxDate) / (1000 * 60 * 60 * 24));
      const errorMsg = `Flights can only be booked up to ${MAX_BOOKING_DAYS} days in advance. Your selected date is ${daysOver} day(s) beyond the limit.`;
      setDateError(errorMsg);
      console.warn(`[SkyDrift] Date validation failed: Exceeds maximum booking window. Selected: ${dateString}, Max allowed: ${maxDate.toISOString().split('T')[0]}, Days over limit: ${daysOver}`);
      console.info(`[SkyDrift] Business rule: Maximum booking window is ${MAX_BOOKING_DAYS} days. This is a business policy, not a technical limitation.`);
      return false;
    }

    setDateError('');
    return true;
  };

  const sanitizeDateInput = (value) => {
    // Remove any non-date characters and ensure proper format
    // Allow only valid date format (YYYY-MM-DD)
    if (!value) return '';
    
    // Basic sanitization - remove any script tags or dangerous characters
    const sanitized = value.replace(/[<>]/g, '');
    
    // Validate it's a proper date string format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (sanitized && !dateRegex.test(sanitized)) {
      // If it doesn't match the expected format, return empty to let browser handle it
      return '';
    }
    
    return sanitized;
  };

  // --- Handlers ---
  const handleSearch = (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setDateError('');
    
    // Validate date if provided
    if (!formData.date) {
      setDateError('Please select a departure date.');
      return;
    }

    if (!validateDateRange(formData.date)) {
      // Date validation failed, don't proceed
      return;
    }

    setLoading(true);
    
    // Simulate API search
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilFlight = Math.ceil((selectedDate - today) / (1000 * 60 * 60 * 24));
    
    console.log(`[SkyDrift] Searching flights for route: ${formData.from} to ${formData.to}`);
    console.log(`[SkyDrift] Departure date: ${formData.date} (${daysUntilFlight} days from today)`);
    console.log(`[SkyDrift] Booking window check: ${daysUntilFlight} days (max: ${MAX_BOOKING_DAYS} days)`);
    
    // Simulate API delay
    setTimeout(() => {
      // Check if date is within valid range (double-check, in case user manipulated the input)
      const dateObj = new Date(formData.date);
      const maxDate = new Date(today);
      maxDate.setDate(today.getDate() + MAX_BOOKING_DAYS);
      
      if (dateObj > maxDate) {
        // Date exceeds limit - return empty results (this looks like a bug to users)
        console.warn(`[SkyDrift] Search date exceeds maximum booking window (${MAX_BOOKING_DAYS} days). Selected: ${formData.date}, Max allowed: ${maxDate.toISOString().split('T')[0]}`);
        console.info(`[SkyDrift] Business rule: Flights are only available for booking up to ${MAX_BOOKING_DAYS} days in advance. This is a business policy limitation, not a technical bug.`);
        console.log(`[SkyDrift] API response: 200 OK, but no flights found (date out of booking window)`);
        setSearchResults([]);
      } else if (dateObj < today) {
        // Past date - return empty results
        console.warn(`[SkyDrift] Search date is in the past. Selected: ${formData.date}, Today: ${today.toISOString().split('T')[0]}`);
        setSearchResults([]);
      } else {
        // Valid date - return flight results
        const location = getUserLocation();
        console.log(`[SkyDrift] API response: 200 OK, ${FLIGHTS.length} flights found`);
        if (location === 'TR') {
          console.log(`[SkyDrift] User location detected: Turkey (TR)`);
          console.log(`[SkyDrift] Applying currency conversion: USD → TL (Rate: ${USD_TO_TL_RATE})`);
          console.info(`[SkyDrift] INTENDED BEHAVIOR: Flight prices are automatically converted to Turkish Lira (TL) based on user's location (TR). This is a feature, not a bug.`);
          FLIGHTS.forEach(flight => {
            const priceTL = Math.round(flight.price * USD_TO_TL_RATE);
            console.log(`[SkyDrift] Flight ${flight.id}: $${flight.price} USD = ₺${priceTL} TL`);
          });
        }
        setSearchResults(FLIGHTS);
      }
      
      setLoading(false);
      setStep('results');
    }, 800);
  };

  const selectFlight = (flight) => {
    const location = getUserLocation();
    console.log(`[SkyDrift] Flight selected: ID ${flight.id}`);
    if (location === 'TR') {
      const priceTL = Math.round(flight.price * USD_TO_TL_RATE);
      console.log(`[SkyDrift] Currency conversion: $${flight.price} USD → ₺${priceTL} TL (Rate: ${USD_TO_TL_RATE})`);
      console.info(`[SkyDrift] INTENDED BEHAVIOR: Prices displayed in Turkish Lira (TL) because user location is Turkey (TR). This is automatic currency conversion based on geolocation, not a bug.`);
    }
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
    
    // Clear previous errors
    setCardNumberError('');
    setPaymentDateError('');
    
    // Validate departure date - check if it's in the past
    if (formData.date) {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        const daysPast = Math.ceil((today - selectedDate) / (1000 * 60 * 60 * 24));
        const errorMessage = `Unable to create booking. Please check your selected dates.`;
        setPaymentDateError(errorMessage);
        console.error('[SkyDrift] Booking Failed: Unable to create booking');
        console.error(`[SkyDrift] Selected departure date: ${formData.date} (${daysPast} day(s) in the past)`);
        console.error(`[SkyDrift] Today's date: ${today.toISOString().split('T')[0]}`);
        console.error(`[SkyDrift] Route: ${formData.from} → ${formData.to}`);
        console.error(`[SkyDrift] Passenger: ${formData.firstName} ${formData.lastName}`);
        console.error(`[SkyDrift] Selected Flight ID: ${selectedFlightId}`);
        console.warn('[SkyDrift] SUGGESTION: Did you check the dates? The selected departure date is in the past.');
        return; // Prevent payment processing
      }
    }
    
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
    
    setLoading(true);

    console.log('[SkyDrift] Initiating transaction...');
    console.log('[SkyDrift] Payment Gateway: Connecting...');

    // Simulate network delay
    setTimeout(() => {
      // Log successful payment processing
      console.log('[SkyDrift] Payment Gateway: Handshake successful.');
      console.log('[SkyDrift] Processing payment...');
      console.log('[SkyDrift] Payment approved. Confirmation code: BK' + Math.random().toString(36).substr(2, 9).toUpperCase());
      
      setLoading(false);
      
      // Move to Success State
      setStep('success');
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
    setDateError('');
    setPaymentDateError('');
    setSearchResults([]);
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
    const currentIdx = ['search', 'results', 'details', 'payment', 'success'].indexOf(step);
    
    if (step === 'success') return null;

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
    <div ref={appRef} className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
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
                      value={formData.date}
                      onChange={(e) => {
                        const sanitized = sanitizeDateInput(e.target.value);
                        setFormData({...formData, date: sanitized});
                        setDateError(''); // Clear error when user changes date
                        // Validate on change for immediate feedback
                        if (sanitized) {
                          validateDateRange(sanitized);
                        }
                      }}
                      max={(() => {
                        const maxDate = new Date();
                        maxDate.setDate(maxDate.getDate() + MAX_BOOKING_DAYS);
                        return maxDate.toISOString().split('T')[0];
                      })()} // Set max to 60 days from today
                      // Note: min attribute removed to allow past dates for testing
                      className={`w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none ${
                        dateError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {dateError && (
                    <p className="text-red-600 text-xs mt-1 flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {dateError}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Book up to {MAX_BOOKING_DAYS} days in advance
                  </p>
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
             <p className="text-sm text-gray-500 mb-4">
               {formData.from} to {formData.to} • {formData.date ? new Date(formData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
             </p>
             
             {searchResults.length === 0 ? (
               <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
                 <div className="flex justify-center mb-4">
                   <Plane className="h-12 w-12 text-gray-300" />
                 </div>
                 <h3 className="text-lg font-semibold text-gray-700 mb-2">No flights found</h3>
                 <p className="text-sm text-gray-500 mb-6">
                   We couldn't find any flights matching your search criteria.
                 </p>
                 <button
                   onClick={() => setStep('search')}
                   className="text-sky-600 hover:text-sky-700 text-sm font-medium underline"
                 >
                   Try a different search
                 </button>
               </div>
             ) : (
               searchResults.map(flight => (
                 <div key={flight.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-sky-500 cursor-pointer transition-all group" onClick={() => selectFlight(flight)}>
                   <div className="flex justify-between items-center">
                     <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 bg-sky-100 rounded-full flex items-center justify-center text-sky-700 font-bold">SD</div>
                        <div>
                          <div className="font-bold text-lg">{flight.time}</div>
                          <div className="text-sm text-gray-500">{flight.airline} • Direct • {flight.duration}</div>
                        </div>
                     </div>
                     <div className="text-right">
                        <div className="text-2xl font-bold text-gray-800">{formatPrice(flight.price)}</div>
                        <div className={`text-xs font-medium ${
                          flight.class === 'Business' ? 'text-purple-600' : 'text-green-600'
                        }`}>
                          {flight.class}
                        </div>
                        {getUserLocation() === 'TR' && (
                          <div className="text-xs text-gray-400 mt-1">
                            Converted from ${flight.price} USD
                          </div>
                        )}
                     </div>
                   </div>
                 </div>
               ))
             )}
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
                 <span className="text-xl font-bold">
                   {(() => {
                     const selectedFlight = selectedFlightId ? FLIGHTS.find(f => f.id === selectedFlightId) : null;
                     const price = selectedFlight ? selectedFlight.price : 120;
                     return formatPrice(price);
                   })()}
                 </span>
               </div>
               <div className="text-sm text-gray-500">
                 Includes taxes and fees
                 {getUserLocation() === 'TR' && (
                   <span className="text-xs text-gray-400 ml-2">
                     (Converted from USD)
                   </span>
                 )}
               </div>
             </div>

             {paymentDateError && (
               <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 mb-6">
                 <div className="flex items-start">
                   <AlertTriangle className="h-5 w-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                   <div className="flex-1">
                     <h3 className="text-red-800 font-semibold mb-2">Unable to Create Booking</h3>
                     <p className="text-red-700 text-sm mb-3">{paymentDateError}</p>
                     <div className="bg-white border border-red-300 rounded p-3 mt-3">
                       <p className="text-sm text-gray-700 mb-2">
                         <strong>BugScribe Suggestion:</strong> Did you check the dates? The selected departure date may be in the past or invalid.
                       </p>
                       <p className="text-xs text-gray-600 mb-3">
                         Your booking details (date, route, passenger info) will be included in the bug report.
                       </p>
                       <button
                         type="button"
                         onClick={() => {
                           setChatOpen(true);
                           // Auto-trigger bug report after a short delay
                           setTimeout(() => {
                             handleReportBug();
                           }, 500);
                         }}
                         className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                       >
                         Generate Bug Report with Booking Details
                       </button>
                     </div>
                   </div>
                 </div>
               </div>
             )}

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

        {/* STEP 5: SUCCESS */}
        {step === 'success' && (
          <div className="bg-white p-8 rounded-xl shadow-2xl border-t-8 border-green-600 text-center animate-fade-in">
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 p-4 rounded-full">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Booking Confirmed!</h1>
            <p className="text-green-600 font-semibold mb-4">
              Your flight has been successfully booked
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Route:</strong> {formData.from} → {formData.to}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Date:</strong> {formData.date ? new Date(formData.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Passenger:</strong> {formData.firstName} {formData.lastName}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Confirmation:</strong> A confirmation email has been sent to {formData.email}
              </p>
            </div>
            <p className="text-gray-600 mb-8">
              Thank you for choosing SkyDrift Airlines. We look forward to serving you!
            </p>

            <button 
              onClick={handleReset}
              className="px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors w-full"
            >
              Book Another Flight
            </button>
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
