import { config } from "./config.js";
import { configureConnection, getWalletList,connectToErc20MinedTransactions } from "./functions/functions.js";

async function main(){
  var alchemy;
  var walletInfo;
  if (process.argv[2] !== undefined) {
    if(config.supportedChains.includes(process.argv[2])){
      alchemy = configureConnection(process.argv[2].toLowerCase());
      walletInfo = await getWalletList();
      //getSupportedTokenList
      connectToErc20MinedTransactions(alchemy,walletInfo,process.argv[2]);
    }else {
      console.log(`Error - insert a supported network: ${config.supportedChains}`);
      process.exit(1);
    }
  } else {
    console.log(`Error - network not found`);
    process.exit(1);
  }
}
main();