import 'dotenv/config';
import { DynamicEvmWalletClient } from '@dynamic-labs-wallet/node-evm';
import { ThresholdSignatureScheme } from '@dynamic-labs-wallet/core';
import { http, createWalletClient } from 'viem';
import { mainnet } from 'viem/chains';

let evmClient: DynamicEvmWalletClient | null = null;

async function getClient(): Promise<DynamicEvmWalletClient> {
  if (!evmClient) {
    evmClient = new DynamicEvmWalletClient({
      environmentId: process.env.DYNAMIC_ENVIRONMENT_ID!,
      enableMPCAccelerator: false, // set true only on AWS Nitro Enclave infra
    });
    await evmClient.authenticateApiToken(process.env.DYNAMIC_AUTH_TOKEN!);
  }
  return evmClient;
}

export async function createServerWallet() {
  const client = await getClient();
  const wallet = await client.createWalletAccount({
    thresholdSignatureScheme: ThresholdSignatureScheme.TWO_OF_TWO,
    password: process.env.WALLET_PASSWORD,
    backUpToClientShareService: true,
    onError: (error: Error) => {
      console.error('Wallet creation error:', error);
    },
  });
  return {
    address: wallet.accountAddress,
  };
}

export async function signAndSendTransaction(
  senderAddress: string,
  to: string,
  value: string,
  data?: string
) {
  const client = await getClient();

  const publicClient = client.createViemPublicClient({
    chain: mainnet,
    rpcUrl: process.env.RPC_URL!,
  });

  const preparedTx = await publicClient.prepareTransactionRequest({
    to: to as `0x${string}`,
    value: BigInt(value),
    data: data as `0x${string}` | undefined,
    account: senderAddress as `0x${string}`,
    chain: mainnet,
  });

  const signedTx = await client.signTransaction({
    senderAddress: senderAddress as `0x${string}`,
    transaction: preparedTx,
    password: process.env.WALLET_PASSWORD,
  });

  const walletClient = createWalletClient({
    chain: mainnet,
    transport: http(process.env.RPC_URL!),
    account: senderAddress as `0x${string}`,
  });

  const txHash = await walletClient.sendRawTransaction({
    serializedTransaction: signedTx,
  });

  return txHash;
}
