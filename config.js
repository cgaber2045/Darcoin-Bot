/*
   _____             __ _          ______ _ _      
  / ____|           / _(_)        |  ____(_) |     
 | |     ___  _ __ | |_ _  __ _   | |__   _| | ___ 
 | |    / _ \| '_ \|  _| |/ _` |  |  __| | | |/ _ \
 | |___| (_) | | | | | | | (_| |  | |    | | |  __/
  \_____\___/|_| |_|_| |_|\__, |  |_|    |_|_|\___|
                           __/ |                   
                          |___/                    
                          
 Configuration file for the DarCoin Bot created by Chris Gaber.
 Made for use by the Sanctuary Discord Server.
 Copyright (C) 2021 Sanctuary, Inc. All rights reserved.
*/ 

const pjson = require('./package.json');
const config = {
    testing: {
        serverID: "875551952820383774",
        walletChannelID: "875551952820383777",
        generalChannelID: "875575709446340688",
    },
    production: {
        serverID: "162978315068506112",
        walletChannelID: "874802775010213889",
        generalChannelID: "875801201420165140",
    },
    app: {
        // Announcements
        announcement: "**ANNOUNCEMENTS:** Patch " + pjson.version + " is live! New Stuff: Items!\n",
        // Wallet options
        coinName: "DarCoin",
        initialStartCash: 50,
        initialBankCash: 500,
        taxRate: 0.06,
        wellfareRate: 10,
        // Betting options
        progressBarLength: 50,
        // Robbing options
        robCooldown: 8,
        penaltyAmount: 0.35,
        // Blackjack options
        minBet: 5,
        maxBet: 30,
        // Music options
        playCost: 20,
        skipCost: 10,
    }
};

module.exports = config;