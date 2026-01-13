import React from 'react';
import { Plane, Calendar, CreditCard, User, AlertTriangle, ChevronRight, Search, MapPin, CheckCircle, ArrowLeft } from 'lucide-react';
import { useSkyDriftApp, formatPrice, getUserLocation, MAX_BOOKING_DAYS, FLIGHTS } from './app_logic';

export default function App() {
  // Extract state and actions from our Logic Hook
  const { state, actions } = useSkyDriftApp();
  const { step, loading, formData, searchResults, selectedFlightId, errors } = state;

  // --- Components for Layout ---
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
            <form onSubmit={actions.handleSearch} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase">From</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input 
                      type="text" 
                      value={formData.from}
                      onChange={e => actions.setFormData({...formData, from: e.target.value})}
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
                      onChange={e => actions.setFormData({...formData, to: e.target.value})}
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
                        const sanitized = actions.sanitizeDateInput(e.target.value);
                        actions.setFormData({...formData, date: sanitized});
                        if (sanitized) actions.validateDateRange(sanitized);
                      }}
                      max={(() => {
                        const maxDate = new Date();
                        maxDate.setDate(maxDate.getDate() + MAX_BOOKING_DAYS);
                        return maxDate.toISOString().split('T')[0];
                      })()} 
                      className={`w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none ${
                        errors.date ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.date && (
                    <p className="text-red-600 text-xs mt-1 flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {errors.date}
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
              {/* Back Button Header */}
              <div className="flex items-center mb-4">
                <button 
                  onClick={actions.handleBack}
                  className="flex items-center text-gray-500 hover:text-sky-600 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  <span className="font-medium">Change Search</span>
                </button>
              </div>

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
                    onClick={() => actions.setStep('search')}
                    className="text-sky-600 hover:text-sky-700 text-sm font-medium underline"
                  >
                    Try a different search
                  </button>
                </div>
              ) : (
                searchResults.map(flight => (
                  <div key={flight.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-sky-500 cursor-pointer transition-all group" onClick={() => actions.selectFlight(flight)}>
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

        {/* STEP 3: DETAILS */}
        {step === 'details' && (
          <div className="bg-white p-8 rounded-xl shadow-lg animate-fade-in">
            <h2 className="text-2xl font-bold mb-6">Who is flying?</h2>
            <form onSubmit={actions.handleDetailsSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">First Name</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. John"
                    value={formData.firstName}
                    onChange={e => actions.setFormData({...formData, firstName: e.target.value})}
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
                    onChange={e => actions.setFormData({...formData, lastName: e.target.value})}
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
                    onChange={e => actions.setFormData({...formData, passport: e.target.value})}
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
                    onChange={e => actions.setFormData({...formData, email: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500" 
                  />
              </div>

              {/* BUTTONS */}
              <div className="flex gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={actions.handleBack}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors flex items-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </button>
                
                <button type="submit" className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-lg flex justify-center items-center">
                  Continue to Payment
                  <ChevronRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 4: PAYMENT */}
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

              {errors.paymentDate && (
                <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-red-800 font-semibold mb-2">Unable to Create Booking</h3>
                      <p className="text-red-700 text-sm mb-3">{errors.paymentDate}</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={actions.handleFinalBooking} className="space-y-4">
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
                         actions.setFormData({...formData, cardNumber: e.target.value});
                       }}
                       className={`w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-sky-500 ${
                         errors.card ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                       }`}
                     />
                   </div>
                   {errors.card && (
                     <p className="text-red-600 text-sm mt-1 flex items-center">
                       <AlertTriangle className="h-4 w-4 mr-1" />
                       {errors.card}
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

                  {/* BUTTONS */}
                  <div className="flex gap-3 mt-6">
                    <button 
                      type="button" 
                      disabled={loading}
                      onClick={actions.handleBack}
                      className="px-6 py-4 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center"                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </button> 

                    <button 
                      type="submit" 
                      disabled={loading}
                      className={`flex-1 text-white font-bold py-4 rounded-lg flex items-center justify-center transition-all ${
                        loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {loading ? 'Processing Transaction...' : 'Pay & Book Flight'}
                      {!loading && <ChevronRight className="ml-2 h-5 w-5" />}
                    </button>
                  </div>
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
              onClick={actions.handleReset}
              className="px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors w-full"
            >
              Book Another Flight
            </button>
          </div>
        )}

      </main>
    </div>
  );
}