+# Encrypted Job Registry
+
+Encrypted Job Registry is a privacy-preserving hiring dApp that stores applicant metadata with Fully Homomorphic Encryption (FHE). Candidates submit their name, birth year, nationality identifier, and annual salary. Only the name is visible on-chain. Age, nationality, and salary remain encrypted, yet the platform can still evaluate whether a candidate qualifies for each company’s requirements. The solution demonstrates how Zama’s FHE tooling can power confidential web3 workflows without sacrificing verifiability.
+
+## Overview
+
+- Store sensitive candidate attributes as encrypted integers while keeping names in plaintext for discoverability.
+- Evaluate company-specific hiring rules entirely on-chain without ever revealing the underlying confidential data.
+- Provide a front-end experience that connects to Sepolia, uses Zama’s SDK for client-side encryption/decryption flows, and integrates RainbowKit for wallet onboarding.
+- Maintain auditable smart-contract logic with deterministic company requirements and encrypted application outcomes.
+
+## Key Advantages
+
+- **End-to-end confidentiality:** Salary, age, and nationality values are encrypted at rest and in transit; only the applicant can decrypt their own records.
+- **Deterministic eligibility checks:** Smart contracts compare encrypted values using FHE operations, proving rule compliance without exposing raw data.
+- **Seamless Web3 onboarding:** RainbowKit and Wagmi deliver a familiar wallet UX while the underlying logic remains FHE-enabled.
+- **Verifiable outcomes:** Application results are stored as encrypted booleans, enabling applicants to decrypt their status while keeping the verdict private to third parties.
+- **Composable architecture:** The design separates encryption tooling, contract evaluation, and frontend orchestration, making it easier to extend or audit each layer.
+
+## Problems Solved
+
+- **Privacy-preserving hiring:** Companies can apply eligibility filters (age, nationality, salary thresholds) without the legal and security risk of storing plaintext PII.
+- **Applicant trust:** Candidates control decryption keys and can prove eligibility without revealing details, fostering trust in the hiring pipeline.
+- **Regulatory alignment:** Storing sensitive data in encrypted form supports compliance requirements around data minimisation and confidentiality.
+- **Web3-native automation:** Decisions execute on-chain with transparent logs (events and handles) while the data underpinning those decisions stays private.
+
+## Solution Architecture
+
+### Smart Contract Layer (`contracts/EncryptedJobRegistry.sol`)
+
+- Extends Zama’s `SepoliaConfig` and imports FHE primitives (`euint32`, `euint64`, `ebool`, etc.).
+- Stores user profiles keyed by wallet address with encrypted fields and plaintext names.
+- Persists three predefined company requirements:
+  - **Astra Finance:** Age ≥ 21, nationality id 1, salary ≥ 45,000
+  - **Orbit Labs:** Age ≥ 25, nationality id 2, salary ≥ 60,000
+  - **Nova Health:** Age ≥ 30, nationality id 3, salary ≥ 75,000
+- Performs encrypted comparisons for nationality, age, and salary to determine eligibility while preserving secrecy.
+- Emits events (`UserRegistered`, `UserUpdated`, `ApplicationEvaluated`) for external analytics without leaking raw data.
+
+### Encryption Workflow
+
+1. Frontend initialises the Zama Relayer SDK (`useZamaInstance`).
+2. On form submission, the client:
+   - Validates user input types and ranges.
+   - Builds an encrypted payload via `createEncryptedInput` for birth year, nationality id, and salary.
+   - Sends encrypted handles and proof to the contract’s `registerUser` method using `ethers`.
+3. Contracts convert handles back to internal FHE types and store them while granting the user and contract access with `FHE.allow`.
+4. When applying to a company, the contract compares encrypted data against deterministic requirements and returns an encrypted boolean.
+5. Users can decrypt their stored values and application results by generating a client-side keypair, signing an EIP-712 message, and calling `userDecrypt` through the SDK.
+
+### Frontend Application (`src/src`)
+
+- Built with React, Vite, Wagmi, and RainbowKit (configured for Sepolia).
+- `ProfileForm` handles encrypted profile creation, updates, and self-decryption.
+- `CompanyBoard` lists company requirements, triggers applications, and decrypts results.
+- Reads contract state via `viem` in alignment with the “write with ethers, read with viem” guideline.
+- Uses custom CSS (no Tailwind) to maintain a lightweight UI.
+
+### Data Lifecycle
+
+1. **Registration:** Users create an encrypted profile and emit a registration/update event.
+2. **Application:** Users select a company, triggering an on-chain encrypted evaluation.
+3. **Result retrieval:** The frontend fetches encrypted handles for application outcomes and decrypts them locally.
+4. **Profile management:** Users can decrypt their own stored profile fields on demand.
+
+## Technology Stack
+
+- **Smart contracts:** Solidity 0.8.27, Hardhat, hardhat-deploy, TypeChain, Chai/Mocha.
+- **FHE tooling:** `@fhevm/solidity` for on-chain primitives, `@zama-fhe/relayer-sdk` for the encryption relayer client.
+- **Frontend:** React 19, Vite 7, TypeScript, Wagmi 2, RainbowKit 2, Viem 2, Ethers 6.
+- **Developer experience:** ESLint, Prettier, Hardhat gas reporter, Solidity coverage.
+
+## Getting Started
+
+### Prerequisites
+
+- Node.js 20+
+- npm 9+
+- Funded Sepolia wallet for on-chain deployment and interaction
+- WalletConnect project ID for RainbowKit (obtain from WalletConnect Cloud)
+
+### Install Dependencies
+
+```bash
+# Install contract tooling
+npm install
+
+# Install frontend dependencies
+cd src
+npm install
+cd ..
+```
+
+### Environment Configuration
+
+Create a `.env` file in the repository root:
+
+```env
+PRIVATE_KEY=0x...        # Used for Sepolia deployments (32-byte hex string)
+INFURA_API_KEY=...       # Sepolia RPC access
+ETHERSCAN_API_KEY=...    # Optional, enables contract verification
+MNEMONIC=...             # Optional, used for local development accounts only
+```
+
+The Hardhat configuration loads these variables with `dotenv.config()`. Sepolia deployments consume the `PRIVATE_KEY`; mnemonic-based deployments are limited to local or anvil environments.
+
+RainbowKit lives in `src/src/config/wagmi.ts`. Replace the placeholder `projectId` with your WalletConnect project ID before serving the frontend.
+
+## Smart Contract Workflow
+
+Run Hardhat tasks from the repository root:
+
+```bash
+# Compile and generate TypeChain bindings
+npx hardhat compile
+
+# Execute the unit test suite
+npx hardhat test
+
+# Optional: start a local FHE-ready Hardhat node
+npx hardhat node
+```
+
+### Deployment
+
+```bash
+# Deploy to Hardhat’s in-memory network
+npx hardhat deploy --network hardhat
+
+# Deploy to Sepolia (requires PRIVATE_KEY and INFURA_API_KEY)
+npx hardhat deploy --network sepolia
+
+# Optional: verify the contract on Sepolia Etherscan
+npx hardhat verify --network sepolia <DEPLOYED_ADDRESS>
+```
+
+Deployment artifacts, including the canonical ABI, are stored in `deployments/<network>/EncryptedJobRegistry.json`. Always copy the ABI and address from this file into the frontend (`src/src/config/contracts.ts`) after redeployments to keep the UI and contracts synchronised.
+
+## Frontend Workflow
+
+All commands run from the `src` directory unless noted otherwise:
+
+```bash
+cd src
+
+# Type-check and bundle the UI
+npm run build
+
+# Start the Vite development server
+npm run dev
+
+# Preview the production build
+npm run preview
+```
+
+The application expects an active Sepolia deployment at the address defined in `src/src/config/contracts.ts`. When connecting, users:
+
+1. Authenticate with a RainbowKit-supported wallet (Sepolia chain).
+2. Allow the Zama relayer SDK to initialise the encryption instance.
+3. Submit encrypted profile data, apply to companies, and decrypt results from the UI without exposing plaintext values.
+
+## Quality and Testing
+
+- **Hardhat unit tests:** Validate contract logic, encrypted comparisons, and requirement enforcement.
+- **TypeScript build:** `npm run build` in `src` performs strict type-checking before bundling.
+- **Coverage & gas:** Use `npm run coverage` and `REPORT_GAS=1 npx hardhat test` (root) for deeper insights when optimising.
+
+## Future Roadmap
+
+- **Dynamic company onboarding:** Allow authorised employers to register encrypted requirements through governance or role-based access control.
+- **Extended applicant schema:** Support additional encrypted fields (experience, certifications) with versioned profile storage.
+- **Cross-network support:** Generalise deployment scripts for future FHE-enabled chains beyond Sepolia.
+- **ZK attestations:** Integrate verifiable credentials so applicants can prove attribute authenticity without revealing raw data.
+- **Privacy dashboards:** Provide aggregate analytics (e.g., number of qualified applicants) using privacy-preserving computation.
+- **Enhanced UX:** Add multi-language support, inline education about FHE, and richer error handling for SDK initialisation.
+
+## Troubleshooting
+
+- **`contract.registerUser is not a function`:** Rebuild the frontend after synchronising the ABI and contract address from `deployments/sepolia/EncryptedJobRegistry.json`.
+- **Wallet connection failures:** Replace `projectId` in `src/src/config/wagmi.ts` with a valid WalletConnect Cloud ID and confirm your wallet supports Sepolia.
+- **Zama SDK errors:** Check browser developer tools for network restrictions and re-run `npm run build` in `src` to ensure the SDK bundle is included.
+- **Deployment issues:** Verify the `.env` configuration, ensure the `PRIVATE_KEY` account holds Sepolia ETH, and confirm the Infura project allows Sepolia traffic.
+
+## License
+
+This project remains under the BSD-3-Clause-Clear license. Refer to the [`LICENSE`](LICENSE) file for details.
