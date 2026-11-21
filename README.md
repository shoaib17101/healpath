# 🏥 HealPath — Doctor-Patient Management Platform

> A full-stack healthcare web application connecting doctors and patients through intelligent appointment scheduling, real-time messaging, video consultations, and AI-powered health guidance.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
  - [Authentication & User Management](#authentication--user-management)
  - [Doctor Dashboard](#doctor-dashboard)
  - [Patient Dashboard](#patient-dashboard)
  - [Appointment System](#appointment-system)
  - [Messaging System](#messaging-system)
  - [Video Consultations (Jitsi)](#video-consultations-jitsi)
  - [Medical Records & Patient History](#medical-records--patient-history)
  - [Doctor Discovery & Search](#doctor-discovery--search)
  - [Payment System — JazzCash / EasyPaisa (Manual Proof)](#payment-system--jazzcash--easypaisa-manual-proof)
  - [AI Health Chatbot](#ai-health-chatbot)
  - [AI Exercise Feedback](#ai-exercise-feedback)
  - [Profile Management](#profile-management)
  - [Super Admin Panel](#super-admin-panel)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Testing and Verification](#testing-and-verification)
- [Data Models](#data-models)
- [Role-Based Access Control](#role-based-access-control)

---

## Overview

HealPath is a comprehensive healthcare platform designed to streamline the interaction between doctors and patients. The system supports two distinct user roles — **Doctor** and **Patient** — each with a tailored dashboard and set of capabilities.

Key pillars of the platform:

- 📅 Smart appointment booking with doctor availability validation
- 💬 Real-time messaging and feedback between doctors and patients
- 📹 Video consultations via Jitsi Meet — no API key or account required
- 🤖 AI health assistant powered by Google Gemini
- 💳 JazzCash / EasyPaisa manual payment with proof-of-transaction verification
- 📄 Full medical record and patient recovery plan management
- 🔍 Location-aware doctor search and public profile views
- 🛡️ Super Admin panel for doctor approvals and full account oversight

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | UI framework |
| Vite | 5.4 | Build tool & dev server |
| React Router DOM | 6.14 | Client-side routing |
| Tailwind CSS | 3.4 | Utility-first styling |
| Lucide React | 1.14 | Icon library |
| Axios | 1.15 | HTTP client |
| React Hot Toast | 2.6 | Toast notifications |
| html2pdf.js | 0.14 | PDF export of prescriptions |
| @jitsi/react-sdk | 1.4 | Embedded Jitsi video meeting SDK |
| socket.io-client | 4.8 | Live connection signaling |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js + Express | 5.2 | REST API server |
| MongoDB + Mongoose | 9.5 | Database & ODM |
| Socket.io | 4.8 | Real-time events & signaling server |
| bcryptjs | 3.0 | Password hashing |
| JSON Web Tokens | 9.0 | Stateless authentication |
| Nodemailer | 8.0 | Email (password reset) |
| Helmet | 8.1 | HTTP security headers |
| Compression | 1.8 | Gzip response compression |
| dotenv | 17.4 | Environment variable loading |

---

## Features

---

### Authentication & User Management

HealPath uses **JWT-based stateless authentication** with a 7-day token lifetime stored in `localStorage`.

#### Registration (`POST /api/auth/register`)
- Supports two roles: **Doctor** and **Patient**
- **Patient** fields: name, email, password, province, city
- **Doctor** additional fields: medical category, availability schedule (days + start/end times), years of experience, consultation fees (PKR), bio, work number, clinic address, certifications
- Availability is stored as a structured object `{ days[], startTime, endTime }` to enable robust scheduling validation

#### Login (`POST /api/auth/login`)
- Email + password authentication
- Returns a JWT token, the user's role, name, and ID
- Role-based redirect on success: doctors → `/dashboard`, patients → `/patient-dashboard`

#### Password Recovery
- **Forgot Password** (`POST /api/auth/forgot-password`): Generates a cryptographically secure reset token (1-hour expiry), sends a reset link via email using Nodemailer
- **Reset Password** (`POST /api/auth/reset-password/:token`): Validates the token expiry, enforces minimum 8-character passwords, hashes and saves the new password
- **Change Password** (`PUT /api/auth/change-password`): For logged-in users — verifies current password before updating; requires 8+ character new password; accessible from the Profile page via a secure modal

#### Profile Update (`PUT /api/auth/me`)
- Doctors can update all profile fields including availability
- All users can update name, email, province, city, and profile picture (stored as base64)
- Structured availability updates normalize day names to prevent scheduling conflicts

#### Account Deletion (`DELETE /api/auth/me`)
- Permanently deletes the authenticated user's account

---

### Doctor Dashboard

The Doctor Dashboard (`/dashboard`) is the primary workspace for medical professionals. Key sections:

#### Patient List & Recovery Plans
- Displays all patients assigned to the doctor via the `Patient` model (linked by doctor ID)
- Shows patient name, email, recovery plan, progress percentage, and status (`Active`, `Review`, or `Inactive`)
- Inline action buttons per patient in the list:
  - **Edit Recovery Plan (Blue)**: Updates patient's recovery plan
  - **Schedule Appointment (Green)**: Instantly schedules a new appointment
  - **Add Feedback (Orange)**: Sends an direct feedback message to the patient (prefixed with "Feedback: ")

#### Quick Actions Panel
- Interactive quick actions at the top of the dashboard:
  - **Add Feedback**: Opens modal to send message feedback to the selected patient
  - **Schedule Appointment**: Opens appointment scheduling modal (time, type, description)
  - **Update Plan**: Opens recovery plan update modal with pre-populated current plan

#### Appointment Overview & Today's Schedule
- View all upcoming and past appointments with their current status
- Appointment statuses: `pending`, `scheduled`, `suggested`, `rejected`, `completed`, `missed`, `cancelled`, `no-show`, `paid`
- **Suggest New Appointment**: Doctors can propose appointments to patients; these appear with a `suggested` status on the patient side for accept/decline
- **Status Updates**: Doctors can mark appointments as `scheduled`, `completed`, `cancelled`, `no-show`, or `missed`
- **Unread badge**: Red notification dot on the Appointments nav item shows the count of unread appointment entries; cleared automatically when the section is visited
- Shows empty state illustration and message when no appointments are scheduled for today

#### Medical Record Entry
- Doctors can add three types of records directly from the dashboard:
  - **Prescription**: medication, dosage, frequency, duration
  - **Exercise Plan**: exercise name, sets, reps, description
  - **Clinical Note**: symptoms, diagnosis, vitals (BP, temperature, weight, heart rate)

#### Scheduling Tools
- Reschedule any upcoming appointment after validating availability
- Doctor's availability (days + time window) is enforced during scheduling

---

### Patient Dashboard

The Patient Dashboard (`/patient-dashboard`) gives patients a holistic view of their healthcare journey.

#### At a Glance
- Displays upcoming appointment details (doctor name, date, time, type)
- Shows the assigned doctor's name and available contact options

#### Appointment Suggestions
- Patients can see appointment suggestions made by their doctor
- Accept or decline each suggestion from the dashboard with one click
- Accepting transitions the appointment from `suggested` → `scheduled`

#### Quick Actions
- Links to book a new appointment, view medical history, message the doctor, and access the AI chatbot

#### AI Health Chatbot
- Floating chat widget available on the Patient Dashboard (see [AI Health Chatbot](#ai-health-chatbot) section)

---

### Appointment System

The appointment system is the core scheduling engine, enforcing real-world availability constraints.

#### Booking Flow (Patient-Initiated)
1. Patient browses to a doctor's profile page (`/doctor/:id`)
2. Selects appointment type (In Person / Tele-Health / General Consultation), date, time, and adds a description
3. Backend validates the chosen day against the doctor's available days and the chosen time against the doctor's working hours, then creates a `pending` reservation that holds the slot without taking payment
4. The doctor confirms or rejects the reservation. If rejected, no payment is taken; if confirmed, the appointment becomes payment-required
5. After confirmation, the patient submits payment proof and the appointment enters admin verification
6. The system then:
   - Creates or updates the patient's `Patient` record
   - Links it to the doctor
   - Creates the `Appointment` record
7. After an admin verifies the payment, the appointment becomes scheduled

#### Availability Validation Rules
- The chosen appointment day **must** be in the doctor's `availability.days` array
- The chosen time slot must fall within the doctor's `startTime`–`endTime` window (with a 30-minute minimum buffer before end time)
- Time comparison handles 12-hour AM/PM format

#### Appointment Statuses
| Status | Meaning |
|---|---|
| `pending` | Slot reserved and awaiting doctor confirmation |
| `pending_verification` | Payment proof submitted and awaiting admin verification |
| `scheduled` | Confirmed and upcoming |
| `suggested` | Created by a doctor for patient review |
| `rejected` | Declined by patient |
| `completed` | Consultation finished |
| `missed` | Patient did not attend |
| `cancelled` | Cancelled by doctor or patient |
| `no-show` | Patient did not show up |
| `paid` | (deprecated) Previously indicated payment verified |

#### Rescheduling
- Either party can request a reschedule via `PATCH /api/appointments/:id/reschedule`
- New date/time is validated against doctor availability before the change is applied
- Cannot reschedule appointments with terminal statuses (completed, missed, rejected, cancelled, no-show)

#### Unread Notification Count
- `GET /api/appointments/unread-count` returns the count of unread appointments for the logged-in doctor
- `PATCH /api/appointments/read-all` marks all appointments as read

---

### Messaging System

HealPath includes a full in-app messaging system between doctors and patients.

#### Conversations (`GET /api/messages/conversations`)
- Returns a deduplicated list of all unique contacts the user has exchanged messages with
- Each entry includes the contact's name, role, last message preview, and timestamp

#### Message Exchange
- `POST /api/messages` — sends a new message with optional file attachment (`fileData` + `fileName`)
- `GET /api/messages/:userId` — retrieves the full message thread between the logged-in user and a specific contact, sorted chronologically

#### Contact Discovery
- `GET /api/messages/users/doctors` — for patients: lists all available doctors to start a conversation
- `GET /api/messages/users/patients` — for doctors: lists all patients assigned to them (by matching email from `Patient` model)

#### Unread Tracking
- Each message has a `read` boolean flag
- `GET /api/messages/unread-count` — returns the count of unread incoming messages
- `PATCH /api/messages/read-all` — marks all received messages as read
- Notification badge on the Messages nav item shows the real-time unread count; it clears automatically when the Messages page is opened

---

### Video Consultations (Jitsi)

HealPath supports peer-to-peer video consultations using **Jitsi Meet**, requiring no API key, account, or payment method.

- The active video calling system on both the Messages page (`/messages`) and Appointments page (`/appointments`) is Jitsi, powered by `@jitsi/react-sdk` on the client.
- Initiating a call generates a unique, sanitized room name (derived from the appointment or conversation) on the public Jitsi server (`meet.jit.si`), so both doctor and patient land in the same private room automatically.
- `configOverwrite` disables the prejoin/lobby screen and grants moderator rights to every participant, so the call connects immediately without a PIN or "waiting for moderator" delay.
- Calls run inside a full-screen `JitsiCallModal` with camera/mic controls; closing the modal unmounts the iframe to release the camera and microphone.
- On mobile browsers, users are prompted to open the call in the native Jitsi Meet app for a more reliable connection.

> **Note:** The codebase also contains an earlier `DailyCallModal` component and `backend/routes/calls.js` Daily.co integration from a prior experiment. These are not wired into any active page and are safe to delete — Jitsi is the video calling system actually in use.

---

### Medical Records & Patient History

#### Doctor Side
Doctors create records for their patients via the Doctor Dashboard. Three record types are supported:

**Prescription** (`type: PRESCRIPTION`)
- Fields: title, description, medication, dosage, frequency, duration

**Exercise Plan** (`type: EXERCISE`)
- Fields: title, description, exercise name, sets, reps

**Clinical Note** (`type: NOTE`)
- Fields: title, description, symptoms, diagnosis, vitals (BP, temperature, weight, heart rate)

#### Patient History Page (`/patient-history/:patientId`)
- Accessible to both the doctor (for their patients) and the patient themselves
- Displays all medical records sorted newest first, grouped by type with colour-coded badges
- Each record shows the issuing doctor's name and the creation date

#### Prescription Export
- The `PrescriptionView` component allows prescriptions to be rendered as a printable/PDF document using `html2pdf.js`
- Exports include patient name, doctor name, medication details, and date

---

### Doctor Discovery & Search
A new super admin role is available to oversee platform users, approval workflows, appointments, and payment summaries.

#### Admin Panel
- Accessible at `/admin` for users with the `admin` role
- Approve or reject pending doctor registrations
- View platform-wide appointment records and payment summaries
- Manage users and delete accounts if needed

A demo admin account may be seeded using `backend/seed-admin.js`.

Seed admin credentials:
- Email: set `ADMIN_EMAIL` in `backend/.env`
- Password: set `ADMIN_PASSWORD` in `backend/.env`

To create the seed admin user:

```bash
cd backend
npm run seed-admin
```
#### Search Page (`/find-doctors`)
- Prefix search by doctor name or medical category (case-insensitive); a query only matches values that start with the entered characters
- Filter by **Province** and **City**
- Displays doctor cards with: name, category, experience, fees, rating, availability days, and a "View Profile" link
- Symptom suggestions also use case-insensitive prefix matching for English and translated symptom names

#### Doctor Profile Page (`/doctor/:id`)
- Public-facing profile showing: photo, bio, category, clinic address, certifications, experience, rating, fees
- Displays availability schedule (working days + hours)
- **Book Appointment** button triggers the booking flow
- **Rate Doctor** allows patients to submit a 1–5 star rating (cumulative average stored on the User model)

#### Doctor Rating System
- `POST /api/doctors/:id/rate` — accepts a rating (1–5), computes the new cumulative average using `(existingTotal + newRating) / (ratingCount + 1)`, and updates the doctor's `rating` and `ratingCount` fields

---

### Payment System — JazzCash / EasyPaisa (Manual Proof)

The project previously integrated Safepay as an automated payment gateway; this was removed after persistent sandbox/localhost redirect issues. It has been replaced with a **manual mobile-wallet payment flow** suited to the Pakistani market:

- Each doctor's `workNumber` is used as the JazzCash and EasyPaisa contact number; legacy `paymentDetails.jazzcashNumber` and `paymentDetails.easypaisaNumber` values remain supported as fallbacks
- When booking, the patient sees the doctor's wallet number(s) and fee, sends payment directly via JazzCash or EasyPaisa, then submits the transaction ID and payment method as proof
- `POST /api/appointments/book-with-payment` creates the appointment (status `scheduled`) and a `Payment` record in the same atomic call, keyed by a unique `transactionId` to prevent duplicate submissions
- `PATCH /api/appointments/:id/payment-proof` allows attaching/updating payment proof after the fact
- Every payment now records a commission split: the platform receives a configurable percentage (default `15%`) and the doctor receives the remaining payout amount
- Admins can mark a payment payout as paid through `PATCH /api/admin/payments/:id/mark-paid`
- The doctor receives an email notification (via Nodemailer) whenever new payment proof is submitted, so they can manually verify the transaction
- All payments are visible to the Super Admin in the Billing tab for oversight

This trades automated verification for zero dependency on a live payment gateway or public HTTPS callback URL — it works fully on localhost and requires no third-party sandbox account.

---

### AI Health Chatbot

A floating chat widget available on the Patient Dashboard, powered by **Google Gemini 2.5 Flash**.

#### Features
- Opens as a slide-up panel anchored to the bottom-right of the screen
- Maintains a full conversation history across the session
- Animated typing indicator while waiting for a response
- Animated pulse badge on the chat button draws user attention

#### System Instructions
The AI is configured as "HealPath Assistant" with instructions to:
- Help patients with recovery and general health questions
- Explain medical terminology in plain language
- Advise when professional medical attention is needed
- Always clarify it is not a substitute for professional medical advice

#### Fallback Behaviour
- If `VITE_GEMINI_API_KEY` is not set, the chatbot uses a built-in rule-based response system covering common topics (knee, shoulder, back pain, general pain)
- If the API call fails at runtime, the same rule-based responses are used as a graceful fallback so the UI always remains functional

#### Configuration
Set the following in `frontend/.env`:
```
VITE_GEMINI_API_KEY=your_google_gemini_api_key
```

---

### AI Exercise Feedback

The `/feedback` page provides AI-driven exercise session analysis for patients.

#### Metrics Displayed
- **Mobility Score** — range of motion quality
- **Precision Score** — movement accuracy
- **Recovery Score** — overall recovery trajectory

#### Session Summary
- Session duration
- Focus area (e.g., Knee stability)
- AI-generated notes with observations and next-step recommendations

> **Note:** The current implementation displays illustrative demo data. Integration with a live exercise tracking or video analysis service can be added to the `AIExerciseFeedback` component.

---

### Profile Management

The Profile page (`/profile`) allows both doctors and patients to manage their account.

#### Common Fields (All Users)
- Name, email, province, city
- Profile picture upload (stored as base64 string, displayed throughout the app)

#### Doctor-Specific Fields
- Medical category (specialty)
- Availability schedule: working days (multi-select toggles) + start/end times with AM/PM
- Years of experience
- Consultation fees (PKR)
- Professional bio
- Work phone number (11-digit validation)
- Clinic address
- Certifications

#### Change Password Modal
- Triggered from a dedicated "Change Password" button on the profile page
- Requires the user's current password for verification
- Enforces a minimum of 8 characters for the new password
- Input fields include password visibility toggles

---

### Super Admin Panel

HealPath includes a **Super Admin** role (`role: 'admin'`) with a dedicated dashboard at `/admin`, giving platform-wide oversight and control that neither doctors nor patients have access to.

#### Doctor Approval Workflow
- New doctor registrations are created with `status: 'pending'` and are **excluded from public doctor search** until approved
- Patients and admins default to `status: 'approved'` on creation
- The admin's Overview tab surfaces a live "Doctor Applications" queue; approving a doctor immediately makes them searchable, rejecting keeps them hidden with a `rejected` badge

#### Account Management (Doctors & Patients)
- Sidebar-organized tabs: **Overview, Doctors, Patients, Appointments, Billing**
- Every account can be **Suspended** (blocks login with a 403 message), **Re-activated**, or **permanently Deleted**
- Search/filter by name or email across doctor and patient lists
- Status is always visible as a colored badge: Pending (amber), Approved (green), Suspended (red), Rejected (gray)

#### Platform Oversight
- **Overview stats**: total approved doctors, total patients, total appointments, pending doctor approvals, and total revenue collected (aggregated from completed payments)
- **Appointments tab**: every appointment on the platform across all doctors and patients
- **Billing tab**: every payment record with patient, doctor, amount, method, and transaction ID — supporting manual verification of the JazzCash/EasyPaisa proof-of-payment flow

#### Access Control
- All `/api/admin/*` routes are protected by both the standard `auth` JWT middleware and an `admin` middleware that rejects any non-admin role
- The first Super Admin account is created via `backend/seed-admin.js` (see [Getting Started](#getting-started))

---

## Project Structure

```
healpath/
├── backend/
│   ├── middleware/
│   │   └── auth.js              # JWT verification middleware
│   ├── models/
│   │   ├── Appointment.js       # Appointment schema & statuses
│   │   ├── MedicalRecord.js     # Prescriptions, exercises, notes
│   │   ├── Message.js           # Chat messages with read tracking
│   │   ├── Patient.js           # Patient profile (linked to User)
│   │   └── User.js              # Core user (doctor + patient)
│   ├── routes/
│   │   ├── appointments.js      # Booking, rescheduling, status updates
│   │   ├── auth.js              # Register, login, password management
│   │   ├── calls.js             # Daily.co video room creation/tokens
│   │   ├── doctors.js           # Doctor search, profile, rating
│   │   ├── history.js           # Medical record CRUD
│   │   ├── messages.js          # Messaging & conversations
│   │   ├── patients.js          # Patient recovery plans and progress
│   ├── utils/
 (payment-related files removed)
│   ├── server.js                # Express app entry point
│   └── .env                     # Backend environment variables
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── AIHealthChatbot.jsx     # Floating Gemini AI chat widget
    │   │   ├── DailyCallModal.jsx      # Telehealth Daily.co call iframe modal
    │   │   ├── DashboardShell.jsx      # Shared dashboard layout wrapper
    │   │   ├── JitsiCallModal.jsx      # Public Jitsi video call meeting modal
    │   │   ├── PageLoader.jsx          # Suspense fallback loader
    │   │   ├── PrescriptionView.jsx    # PDF-exportable prescription view
    │   │   └── ProtectedRoute.jsx      # Auth + role guard for routes
    │   ├── pages/
    │   │   ├── AIExerciseFeedback.jsx  # Exercise analysis dashboard
    │   │   ├── Appointments.jsx        # Unified appointment management
    │   │   ├── Contact.jsx             # Contact / support page
    │   │   ├── DoctorDashboard.jsx     # Doctor workspace
    │   │   ├── DoctorProfileView.jsx   # Public doctor profile & booking
    │   │   ├── ForgotPassword.jsx      # Forgot & reset password flows
    │   │   ├── LandingPage.jsx         # Public marketing landing page
    │   │   ├── Messages.jsx            # In-app messaging interface
    │   │   ├── NotFound.jsx            # 404 page
    │   │   ├── PatientDashboard.jsx    # Patient workspace
    │   │   ├── PatientHistory.jsx      # Medical record history viewer
    │   │   ├── PaymentDebugLogs.jsx    # Diagnostic payment logs viewer
    │   │   ├── Profile.jsx             # Profile editor for all users
    │   │   ├── SearchDoctors.jsx       # Doctor discovery & filtering
    │   │   ├── SignIn.jsx              # Login page
    │   │   └── SignUp.jsx              # Registration page (role-aware)
    │   ├── App.jsx                     # Route definitions (lazy-loaded)
    │   ├── api.js                      # Axios base instance
    │   └── main.jsx                    # React entry point
    ├── index.html
    └── vite.config.js
```

---

## API Reference

### Auth (`/api/auth`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | No | Create a new doctor or patient account |
| POST | `/login` | No | Authenticate and receive a JWT |
| GET | `/me` | ✅ | Get the current user's profile |
| PUT | `/me` | ✅ | Update profile fields |
| DELETE | `/me` | ✅ | Delete account permanently |
| POST | `/forgot-password` | No | Send a password reset email |
| POST | `/reset-password/:token` | No | Reset password using email token |
| PUT | `/change-password` | ✅ | Change password (requires current password) |

### Appointments (`/api/appointments`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | ✅ | Get appointments for logged-in user |
| POST | `/` | ✅ | Book or suggest a new appointment |
| GET | `/unread-count` | ✅ | Get count of unread appointments (doctor) |
| PATCH | `/read-all` | ✅ | Mark all appointments as read |
| PATCH | `/:id/status` | ✅ | Update appointment status |
| PATCH | `/:id/reschedule` | ✅ | Reschedule an appointment |
| DELETE | `/:id` | ✅ | Delete an appointment |

### Doctors (`/api/doctors`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | No | Search doctors (name, category, province, city) |
| GET | `/:id` | ✅ | Get a single doctor's profile |
| GET | `/:id/availability` | No | Get a doctor's availability schedule |
| POST | `/:id/rate` | ✅ | Submit a 1–5 star rating for a doctor |

### Messages (`/api/messages`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/conversations` | ✅ | List all unique conversation contacts |
| GET | `/unread-count` | ✅ | Get unread incoming message count |
| PATCH | `/read-all` | ✅ | Mark all received messages as read |
| GET | `/users/doctors` | ✅ | List all doctors (for patients) |
| GET | `/users/patients` | ✅ | List assigned patients (for doctors) |
| POST | `/` | ✅ | Send a message (with optional file) |
| GET | `/:userId` | ✅ | Get message thread with a specific user |

<!-- Payments API removed -->

### Calls (`/api/calls`)
> ⚠️ Legacy Daily.co routes — not called by any active page. Jitsi calls are handled entirely client-side via `@jitsi/react-sdk` and require no backend route.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/create-room` | ✅ | (Unused) Create a Daily.co video room |
| POST | `/create-token` | ✅ | (Unused) Generate a Daily.co meeting token |

### Admin (`/api/admin`)
> All routes require both a valid JWT **and** `role: 'admin'`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/users` | List all doctors & patients |
| GET | `/users/pending-doctors` | List doctors awaiting approval |
| PATCH | `/users/:id/approve` | Approve a pending doctor |
| PATCH | `/users/:id/reject` | Reject a pending doctor |
| PATCH | `/users/:id/suspend` | Suspend any doctor/patient account |
| PATCH | `/users/:id/reactivate` | Re-activate a suspended account |
| DELETE | `/users/:id` | Permanently delete an account |
| GET | `/appointments` | List every appointment platform-wide |
| GET | `/payments` | List every payment record platform-wide |
| GET | `/stats` | Dashboard stats: doctor/patient/appointment counts, pending approvals, total revenue |

### History (`/api/history`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/:patientId` | ✅ | Get all medical records for a patient |
| POST | `/` | ✅ (doctor only) | Add a new medical record |

### Patients (`/api/patients`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | ✅ | List all patients assigned to the doctor (or patient's own records) |
| POST | `/` | ✅ (doctor only) | Create a new patient record |
| PUT | `/:id` | ✅ (doctor only) | Update patient progress, status, and recovery plan |

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Database
MONGO_URI=mongodb://localhost:27017/healpath

# Authentication
JWT_SECRET=your_jwt_secret_here

# Server
PORT=8000

# Daily.co API (legacy — not used by any active feature, safe to omit)
DAILY_API_KEY=your_daily_api_key

# Email (for password reset)
EMAIL_HOST=smtp.yourprovider.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your@email.com
EMAIL_PASS=your_email_password
EMAIL_FROM=no-reply@healpath.com

# Deployment URLs
BACKEND_HOST=http://localhost:8000
FRONTEND_HOST=http://localhost:5173
# Password-reset links use this URL in production
FRONTEND_URL=http://localhost:5173

# Optional seed accounts
ADMIN_EMAIL=admin@healpath.com
ADMIN_PASSWORD=replace_with_a_unique_password
SEED_DOCTOR_PASSWORD=replace_with_a_unique_password
```

### Frontend (`frontend/.env`)

```env
# Google Gemini AI (optional — chatbot uses built-in fallback if not set)
VITE_GEMINI_API_KEY=your_google_gemini_api_key

# Backend API base URL
VITE_API_URL=http://localhost:8000
```

---

## Getting Started

### Prerequisites
- Node.js >= 18
- MongoDB (local or Atlas)
- npm

### 1. Clone the repository
```bash
git clone <repository-url>
cd healpath
```

### 2. Set up the Backend
```bash
cd backend
npm install

# Copy and edit environment variables
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, and email credentials

npm start
# Server + Socket.io runs on http://localhost:8000
```

### 3. Set up the Frontend
```bash
cd frontend
npm install

# Copy and edit environment variables
cp .env.example .env
# Add your VITE_GEMINI_API_KEY if you want the live AI chatbot

npm run dev
# Frontend runs on http://localhost:5173
```

### 4. Seed Sample Doctors (Optional)
```bash
cd backend
node seed_doctors.js
```
Set `SEED_DOCTOR_PASSWORD` in `backend/.env` first. All sample doctor accounts use that password; the local credentials document is intentionally not included in Git.

### 5. Seed the Super Admin (Required for Admin Panel)
```bash
cd backend
node seed-admin.js
```
Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env` first. The script creates the first Super Admin account with those credentials.

---

## Testing and Verification

### Automated checks

Run the backend regression suite:

```bash
cd backend
npm test
```

Build the frontend production bundle:

```bash
cd frontend
npm run build
```

The backend suite covers doctor search behavior, public doctor access, payment splitting, user status rules, and profile persistence. The frontend build catches JSX, module, and bundling errors.

### Manual smoke test

With MongoDB, the backend, and the frontend running:

1. Create or seed a doctor account and approve it from the Admin panel.
2. Confirm the doctor appears in **Find Doctors** and search only returns prefix matches.
3. Log in as a patient, select the doctor, choose an available date, and confirm time slots appear.
4. Open the payment step and confirm the doctor's `workNumber` is shown for both JazzCash and EasyPaisa.
5. Log in as the doctor and confirm suggested appointments can be created.

### Live API checks

```bash
curl http://localhost:8000/api/doctors
curl "http://localhost:8000/api/doctors?search=zak"
curl "http://localhost:8000/api/doctors/<doctor-id>/availability"
```

The API requires an approved doctor for public profile and availability responses. WebSocket connection warnings affect real-time messaging or call notifications, but do not block normal REST API requests, appointments, or payments.

---

## Data Models

### User
```
name, email, password (hashed), role (doctor|patient|admin)
status: pending | approved | rejected | suspended
  (defaults to 'approved' for patients/admins, 'pending' for doctors)
province, city, profilePic (base64)
// Doctor fields:
category, availability { days[], startTime, endTime, startPeriod, endPeriod }
experience, fees, bio, workNumber, clinicAddress, certifications
paymentDetails { jazzcashNumber, easypaisaNumber }
rating, ratingCount
resetPasswordToken, resetPasswordExpires
```

### Patient
```
name, email, plan, progress (0–100), status (Active|Inactive|Review)
doctor (ref: User)
```

### Appointment
```
patient (ref: Patient), doctor (ref: User)
time, description
type: IN PERSON | TELE-HEALTH | General Consultation
date, status, read (boolean)
```

### MedicalRecord
```
patient (ref: Patient), doctor (ref: User)
type: PRESCRIPTION | EXERCISE | NOTE
title, description
// Prescription: medication, dosage, frequency, duration
// Exercise: exerciseName, sets, reps
// Note: symptoms, diagnosis, vitals { bp, temp, weight, heartRate }
date
```

### Message
```
sender (ref: User), receiver (ref: User)
content, fileData, fileName
read (boolean), date
```

### Payment
```
patientId (ref: User), doctorId (ref: User)
amount, method (JazzCash|EasyPaisa|Unknown), transactionId (unique)
status: pending | completed | failed | cancelled
appointmentId (ref: Appointment, optional)
date
```

---

## Role-Based Access Control

| Feature | Patient | Doctor | Admin |
|---|---|---|---|
| Book appointment (patient-initiated) | ✅ | ❌ | ❌ |
| Suggest appointment (doctor-initiated) | ❌ | ✅ | ❌ |
| Accept / decline appointment suggestion | ✅ | ❌ | ❌ |
| View own appointments | ✅ | ✅ | ❌ |
| Mark appointment completed/missed/no-show | ❌ | ✅ | ❌ |
| Cancel appointment | ✅ | ✅ | ❌ |
| Add medical records (prescriptions, etc.) | ❌ | ✅ | ❌ |
| View medical history | ✅ (own) | ✅ (their patients) | ❌ |
| Message doctors | ✅ | ❌ | ❌ |
| Message patients | ❌ | ✅ (assigned patients only) | ❌ |
| Search all doctors | ✅ | ✅ | ❌ |
| Rate a doctor | ✅ | ❌ | ❌ |
| Submit payment proof (JazzCash/EasyPaisa) | ✅ | ❌ | ❌ |
| Initiate video call | ✅ | ✅ | ❌ |
| Access AI Health Chatbot | ✅ | ❌ | ❌ |
| Edit own profile | ✅ | ✅ | ❌ |
| Approve / reject doctor registrations | ❌ | ❌ | ✅ |
| Suspend / re-activate / delete any account | ❌ | ❌ | ✅ |
| View all appointments & payments platform-wide | ❌ | ❌ | ✅ |

---

> Built with ❤️ for better healthcare access.
