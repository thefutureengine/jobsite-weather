exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if(event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { lat, lon } = JSON.parse(event.body || '{}');
    if(!lat || !lon) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'lat and lon required' }) };
    }

    const key = process.env.TOMORROW_KEY;
    if(!key) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured' }) };
    }

    const url = `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lon}&apikey=${key}&units=imperial&timesteps=1h&fields=precipitationIntensity,precipitationProbability,weatherCode`;

    const r = await fetch(url);
    if(!r.ok) {
      return { statusCode: r.status, headers, body: JSON.stringify({ error: 'Tomorrow.io error' }) };
    }

    const data = await r.json();
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch(e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
