# APEx Athens 2026 — Accommodation Booking System

Σύστημα διαχείρισης κρατήσεων ξενοδοχείων για το APEx Athens 2026 (Asteria Domus, Glyfada). Καλύπτει: δημόσια φόρμα κράτησης, πληρωμές μέσω Stripe, allotment/availability logic, audit trail αλλαγών, admin dashboard, Excel exports, email confirmations.

**Status:** Λειτουργικό end-to-end (test mode στο Stripe). Δεν έχει πάει ακόμα live με πραγματικές πληρωμές.

---

## 1. Αρχιτεκτονική — επισκόπηση

```
Guest                    Cloudflare Worker           Retool Workflow A          Stripe
  |                        (CORS proxy #1)             (booking + checkout)        |
  |--- submit φόρμα ------>|                                                       |
  |                        |--- POST + API key -------->|                         |
  |                        |                             |--- INSERT booking       |
  |                        |                             |    (pending/waitlisted) |
  |                        |                             |--- create Checkout ---->|
  |                        |                             |<---- session url -------|
  |                        |<---- { checkoutUrl } -------|                         |
  |<--- redirect ----------|                                                       |
  |                                                                                |
  |----------------------------- πληρωμή στο Stripe Checkout -------------------->|
                                                                                    |
                                                          Stripe webhook            |
                                                          (checkout.session.completed)
                                                                |
                          Cloudflare Worker            Retool Workflow B           |
                          (CORS/relay #2)               (payment confirmation)     |
                                |<------------------------------|<-----------------|
                                |--- UPDATE status='paid' ------>|
                                |--- INSERT audit log ("changes")|
                                |--- send confirmation email ---->|
```

**Admin Dashboard** (ξεχωριστό Retool app) διαβάζει live από την ίδια Retool Database (`bookingsData`, `allotments`, `changes`) και προσφέρει: KPIs, γραφήματα, manual booking, ακυρώσεις, Excel exports.

---

## 2. Συστατικά μέρη

### 2.1 Booking Form (`accommodation-tab.html`)
Standalone HTML/CSS/JS αρχείο (χωρίς frameworks). Είναι ταυτόχρονα:
- Clone του σχεδιασμού του accommodation tab (λίστα ξενοδοχείων + χάρτης + sort)
- Φόρμα κράτησης (modal), με πεδία: ονοματεπώνυμο, email, κινητό, ημερομηνίες, ξενοδοχείο, τύπος δωματίου, άτομα, συνοδός, ειδικές ανάγκες, παρατηρήσεις, τιμολόγηση (απόδειξη/τιμολόγιο), αποδοχή όρων.
- Client-side validation (αρνητικός αριθμός ατόμων, ημερομηνία αναχώρησης πριν την άφιξη, μορφή κινητού).
- Live υπολογισμός τιμής (`roomPricing` object, νύχτες × τιμή/βράδυ).
- Χειρισμός response: redirect σε Stripe (`checkoutUrl`) ή εμφάνιση μηνύματος waitlist.

Το κομμάτι "Φόρμα Κράτησης" είναι σαφώς σημειωμένο μέσα στον κώδικα με σχόλια `👉` (αρχή/τέλος), ώστε να είναι εύκολο να μεταφερθεί σε πραγματικό site αργότερα.

⚠️ **Δεν χρησιμοποιεί ακόμα πραγματικό domain** — τα `success_url`/`cancel_url` του Stripe δείχνουν σε `example.com` placeholder. Πρέπει να αλλάξουν πριν το production.

### 2.2 Cloudflare Workers (2x, ρόλος: CORS/auth relay)
Το Retool webhook δεν υποστηρίζει CORS για κλήσεις απευθείας από browser, οπότε δύο μικρά Workers μεσολαβούν:

- **`apex-booking-proxy`** — δέχεται τα POST της φόρμας, προσθέτει το API key του Workflow A, προωθεί server-to-server.
- **`apex-stripe-relay`** — δέχεται το webhook event του Stripe, προσθέτει το API key του Workflow B, προωθεί server-to-server.

Και τα δύο κρατούν τα αντίστοιχα Retool API keys κρυφά (δεν είναι ορατά στον client-side κώδικα).

⚠️ **Γνωστός περιορισμός ασφαλείας**: και οι δύο Workers έχουν `Access-Control-Allow-Origin: '*'` — τεχνικά, οποιοσδήποτε ξέρει το Worker URL θα μπορούσε να στείλει δικά του δεδομένα. Αποδεκτό ρίσκο για μικρής κλίμακας event, όχι για production συστήματα μεγάλης κλίμακας.

