import { useState } from 'react';

// --- Mock Data & Constants ---
export const FLIGHTS = [
  { id: 1, airline: 'SkyDrift', time: '06:00 AM - 08:15 AM', duration: '2h 15m', price: 125, route: 'IST -> LHR', class: 'Economy' },
  { id: 2, airline: 'SkyDrift', time: '08:00 AM - 10:30 AM', duration: '2h 30m', price: 120, route: 'IST -> LHR', class: 'Economy' },
  { id: 3, airline: 'SkyDrift', time: '10:15 AM - 12:45 PM', duration: '2h 30m', price: 135, route: 'IST -> LHR', class: 'Economy' },
  { id: 4, airline: 'SkyDrift', time: '02:00 PM - 04:45 PM', duration: '2h 45m', price: 145, route: 'IST -> LHR', class: 'Economy' },
  { id: 5, airline: 'SkyDrift', time: '04:30 PM - 07:00 PM', duration: '2h 30m', price: 150, route: 'IST -> LHR', class: 'Business' },
  { id: 6, airline: 'SkyDrift', time: '06:00 PM - 08:30 PM', duration: '2h 30m', price: 140, route: 'IST -> LHR', class: 'Economy' },
  { id: 7, airline: 'SkyDrift', time: '08:00 PM - 10:30 PM', duration: '2h 30m', price: 95, route: 'IST -> LHR', class: 'Economy' },
  { id: 8, airline: 'SkyDrift', time: '10:45 PM - 01:15 AM+1', duration: '2h 30m', price: 110, route: 'IST -> LHR', class: 'Economy' },
];

export const MAX_BOOKING_DAYS = 60;
const USD_TO_TL_RATE = 30;

// --- Helper Functions (Pure Logic) ---

export const getUserLocation = () => {
  return 'TR'; // Always TR for this demo
};

export const formatPrice = (priceUSD, showBoth = false) => {
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

// --- Main Application Logic Hook ---
export const useSkyDriftApp = () => {
  const [step, setStep] = useState('search');
  const [loading, setLoading] = useState(false);
  const [cardNumberError, setCardNumberError] = useState('');
  const [dateError, setDateError] = useState('');
  const [paymentDateError, setPaymentDateError] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFlightId, setSelectedFlightId] = useState(null);
  
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

  const validateDateRange = (dateString) => {
    if (!dateString) {
      setDateError('');
      return true;
    }

    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + MAX_BOOKING_DAYS);

    if (selectedDate < today) {
      const errorMsg = 'Departure date cannot be in the past. Please select a future date.';
      setDateError(errorMsg);
      console.warn(`[SkyDrift] Date validation failed: Past date selected. Selected: ${dateString}, Today: ${today.toISOString().split('T')[0]}`);
      return false;
    }

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
    if (!value) return '';
    const sanitized = value.replace(/[<>]/g, '');
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (sanitized && !dateRegex.test(sanitized)) {
      return '';
    }
    return sanitized;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setDateError('');
    
    if (!formData.date) {
      setDateError('Please select a departure date.');
      return;
    }

    if (!validateDateRange(formData.date)) {
      return;
    }

    setLoading(true);
    
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilFlight = Math.ceil((selectedDate - today) / (1000 * 60 * 60 * 24));
    
    console.log(`[SkyDrift] Searching flights for route: ${formData.from} to ${formData.to}`);
    console.log(`[SkyDrift] Departure date: ${formData.date} (${daysUntilFlight} days from today)`);
    console.log(`[SkyDrift] Booking window check: ${daysUntilFlight} days (max: ${MAX_BOOKING_DAYS} days)`);
    
    setTimeout(() => {
      const dateObj = new Date(formData.date);
      const maxDate = new Date(today);
      maxDate.setDate(today.getDate() + MAX_BOOKING_DAYS);
      
      if (dateObj > maxDate) {
        console.warn(`[SkyDrift] Search date exceeds maximum booking window (${MAX_BOOKING_DAYS} days). Selected: ${formData.date}, Max allowed: ${maxDate.toISOString().split('T')[0]}`);
        console.info(`[SkyDrift] Business rule: Flights are only available for booking up to ${MAX_BOOKING_DAYS} days in advance.`);
        console.log(`[SkyDrift] API response: 200 OK, but no flights found (date out of booking window)`);
        setSearchResults([]);
      } else if (dateObj < today) {
        console.warn(`[SkyDrift] Search date is in the past. Selected: ${formData.date}, Today: ${today.toISOString().split('T')[0]}`);
        setSearchResults([]);
      } else {
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
      console.info(`[SkyDrift] INTENDED BEHAVIOR: Prices displayed in Turkish Lira (TL) because user location is Turkey (TR).`);
    }
    setSelectedFlightId(flight.id);
    setStep('details');
  };

  const handleDetailsSubmit = (e) => {
    e.preventDefault();
    console.log('[SkyDrift] Passenger details captured. Validating...');
    setStep('payment');
  };

  const handleFinalBooking = (e) => {
    e.preventDefault();
    setCardNumberError('');
    setPaymentDateError('');
    
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
        console.warn('[SkyDrift] SUGGESTION: Did you check the dates? The selected departure date is in the past.');
        return;
      }
    }
    
    const cardNumberDigits = formData.cardNumber.replace(/\s/g, '');
    const expectedDigits = 16;
    
    if (cardNumberDigits.length !== expectedDigits) {
      const errorMessage = `Card number must contain exactly ${expectedDigits} digits. You entered ${cardNumberDigits.length} digit(s).`;
      setCardNumberError(errorMessage);
      console.error('[SkyDrift] Card Number Validation Error:', errorMessage);
      console.error(`[SkyDrift] Expected: ${expectedDigits} digits, Received: ${cardNumberDigits.length} digits`);
      return;
    }
    
    setLoading(true);
    console.log('[SkyDrift] Initiating transaction...');
    console.log('[SkyDrift] Payment Gateway: Connecting...');

    setTimeout(() => {
      console.log('[SkyDrift] Payment Gateway: Handshake successful.');
      console.log('[SkyDrift] Processing payment...');
      console.log('[SkyDrift] Payment approved.');
      setLoading(false);
      setStep('success');
    }, 2000);
  };

  const handleReset = () => {
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

  const handleBack = () => {
    switch (step) {
        case 'results':
        setStep('search');
        break;
        case 'details':
        setStep('results');
        break;
        case 'payment':
        setStep('details');
        break;
        default:
        break;
    }
    };

  return {
    state: {
      step,
      loading,
      formData,
      searchResults,
      selectedFlightId,
      errors: {
        date: dateError,
        card: cardNumberError,
        paymentDate: paymentDateError
      }
    },
    actions: {
      setStep,
      setFormData,
      sanitizeDateInput,
      validateDateRange,
      handleSearch,
      selectFlight,
      handleDetailsSubmit,
      handleFinalBooking,
      handleReset,
      handleBack
    }
  };
};