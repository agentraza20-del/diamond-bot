// Shared bot client module
// This allows the admin panel to send messages through the WhatsApp bot

let client = null;

function setClient(whatsappClient) {
    client = whatsappClient;
    console.log('✅ Bot client registered in shared module');
}

function getClient() {
    return client;
}

function isClientReady() {
    return client && client.isReady && client.isReady();
}

async function sendMessageToGroup(groupId, message) {
    try {
        if (!isClientReady()) {
            throw new Error('Bot client is not ready');
        }
        
        console.log(`📨 Sending message to group ${groupId}`);
        await client.sendMessage(groupId, message);
        console.log(`✅ Message sent to ${groupId}`);
        return { success: true, message: 'Message sent' };
    } catch (error) {
        console.error(`❌ Failed to send message to ${groupId}:`, error.message);
        throw error;
    }
}

module.exports = {
    setClient,
    getClient,
    isClientReady,
    sendMessageToGroup
};
