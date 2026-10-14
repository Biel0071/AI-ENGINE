const axios = require('axios');

async function main() {
  const url = 'http://209.50.241.22:3001/v1/chat/completions';
  const key = 'ap_199924c0bf797f7885b06cc2f0be743ef145a7e3be1733bd';

  console.log(`Testing inference against: ${url}`);
  try {
    const res = await axios.post(url, {
      model: 'qwen2.5:3b',
      messages: [
        { role: 'system', content: 'Você é o assistente inteligente do Fênix OS.' },
        { role: 'user', content: 'Responda apenas: FENIX_REAL_INFERENCE_OK' }
      ],
      temperature: 0.1,
      max_tokens: 30,
    }, {
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      timeout: 45000,
    });

    console.log('STATUS:', res.status);
    console.log('RESPONSE BODY:\n', JSON.stringify(res.data, null, 2));
    const content = res.data?.choices?.[0]?.message?.content;
    console.log('EXTRACTED CONTENT:', content);
  } catch (err) {
    if (err.response) {
      console.error('SERVER ERROR STATUS:', err.response.status);
      console.error('SERVER ERROR DATA:', err.response.data);
    } else {
      console.error('CLIENT ERROR:', err.message);
    }
  }
}

main();
