import * as dotenv from 'dotenv'
import { Network } from "alchemy-sdk";
dotenv.config();

let supportedChains = ["ethereum","goerli"];
let cloudFunctions = {
  getWalletList: process.env.GETWALLETLIST,
  sendUpdateRequest: process.env.SUBWALLETBALANCEUPDATE,
  addTransaction: process.env.ADDTRANSACTION
}
let supportedToken = {
  goerli:["0xe68104d83e647b7c1c15a91a8d8aad21a51b3b3e","0x1f9840a85d5af5bf1d1762f925bdaddc4201f984"]
}
export const config = {
  ethereum: {API: process.env.ETH_API_KEY,network: Network.ETH_MAINNET,chainAsset:"Ethereum",chainSymbol:"ETH",chainLogo:"https://cryptologos.cc/logos/ethereum-eth-logo.png?v=023"},
  goerli: {API:process.env.GOERLI_API_KEY,network:Network.ETH_GOERLI,chainAsset:"Ethereum",chainSymbol:"ETH",chainLogo:"https://cryptologos.cc/logos/ethereum-eth-logo.png?v=023",supportedTokens:supportedToken.goerli},
  polygon: {API:process.env.POLYGON_API_KEY,network:Network.MATIC_MAINNET},
  arbitrum: {API:process.env.ARBITRUM_API_KEY,network:Network.ARB_MAINNET},
  supportedChains: supportedChains,
  cloudFunctions: cloudFunctions
};