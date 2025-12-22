# Invalid Bug Report Category - Proposals

This document outlines proposed scenarios that appear to be bugs but are actually expected behavior, user errors, or intentional limitations. These demonstrate how BugScribe can help distinguish real bugs from false positives.

---

## **Proposal 1: "My Booking" / Booking Management Page**

### **Scenario A: "Can't Cancel Past Departure Date"**
**What looks like a bug:**
- User tries to cancel a flight that already departed
- Cancel button is disabled/grayed out
- No error message explaining why

**Why it's invalid:**
- This is expected business logic - you can't cancel a flight that already happened
- The button should be disabled, but the UI doesn't explain why

**BugScribe Value:**
- Screenshot shows the disabled button
- Console logs show: `[SkyDrift] Cannot cancel: flight already departed (ID: 123, Departure: 2025-01-15)`
- Network logs show no API call was made (correct behavior)
- BugScribe can identify: "This appears to be intentional business logic, not a bug. Consider adding a tooltip explaining why cancellation is disabled."

**Implementation:**
- Add a "My Bookings" page with a list of past and upcoming flights
- Show past flights with disabled cancel buttons
- Add console logging when user attempts to cancel past flights

---

## **Proposal 2: Search Results with Business Rules**

### **Scenario B: "Search Returns No Results for Future Date"**
**What looks like a bug:**
- User searches for flights 1 year in advance
- No results appear
- User thinks the search is broken

**Why it's invalid:**
- Airlines typically only sell tickets up to 11 months in advance
- This is a business rule, not a bug

**BugScribe Value:**
- Screenshot shows empty results page
- Console logs: `[SkyDrift] Search date exceeds maximum booking window (365 days). Max: 330 days.`
- Network logs show successful API call with empty results
- BugScribe can identify: "Search is working correctly. The date is beyond the booking window. Consider showing a message: 'Flights are available up to 11 months in advance.'"

**Implementation:**
- Add date validation that limits search to 330 days in future
- Show empty state with helpful message (but make it subtle so users might miss it)
- Log the business rule in console

---

## **Proposal 3: Payment Method Restrictions**

### **Scenario C: "Visa Card Not Accepted"**
**What looks like a bug:**
- User enters a valid Visa card number
- Form shows error: "This payment method is not accepted"
- User thinks it's a bug because Visa is a common card type

**Why it's invalid:**
- The airline only accepts Mastercard and Amex for this route (business decision)
- Or: The card is from a restricted country due to sanctions
- This is a business rule, not a technical bug

**BugScribe Value:**
- Screenshot shows the error message
- Console logs: `[SkyDrift] Payment method rejected: VISA not accepted for route IST->LHR. Accepted: [MASTERCARD, AMEX]`
- Network logs show validation endpoint returned: `{ accepted: false, reason: "card_type_not_supported" }`
- BugScribe can identify: "This is a business rule restriction, not a bug. The error message could be clearer: 'Visa cards are not accepted for this route. Please use Mastercard or Amex.'"

**Implementation:**
- Add payment method validation based on route
- Show generic error message (intentionally vague to create confusion)
- Log detailed reason in console

---

## **Proposal 4: Browser/Device Limitations**

### **Scenario D: "Date Picker Doesn't Work on Mobile"**
**What looks like a bug:**
- User on mobile device taps date input
- Native date picker opens (expected on mobile)
- User expects a custom calendar popup like on desktop
- User reports: "Date picker is broken on mobile"

**Why it's invalid:**
- Mobile browsers use native date pickers for better UX
- This is platform-specific behavior, not a bug
- The app is working as designed

**BugScribe Value:**
- Screenshot shows native mobile date picker
- Console logs show: `[SkyDrift] Using native date input (mobile detected: iOS Safari)`
- User agent in diagnostics shows mobile device
- BugScribe can identify: "This is expected mobile browser behavior. Native date pickers are standard on mobile devices. Not a bug."

**Implementation:**
- Detect mobile devices
- Use native date input on mobile, custom picker on desktop
- Log device detection in console

---

## **Proposal 5: Rate Limiting / Security Features**

### **Scenario E: "Search Stopped Working After Multiple Attempts"**
**What looks like a bug:**
- User searches 10 times in 30 seconds
- 11th search fails with "Request failed"
- User thinks the app is broken

**Why it's invalid:**
- Rate limiting is a security/performance feature
- Prevents abuse and API overload
- This is intentional protection, not a bug

**BugScribe Value:**
- Screenshot shows error message
- Console logs: `[SkyDrift] Rate limit exceeded: 10 requests per 30s. Retry after 15s.`
- Network logs show: `GET /api/flights/search -> 429 Too Many Requests`
- BugScribe can identify: "This is rate limiting (429 status), not a bug. The error message could be clearer: 'Too many searches. Please wait 15 seconds before trying again.'"

**Implementation:**
- Add rate limiting to search endpoint
- Return 429 status after 10 requests in 30 seconds
- Show generic error message (intentionally unclear)

---

## **Proposal 6: Feature Limitations (Not Bugs)**

### **Scenario F: "Can't Book More Than 9 Passengers"**
**What looks like a bug:**
- User tries to select 10 passengers
- Dropdown maxes out at 9
- User thinks it's a bug

**Why it's invalid:**
- Business rule: Maximum 9 passengers per booking
- For larger groups, users must make multiple bookings
- This is a feature limitation, not a bug

