# HealPath Implementation & Testing Guide

## Overview
This guide covers the complete implementation of schedule assignment, feedback system, and recovery plan updates for the Doctor Dashboard.

## Architecture Overview

### Frontend Flow
```
User Action (Quick Actions/Table Buttons)
    ↓
Open Modal (setShowXModal = true)
    ↓
Fill Form & Validate
    ↓
Submit Handler (submitX)
    ↓
API Call (POST/PUT)
    ↓
Update Data & Close Modal (fetchData + setShowXModal = false)
    ↓
Show Success Message
```

### Backend Flow
```
API Request (has Bearer token)
    ↓
Auth Middleware (verify JWT)
    ↓
Route Handler (find doctor's data)
    ↓
Create/Update Record
    ↓
Save to MongoDB
    ↓
Return Populated Response
```

## Setup Instructions

### Prerequisites
1. Node.js 14+ installed
2. MongoDB running locally or remote connection set up
3. All dependencies installed (`npm install` in both frontend and backend)

### Backend Setup
```bash
cd backend
npm install
# Ensure .env file has:
# - MONGO_URI (MongoDB connection)
# - JWT_SECRET (for token signing)
# - PORT=5000 (or your preferred port)

npm start
```

### Frontend Setup
```bash
npm install
npm run dev
```

## Features Test Cases

### 1. Quick Actions Testing

#### Test Case 1.1: Add Feedback (Quick Actions)
1. Navigate to Doctor Dashboard
2. Click "Add Feedback" button in Quick Actions
3. **Expected**: Feedback modal opens with first patient selected
4. Enter feedback text
5. Click "Send"
6. **Expected**: Success message, modal closes, data refreshes

#### Test Case 1.2: Schedule Appointment (Quick Actions)
1. Navigate to Doctor Dashboard
2. Click "Schedule Appointment" button in Quick Actions
3. **Expected**: Schedule modal opens with first patient selected
4. Fill in time, type, and description
5. Click "Schedule"
6. **Expected**: Success message, appointment appears in schedule, modal closes

#### Test Case 1.3: Update Plan (Quick Actions)
1. Navigate to Doctor Dashboard
2. Click "Update Plan" button in Quick Actions
3. **Expected**: Plan modal opens with current plan pre-filled
4. Modify plan text
5. Click "Update"
6. **Expected**: Success message, plan updates in patient table, modal closes

### 2. Patient Table Actions Testing

#### Test Case 2.1: Edit Plan from Table
1. Navigate to Doctor Dashboard
2. Locate patient in "Assigned Patients" table
3. Click edit icon (blue pencil button)
4. **Expected**: Plan modal opens for that specific patient
5. Update plan
6. **Expected**: Changes reflected in table immediately

#### Test Case 2.2: Schedule from Table
1. Navigate to Doctor Dashboard
2. Locate patient in table
3. Click event icon (green calendar button)
4. **Expected**: Schedule modal opens for that patient
5. Fill appointment details
6. **Expected**: Appointment appears in Today's Schedule section

#### Test Case 2.3: Feedback from Table
1. Navigate to Doctor Dashboard
2. Locate patient in table
3. Click comment icon (orange comment button)
4. **Expected**: Feedback modal opens for that patient
5. Enter feedback
6. **Expected**: Message sent, modal closes, success message shown

### 3. Form Validation Testing

#### Test Case 3.1: Feedback Validation
1. Open Feedback modal
2. Try to submit without entering text
3. **Expected**: Error message "Please enter feedback"
4. Enter text and submit
5. **Expected**: Feedback sent successfully

#### Test Case 3.2: Schedule Validation
1. Open Schedule Appointment modal
2. Try to submit with empty description
3. **Expected**: Error message "Please enter description"
4. Fill all required fields
5. **Expected**: Appointment created successfully

#### Test Case 3.3: Plan Validation
1. Open Update Plan modal
2. Try to submit with empty plan
3. **Expected**: Error message "Please enter a recovery plan"
4. Enter plan text
5. **Expected**: Plan updated successfully

### 4. Data Persistence Testing

#### Test Case 4.1: Plan Update Persistence
1. Update a patient's plan in modal
2. Close modal and refresh page (F5)
3. **Expected**: Plan change persists in table

#### Test Case 4.2: Appointment Persistence
1. Schedule appointment via modal
2. Refresh page (F5)
3. **Expected**: Appointment still visible in Today's Schedule

#### Test Case 4.3: Feedback Storage
1. Send feedback to patient
2. Navigate to Messages page
3. **Expected**: Feedback message appears in conversations/messages

