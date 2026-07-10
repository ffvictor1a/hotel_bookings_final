export default {
  // ΔΙΟΡΘΩΣΗ 1: Προσθέσαμε το 'env' στην παρένθεση για να βλέπει τις μεταβλητές
  async fetch(request, env) {
    
    const body = await request.text();

    const retoolRes = await fetch('https://api.retool.com/v1/workflows/fb1a43fe-ff18-4a1c-939b-9ecd1401d79c/startTrigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // ΔΙΟΡΘΩΣΗ 2: Βγάλαμε τα εισαγωγικά για να διαβάσει το πραγματικό κλειδί
        'X-Workflow-Api-Key': env.RETOOL_API_KEY
      },
      body
    });

    // Επιστρέφουμε την απάντηση του Retool πίσω στη Stripe
    return new Response(await retoolRes.text(), { 
      status: retoolRes.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}