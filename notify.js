// notify.js — بيشتغل كل يوم الساعة 3 مساءً
// يتحقق من المحطات اللي لسه ما سجلتش ويبعت إشعار على Telegram

const SB_URL    = 'https://plvjfmkbcmulfubiiwyw.supabase.co';
const SB_KEY    = 'sb_publishable_L6fcrQBAOsJv9Wh04wP7ww_h0Xxsl0H';
const BOT_TOKEN = '8910031215:AAFUya-l3VyoXAOMlvxd4zb6DpUGFhiDEw8';
const CHAT_ID   = '870811910';

async function main() {
  const today = new Date().toISOString().split('T')[0];

  // 1) جيب كل المحطات
  const stRes = await fetch(`${SB_URL}/rest/v1/stations?select=name,manager`, {
    headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
  });
  const stations = await stRes.json();

  if (!stations.length) { console.log('No stations found'); return; }

  // 2) جيب المحطات اللي سجلت النهارده
  const attRes = await fetch(
    `${SB_URL}/rest/v1/attendance?select=station&report_date_iso=eq.${today}`,
    { headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY } }
  );
  const attended = await attRes.json();
  const attendedNames = new Set(attended.map(r => r.station));

  // 3) المحطات اللي لسه ما سجلتش
  const missing = stations.filter(s => !attendedNames.has(s.name));

  if (!missing.length) {
    console.log('All stations reported today ✅');
    // ابعت رسالة تأكيد
    await sendTelegram('✅ كل المحطات سجلت الحضور اليوم!');
    return;
  }

  // 4) ابعت إشعار بالمحطات الناقصة
  let msg = '⚠️ تنبيه الساعة 3 مساءً\n';
  msg += '━━━━━━━━━━━━━━\n';
  msg += `المحطات اللي لسه ما سجلتش (${missing.length}):\n\n`;
  missing.forEach(s => {
    msg += `🔴 ${s.name}\n   المدير: ${s.manager}\n`;
  });
  msg += `\nاليوم: ${new Date().toLocaleDateString('ar-EG')}`;

  await sendTelegram(msg);
  console.log(`Sent notification for ${missing.length} missing stations`);
}

async function sendTelegram(text) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text })
  });
  const data = await res.json();
  if (!data.ok) console.error('Telegram error:', data);
}

main().catch(console.error);
