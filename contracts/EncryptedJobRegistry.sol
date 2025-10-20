// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, ebool, euint32, euint64, externalEuint32, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract EncryptedJobRegistry is SepoliaConfig {
    uint32 private constant CURRENT_YEAR = 2024;

    struct UserProfile {
        string name;
        euint32 birthYear;
        euint32 nationality;
        euint64 salary;
        bool exists;
    }

    struct CompanyRequirement {
        uint8 id;
        string name;
        uint32 minimumAge;
        uint32 requiredNationalityId;
        uint64 minimumSalary;
    }

    mapping(address => UserProfile) private _profiles;
    mapping(uint8 => CompanyRequirement) private _requirements;
    uint8[] private _companyIds;
    mapping(address => mapping(uint8 => ebool)) private _applicationResults;

    event UserRegistered(address indexed account, string name);
    event UserUpdated(address indexed account, string name);
    event ApplicationEvaluated(address indexed account, uint8 indexed companyId);

    constructor() {
        _registerCompanyRequirement(0, "Astra Finance", 21, 1, 45_000);
        _registerCompanyRequirement(1, "Orbit Labs", 25, 2, 60_000);
        _registerCompanyRequirement(2, "Nova Health", 30, 3, 75_000);
    }

    function registerUser(
        string calldata name,
        externalEuint32 encryptedBirthYear,
        externalEuint32 encryptedNationality,
        externalEuint64 encryptedSalary,
        bytes calldata inputProof
    ) external {
        euint32 birthYear = FHE.fromExternal(encryptedBirthYear, inputProof);
        euint32 nationality = FHE.fromExternal(encryptedNationality, inputProof);
        euint64 salary = FHE.fromExternal(encryptedSalary, inputProof);

        UserProfile storage profile = _profiles[msg.sender];
        bool alreadyRegistered = profile.exists;

        profile.name = name;
        profile.birthYear = birthYear;
        profile.nationality = nationality;
        profile.salary = salary;
        profile.exists = true;

        FHE.allowThis(birthYear);
        FHE.allowThis(nationality);
        FHE.allowThis(salary);

        FHE.allow(birthYear, msg.sender);
        FHE.allow(nationality, msg.sender);
        FHE.allow(salary, msg.sender);

        if (alreadyRegistered) {
            emit UserUpdated(msg.sender, name);
        } else {
            emit UserRegistered(msg.sender, name);
        }
    }

    function applyToCompany(uint8 companyId) external returns (ebool) {
        UserProfile storage profile = _profiles[msg.sender];
        require(profile.exists, "UserNotRegistered");

        CompanyRequirement memory requirement = _requirements[companyId];
        require(bytes(requirement.name).length != 0, "InvalidCompany");

        euint32 expectedNationality = FHE.asEuint32(requirement.requiredNationalityId);
        ebool nationalityMatch = FHE.eq(profile.nationality, expectedNationality);

        uint32 latestBirthYear = CURRENT_YEAR - requirement.minimumAge;
        euint32 birthYearThreshold = FHE.asEuint32(latestBirthYear);
        ebool ageMatch = FHE.le(profile.birthYear, birthYearThreshold);

        euint64 minimumSalary = FHE.asEuint64(requirement.minimumSalary);
        ebool salaryMatch = FHE.ge(profile.salary, minimumSalary);

        ebool meetsRequirements = FHE.and(nationalityMatch, FHE.and(ageMatch, salaryMatch));

        _applicationResults[msg.sender][companyId] = meetsRequirements;

        FHE.allow(meetsRequirements, msg.sender);
        FHE.allowThis(meetsRequirements);

        emit ApplicationEvaluated(msg.sender, companyId);
        return meetsRequirements;
    }

    function getUserProfile(address account)
        external
        view
        returns (string memory name, euint32 birthYear, euint32 nationality, euint64 salary, bool exists)
    {
        UserProfile storage profile = _profiles[account];
        return (profile.name, profile.birthYear, profile.nationality, profile.salary, profile.exists);
    }

    function getCompanyRequirement(uint8 companyId) external view returns (CompanyRequirement memory requirement) {
        requirement = _requirements[companyId];
        require(bytes(requirement.name).length != 0, "InvalidCompany");
    }

    function listCompanyRequirements() external view returns (CompanyRequirement[] memory companies) {
        companies = new CompanyRequirement[](_companyIds.length);
        for (uint256 i = 0; i < _companyIds.length; ++i) {
            companies[i] = _requirements[_companyIds[i]];
        }
    }

    function getApplicationResult(address account, uint8 companyId) external view returns (ebool) {
        return _applicationResults[account][companyId];
    }

    function hasProfile(address account) external view returns (bool) {
        return _profiles[account].exists;
    }

    function _registerCompanyRequirement(
        uint8 companyId,
        string memory name,
        uint32 minimumAge,
        uint32 requiredNationalityId,
        uint64 minimumSalary
    ) private {
        _requirements[companyId] = CompanyRequirement({
            id: companyId,
            name: name,
            minimumAge: minimumAge,
            requiredNationalityId: requiredNationalityId,
            minimumSalary: minimumSalary
        });
        _companyIds.push(companyId);
    }
}
