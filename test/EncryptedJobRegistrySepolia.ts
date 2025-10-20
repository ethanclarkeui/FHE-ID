import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { deployments, ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { EncryptedJobRegistry } from "../types";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("EncryptedJobRegistrySepolia", function () {
  let signers: Signers;
  let registry: EncryptedJobRegistry;
  let registryAddress: string;
  let step = 0;
  let steps = 0;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn("Skip Sepolia test suite when running against the FHE mock");
      this.skip();
    }

    try {
      const deployment = await deployments.get("EncryptedJobRegistry");
      registryAddress = deployment.address;
      registry = (await ethers.getContractAt(
        "EncryptedJobRegistry",
        deployment.address,
      )) as EncryptedJobRegistry;
    } catch (error) {
      (error as Error).message += ". Deploy the contract with 'npx hardhat deploy --network sepolia'";
      throw error;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(() => {
    step = 0;
    steps = 0;
  });

  it("registers and evaluates an application", async function () {
    steps = 8;
    this.timeout(4 * 40000);

    progress("Fetch company requirements");
    const companies = await registry.listCompanyRequirements();
    expect(companies.length).to.eq(3);

    progress("Encrypting profile values");
    const encryptedInput = await fhevm
      .createEncryptedInput(registryAddress, signers.alice.address)
      .add32(1992)
      .add32(1)
      .add64(80_000)
      .encrypt();

    progress("Submitting registerUser transaction");
    const registerTx = await registry
      .connect(signers.alice)
      .registerUser(
        "Sepolia Tester",
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.handles[2],
        encryptedInput.inputProof,
      );
    await registerTx.wait();

    progress("Applying to company 0");
    const applyTx = await registry.connect(signers.alice).applyToCompany(0);
    await applyTx.wait();

    progress("Retrieving encrypted result");
    const encryptedResult = await registry.getApplicationResult(signers.alice.address, 0);

    progress("Decrypting result");
    const decryptedResult = await fhevm.userDecryptEbool(
      encryptedResult,
      registryAddress,
      signers.alice,
    );

    progress(`Application success: ${decryptedResult}`);
    expect(decryptedResult).to.eq(true);
  });
});
