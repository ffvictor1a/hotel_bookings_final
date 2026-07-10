export default {
  async fetch(request) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const body = await request.text();

    const retoolRes = await fetch('https://api.retool.com/v1/workflows/af6fb092-f8d8-43ed-b6ac-dcb909274ff0/startTrigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workflow-Api-Key': 'retool_wk_778f0f9d8f6547aa9a990cdbd23b1759'
      },
      body
    });

    return new Response(await retoolRes.text(), {
      status: retoolRes.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}