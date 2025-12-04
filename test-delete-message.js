/**
 * Quick Test: Delete Message Edit Toggle
 * 
 * এটি disable delete message edit setting save করে test করে
 */

const fetch = require('node-fetch');

async function testDeleteMessageSetting() {
    try {
        console.log('\n🧪 Testing Delete Message Edit Setting...\n');
        
        // Save setting: Disable delete message edit
        console.log('📝 Saving setting: disableDeleteMessageEdit = true');
        const response = await fetch('http://localhost:3005/api/diamond-status/delete-message-setting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ disableDeleteMessageEdit: true })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Setting saved successfully!');
            console.log('📋 Status:', result.status);
            console.log('\n✅ Delete messages will now be SILENT when orders are deleted');
            console.log('📝 No confirmation message will be sent to the group\n');
        } else {
            console.log('❌ Failed to save setting:', result.error);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run test
testDeleteMessageSetting();
