"use client";

import React, { useEffect, useState } from "react";

// Particle imports
import {
  ConnectButton,
  useAccount,
  useDisconnect,
  usePublicClient,
  useParticleAuth,
  useWallets,
} from "@particle-network/connectkit";

import { mainnet } from '@particle-network/connectkit/chains';

// Connectkit uses Viem, so Viem's features can be utilized
import { formatEther, parseEther } from "viem";

// Optional: Import ethers provider for EIP-1193 compatibility
import { ethers, type Eip1193Provider } from "ethers";

export default function Home() {
  // Initialize account-related states from Particle's useAccount hook
  const { address, isConnected, isConnecting, isDisconnected, chainId } =
    useAccount();
  const { disconnect, disconnectAsync } = useDisconnect();
  const { getUserInfo } = useParticleAuth();

  // Optional: Initialize public client for RPC calls using Viem
  const publicClient = usePublicClient();

  // Retrieve the primary wallet from the Particle Wallets
  const [primaryWallet] = useWallets();

  // Define state variables
  const [account, setAccount] = useState(null); // Store account information
  const [balance, setBalance] = useState<string>(""); // Store user's balance
  const [userAddress, setUserAddress] = useState<string>(""); // Store user's address
  const [userInfo, setUserInfo] = useState<any>(null); // Store user's information
  const [isLoadingUserInfo, setIsLoadingUserInfo] = useState<boolean>(false); // Loading state for fetching user info
  const [userInfoError, setUserInfoError] = useState<string | null>(null); // Error state for fetching user info
  const [recipientAddress, setRecipientAddress] = useState<string>(""); // Store recipient's address for transactions
  const [transactionHash, setTransactionHash] = useState<string | null>(null); // Store transaction hash after sending
  const [isSending, setIsSending] = useState<boolean>(false); // State for showing sending status

  // Connection status message based on the account's connection state
  const connectionStatus = isConnecting
    ? "Connecting..."
    : isConnected
    ? "Connected"
    : isDisconnected
    ? "Disconnected"
    : "Unknown";

  // Load account details and fetch balance when address or chainId changes
  useEffect(() => {
    async function loadAccount() {
      if (address) {
        setAccount(account);
        setUserAddress(address);
        await fetchBalance();
      }
    }
    loadAccount();
  }, [chainId, address]);

  // Fetch and set user information when connected
  useEffect(() => {
    const fetchUserInfo = async () => {
      setIsLoadingUserInfo(true);
      setUserInfoError(null);

      try {
        const userInfo = await getUserInfo();
        console.log(userInfo);
        setUserInfo(userInfo);
      } catch (error) {
        setUserInfoError(
          "Error fetching user info: The current wallet is not a particle wallet."
        );
        console.error("Error fetching user info:", error);
      } finally {
        setIsLoadingUserInfo(false);
      }
    };

    if (isConnected) {
      fetchUserInfo();
    }
  }, [isConnected, getUserInfo]);

  // Fetch user's balance and format it for display
  const fetchBalance = async () => {
    try {
      if (!address) return;
      const balanceResponse = await publicClient?.getBalance({ address: address as `0x${string}` });
      const balanceInEther = formatEther(balanceResponse!);
      console.log(balanceResponse);
      setBalance(parseFloat(balanceInEther).toFixed(4)); // Display balance with 4 decimal places
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  // Handle user disconnect action
  const handleDisconnect = async () => {
    try {
      await disconnectAsync();
    } catch (error) {
      console.error("Error disconnecting:", error);
    }
  };

  // Option 1: Send transaction using ethers.js with a custom EIP-1193 provider
  const executeTxEthers = async () => {
    const tx = {
      to: recipientAddress as `0x${string}`,
      value: BigInt(1e16), // Set value to 0.01 Ether
      data: "0x" as `0x${string}`, // No data, as there is no contract interaction
      chain: mainnet,
    };

    setIsSending(true);

    try {
      const EOAprovider = await primaryWallet.connector.getProvider();
      const customProvider = new ethers.BrowserProvider(
        EOAprovider as Eip1193Provider,
        "any"
      );

      const signer = await customProvider.getSigner();
      const txResponse = await signer.sendTransaction(tx);
      const txReceipt = await txResponse.wait();

      if (txReceipt) {
        setTransactionHash(txReceipt.hash);
      } else {
        console.error("Transaction receipt is null");
      }
    } catch (error) {
      console.error("Error executing EVM transaction:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Option 2: Send transaction using the native Particle provider
  const executeTxNative = async () => {
    try {
      const tx = {
        to: recipientAddress as `0x${string}`,
        value: BigInt(1e16), // 0.01 ETH
        data: "0x" as `0x${string}`, // or real encoded function call
        chainId: primaryWallet.chainId,
        account: primaryWallet.accounts[0] as `0x${string}`,
        chain: mainnet,
      };

      setIsSending(true);

      const walletClient = primaryWallet.getWalletClient();
      const transactionResponse = await walletClient.sendTransaction(tx);

      setTransactionHash(transactionResponse);
      console.log("Transaction sent:", transactionResponse);
    } catch (error) {
      console.error("Failed to send transaction:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Parameters for the on-ramp URL
  const fiatCoin = "USD";
  const cryptoCoin = "ETH";
  const network = "Ethereum";
  const theme = "dark";
  const language = "en";

  // Function to handle the on-ramp button click
  const handleOnRamp = () => {
    const onRampUrl = `https://ramp.particle.network/?fiatCoin=${fiatCoin}&cryptoCoin=${cryptoCoin}&network=${network}&theme=${theme}&language=${language}`;
    window.open(onRampUrl, "_blank");
  };

  // Function to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("Copied to clipboard!");
    });
  };

  // Function to truncate Ethereum address
  const truncateAddress = (address: string) => {
    return address.slice(0, 6) + "..." + address.slice(-4);
  };

  return (
    <div className=" flex flex-col items-center justify-between p-8 bg-black text-white">
      {/* Header */}
      <header className="mb-8 flex flex-col items-center">
        <img
          src="https://camo.githubusercontent.com/8f19e01ee2f062917c087e75d1a504315a04fbf8d42cbcd61fc4b8a20f11118e/68747470733a2f2f692e696d6775722e636f6d2f786d647a5855342e706e67"
          alt="Particle Network Logo"
          className="mb-4 w-96"
        />
        <h1 className="text-4xl font-bold">Tony Wallet</h1>
        {/* <h2 className="mt-4 text-xl font-bold">
          Particle Connect Quickstart— Fetch user data and send trasnactions
        </h2> */}
      </header>

      <main className="flex-grow flex flex-col items-center justify-center w-full max-w-6xl mx-auto">
        {/* Display connection status */}
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg max-w-sm mx-auto mb-4">
          <h2 className="text-md font-semibold text-white">
            Status: {connectionStatus}
          </h2>
        </div>

        {isConnected ? (
          <>
            <div className="flex justify-center w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                <div className="border border-purple-500 p-6 rounded-lg">
                  {isLoadingUserInfo ? (
                    <div>Loading user info...</div>
                  ) : userInfoError ? (
                    <div className="text-red-500">{userInfoError}</div>
                  ) : (
                    userInfo && ( // Conditionally render user info
                      <div className="flex items-center">
                        <h2 className="text-lg font-semibold text-white mr-2">
                          Name: {userInfo.name || "N/A"}
                        </h2>
                        {userInfo.avatar && (
                          <img
                            src={userInfo.avatar}
                            alt="User Avatar"
                            className="w-10 h-10 rounded-full"
                          />
                        )}
                      </div>
                    )
                  )}
                  <h2 className="text-lg font-semibold mb-2 text-white flex items-center">
                    Address: <code>{truncateAddress(userAddress)}</code>
                    <button
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-2 ml-2 rounded transition duration-300 ease-in-out transform hover:scale-105 shadow-lg flex items-center"
                      onClick={() => copyToClipboard(userAddress)}
                    >
                      📋
                    </button>
                  </h2>
                  <h2 className="text-lg font-semibold mb-2 text-white">
                    Chain ID: <code>{chainId}</code>
                  </h2>
                  <h2 className="text-lg font-semibold mb-2 text-white flex items-center">
                    Balance: {balance !== "" ? balance : "Loading..."}
                    <button
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-2 ml-2 rounded transition duration-300 ease-in-out transform hover:scale-105 shadow-lg flex items-center"
                      onClick={fetchBalance}
                    >
                      🔄
                    </button>
                  </h2>
                  <button
                    className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                    onClick={handleOnRamp}
                  >
                    Buy Crypto with Fiat
                  </button>
                  <div>
                    <button
                      className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                      onClick={handleDisconnect}
                    >
                      Disconnect
                    </button>
                  </div>
                </div>

                <div className="border border-purple-500 p-6 rounded-lg">
                  <h2 className="text-2xl font-bold mb-2 text-white">
                    Send a transaction
                  </h2>
                  <h2 className="text-lg">Send 0.01</h2>
                  <input
                    type="text"
                    placeholder="Recipient Address"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className="mt-4 p-2 w-full rounded border border-gray-700 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <button
                    className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                    onClick={executeTxNative}
                    disabled={!recipientAddress || isSending}
                  >
                    {isSending ? "Sending..." : `Send 0.01 Particle provider`}
                  </button>
                  <button
                    className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                    onClick={executeTxEthers}
                    disabled={!recipientAddress || isSending}
                  >
                    {isSending ? "Sending..." : `Send 0.01 with ethers`}
                  </button>
                  {/* Display transaction notification with the hash */}
                  {transactionHash && (
                    <div className="mt-4 p-2 bg-gray-800 rounded-lg text-white">
                      Transaction Hash: {transactionHash}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <ConnectButton />
        )}
      </main>
    </div>
  );
}