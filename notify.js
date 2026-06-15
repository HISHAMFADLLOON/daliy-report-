// notify.js — بيشتغل كل يوم الساعة 12 ظهرًا
// يتحقق من المحطات اللي لسه ما سجلتش ويبعت إشعار على Telegram
// كمان بيرصد المحطات المتأخرة بشكل متكرر (3 ايام متتالية فأكثر) ويبعتها في قسم منفصل

const SB_URL    = 'https://plvjfmkbcmulfubiiwyw.supabase.co';
const SB_KEY    = 'sb_publishable_L6fcrQBAOsJv9Wh04wP7ww_h0Xxsl0H';
const BOT_TOKEN = '8910031215:AAFUya-l3VyoXAOMlvxd4zb6DpUGFhiDEw8';
const CHAT_ID   = '870811910';

const LOOKBACK_DAYS    = 7; // عدد الايام السابقة اللي بنفحصها لحساب التأخير المتكرر
const ESCALATION_DAYS  = 3; // لو المحطة متأخرة هذا العدد من الايام المتتالية (شامل اليوم) يبقى تصعيد

function isFriday(iso) {
  return new Date(iso + 'T00:00:00').getDay() === 5;
}
function toISO(d) {
  return d.toISOString().split('T')[0];
}

async function main() {
  const todayDate = new Date();
  const today = toISO(todayDate);

  // 1) جيب كل المحطات
  const stRes = await fetch(`${SB_URL}/rest/v1/stations?select=name,manager`, {
    headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
  });
  const stations = await stRes.json();
  if (!stations.length) { console.log('No stations found'); return; }

  // 2) جيب تسجيلات آخر عدة ايام (لحساب التأخير المتكرر بكفاءة)
  const startDate = new Date(todayDate);
  startDate.setDate(startDate.getDate() - (LOOKBACK_DAYS - 1));
  const startISO = toISO(startDate);

  const attRes = await fetch(
    `${SB_URL}/rest/v1/attendance?select=station,report_date_iso&report_date_iso=gte.${startISO}&report_date_iso=lte.${today}`,
    { headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY } }
  );
  const records = await attRes.json();

  // خريطة: اسم المحطة -> مجموعة التواريخ اللي سجلت فيها
  const stationDates = {};
  records.forEach(r => {
    if (!stationDates[r.station]) stationDates[r.station] = new Set();
    stationDates[r.station].add(r.report_date_iso);
  });

  const attendedToday = new Set(
    records.filter(r => r.report_date_iso === today).map(r => r.station)
  );

  // 3) المحطات اللي لسه ما سجلتش النهارده
  const missing = stations.filter(s => !attendedToday.has(s.name));

  if (!missing.length) {
    console.log('All stations reported today ✅');
    await sendTelegram('✅ كل المحطات سجلت الحضور اليوم!');
    return;
  }

  // 4) حساب عدد الايام المتتالية المتأخرة لكل محطة ناقصة (الجمعة مستثناة من العدّ)
  const escalated = [];
  const normal = [];

  missing.forEach(s => {
    const dates = stationDates[s.name] || new Set();
    let streak = 1; // النهارده
    const cursor = new Date(todayDate);
    for (let i = 0; i < LOOKBACK_DAYS; i++) {
      cursor.setDate(cursor.getDate() - 1);
      const cIso = toISO(cursor);
      if (isFriday(cIso)) continue;
      if (dates.has(cIso)) break;
      streak++;
    }
    if (streak >= ESCALATION_DAYS) escalated.push({ ...s, streak });
    else normal.push(s);
  });

  // 5) بناء الرسالة
  let msg = '⚠️ تنبيه الساعة 12 ظهرًا\n';
  msg += '━━━━━━━━━━━━━━\n';

  if (escalated.length) {
    msg += `🚨 محطات متأخرة بشكل متكرر (${escalated.length}):\n\n`;
    escalated.forEach(s => {
      msg += `🚨 ${s.name}\n   المدير: ${s.manager}\n   لم تسجل منذ ${s.streak} يوم متتالي\n\n`;
    });
    msg += '━━━━━━━━━━━━━━\n';
  }

  if (normal.length) {
    msg += `المحطات اللي لسه ما سجلتش (${normal.length}):\n\n`;
    normal.forEach(s => {
      msg += `🔴 ${s.name}\n   المدير: ${s.manager}\n`;
    });
  }

  msg += `\nاليوم: ${todayDate.toLocaleDateString('ar-EG')}`;
  await sendTelegram(msg.trim());
  console.log(`Sent notification for ${missing.length} missing stations (${escalated.length} escalated)`);
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
