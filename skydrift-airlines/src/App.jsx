import React, { useState, useEffect } from 'react';
import { Plane, Calendar, CreditCard, User, AlertTriangle, ChevronRight, Search, MapPin } from 'lucide-react';

// --- Mock Data ---
const FLIGHTS = [
  { id: 1, airline: 'SkyDrift', time: '08:00 AM - 10:30 AM', duration: '2h 30m', price: 120, route: 'IST -> LHR' },
  { id: 2, airline: 'SkyDrift', time: '02:00 PM - 04:45 PM', duration: '2h 45m', price: 145, route: 'IST -> LHR' },
  { id: 3, airline: 'SkyDrift', time: '08:00 PM - 10:30 PM', duration: '2h 30m', price: 95, route: 'IST -> LHR' },
];

export default function App() {
  const [step, setStep] = useState('search'); // search, results, details, payment, crash
  const [loading, setLoading] = useState(false);
  
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
                      className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
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
    </div>
  );
}