### 2.3 Retool Database — Πίνακες

| Table | Ρόλος | Βασικές στήλες |
|---|---|---|
| `bookingsData` | Όλες οι κρατήσεις | id, full_name, email, mobile, checkin, checkout, hotel, room_type, guests, companion, special_needs, notes, billing_type, company_name, vat, tax_office, status, amount, created_at, group_name, created_by |
| `allotments` | Πόσα δωμάτια υπάρχουν ανά ξενοδοχείο/τύπο | hotel, room_type, total_allotment, price_per_night, deadline |
| `changes` | Ενιαίο audit trail — πληρωμές, ακυρώσεις, κάθε αλλαγή | booking_id, guest_name, hotel, changed_by, changed_at, change_description, old_value, new_value, amount_delta, requires_payment, requires_refund |

**`status` values σε χρήση:** `pending`, `paid`, `confirmed`, `cancelled`, `waitlisted`, `hosted` (για δωρεάν συμμετοχή)

⚠️ Παλιότερα είχε φτιαχτεί και table `paymentStatus` — **δεν χρησιμοποιείται πλέον**, ενοποιήθηκε στο `changes`. Μπορεί να διαγραφεί.

### 2.4 Retool Workflow A — "Booking" (`af6fb092-...`)
Trigger: Webhook (POST από τον booking-proxy Worker)

1. `checkAvailability` — SELECT στο `allotments` + live COUNT στο `bookingsData`, ελέγχει αν υπάρχει διαθέσιμο δωμάτιο
2. `code1` — INSERT στο `bookingsData`, με status υπολογισμένο δυναμικά (`pending` αν διαθέσιμο, `waitlisted` αν sold out) — fail-safe: αν δεν βρεθεί allotment row, default σε `pending`
3. **Branch**: `code1.data[0].status === 'pending'`
   - **If** → `query1` (Stripe: POST `/v1/checkout/sessions`, μέσω `stripeAcc` resource) → `response1` (`{checkoutUrl: query1.data.url}`)
   - **Else** → `response2` (`{waitlisted: true, message: "..."}`)

### 2.5 Retool Workflow B — "Payment confirmation" (`fb1a43fe-...`)
Trigger: Webhook (POST από τον stripe-relay Worker, μετά από Stripe event `checkout.session.completed`)

1. `query1` — `UPDATE "bookingsData" SET status='paid' WHERE id = {{ metadata.booking_id }} RETURNING id, full_name, email, hotel, room_type, checkin, checkout, amount, status`
2. `query2` — `INSERT INTO "changes"` (audit log: "Payment confirmed via Stripe")
3. Email block (Retool Email resource) — στέλνει επιβεβαίωση στον guest με όλα τα στοιχεία κράτησης + πολιτική αλλαγών/ακυρώσεων

### 2.6 Admin Dashboard (ξεχωριστό Retool app)
- **KPIs**: Σύνολο κρατήσεων (εξαιρεί waitlisted), Συνολικά έσοδα (μόνο paid/confirmed), Πληρωμένες/Εκκρεμείς/Ακυρωμένες
- **Γραφήματα**: κρατήσεις ανά ξενοδοχείο, κατανομή status
- **Διαθέσιμα δωμάτια ανά τύπο**: live υπολογισμός (LEFT JOIN allotments + bookingsData, COUNT paid/confirmed)
- **Λίστα αλλαγών**: πίνακας από το `changes` table
- **Κουμπί "Ακύρωση"** σε κάθε κράτηση — UPDATE status='cancelled' + INSERT στο changes (με σωστό `requires_refund` αν ήταν ήδη paid)
- **Κουμπί "+ Χειροκίνητη Κράτηση"** (manual booking) — backend function `bookings/createBooking`, υποστηρίζει group booking (array από δωμάτια σε ένα booking, ίδιο guest/group_name), παρακάμπτει το allotment check του Workflow A (σκόπιμα, για ειδικές συμφωνίες με ξενοδοχεία)
- **Excel exports** (tabs): Rooming List (ανά ξενοδοχείο, dropdown filter), Full Report, Payments Report, Changes Report — native Retool table export button (CSV, ανοίγει σε Excel)

---

## 3. Requirements: τι καλύφθηκε, τι εκκρεμεί

