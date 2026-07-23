export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    };
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    const retoolRes = await fetch('https://api.retool.com/v1/workflows/d413eaae-b876-429a-9849-8e531ad3b8f6/startTrigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workflow-Api-Key': env.RETOOL_API_KEY_HOTELS
      },
      body: '{}'
    });
    return new Response(await retoolRes.text(), {
      status: retoolRes.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}