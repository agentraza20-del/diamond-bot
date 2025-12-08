const fetch = require('node-fetch');

async function sendMessage() {
  const groupId = '120363405821339800@g.us';
  const rate = 4;
  
  const message = `📢 *রেট আপডেট নোটিফিকেশন*

💰 নতুন রেট: ৳${rate} প্রতি ডায়মন্ড

📊 হিসাব:
• 100💎 = ৳${100 * rate}
• 500💎 = ৳${500 * rate}
• 1000💎 = ৳${1000 * rate}

✅ নতুন রেট এখন কার্যকর।`;

  console.log('📤 Sending message...');
  console.log('Group ID:', groupId);
  console.log('Message:', message);
  console.log('---');

  try {
    const response = await fetch('http://localhost:3001/api/bot-send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, message })
    });

    const data = await response.json();
    console.log('Response:', data);

    if (data.success) {
      console.log('✅ Message sent successfully!');
    } else {
      console.log('❌ Error:', data.message);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

sendMessage();
