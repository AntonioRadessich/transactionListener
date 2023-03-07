import { Alchemy, AlchemySubscription } from "alchemy-sdk";
import fetch from "node-fetch";
import { config } from "../config.js";

export function configureConnection(network){
  var alchemy;
  if(config.supportedChains.includes(network)){
    alchemy = new Alchemy({
      apiKey: config[network].API,
      network: config[network].network,
    });
  }
  return alchemy;
}

export async function getWalletList() {
  var res = [];
  var walletListV2 = [];
  await fetch(config.cloudFunctions.getWalletList)
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
    })
    .then((data) => {
      if (data) {
        res = data;
      }
    })
    .catch((err) => console.error(err));
    for (var x in res.message) {
      walletListV2.push({ from: res.message[x] });
      walletListV2.push({ to: res.message[x] });
    }
  return {
    walletList: res.message,
    walletListV2: walletListV2
  };
}

export async function connectToErc20MinedTransactions(alchemy,walletInfo,network){
  await alchemy.ws.on(
    {
      method: AlchemySubscription.MINED_TRANSACTIONS,
      addresses: walletInfo.walletListV2,
      includeRemoved: true,
      hashesOnly: false,
    },
    async (tx) => {
      console.log("Transazione trovata");
      alchemy.core
        .getTransactionReceipt(tx.transaction.hash)
        .then(async (recepit) => {
          recepit.cumulativeGasUsed =
            recepit.cumulativeGasUsed / Math.pow(10, 18);
          recepit.gasUsed = recepit.gasUsed / Math.pow(10, 18);
          recepit.gasPrice = recepit.gasPrice / Math.pow(10, 18);
          let todo;
          if (walletInfo.walletList.includes(recepit.to.toLowerCase())) {
            for (var x in recepit.logs) {
              if(x!=0 && recepit.logs[x].address != recepit.logs[recepit.logs.length-1].address){
                await alchemy.core
                  .getTokenMetadata(recepit.logs[x].address)
                  .then((metadata) => {
                    recepit.logs[x] = {
                      address: recepit.logs[x].address,
                      tokenName: metadata.name,
                      value:
                        recepit.logs[x].data / Math.pow(10, metadata.decimals),
                    };
                  });
              }
            }
            recepit.logs.pop();
            recepit.logs.shift();
            todo = {
              network: process.argv[2].toLowerCase(),
              address: recepit.to.toLowerCase(),
              transactionData: recepit,
            };
            sendAddTransactionRequest(todo);
            getWalletData(
              recepit.to.toLowerCase(),
              process.argv[2].toLowerCase(),
              alchemy
            );
          }
          if (walletInfo.walletList.includes(recepit.from.toLowerCase())) {
            for(var x in recepit.logs){ 
              if(x!=0 && recepit.logs[x].address != recepit.logs[recepit.logs.length-1].address){
                await alchemy.core
                  .getTokenMetadata(recepit.logs[x].address)
                  .then((metadata) => {
                    recepit.logs[x] = {
                      address: recepit.logs[x].address,
                      tokenName: metadata.name,
                      value:
                        recepit.logs[x].data / Math.pow(10, metadata.decimals),
                    };
                });
              }
            }
            recepit.logs.pop();
            recepit.logs.shift();
            todo = {
              network: network.toLowerCase(),
              address: recepit.from.toLowerCase(),
              transactionData: recepit,
            };
            sendAddTransactionRequest(todo);
            getWalletData(
              recepit.from.toLowerCase(),
              network.toLowerCase(),
              alchemy
            );
          }
        });
    });
}

export async function getWalletData(address, network, alchemy) {
  const ethBalance = await alchemy.core.getBalance(address, "latest");
  var balances = [];
  balances.push({
    balance: ethBalance / Math.pow(10, 18),
    contract: "",
    decimals: 18,
    logo: config[network].chainLogo,
    name: config[network].chainAsset,
    symbol: config[network].chainSymbol,
  });
  await alchemy.core
    .getTokenBalances(address, config.goerli.supportedTokens)
    .then(async (tokenBalances) => {
      const nonZeroBalances = tokenBalances.tokenBalances.filter((token) => {
        return token["tokenBalance"] != 0;
      });
      var tokenMetadata;
      await Promise.all(
        nonZeroBalances.map(async (token) => {
          tokenMetadata = await alchemy.core
            .getTokenMetadata(token.contractAddress)
            .catch(() => {
              console.log("Errore con i metadata di un token");
            });
          try {
            token["tokenBalance"] =
              token["tokenBalance"] / Math.pow(10, tokenMetadata["decimals"]);
            balances.push({
              name: tokenMetadata["name"],
              contract: token["contractAddress"],
              balance: token["tokenBalance"],
              decimals: tokenMetadata["decimals"],
              logo: tokenMetadata["logo"],
              symbol: tokenMetadata["symbol"],
            });
          } catch {
            console.log("Token" + token["contractAddress"] + "non inserito");
          }
        })
      );
    })
    .then(() => {
      var data = {
        network: network,
        ethBalance: ethBalance / Math.pow(10, 18),
        tokenBalances: balances,
      };
      let todo = {
        address: address,
        data: data,
      };
      sendUpdateRequest(todo);
      console.log("Dati inviati " + address);
    });
}


function sendUpdateRequest(todo) {
  fetchRetry(
    config.cloudFunctions.sendUpdateRequest,
    1,
    10,
    {
      method: "POST",
      body: JSON.stringify(todo),
      headers: { "Content-Type": "application/json" },
    }
  );
}

function sendAddTransactionRequest(todo) {
  console.log("Provo ad aggiungere transazione");
  fetchRetry(
    config.cloudFunctions.addTransaction,
    1,
    10,
    {
      method: "POST",
      body: JSON.stringify(todo),
      headers: { "Content-Type": "application/json" },
    }
  );
}

function wait(delay) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

async function fetchRetry(url, delay, tries, fetchOptions = {}) {
  async function onError(err) {
    var triesLeft = tries - 1;
    if (triesLeft == 0) {
      throw err;
    }
    await wait(delay);
    console.log("error");
    fetchRetry(url, delay, triesLeft, fetchOptions);
  }
  try {
    return await fetch(url, fetchOptions);
  } catch (err_1) {
    return onError(err_1);
  }
}