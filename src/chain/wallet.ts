import { Connection, PublicKey } from "@solana/web3.js";
import { mintConfigured, PUMP_MINT, SOLANA_RPC } from "./config";
import { tierFromBalance, type HolderTier } from "./holderPerks";

class WalletService {
  connected = false;
  publicKey: string | null = null;
  balance = 0;
  tier: HolderTier = "none";

  private listeners = new Set<() => void>();

  onChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    for (const cb of this.listeners) cb();
  }

  getProvider(): PhantomProvider | undefined {
    return window.solana?.isPhantom ? window.solana : undefined;
  }

  hasPhantom(): boolean {
    return !!this.getProvider();
  }

  shortAddress(addr: string | null): string {
    if (!addr) return "";
    return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
  }

  async connect(): Promise<boolean> {
    const provider = this.getProvider();
    if (!provider) {
      window.open("https://phantom.app/", "_blank");
      return false;
    }
    try {
      const resp = await provider.connect();
      this.publicKey = resp.publicKey.toString();
      this.connected = true;
      await this.refreshBalance();
      this.notify();
      return true;
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.getProvider()?.disconnect();
    } catch {
      /* already disconnected */
    }
    this.connected = false;
    this.publicKey = null;
    this.balance = 0;
    this.tier = "none";
    this.notify();
  }

  async refreshBalance(): Promise<void> {
    if (!this.publicKey || !mintConfigured) {
      this.balance = 0;
      this.tier = "none";
      return;
    }
    try {
      const conn = new Connection(SOLANA_RPC, "confirmed");
      const owner = new PublicKey(this.publicKey);
      const mint = new PublicKey(PUMP_MINT);
      const accounts = await conn.getParsedTokenAccountsByOwner(owner, { mint });
      const ui = accounts.value[0]?.account.data.parsed.info.tokenAmount.uiAmount;
      this.balance = ui ?? 0;
      this.tier = tierFromBalance(this.balance);
    } catch {
      this.balance = 0;
      this.tier = "none";
    }
    this.notify();
  }

  async tryReconnect(savedAddress?: string): Promise<void> {
    const provider = this.getProvider();
    if (!provider?.publicKey) return;
    const pk = provider.publicKey.toString();
    if (savedAddress && pk !== savedAddress) return;
    this.publicKey = pk;
    this.connected = true;
    await this.refreshBalance();
    this.notify();
  }

  getSellMultiplier(): number {
    if (this.tier === "founder") return 1.1;
    if (this.tier === "veteran") return 1.05;
    return 1;
  }
}

export const walletService = new WalletService();
