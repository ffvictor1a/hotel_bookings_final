export default {
  async fetch(request) {
    const body = await request.text();

    const retoolRes = await fetch('https://api.retool.com/v1/workflows/fb1a43fe-ff18-4a1c-939b-9ecd1401d79c/startTrigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workflow-Api-Key': 'retool_wk_f2d01880a13d485bb52f0947423b3011'
      },
      body
    });

    return new Response(await retoolRes.text(), { status: retoolRes.status });
  }
}