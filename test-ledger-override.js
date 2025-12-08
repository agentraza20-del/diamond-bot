const ledger = require("./utils/ledger.js");

// Test: computeGroupApprovedDue should return 2200 (override) not 2300 (calculated)
const userId = "115930327715989@lid";
const groupId = "120363000000000000@g.us";

const due = ledger.computeGroupApprovedDue(userId, groupId);
console.log(`User: ${userId}`);
console.log(`Due (should be 2200 from override): ${due}`);

if (due === 2200) {
    console.log(" SUCCESS - Ledger using dueBalanceOverride!");
} else {
    console.log(` FAILED - Expected 2200 but got ${due}`);
}
