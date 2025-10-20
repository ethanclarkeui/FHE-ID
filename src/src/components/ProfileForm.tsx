import { FormEvent, useMemo, useState } from 'react';
import { Contract } from 'ethers';
import { useAccount } from 'wagmi';

import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';
import type { StoredProfile } from '../types/registry';
import '../styles/ProfileForm.css';

const NATIONALITY_OPTIONS = [
  { value: '1', label: 'USA' },
  { value: '2', label: 'Canada' },
  { value: '3', label: 'Japan' },
  { value: '4', label: 'Germany' },
  { value: '5', label: 'Brazil' },
];

interface ProfileFormProps {
  instance: any;
  isInstanceLoading: boolean;
  profile: StoredProfile | null;
  onRegistered: () => void;
}

interface DecryptedProfile {
  birthYear: string;
  nationality: string;
  salary: string;
}

export function ProfileForm({ instance, isInstanceLoading, profile, onRegistered }: ProfileFormProps) {
  const { address } = useAccount();
  const signerPromise = useEthersSigner();

  const [fullName, setFullName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [nationality, setNationality] = useState('1');
  const [salary, setSalary] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedProfile, setDecryptedProfile] = useState<DecryptedProfile | null>(null);
  const [decryptError, setDecryptError] = useState<string | null>(null);

  const isConnected = useMemo(() => Boolean(address), [address]);
  const hasProfile = Boolean(profile?.exists);

  const resetForm = () => {
    setFullName('');
    setBirthYear('');
    setNationality('1');
    setSalary('');
  };

  const validateInputs = () => {
    if (!fullName.trim()) {
      throw new Error('Name is required');
    }

    const birthYearNumber = Number(birthYear);
    if (!Number.isInteger(birthYearNumber) || birthYearNumber < 1900 || birthYearNumber > 2020) {
      throw new Error('Birth year must be a valid year between 1900 and 2020');
    }

    const nationalityNumber = Number(nationality);
    if (!Number.isInteger(nationalityNumber) || nationalityNumber < 0) {
      throw new Error('Nationality must be a non-negative integer');
    }

    const salaryNumber = Number(salary);
    if (!Number.isFinite(salaryNumber) || salaryNumber < 0) {
      throw new Error('Annual salary must be a non-negative number');
    }

    if (!Number.isSafeInteger(Math.round(salaryNumber))) {
      throw new Error('Salary is too large to encode');
    }

    return {
      birthYearNumber,
      nationalityNumber,
      salaryNumber: Math.round(salaryNumber),
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!instance || !isConnected) {
      setSubmitError('Encryption service or wallet unavailable');
      return;
    }

    const signer = signerPromise ? await signerPromise : undefined;
    if (!signer) {
      setSubmitError('Wallet signer not available');
      return;
    }

    let parsed: ReturnType<typeof validateInputs>;
    try {
      parsed = validateInputs();
    } catch (validationError) {
      setSubmitError(validationError instanceof Error ? validationError.message : 'Invalid input');
      return;
    }

    setIsSubmitting(true);
    setSubmitSuccess(false);
    setSubmitError(null);

    try {
      const inputBuilder = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
      inputBuilder.add32(parsed.birthYearNumber);
      inputBuilder.add32(parsed.nationalityNumber);
      inputBuilder.add64(parsed.salaryNumber);

      const encryptedInput = await inputBuilder.encrypt();

      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.registerUser(
        fullName.trim(),
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.handles[2],
        encryptedInput.inputProof
      );

      await tx.wait();

      setSubmitSuccess(true);
      resetForm();
      onRegistered();
    } catch (error) {
      console.error('Failed to submit profile', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecryptProfile = async () => {
    if (!instance || !address || !profile?.exists) {
      setDecryptError('No encrypted profile available');
      return;
    }

    const signer = signerPromise ? await signerPromise : undefined;
    if (!signer) {
      setDecryptError('Wallet signer not available');
      return;
    }

    setIsDecrypting(true);
    setDecryptError(null);

    try {
      const keypair = instance.generateKeypair();
      const contractAddresses = [CONTRACT_ADDRESS];
      const timeStart = Math.floor(Date.now() / 1000).toString();
      const durationDays = '7';

      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, timeStart, durationDays);

      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );

      const handleContractPairs = [
        { handle: profile.birthYearHandle, contractAddress: CONTRACT_ADDRESS },
        { handle: profile.nationalityHandle, contractAddress: CONTRACT_ADDRESS },
        { handle: profile.salaryHandle, contractAddress: CONTRACT_ADDRESS }
      ];

      const decrypted = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        timeStart,
        durationDays
      );

      const resolve = (handle: string) => decrypted[handle] ?? '';

      setDecryptedProfile({
        birthYear: resolve(profile.birthYearHandle),
        nationality: resolve(profile.nationalityHandle),
        salary: resolve(profile.salaryHandle),
      });
    } catch (error) {
      console.error('Failed to decrypt profile', error);
      setDecryptError(error instanceof Error ? error.message : 'Failed to decrypt profile');
    } finally {
      setIsDecrypting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="profile-card">
        <h2 className="profile-title">Submit your profile</h2>
        <p className="profile-message">Connect your wallet to register encrypted details.</p>
      </div>
    );
  }

  if (isInstanceLoading) {
    return (
      <div className="profile-card">
        <h2 className="profile-title">Submit your profile</h2>
        <p className="profile-message">Initialising encryption service...</p>
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="profile-card">
        <h2 className="profile-title">Submit your profile</h2>
        <p className="profile-error">Encryption service unavailable. Please refresh the page.</p>
      </div>
    );
  }

  return (
    <div className="profile-card">
      <h2 className="profile-title">Submit your profile</h2>
      <p className="profile-description">
        Store your birth year, nationality, and annual salary with fully homomorphic encryption. Only your name
        is visible on-chain while the rest stays hidden.
      </p>

      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label className="form-label" htmlFor="fullName">Full name</label>
          <input
            id="fullName"
            className="text-input"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Jane Doe"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-field">
            <label className="form-label" htmlFor="birthYear">Birth year</label>
            <input
              id="birthYear"
              className="text-input"
              type="number"
              min="1900"
              max="2020"
              value={birthYear}
              onChange={(event) => setBirthYear(event.target.value)}
              placeholder="1992"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="nationality">Nationality ID</label>
            <select
              id="nationality"
              className="select-input"
              value={nationality}
              onChange={(event) => setNationality(event.target.value)}
              disabled={isSubmitting}
            >
              {NATIONALITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value} - {option.label}
                </option>
              ))}
            </select>
            <p className="help-text">Use the identifier requested by the prospective employer.</p>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="salary">Annual salary</label>
          <input
            id="salary"
            className="text-input"
            type="number"
            min="0"
            value={salary}
            onChange={(event) => setSalary(event.target.value)}
            placeholder="75000"
            disabled={isSubmitting}
            required
          />
          <p className="help-text">Enter the gross annual salary using whole numbers.</p>
        </div>

        {submitError && <p className="profile-error">{submitError}</p>}
        {submitSuccess && <p className="profile-success">Profile saved successfully.</p>}

        <button type="submit" className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : hasProfile ? 'Update profile' : 'Create profile'}
        </button>
      </form>

      {hasProfile && (
        <div className="profile-summary">
          <h3 className="summary-title">Stored details</h3>
          <p className="summary-text">Name: <span className="summary-highlight">{profile?.name}</span></p>

          <button
            type="button"
            className="secondary-button"
            onClick={handleDecryptProfile}
            disabled={isDecrypting}
          >
            {isDecrypting ? 'Decrypting...' : 'Decrypt my encrypted fields'}
          </button>

          {decryptError && <p className="profile-error">{decryptError}</p>}

          {decryptedProfile && (
            <div className="decrypted-details">
              <p>Birth year: <span className="summary-highlight">{decryptedProfile.birthYear}</span></p>
              <p>Nationality ID: <span className="summary-highlight">{decryptedProfile.nationality}</span></p>
              <p>Annual salary: <span className="summary-highlight">{decryptedProfile.salary}</span></p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
