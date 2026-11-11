# Pawgress Phase 1 prototype

Veterinary patient updates and pickup confirmation. One shared app, two experiences: Veterinary Staff and Pet Owner.

**Tagline:** Less time answering phones. More time caring for patients.

## How to run locally

```bash
npm install
npm run dev
```

Open the printed URL (or http://localhost:5173). On a desktop you’ll see a phone frame; on a phone it is full screen. Use **Add to Home Screen** from your browser menu.

## Fictional data

Clinic: Lakeside Veterinary Clinic, (570) 555-0147

Staff: Sarah (Vet Tech), Jessica (Receptionist), Dr. Smith (Veterinarian), Admin Maria (Clinic Administrator). Only Dr. Smith and Admin Maria can schedule pickup.

Owners you can log in as: Jamie Carter (Buddy), Priya Shah (Luna). Other fictional owners exist for the remaining patients but are not in the login list.

Patients today: Buddy (Surgery, In Recovery), Luna (Hospitalization, Being Monitored), Max (Dental, Procedure Started), Bella (Recovery, Resting Comfortably), Charlie (Surgery, Preparing for Surgery), Daisy (Exam, Checked In).

## What is simulated

- Push notifications are simulated in-app (bell badge + notification center). If the browser allows it, a Notification and a short vibration may also fire while the tab is open.
- “Invite staff” does not send email; it adds a pending staff row.
- Shared state lives in this browser (IndexedDB + BroadcastChannel). Switching users on the same phone, or opening staff and owner in two tabs / the desktop split demo, stays in sync. Cross-device sync is not in this Phase 1 build (a new free Supabase project could not be created — the account is already at its free-project limit).
- Camera capture uses the phone file/camera input and compresses the photo in the browser.

## Switch roles quickly

Avatar menu → **Switch user**. Or open `/?split=1` on a wide screen for staff and owner side by side.

Settings includes **Demo speed** (Real 15/30 min, Fast 20s/40s) and **Reset demo data**.
