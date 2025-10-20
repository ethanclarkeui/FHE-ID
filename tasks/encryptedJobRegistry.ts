import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

const CONTRACT_NAME = "EncryptedJobRegistry";

task("registry:address", "Prints the EncryptedJobRegistry address").setAction(
  async function (_taskArguments: TaskArguments, hre) {
    const { deployments } = hre;

    const deployment = await deployments.get(CONTRACT_NAME);

    console.log(`${CONTRACT_NAME} address: ${deployment.address}`);
  },
);

task("registry:list-companies", "Lists configured company requirements")
  .addOptionalParam("address", "Optionally specify the contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const contractDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get(CONTRACT_NAME);

    const registry = await ethers.getContractAt(CONTRACT_NAME, contractDeployment.address);
    const companies = await registry.listCompanyRequirements();

    console.log("Configured companies:");
    companies.forEach((company: any) => {
      console.log(
        `- [${company.id}] ${company.name}: minAge=${company.minimumAge}, nationality=${company.requiredNationalityId}, minSalary=${company.minimumSalary}`,
      );
    });
  });

task("registry:register", "Registers or updates the user profile")
  .addParam("name", "Full name to store in plain text")
  .addParam("birthyear", "Birth year as a four digit number")
  .addParam("nationality", "Numeric nationality identifier")
  .addParam("salary", "Annual salary (whole units)")
  .addOptionalParam("address", "Optionally specify the contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const contractDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get(CONTRACT_NAME);

    const registry = await ethers.getContractAt(CONTRACT_NAME, contractDeployment.address);
    const signers = await ethers.getSigners();

    const birthYear = parseInt(taskArguments.birthyear, 10);
    const nationality = parseInt(taskArguments.nationality, 10);
    const salary = BigInt(taskArguments.salary);

    if (!Number.isInteger(birthYear) || birthYear <= 0) {
      throw new Error("birthyear must be a positive integer");
    }

    if (!Number.isInteger(nationality) || nationality < 0) {
      throw new Error("nationality must be a non-negative integer");
    }

    if (salary < 0n) {
      throw new Error("salary must be non-negative");
    }

    if (salary > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error("salary is too large for encryption helper");
    }

    const encryptedInput = await fhevm
      .createEncryptedInput(contractDeployment.address, signers[0].address)
      .add32(birthYear)
      .add32(nationality)
      .add64(Number(salary))
      .encrypt();

    const tx = await registry
      .connect(signers[0])
      .registerUser(
        taskArguments.name,
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.handles[2],
        encryptedInput.inputProof,
      );

    console.log(`Sent registerUser transaction ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Status: ${receipt?.status}`);
  });

task("registry:apply", "Evaluates application for a company")
  .addParam("company", "Company identifier (0-2)")
  .addOptionalParam("address", "Optionally specify the contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const contractDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get(CONTRACT_NAME);

    const companyId = parseInt(taskArguments.company, 10);
    if (!Number.isInteger(companyId) || companyId < 0) {
      throw new Error("company must be a non-negative integer");
    }

    const registry = await ethers.getContractAt(CONTRACT_NAME, contractDeployment.address);
    const signers = await ethers.getSigners();

    const tx = await registry.connect(signers[0]).applyToCompany(companyId);
    console.log(`Sent applyToCompany transaction ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`Status: ${receipt?.status}`);
  });

task("registry:decrypt-result", "Decrypts the latest application outcome")
  .addParam("company", "Company identifier (0-2)")
  .addOptionalParam("address", "Optionally specify the contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const contractDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get(CONTRACT_NAME);

    const companyId = parseInt(taskArguments.company, 10);
    if (!Number.isInteger(companyId) || companyId < 0) {
      throw new Error("company must be a non-negative integer");
    }

    const registry = await ethers.getContractAt(CONTRACT_NAME, contractDeployment.address);
    const signers = await ethers.getSigners();

    const encryptedResult = await registry.getApplicationResult(signers[0].address, companyId);

    if (encryptedResult === ethers.ZeroHash) {
      console.log("No application result stored for this company.");
      return;
    }

    const clearResult = await fhevm.userDecryptEbool(
      encryptedResult,
      contractDeployment.address,
      signers[0],
    );

    console.log(`Encrypted result: ${encryptedResult}`);
    console.log(`Meets requirements: ${clearResult}`);
  });

task("registry:profile", "Shows the stored encrypted profile for an address")
  .addOptionalParam("address", "Optionally specify the contract address")
  .addOptionalParam("user", "User address (defaults to signer[0])")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const contractDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get(CONTRACT_NAME);

    const registry = await ethers.getContractAt(CONTRACT_NAME, contractDeployment.address);
    const signers = await ethers.getSigners();
    const targetAddress = taskArguments.user ?? signers[0].address;

    const profile = await registry.getUserProfile(targetAddress);

    console.log(`Profile for ${targetAddress}`);
    console.log(`- name: ${profile[0]}`);
    console.log(`- birthYear (encrypted): ${profile[1]}`);
    console.log(`- nationality (encrypted): ${profile[2]}`);
    console.log(`- salary (encrypted): ${profile[3]}`);
    console.log(`- exists: ${profile[4]}`);
  });
