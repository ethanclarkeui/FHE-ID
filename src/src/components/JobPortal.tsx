import { useEffect, useMemo, useState } from 'react';
import { useAccount, usePublicClient, useReadContract } from 'wagmi';

import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contracts';
import { useZamaInstance } from '../hooks/useZamaInstance';
import type { CompanyRequirement, StoredProfile } from '../types/registry';
import { CompanyBoard } from './CompanyBoard';
import { Header } from './Header';
import { ProfileForm } from './ProfileForm';
import '../styles/JobPortal.css';

type ActiveTab = 'profile' | 'companies';

export function JobPortal() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { instance, isLoading: instanceLoading, error: instanceError } = useZamaInstance();

  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
  const [refreshTicker, setRefreshTicker] = useState(0);
  const [applicationHandles, setApplicationHandles] = useState<Record<number, string>>({});
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  const {
    data: companiesData,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'listCompanyRequirements',
  });

  const {
    data: profileData,
    refetch: refetchProfile,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getUserProfile',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
    },
  });

  const companies: CompanyRequirement[] = useMemo(() => {
    if (!companiesData) {
      return [];
    }

    return (companiesData as any[]).map((company) => ({
      id: Number(company.id),
      name: company.name as string,
      minimumAge: Number(company.minimumAge),
      requiredNationalityId: Number(company.requiredNationalityId),
      minimumSalary: Number(company.minimumSalary),
    }));
  }, [companiesData]);

  const profile: StoredProfile | null = useMemo(() => {
    if (!profileData) {
      return null;
    }

    const [name, birthYear, nationality, salary, exists] = profileData as [string, string, string, string, boolean];
    return {
      name,
      birthYearHandle: birthYear,
      nationalityHandle: nationality,
      salaryHandle: salary,
      exists,
    };
  }, [profileData]);

  useEffect(() => {
    let cancelled = false;

    if (!publicClient || !address || companies.length === 0) {
      setApplicationHandles({});
      return;
    }

    const loadResults = async () => {
      setIsLoadingResults(true);
      try {
        const entries = await Promise.all(
          companies.map(async (company) => {
            const result = await publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: CONTRACT_ABI,
              functionName: 'getApplicationResult',
              args: [address, BigInt(company.id)],
            });
            return [company.id, result as string];
          })
        );

        if (!cancelled) {
          setApplicationHandles(Object.fromEntries(entries));
        }
      } catch (error) {
        console.error('Failed to load application results', error);
      } finally {
        if (!cancelled) {
          setIsLoadingResults(false);
        }
      }
    };

    loadResults();

    return () => {
      cancelled = true;
    };
  }, [publicClient, address, companies, refreshTicker]);

  const triggerRefresh = () => {
    setRefreshTicker((value) => value + 1);
    if (refetchProfile) {
      refetchProfile();
    }
  };

  return (
    <div className="job-portal">
      <Header />
      <div className="portal-content">
        <div className="tab-navigation">
          <nav className="tab-nav">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`tab-button ${activeTab === 'profile' ? 'active' : 'inactive'}`}
            >
              Profile
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('companies')}
              className={`tab-button ${activeTab === 'companies' ? 'active' : 'inactive'}`}
            >
              Companies
            </button>
          </nav>
        </div>

        {instanceError && <p className="portal-error">{instanceError}</p>}

        {activeTab === 'profile' && (
          <ProfileForm
            instance={instance}
            isInstanceLoading={instanceLoading}
            profile={profile}
            onRegistered={triggerRefresh}
          />
        )}

        {activeTab === 'companies' && (
          <CompanyBoard
            instance={instance}
            companies={companies}
            applicationHandles={applicationHandles}
            isLoadingResults={isLoadingResults}
            onRefresh={triggerRefresh}
            hasProfile={Boolean(profile?.exists)}
          />
        )}
      </div>
    </div>
  );
}
