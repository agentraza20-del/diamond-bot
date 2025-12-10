#!/usr/bin/env node

/**
 * 📅 Transfer Yesterday's Orders to Yesterday Tab
 * গতকালের সব orders গুলো Yesterday tab এ move করে
 */

const fs = require('fs').promises;
const path = require('path');

const DB_PATH = path.join(__dirname, 'config', 'database.json');

// BD Timezone helper
function getBDTime() {
    const BD_TIMEZONE_OFFSET = 6 * 60 * 60 * 1000;
    return new Date(Date.now() + BD_TIMEZONE_OFFSET);
}

// Get yesterday's date range in BD timezone
function getYesterdayRange() {
    const now = getBDTime();
    const yesterday = new Date(now);
    yesterday.setUTCDate(now.getUTCDate() - 1);
    
    const start = new Date(yesterday);
    start.setUTCHours(0, 0, 0, 0);
    
    const end = new Date(yesterday);
    end.setUTCHours(23, 59, 59, 999);
    
    return { start, end };
}

async function transferToYesterday() {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                                                        ║');
    console.log('║      📅 TRANSFER ORDERS TO YESTERDAY TAB 📅           ║');
    console.log('║                                                        ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    try {
        // Read database
        const data = await fs.readFile(DB_PATH, 'utf8');
        const db = JSON.parse(data);
        
        if (!db.groups) {
            console.log('❌ No groups found in database');
            return;
        }
        
        const yesterdayRange = getYesterdayRange();
        let totalTransferred = 0;
        
        console.log(`📅 Yesterday's Date Range:`);
        console.log(`   Start: ${yesterdayRange.start.toISOString()}`);
        console.log(`   End:   ${yesterdayRange.end.toISOString()}\n`);
        
        // Process each group
        for (const [groupId, groupData] of Object.entries(db.groups)) {
            if (!groupData.entries || groupData.entries.length === 0) {
                continue;
            }
            
            let groupTransferred = 0;
            
            // Process each entry
            groupData.entries.forEach((entry, index) => {
                // Check if entry is processing or pending (not yet approved)
                if (['processing', 'pending'].includes(entry.status)) {
                    // Check if it's from today
                    const entryDate = entry.createdAt ? new Date(entry.createdAt) : null;
                    
                    if (entryDate) {
                        const now = getBDTime();
                        const entryDay = entryDate.getUTCDate();
                        const nowDay = now.getUTCDate();
                        
                        // If created today, move to yesterday
                        if (entryDay === nowDay) {
                            // Change status to approved
                            entry.status = 'approved';
                            
                            // Set approvedAt to yesterday
                            const approvalTime = new Date(yesterdayRange.end);
                            entry.approvedAt = approvalTime.toISOString();
                            
                            // Update createdAt to yesterday (keep same time but shift date)
                            const createdTime = entryDate;
                            const shiftedDate = new Date(yesterdayRange.start);
                            shiftedDate.setUTCHours(
                                createdTime.getUTCHours(),
                                createdTime.getUTCMinutes(),
                                createdTime.getUTCSeconds()
                            );
                            entry.createdAt = shiftedDate.toISOString();
                            
                            groupTransferred++;
                            totalTransferred++;
                            
                            console.log(`✅ Order ${entry.id} - ${entry.userName} (${entry.diamonds}💎) → Yesterday`);
                        }
                    }
                }
            });
            
            if (groupTransferred > 0) {
                console.log(`   📊 Group: ${groupData.name || 'Unknown'} - ${groupTransferred} orders transferred\n`);
            }
        }
        
        // Save updated database
        await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
        
        console.log('═'.repeat(60));
        console.log(`\n✨ Transfer Complete!`);
        console.log(`✅ Total Orders Transferred: ${totalTransferred}`);
        console.log(`📁 Database Updated: ${DB_PATH}\n`);
        console.log('🎯 Next Steps:');
        console.log('   1. Restart bot services');
        console.log('   2. Refresh Admin Panel');
        console.log('   3. Go to Yesterday tab - orders should be there now!\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run
transferToYesterday();