### Καλυμμένα
- Hotels/Allotments (στατικά δεδομένα σε table)
- Booking form με όλα τα ζητηθέντα πεδία
- Availability logic (decrement μόνο σε paid/confirmed, ζωντανός υπολογισμός)
- Payments μέσω Stripe (πλήρες ποσό, διαφορετικές τιμές ανά room type)
- Audit trail αλλαγών (ποιος/πότε/τι/παλιά-νέα τιμή/χρέωση-refund)
- Admin Dashboard (8 απαιτούμενα widgets)
- Email confirmations (μετά την πληρωμή)
- Excel exports: Rooming list, Full report, Payments report, Changes report
- Edge cases: **sold out + waitlist** (πλήρες), **ακύρωση** (πλήρες), **manual booking από admin** (πλήρες), **group booking** (πλήρες), **δωρεάν/hosted guest** (μέσω manual booking, status='hosted', amount=0, skip Stripe)

### Μερικώς καλυμμένα / χρειάζονται προσοχή
- **Αλλαγή συνοδού / ημερομηνιών** — μπορεί να γίνει manual UPDATE από admin, αλλά δεν υπάρχει ακόμα dedicated UI με αυτόματο επανυπολογισμό τιμής + audit log για αυτές τις 2 περιπτώσεις ειδικά
- **No payment (timeout)** — δεν υπάρχει ακόμα scheduled job που να "καθαρίζει"/ακυρώνει pending κρατήσεις που έμειναν απλήρωτες για X ώρες
- **Duplicate booking detection** — δεν υπάρχει έλεγχος πριν την υποβολή (ίδιο email+ξενοδοχείο+ημερομηνίες)

### Δεν καλύφθηκαν (λείπουν δεδομένα/απαιτούν διευκρίνιση)
- **Airline list** — η φόρμα δεν συλλέγει στοιχεία πτήσης
- **Transfer list** — η φόρμα δεν συλλέγει ανάγκη/στοιχεία μεταφοράς
- **Ticket list** — ασαφές τι ακριβώς σημαίνει, χρειάζεται διευκρίνιση

---

## 4. Γνωστοί περιορισμοί & τεχνικό χρέος

1. **Stripe σε test mode** — καμία πραγματική χρέωση δεν έχει γίνει ακόμα. Πριν πάει live: αλλαγή σε `sk_live_`, αλλαγή `success_url`/`cancel_url` σε πραγματικό domain, προσθήκη επαλήθευσης Stripe signature στο Workflow B (λείπει τώρα).
2. **Cloudflare Workers χωρίς authentication** — ανοιχτά σε οποιονδήποτε ξέρει το URL (βλ. §2.2).
3. **Retool Workflows free tier** — όριο 500 εκτελέσεις/μήνα.
4. **Κανένα retry/error handling** αν Worker/Workflow είναι προσωρινά down — η κράτηση αποτυγχάνει σιωπηλά.
5. **Καμία server-side validation** πέρα από τη φόρμα — το Workflow A δέχεται ό,τι του σταλεί χωρίς επιπλέον έλεγχο εγκυρότητας δεδομένων.
6. **Payload/CMS**: αξιολογήθηκε ως εναλλακτικό backend αλλά η υλοποίηση προχώρησε αποκλειστικά με Retool (Database + Workflows) — δεν χρησιμοποιείται τελικά.

---

## 5. Setup reference (για μελλοντικό developer/agent)

- **Retool workspace**: vickeramaraki.retool.com
- **Workflow A** (booking): `af6fb092-f8d8-43ed-b6ac-dcb909274ff0`
- **Workflow B** (payment confirmation): `fb1a43fe-ff18-4a1c-939b-9ecd1401d79c`
- **Cloudflare account**: Ellie32on@gmail.com
- **Worker #1**: `apex-booking-proxy.ellie32on.workers.dev`
- **Worker #2**: `apex-stripe-relay.ellie32on.workers.dev`
- **Stripe**: sandbox/test mode, webhook endpoint destination → Worker #2 URL, event: `checkout.session.completed`
- **API keys** (Retool workflow keys, Stripe secret key): αποθηκευμένα μέσα στους αντίστοιχους Workers/Retool resources — **δεν αναγράφονται εδώ για ασφάλεια**, βλέπε Retool → Workflow → Triggers → Webhook → Api key, και Stripe Dashboard → Developers → API keys.

---

## 6. Επόμενα βήματα (προτεινόμενη σειρά)

1. Dedicated UI για αλλαγή συνοδού/ημερομηνιών (με επανυπολογισμό τιμής)
2. Scheduled workflow για no-payment timeout (auto-expire pending bookings)
3. Duplicate booking check πριν το submit
4. Απόφαση για Airline/Transfer/Ticket list — είτε προσθήκη πεδίων στη φόρμα, είτε ξεχωριστό σύστημα
5. Πριν το live event: αλλαγή σε πραγματικό domain, live Stripe keys, Stripe signature verification, custom email domain (αντί για Retool Email default)
