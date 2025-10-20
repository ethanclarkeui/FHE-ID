import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { EncryptedJobRegistry, EncryptedJobRegistry__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory(
    "EncryptedJobRegistry",
  )) as EncryptedJobRegistry__factory;
  const registry = (await factory.deploy()) as EncryptedJobRegistry;
  const registryAddress = await registry.getAddress();

  return { registry, registryAddress };
}

describe("EncryptedJobRegistry", function () {
  let signers: Signers;
  let registry: EncryptedJobRegistry;
  let registryAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("Skip local-only test suite when not running with FHE mock");
      this.skip();
    }

    ({ registry, registryAddress } = await deployFixture());
  });

  it("exposes three company requirements", async function () {
    const companies = await registry.listCompanyRequirements();

    expect(companies.length).to.eq(3);
    expect(companies[0].name).to.eq("Astra Finance");
    expect(companies[1].name).to.eq("Orbit Labs");
    expect(companies[2].name).to.eq("Nova Health");
  });

  it("registers a profile with encrypted attributes", async function () {
    const birthYear = 1995;
    const nationality = 1;
    const salary = 65_000;

    const encryptedInput = await fhevm
      .createEncryptedInput(registryAddress, signers.alice.address)
      .add32(birthYear)
      .add32(nationality)
      .add64(salary)
      .encrypt();

    await registry
      .connect(signers.alice)
      .registerUser(
        "Alice Johnson",
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.handles[2],
        encryptedInput.inputProof,
      );

    const profile = await registry.getUserProfile(signers.alice.address);

    const decryptedBirthYear = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      profile.birthYear,
      registryAddress,
      signers.alice,
    );
    const decryptedNationality = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      profile.nationality,
      registryAddress,
      signers.alice,
    );
    const decryptedSalary = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      profile.salary,
      registryAddress,
      signers.alice,
    );

    expect(profile.name).to.eq("Alice Johnson");
    expect(profile.exists).to.eq(true);
    expect(decryptedBirthYear).to.eq(birthYear);
    expect(decryptedNationality).to.eq(nationality);
    expect(decryptedSalary).to.eq(salary);
  });

  it("evaluates applications using encrypted requirements", async function () {
    const birthYear = 1990;
    const nationality = 1;
    const salary = 90_000;

    const encryptedInput = await fhevm
      .createEncryptedInput(registryAddress, signers.alice.address)
      .add32(birthYear)
      .add32(nationality)
      .add64(salary)
      .encrypt();

    await registry
      .connect(signers.alice)
      .registerUser(
        "Alice Johnson",
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        encryptedInput.handles[2],
        encryptedInput.inputProof,
      );

    await registry.connect(signers.alice).applyToCompany(0);
    const matchResult = await registry.getApplicationResult(signers.alice.address, 0);
    const match = await fhevm.userDecryptEbool(matchResult, registryAddress, signers.alice);
    expect(match).to.eq(true);

    await registry.connect(signers.alice).applyToCompany(2);
    const mismatchResult = await registry.getApplicationResult(signers.alice.address, 2);
    const mismatch = await fhevm.userDecryptEbool(mismatchResult, registryAddress, signers.alice);
    expect(mismatch).to.eq(false);
  });
});