**BugScribe Value:**
- Screenshot shows dropdown with max 9 selected
- Console logs: `[SkyDrift] Passenger limit reached: 9 (business rule)`
- No error in network logs (validation happens client-side)
- BugScribe can identify: "This is a business rule limitation. Consider showing a message: 'For groups larger than 9, please make multiple bookings or contact group sales.'"

**Implementation:**
- Limit passenger dropdown to 1-9
- Don't show explanation (intentionally)
- Log the limit in console

---

## **Proposal 7: User Input Errors**

### **Scenario G: "Email Validation Too Strict"**
**What looks like a bug:**
- User enters: `john.doe+test@company.co.uk`
- Form shows: "Invalid email format"
- User thinks it's a bug because this is a valid email

**Why it's invalid:**
- The email IS technically valid
- But the airline's system doesn't support plus signs in emails (legacy system limitation)
- This is a known limitation, not a bug in the validation logic

**BugScribe Value:**
- Screenshot shows validation error
- Console logs: `[SkyDrift] Email validation: plus signs not supported (legacy system limitation)`
- Network logs show validation endpoint rejected it
- BugScribe can identify: "Email format is technically valid, but system limitation. Error message should explain: 'Email addresses with + signs are not supported. Please use a different email address.'"

**Implementation:**
- Add email validation that rejects plus signs
- Show generic "Invalid email format" message
- Log the specific reason in console

---

## **Proposal 8: Session/State Management**

### **Scenario H: "Form Data Lost After 30 Minutes"**
**What looks like a bug:**
- User fills out booking form
- Leaves page open for 35 minutes
- Comes back and form is empty
- User thinks data was lost due to a bug

**Why it's invalid:**
- Session timeout is a security feature
- Prevents stale sessions and security issues
- This is expected behavior, but not clearly communicated

**BugScribe Value:**
- Screenshot shows empty form
- Console logs: `[SkyDrift] Session expired after 30 minutes of inactivity. Form cleared for security.`
- LocalStorage shows session was cleared
- BugScribe can identify: "This is a security timeout, not a bug. Consider showing a warning: 'Your session will expire in 5 minutes due to inactivity. Click here to extend.'"

**Implementation:**
- Add 30-minute session timeout
- Clear form data after timeout
- Log timeout in console
- Don't show warning (intentionally)

---

## **Proposal 9: Geographic Restrictions**

### **Scenario I: "Can't Book from Certain Countries"**
**What looks like a bug:**
- User in Country X tries to book
- Payment page shows: "Service unavailable in your region"
- User thinks the app is broken

**Why it's invalid:**
- Geographic restrictions due to regulations/sanctions
- This is a business/legal requirement, not a bug
- But the error message is unclear

**BugScribe Value:**
- Screenshot shows error message
- Console logs: `[SkyDrift] Geographic restriction: Country XX not supported (regulatory compliance)`
- Network logs show: `GET /api/check-availability -> 403 Forbidden (region: XX)`
- BugScribe can identify: "This is a geographic restriction (403), not a bug. Error message should explain: 'Booking is not available in your region due to regulatory requirements. Please contact customer service for assistance.'"

**Implementation:**
- Add IP-based geolocation check
- Block certain countries (use a test country code)
- Show generic error message
- Log detailed reason in console

---

## **Proposal 10: Browser Feature Support**

### **Scenario J: "Can't Upload Passport Photo"**
**What looks like a bug:**
- User tries to upload passport photo
- File input doesn't work
- User reports: "File upload is broken"

**Why it's invalid:**
- User is on an old browser that doesn't support File API
- Or: User is on mobile and trying to use camera, but permissions denied
- This is a browser/device limitation, not a bug

**BugScribe Value:**
- Screenshot shows file input
- Console logs: `[SkyDrift] File API not supported. Browser: IE 11. Required: FileReader API.`
- Or: `[SkyDrift] Camera permission denied by user`
- BugScribe can identify: "This is a browser compatibility issue, not a bug. The app requires modern browser features. Consider showing: 'Your browser doesn't support file uploads. Please use Chrome, Firefox, or Safari.'"

**Implementation:**
- Add file upload for passport photos
- Check for File API support
- Show error if not supported
- Log browser capabilities in console

---

## **Implementation Priority Recommendations**

### **High Priority (Easy to implement, high value):**
1. **Proposal 1**: My Bookings page with past flight cancellation
2. **Proposal 5**: Rate limiting on search
3. **Proposal 6**: Passenger limit (9 max)

### **Medium Priority (Moderate complexity, good demonstration):**
4. **Proposal 2**: Date range restrictions (11 months)
5. **Proposal 3**: Payment method restrictions
6. **Proposal 7**: Email validation with plus signs

### **Lower Priority (More complex, but valuable):**
7. **Proposal 4**: Mobile date picker differences
8. **Proposal 8**: Session timeout
9. **Proposal 9**: Geographic restrictions
10. **Proposal 10**: Browser feature detection

---

## **How BugScribe Helps with Invalid Reports**

For each scenario, BugScribe would:
1. **Capture Context**: Screenshots, console logs, network logs show the full picture
2. **Identify Patterns**: Console logs often contain the "why" (business rules, limitations)
3. **Suggest Improvements**: Even if not a bug, suggest better error messages
4. **Save Developer Time**: Quickly distinguish real bugs from false positives
5. **Document Business Rules**: Console logs serve as documentation of why something behaves this way

---

## **Next Steps**

1. Choose 3-5 proposals to implement
2. Add the new pages/flows
3. Add intentional "confusing" error messages (that look like bugs)
4. Add detailed console logging explaining the business rules
5. Test BugScribe's ability to identify these as invalid reports

