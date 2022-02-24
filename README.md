#  Darcoin Bot (Discord Economy Bot)
> Darcoin Bot is an Economy Discord Bot built with discord.js. See https://discord.js.org/#/docs/main/12.5.3/general/welcome for the api.

## Requirements

1. Discord Bot Token **[Guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot)**
2. Node.js v14.18.0 or newer

## 🚀 Getting Started

```sh
git clone https://github.com/cgaber2045/Darcoin-Bot.git
cd Darcoin-Bot
npm install
```

After installation finishes follow configuration instructions then run `node bot.js` to start the bot.

## ⚙️ Configuration

Edit the `config.js` and edit any of the values:

⚠️ **Note: Never commit or share your token or api keys publicly** ⚠️

```json
{
  "coinName": "$DarCoin$",
  "initialStartCash": 50,
  "initialBankCash": 500,
  "taxRate": 0.06,
  "progressBarLength": 50,
  "robCooldown": 8,
  "penaltyAmount": 0.35,
  "minBet": 5,
  "maxBet": 30,
  "playCost": 20,
  "skipCost": 10,
}
```

Create a .env file and fill in values for:
```
BOT_TOKEN = # Set this to your bot token
COOKIE_STRING = # Set this to the value of your __Secure-3PSID cookie from youtube.com. in the form __Secure-3PSID=value;
```

## 📝 Features & Commands

> Note: The default prefix is '/'
> Commands are slash commands, tab auto completion and parameters are shown.

### 💰 Wallet

* Create a wallet (/join)
* View balance (/balance)

* Pay another user with a wallet

`/pay CEG 10`

![wallet](https://imgur.com/a/mMhDcBC)

### 🎲 Betting

* Start betting 

`/startbets TSM Cloud9`

* Bet

`/bet TSM 100`

* Stop bets (/stopbets)
* Declare a winner (/winner \[winner\])
* Cancel betting (/cancel)

### 🏪 Marketplace

* Buy products in the market/ Currently available products: deafen, undeafen, gag, ungag, taze, nick

`/buy gag CEG`
`/buy nick CEG Chris`

### 🔫 Robbing

* Rob people for a specified amount. The more you try to take, the lower the odds.

`/rob CEG 10`

### 🃏 Blackjack

* Play blackjack against the bot and win DarCoin/

`/blackjack 10`

### 💼 Jobs

* Ask a server admin to apply for a job in the server/

`/listjobs`

### 🎶 Music

* Play music from YouTube via url for a certain amount of time per DarCoin

`/play https://www.youtube.com/watch?v=GLvohMXgcBo`

* Play music from YouTube via search query for a certain amount of time per DarCoin

`/play under the bridge red hot chili peppers`

* Queue system (/queue)
* Skip songs for a cost (/skip)

![musicplayer](https://i.imgur.com/i5tOAam.png)

## 🤝 Contributing

1. [Fork the repository](https://github.com/cgaber2045/Darcoin-Bot/fork)
2. Clone your fork: `git clone https://github.com/your-username/Darcoin-Bot.git`
3. Create your feature branch: `git checkout -b my-new-feature`
4. Stage changes `git add .`
5. Commit your changes: `git commit`
6. Push to the branch: `git push origin my-new-feature`
7. Submit a pull request