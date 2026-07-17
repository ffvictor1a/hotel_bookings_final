export default {
  // 1ο ΛΑΘΟΣ: Προσθέσαμε το 'env' εδώ για να έχει πρόσβαση ο Worker στα Variables σου
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const body = await request.text();

    const retoolRes = await fetch('https://api.retool.com/v1/workflows/e1f4a413-4374-4728-996d-fc7854412bbf/startTrigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 2ο ΛΑΘΟΣ: Βγάλαμε τα εισαγωγικά και βάλαμε το env.RETOOL_API_KEY_2
        'X-Workflow-Api-Key': env.RETOOL_API_KEY_2
      },
      body
    });

    return new Response(await retoolRes.text(), {
      status: retoolRes.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}