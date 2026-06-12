interface PhantomProvider {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect(): Promise<{ publicKey: { toString(): string } }>;
  disconnect(): Promise<void>;
}

interface Window {
  solana?: PhantomProvider;
}
