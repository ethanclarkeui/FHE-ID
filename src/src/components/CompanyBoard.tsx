import { useMemo, useState } from 'react';
import { Contract } from 'ethers';
import { useAccount } from 'wagmi';

import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';
import type { CompanyRequirement } from '../type/registry';
import '../styles/CompanyBoard.css';

interface CompanyBoardProps {
  instance: any;
  companies: CompanyRequirement[];
  applicationHandles: Record<number, string>;
  isLoadingResults: boolean;
  onRefresh: () => void;
  hasProfile: boolean;
}

const EMPTY_HANDLE_REGEX = /^0x0*$/i;

export function CompanyBoard({
  instance,
  companies,
  applicationHandles,
  isLoadingResults,
  onRefresh,
  hasProfile,
}: CompanyBoardProps) {
  const { address } = useAccount();
  const signerPromise = useEthersSigner();

  const [pendingCompany, setPendingCompany] = useState<number | null>(null);
  const [decryptingCompany, setDecryptingCompany] = useState<number | null>(null);
  const [decryptedResults, setDecryptedResults] = useState<Record<number, boolean>>({});
  const [feedback, setFeedback] = useState<string | null>(null);

  const isConnected = useMemo(() => Boolean(address), [address]);

  const handleApply = async (companyId: number) => {
    if (!isConnected) {
      setFeedback('Connect your wallet before applying.');
      return;
    }

    if (!hasProfile) {
      setFeedback('Submit your encrypted profile before applying.');
      return;
    }

    const signer = signerPromise ? await signerPromise : undefined;
    if (!signer) {
      setFeedback('Wallet signer not available.');
      return;
    }

    setPendingCompany(companyId);
    setFeedback(null);

    try {
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.applyToCompany(companyId);
      await tx.wait();
      setFeedback('Application submitted successfully.');
      onRefresh();
    } catch (error) {
      console.error('Failed to apply', error);
      setFeedback(error instanceof Error ? error.message : 'Failed to submit application');
    } finally {
      setPendingCompany(null);
    }
  };

  const handleDecryptResult = async (companyId: number) => {
    if (!instance || !address) {
      setFeedback('Encryption service not ready.');
      return;
    }

    const handle = applicationHandles[companyId];
    if (!handle || EMPTY_HANDLE_REGEX.test(handle)) {
      setFeedback('No encrypted result found for this company.');
      return;
    }

    const signer = signerPromise ? await signerPromise : undefined;
    if (!signer) {
      setFeedback('Wallet signer not available.');
      return;
    }

    setDecryptingCompany(companyId);
    setFeedback(null);

    try {
      const keypair = instance.generateKeypair();
      const contractAddresses = [CONTRACT_ADDRESS];
      const startTime = Math.floor(Date.now() / 1000).toString();
      const durationDays = '7';

      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTime, durationDays);
      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );

      const decrypted = await instance.userDecrypt(
        [{ handle, contractAddress: CONTRACT_ADDRESS }],
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTime,
        durationDays
      );

      const rawValue = decrypted[handle];
      const matches = rawValue === true || rawValue === 'true' || rawValue === '1';

      setDecryptedResults((prev) => ({ ...prev, [companyId]: matches }));
      setFeedback(matches ? 'You meet the requirements.' : 'You do not meet the requirements yet.');
    } catch (error) {
      console.error('Failed to decrypt result', error);
      setFeedback(error instanceof Error ? error.message : 'Failed to decrypt application result');
    } finally {
      setDecryptingCompany(null);
    }
  };

  return (
    <div className="company-board">
      <div className="board-header">
        <h2 className="board-title">Available companies</h2>
        <p className="board-description">
          Each company checks age, nationality, and annual salary without revealing your personal data.
        </p>
      </div>

      {feedback && <p className="board-feedback">{feedback}</p>}

      {companies.length === 0 ? (
        <div className="company-card empty">
          <p>No companies configured yet.</p>
        </div>
      ) : (
        <div className="company-grid">
          {companies.map((company) => {
            const handle = applicationHandles[company.id];
            const isEvaluated = Boolean(handle && !EMPTY_HANDLE_REGEX.test(handle));
            const decrypted = decryptedResults[company.id];

            return (
              <div className="company-card" key={company.id}>
                <div className="company-header">
                  <h3 className="company-name">{company.name}</h3>
                  <span className="company-id">#{company.id}</span>
                </div>

                <ul className="requirement-list">
                  <li>
                    <span className="requirement-label">Minimum age</span>
                    <span className="requirement-value">{company.minimumAge}+</span>
                  </li>
                  <li>
                    <span className="requirement-label">Required nationality ID</span>
                    <span className="requirement-value">{company.requiredNationalityId}</span>
                  </li>
                  <li>
                    <span className="requirement-label">Minimum salary</span>
                    <span className="requirement-value">${company.minimumSalary.toLocaleString()}</span>
                  </li>
                </ul>

                <div className="company-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => handleApply(company.id)}
                    disabled={pendingCompany === company.id}
                  >
                    {pendingCompany === company.id ? 'Submitting...' : 'Apply to company'}
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => handleDecryptResult(company.id)}
                    disabled={decryptingCompany === company.id || !isEvaluated}
                  >
                    {decryptingCompany === company.id
                      ? 'Decrypting...'
                      : isEvaluated
                        ? 'Decrypt outcome'
                        : 'Awaiting evaluation'}
                  </button>
                </div>

                {isLoadingResults && !isEvaluated && (
                  <p className="company-hint">Checking for encrypted results...</p>
                )}

                {decrypted !== undefined && (
                  <p className={`company-result ${decrypted ? 'success' : 'failure'}`}>
                    {decrypted ? 'You satisfy all requirements.' : 'You do not satisfy every requirement.'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
