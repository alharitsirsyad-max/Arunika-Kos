/**
 * Minimal type declarations for midtrans-client.
 * The package ships no TypeScript types; this stub is enough for the compiler.
 */
declare module "midtrans-client" {
  interface MidtransClientOptions {
    isProduction: boolean;
    serverKey: string;
    clientKey?: string;
  }

  interface TransactionDetails {
    order_id: string;
    gross_amount: number;
  }

  interface CustomerDetails {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  }

  interface SnapTransactionParams {
    transaction_details: TransactionDetails;
    customer_details?: CustomerDetails;
    [key: string]: unknown;
  }

  interface SnapTokenResponse {
    token: string;
    redirect_url: string;
  }

  class Snap {
    constructor(options: MidtransClientOptions);
    createTransaction(params: SnapTransactionParams): Promise<SnapTokenResponse>;
    createTransactionToken(params: SnapTransactionParams): Promise<string>;
    createTransactionRedirectUrl(params: SnapTransactionParams): Promise<string>;
  }

  class CoreApi {
    constructor(options: MidtransClientOptions);
    transaction: {
      status(orderId: string): Promise<Record<string, unknown>>;
    };
  }

  const midtransClient: {
    Snap: typeof Snap;
    CoreApi: typeof CoreApi;
  };

  export = midtransClient;
}
