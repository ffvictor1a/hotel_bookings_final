<plan_state>status=done</plan_state>

## Overview

This is a Retool React hotel-bookings management dashboard (Greek-language UI). It features KPI cards, a bookings table with inline cancel/edit actions, an allotments availability section, a changes log, and a four-tab reports section (Rooming List, Full Report, Payments, Changes). The app was originally built in this same Retool React sandbox — the source package.json contains the exact resource UUID for the sandbox `retoolDb` resource, confirming a 1-to-1 mapping.

## Services to resolve

| service | role | source signals | candidate resource type(s) | resolved |
|---------|------|----------------|---------------------------|----------|
| retoolDb | Primary relational database — stores bookings, allotments, changes | Source `package.json` resourceReferencesByFile (all 11 backend files), explicit UUID `68ce67f9-d1f5-470a-82e3-7476ff5b41aa` with displayName `retool_db` | sql (retoolDb) | retool_db |

## Data needs (lightweight)

| entity | shape | source file | service |
|--------|-------|-------------|---------|
| bookingsData | id, full_name, hotel, room_type, checkin, checkout, amount, companion, status, email, mobile, guests, created_at, billing_type, receipt_vat, receipt_tax_office, company_name, vat, tax_office, company_phone, company_address, company_email, company_activity | /imported-source/backend/bookings/getBookings.ts | retoolDb |
| allotments | id, hotel, room_type, total_allotment, price_per_night, deadline | /imported-source/backend/allotments/getAllotments.ts | retoolDb |
| changes | id, change_id, booking_id, guest_name, hotel, changed_by, changed_at, change_description, old_value, new_value, amount_delta, requires_payment, requires_refund | /imported-source/backend/changes/getChanges.ts | retoolDb |

## Source → target mapping

| source path | target path | class | transform notes |
|-------------|-------------|-------|-----------------|
| /imported-source/backend/bookings/getBookings.ts | /backend/bookings/getBookings.ts | A | Byte-identical; retoolDb global same in sandbox |
| /imported-source/backend/bookings/createBooking.ts | /backend/bookings/createBooking.ts | A | Byte-identical |
| /imported-source/backend/bookings/cancelBooking.ts | /backend/bookings/cancelBooking.ts | A | Byte-identical |
| /imported-source/backend/bookings/updateBooking.ts | /backend/bookings/updateBooking.ts | A | Byte-identical |
| /imported-source/backend/allotments/getAllotments.ts | /backend/allotments/getAllotments.ts | A | Byte-identical |
| /imported-source/backend/allotments/getAvailability.ts | /backend/allotments/getAvailability.ts | A | Byte-identical |
| /imported-source/backend/changes/getChanges.ts | /backend/changes/getChanges.ts | A | Byte-identical |
| /imported-source/backend/reports/getChangesReport.ts | /backend/reports/getChangesReport.ts | A | Byte-identical |
| /imported-source/backend/reports/getFullReport.ts | /backend/reports/getFullReport.ts | A | Byte-identical |
| /imported-source/backend/reports/getPayments.ts | /backend/reports/getPayments.ts | A | Byte-identical |
| /imported-source/backend/reports/getRoomingList.ts | /backend/reports/getRoomingList.ts | A | Byte-identical |
| /imported-source/frontend/pages/data/types.ts | /frontend/pages/data/types.ts | A | Byte-identical |
| /imported-source/frontend/styles/global.css | /frontend/styles/global.css | A | Byte-identical |
| /imported-source/frontend/pages/ui/AllotmentsSection.tsx | /frontend/pages/ui/AllotmentsSection.tsx | A | Byte-identical; relative imports already match sandbox paths |
| /imported-source/frontend/pages/ui/ChangesSection.tsx | /frontend/pages/ui/ChangesSection.tsx | A | Byte-identical |
| /imported-source/frontend/pages/ui/DataModal.tsx | /frontend/pages/ui/DataModal.tsx | A | Byte-identical |
| /imported-source/frontend/pages/ui/ManualBookingModal.tsx | /frontend/pages/ui/ManualBookingModal.tsx | A | Byte-identical |
| /imported-source/frontend/pages/ui/ChangeBookingModal.tsx | /frontend/pages/ui/ChangeBookingModal.tsx | A | Byte-identical |
| /imported-source/frontend/pages/ui/BillingDetailsModal.tsx | /frontend/pages/ui/BillingDetailsModal.tsx | A | Byte-identical |
| /imported-source/frontend/pages/Dashboard.tsx | /frontend/pages/Dashboard.tsx | A | Byte-identical |
| /imported-source/frontend/pages/ReportsTab.tsx | /frontend/pages/ReportsTab.tsx | A | Byte-identical |
| /imported-source/frontend/App.tsx | /frontend/App.tsx | B | Replace StarterCanvas placeholder with React Router Routes; import Dashboard and global.css |

## Routes & pages

| route | page file | purpose | auth required |
|-------|-----------|---------|---------------|
| / | /frontend/pages/Dashboard.tsx | Main hotel booking management dashboard | No |
| * | redirect to / | Catch-all redirect | No |

## Confirmed resources from MCP handoff

| service | resource display name | type |
|---------|-----------------------|------|
| retoolDb | retool_db | sql/retoolDb |
