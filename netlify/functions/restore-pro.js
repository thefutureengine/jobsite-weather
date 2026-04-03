exports.handler = async (event) => {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if(event.httpMethod === 'OPTIONS'){
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if(event.httpMethod !== 'POST'){
    return { statusCode: 405, headers: CORS, body: 'Method not allowed' };
  }

  try {
    const { email } = JSON.parse(event.body);
    if(!email) return {
      statusCode: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, message: 'Email required' })
    };

    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email.trim().toLowerCase())}&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const stripeData = await stripeResponse.json();
    const customer = stripeData.data?.[0];

    if(!customer){
      return {
        statusCode: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, message: 'No account found for that email.' })
      };
    }

    const subResponse = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${customer.id}&status=active&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
        }
      }
    );

    const subData = await subResponse.json();
    const hasActiveSub = subData.data?.length > 0;

    if(hasActiveSub){
      return {
        statusCode: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, message: 'Pro restored successfully.' })
      };
    } else {
      return {
        statusCode: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, message: 'No active Pro subscription found for that email.' })
      };
    }

  } catch(e) {
    return {
      statusCode: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, message: 'Could not verify. Try again.' })
    };
  }
};
