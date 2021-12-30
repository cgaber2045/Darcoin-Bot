/*
  _____              _____      _         _____ _                     
 |  __ \            / ____|    (_)       |_   _| |                    
 | |  | | __ _ _ __| |     ___  _ _ __     | | | |_ ___ _ __ ___  ___ 
 | |  | |/ _` | '__| |    / _ \| | '_ \    | | | __/ _ \ '_ ` _ \/ __|
 | |__| | (_| | |  | |___| (_) | | | | |  _| |_| ||  __/ | | | | \__ \
 |_____/ \__,_|_|   \_____\___/|_|_| |_| |_____|\__\___|_| |_| |_|___/
                                                                      
 Items module for the DarCoin bot created by Chris Gaber.
 Made for use by the Sanctuary Discord Server.
 Copyright (C) 2021 Sanctuary, Inc. All rights reserved.
*/

// Map to hold all items after they are parsed in - resets every 24 hours due to Dyno worker.
var allUserItems = new Map();

// Magic function to sort the items whenever they are iterated through.
allUserItems[Symbol.iterator] = function* () {
    yield* [...this.entries()].sort((a, b) => b[1] - a[1]);
}

// Getters and setters
function addItem(user, item) {
    allUserItems.get(user).push(item);
}

// Getters and setters
function removeItem(user, item) {
    allUserItems.set(user, allUserItems.get(user).filter(arrayItem => arrayItem != item));
}

// Getters and setters
function getItems(user) {
    return allUserItems.get(user);
}

function has(user, item) {
    return allUserItems.get(user).includes(item);
}

function allItems() {
    return allUserItems;
}

function formatItems(user) {
    return `["${allUserItems.get(user).join('", "')}"]`;
}

module.exports = {commands, addItem, removeItem, getItems, has, allItems, formatItems};