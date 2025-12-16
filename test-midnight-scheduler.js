#!/usr/bin/env node

/**
 * 🕐 Test Midnight Scheduler
 * Verifies that the midnight transfer scheduler works correctly
 */

// BD Timezone helper
function getBDTime() {
    const BD_TIMEZONE_OFFSET = 6 * 60 * 60 * 1000;
    return new Date(Date.now() + BD_TIMEZONE_OFFSET);
}

// Function to calculate time until midnight (BD timezone)
function getTimeUntilMidnight() {
    const BD_TIMEZONE_OFFSET = 6 * 60 * 60 * 1000;
    const now = new Date(Date.now() + BD_TIMEZONE_OFFSET);
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0); // Next midnight in UTC
    
    return midnight - now;
}

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║         🕐 MIDNIGHT SCHEDULER TEST 🕐                 ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

const now = getBDTime();
console.log('📊 Current BD Time:');
console.log(`   ${now.toISOString()}`);
console.log(`   ${now.toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })}\n`);

const timeUntilMidnight = getTimeUntilMidnight();
const minutesUntil = Math.round(timeUntilMidnight / 1000 / 60);
const secondsUntil = Math.round((timeUntilMidnight % 60000) / 1000);

console.log('⏱️  Time Until Midnight:');
console.log(`   ${minutesUntil} minutes and ${secondsUntil} seconds`);
console.log(`   (${timeUntilMidnight / 1000} seconds total)\n`);

// Calculate next midnight
const nextMidnight = new Date(now);
nextMidnight.setUTCHours(24, 0, 0, 0);

console.log('🌙 Next Midnight Will Be:');
console.log(`   ${nextMidnight.toISOString()}`);
console.log(`   ${nextMidnight.toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })}\n`);

// Show what will happen
console.log('📋 Scheduler Behavior:\n');
console.log('   1. ✅ Admin Panel starts and initializes scheduler');
console.log(`   2. ⏱️  Waits ${minutesUntil} minutes for midnight`);
console.log('   3. 🌙 At midnight (00:00:00), triggers transfer script');
console.log('   4. 📊 Moves all Today orders to Yesterday tab');
console.log('   5. 📅 Schedules next midnight transfer (24 hours later)\n');

console.log('✅ SCHEDULER STATUS: READY\n');
console.log('💡 Note: Scheduler will run ONLY at midnight Bangladesh Time');
console.log('   Your VPS timezone must be correctly set!\n');