### 5. UI/UX Testing

#### Test Case 5.1: Loading States
1. Schedule an appointment
2. **Expected**: "Scheduling..." text appears on button while loading
3. Wait for response
4. **Expected**: Button returns to "Schedule" text

#### Test Case 5.2: Message Display
1. Perform any action (add feedback, schedule, update plan)
2. **Expected**: Toast message appears in top-right corner
3. Wait 3 seconds
4. **Expected**: Message auto-dismisses

#### Test Case 5.3: Modal Close Behavior
1. Open any modal
2. Click X button or Cancel button
3. **Expected**: Modal closes without saving
4. Form state resets on next open

#### Test Case 5.4: Empty States
1. Try to use Quick Actions with no patients
2. **Expected**: Error message "No patients assigned"
3. If no appointments today
4. **Expected**: "No appointments scheduled for today" message shown

## API Endpoints Reference

### Appointments
```
GET /api/appointments
- Get all appointments for logged-in user
- Used by: Doctor to see their appointments, Patient to see their appointments

POST /api/appointments
- Create new appointment
- Body: { patient, doctor, time, type, description, appointmentDate }
- Used by: Doctor Dashboard to schedule appointments
```

### Patients
```
GET /api/patients
- Get all patients for logged-in doctor
- Used by: Doctor Dashboard patient list

PUT /api/patients/:id
- Update patient (progress, status, plan)
- Body: { progress, status, plan } (any combination)
- Used by: Doctor Dashboard to update recovery plans
```

### Messages
```
POST /api/messages
- Send message to another user
- Body: { receiver, content }
- Used by: Feedback system to send feedback messages

GET /api/messages/conversations
- Get all conversations for logged-in user
- Used by: Messages page
```

## Common Issues & Solutions

### Issue 1: Modal doesn't open
- **Check**: Patient data loading correctly (check browser console)
- **Check**: Click handler attached to button
- **Solution**: Verify `setShowXModal(true)` fires on button click

### Issue 2: API returns 401 Unauthorized
- **Check**: Token exists in localStorage
- **Check**: Token not expired
- **Solution**: Sign out and sign in again to refresh token

### Issue 3: Feedback not appearing in Messages
- **Check**: Message sent to correct patient (check receiver ID)
- **Solution**: Navigate to Messages page and open conversation with patient

### Issue 4: Plan doesn't update
- **Check**: Patient ID is being sent correctly
- **Check**: MongoDB connection is active
- **Solution**: Check browser console and backend logs for errors

### Issue 5: Appointment doesn't appear in schedule
- **Check**: Appointment date is today's date
- **Check**: Appointment populating `patient` reference correctly
- **Solution**: Verify appointment time format is correct (HH:MM format)

## Browser Console Debugging

### Check what's being sent to API:
```javascript
// Add this to submitFeedback/submitScheduleAppointment/submitPlanUpdate
console.log('Sending data:', { ... your data ... })
```

### Monitor API responses:
```javascript
// In browser DevTools Network tab
// Filter by XHR/Fetch
// Check request/response bodies
```

### Check localStorage:
```javascript
// In browser console
localStorage.getItem('token')       // Should exist
localStorage.getItem('userId')      // Should exist
localStorage.getItem('role')        // Should be 'doctor'
```

## Performance Considerations

1. **fetchData() calls**: Occurs on:
   - Component mount
   - After successful appointment creation
   - After successful plan update
   - Refetch includes all patients and appointments

2. **Optimization opportunity**: Could add pagination for large patient lists

3. **Caching**: Currently no caching; refresh on every operation for real-time updates

## Future Enhancements

1. Add patient search/filter in table
2. Add appointment recurrence (weekly, monthly)
3. Add progress tracking with charts
4. Add file uploads for patient documents
5. Add real-time notifications
6. Add bulk operations (update multiple patients)
7. Add appointment reminders
8. Add recovery milestones/goals within plans

## Rollback Instructions

If issues occur, revert changes:

```bash
# Frontend
git checkout src/pages/DoctorDashboard.jsx

# Backend
git checkout backend/routes/patients.js
```

## Support & Debugging

1. **Check browser console**: Look for JavaScript errors
2. **Check Network tab**: Verify API requests are successful
3. **Check backend logs**: Look for server errors
4. **Check MongoDB**: Verify documents are being created/updated
5. **Check auth**: Ensure token is valid and not expired

---

**Implementation Complete**: All features are now ready for testing and use.
