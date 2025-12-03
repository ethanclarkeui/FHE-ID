export const CONTRACT_ADDRESS = '0xD85bdc55b0812a4019011e02f9c7D8BD340e503F';

export const CONTRACT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint8",
        "name": "companyId",
        "type": "uint8"
      }
    ],
    "name": "ApplicationEvaluated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "name",
        "type": "string"
      }
    ],
    "name": "UserRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "name",
        "type": "string"
      }
    ],
    "name": "UserUpdated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint8",
        "name": "companyId",
        "type": "uint8"
      }
    ],
    "name": "applyToCompany",
    "outputs": [
      {
        "internalType": "ebool",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "uint8",
        "name": "companyId",
        "type": "uint8"
      }
    ],
    "name": "getApplicationResult",
    "outputs": [
      {
        "internalType": "ebool",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint8",
        "name": "companyId",
        "type": "uint8"
      }
    ],
    "name": "getCompanyRequirement",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint8",
            "name": "id",
            "type": "uint8"
          },
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "uint32",
            "name": "minimumAge",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "requiredNationalityId",
            "type": "uint32"
          },
          {
            "internalType": "uint64",
            "name": "minimumSalary",
            "type": "uint64"
          }
        ],
        "internalType": "struct EncryptedJobRegistry.CompanyRequirement",
        "name": "requirement",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "getUserProfile",
    "outputs": [
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "euint32",
        "name": "birthYear",
        "type": "bytes32"
      },
      {
        "internalType": "euint32",
        "name": "nationality",
        "type": "bytes32"
      },
      {
        "internalType": "euint64",
        "name": "salary",
        "type": "bytes32"
      },
      {
        "internalType": "bool",
        "name": "exists",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "hasProfile",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "listCompanyRequirements",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint8",
            "name": "id",
            "type": "uint8"
          },
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "uint32",
            "name": "minimumAge",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "requiredNationalityId",
            "type": "uint32"
          },
          {
            "internalType": "uint64",
            "name": "minimumSalary",
            "type": "uint64"
          }
        ],
        "internalType": "struct EncryptedJobRegistry.CompanyRequirement[]",
        "name": "companies",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "protocolId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "externalEuint32",
        "name": "encryptedBirthYear",
        "type": "bytes32"
      },
      {
        "internalType": "externalEuint32",
        "name": "encryptedNationality",
        "type": "bytes32"
      },
      {
        "internalType": "externalEuint64",
        "name": "encryptedSalary",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "inputProof",
        "type": "bytes"
      }
    ],
    "name": "registerUser",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
