export interface AramexConfig {
  /**
   * Aramex API username
   */
  username: string;

  /**
   * Aramex API password
   */
  password: string;

  /**
   * Aramex account number
   */
  accountNumber: string;

  /**
   * Aramex account PIN
   */
  accountPin: string;

  /**
   * Aramex account entity (e.g., 'AMM')
   */
  accountEntity: string;

  /**
   * Aramex account country code (e.g., 'JO')
   */
  accountCountryCode: string;

  /**
   * Use sandbox environment
   */
  sandbox?: boolean;

  /**
   * Request timeout in milliseconds
   */
  timeout?: number;

  /**
   * Enable debug logging
   */
  debug?: boolean;
}