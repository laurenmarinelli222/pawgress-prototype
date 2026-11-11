# Pawgress Phase 1 prototype

Veterinary patient updates and pickup confirmation. One shared app, two experiences: Veterinary Staff and Pet Owner.

**Tagline:** Less time answering phones. More time caring for patients.

**Live demo (open on your phone):** https://laurenmarinelli222.github.io/pawgress-prototype/

On a phone, use Add to Home Screen from the browser menu for a full-screen icon. Use the avatar menu → **Switch user** to test both sides on the same device. On a wide desktop, open `?split=1` for staff and owner side by side.

## How to run locally

```bash
npm install
npm run dev
```

Open the printed URL (or http://localhost:5173). Tests (Playwright, requires Chrome): start `npm run preview -- --host 127.0.0.1 --port 4173`, then `npm test`.

## Fictional data

Clinic: Lakeside Veterinary Clinic, (570) 555-0147

Staff: Sarah (Vet Tech), Jessica (Receptionist), Dr. Smith (Veterinarian), Dr. Patel (Veterinarian), Admin Maria (Clinic Administrator). Only veterinarians and Admin Maria can schedule pickup.

Owners you can log in as: Jamie Carter (Buddy), Priya Shah (Luna). Other fictional owners exist for the remaining patients but are not in the login list.

Patients today: Buddy (Surgery, In Recovery), Luna (Hospitalization, Being Monitored), Max (Dental, Procedure Started), Bella (Recovery, Resting Comfortably), Charlie (Surgery, Preparing for Surgery), Daisy (Exam, Checked In).

## What is simulated

- Push notifications are simulated in-app (bell badge + notification center). If the browser allows it, a Notification and a short vibration may also fire while the tab is open.
- “Invite staff” does not send email; it adds a pending staff row.
- Shared state lives in this browser (IndexedDB + BroadcastChannel). Switching users on the same phone, or opening staff and owner in two tabs / the desktop split demo, stays in sync. Cross-device sync is not in this Phase 1 build (a new free Supabase project could not be created — the account is already at its free-project limit; Vercel project creation was not permitted on the connected account).
- Camera capture uses the phone file/camera input and compresses the photo in the browser.

## Settings

**Demo speed:** Real (15 / 30 min) or Fast demo (20s / 40s). Unanswered pickup requests remind the owner, then mark **Needs a Call** for staff. Status is computed from timestamps, so it still works if the app is closed.

**Reset demo data** restores the starting patients, profiles, and timeline. Older in-browser demo data is upgraded automatically (schema v2) so open tabs keep working.

## Patient profiles

Tapping a patient on the staff dashboard opens a detailed profile with Overview (visit information, send update, schedule pickup, and the visit timeline), Pet, Owner, and Private staff notes. Clinic administrators, veterinarians, and vet techs can edit pet and owner profiles. Receptionists can edit owner contact details and visit information; pet clinical fields (weight, microchip, behavioral notes) are view-only for that role.

Owners can open a read-only Pet profile from My Pets or the pet header. They see basic identifying details only. Private staff notes and behavioral notes are filtered out of the owner-facing data and never appear in the owner UI. Owners do not see other families' information.

All profile data in this prototype is fictional (example.com emails, 555 phone numbers, and clearly fake microchip numbers).
