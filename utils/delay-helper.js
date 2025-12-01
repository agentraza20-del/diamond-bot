/**
 * 🛡️ WhatsApp Bot সুরক্ষা - Delay Helper
 * 
 * এটি bot কে আরো মানুষের মতো আচরণ করতে সাহায্য করে
 * এবং WhatsApp ban থেকে রক্ষা করে
 */

// মেসেজ পাঠানোর আগে র‍্যান্ডম delay
function getRandomDelay(min = 1000, max = 3000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Delay function
async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// মেসেজ পাঠানোর সাথে automatic delay
async function sendMessageWithDelay(client, chatId, message, options = {}) {
    try {
        // মানুষের মতো আচরণ - 1-3 সেকেন্ড delay
        const delayTime = getRandomDelay(1000, 3000);
        console.log(`[DELAY] Waiting ${delayTime}ms before sending message...`);
        await delay(delayTime);
        
        // মেসেজ পাঠান
        await client.sendMessage(chatId, message, options);
        console.log(`[DELAY] ✅ Message sent to ${chatId}`);
        
        return { success: true };
    } catch (error) {
        console.error(`[DELAY] ❌ Error sending message:`, error.message);
        return { success: false, error: error.message };
    }
}

// Reply করার সাথে automatic delay
async function replyWithDelay(msg, replyText) {
    try {
        // ছোট delay - কারণ এটি direct reply
        const delayTime = getRandomDelay(500, 1500);
        console.log(`[DELAY] Waiting ${delayTime}ms before replying...`);
        await delay(delayTime);
        
        await msg.reply(replyText);
        console.log(`[DELAY] ✅ Reply sent`);
        
        return { success: true };
    } catch (error) {
        console.error(`[DELAY] ❌ Error replying:`, error.message);
        return { success: false, error: error.message };
    }
}

// একাধিক গ্রুপে মেসেজ পাঠানোর জন্য batch sender
async function sendToMultipleGroups(client, groupIds, message, options = {}) {
    const results = [];
    
    for (let i = 0; i < groupIds.length; i++) {
        const groupId = groupIds[i];
        
        console.log(`[BATCH] Sending to group ${i + 1}/${groupIds.length}: ${groupId}`);
        
        try {
            // প্রতিটি গ্রুপের মাঝে 3-5 সেকেন্ড delay
            if (i > 0) {
                const delayTime = getRandomDelay(3000, 5000);
                console.log(`[BATCH] Waiting ${delayTime}ms before next group...`);
                await delay(delayTime);
            }
            
            await client.sendMessage(groupId, message, options);
            results.push({ groupId, success: true });
            console.log(`[BATCH] ✅ Sent to ${groupId}`);
            
        } catch (error) {
            console.error(`[BATCH] ❌ Failed to send to ${groupId}:`, error.message);
            results.push({ groupId, success: false, error: error.message });
        }
    }
    
    return results;
}

// মেসেজ counter - rate limiting এর জন্য
class MessageCounter {
    constructor() {
        this.counts = {
            lastHour: 0,
            lastDay: 0,
            lastHourTimestamp: Date.now(),
            lastDayTimestamp: Date.now()
        };
    }
    
    // মেসেজ পাঠানোর আগে check করুন
    canSendMessage() {
        this.resetCounters();
        
        // Hourly limit: 100 messages
        if (this.counts.lastHour >= 100) {
            console.log(`[RATE-LIMIT] ⚠️ Hourly limit reached: ${this.counts.lastHour}/100`);
            return false;
        }
        
        // Daily limit: 500 messages
        if (this.counts.lastDay >= 500) {
            console.log(`[RATE-LIMIT] ⚠️ Daily limit reached: ${this.counts.lastDay}/500`);
            return false;
        }
        
        return true;
    }
    
    // মেসেজ পাঠানোর পর increment করুন
    incrementCounter() {
        this.counts.lastHour++;
        this.counts.lastDay++;
    }
    
    // Counter reset
    resetCounters() {
        const now = Date.now();
        
        // Reset hourly counter
        if (now - this.counts.lastHourTimestamp >= 3600000) { // 1 hour
            this.counts.lastHour = 0;
            this.counts.lastHourTimestamp = now;
        }
        
        // Reset daily counter
        if (now - this.counts.lastDayTimestamp >= 86400000) { // 24 hours
            this.counts.lastDay = 0;
            this.counts.lastDayTimestamp = now;
        }
    }
    
    // বর্তমান status দেখুন
    getStatus() {
        this.resetCounters();
        return {
            hourly: {
                sent: this.counts.lastHour,
                limit: 100,
                remaining: 100 - this.counts.lastHour
            },
            daily: {
                sent: this.counts.lastDay,
                limit: 500,
                remaining: 500 - this.counts.lastDay
            }
        };
    }
}

// Global message counter instance
const messageCounter = new MessageCounter();

module.exports = {
    delay,
    getRandomDelay,
    sendMessageWithDelay,
    replyWithDelay,
    sendToMultipleGroups,
    MessageCounter,
    messageCounter
};
