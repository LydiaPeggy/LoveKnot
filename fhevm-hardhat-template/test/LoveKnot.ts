import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { LoveKnot, LoveKnot__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  charlie: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("LoveKnot")) as LoveKnot__factory;
  const loveKnotContract = (await factory.deploy()) as LoveKnot;
  const loveKnotContractAddress = await loveKnotContract.getAddress();

  return { loveKnotContract, loveKnotContractAddress };
}

// Helper function to convert address to uint32 (last 8 hex chars)
function addressToUint32(addr: string): number {
  const addrUint = BigInt(addr);
  return Number(addrUint & BigInt(0xFFFFFFFF));
}

describe("LoveKnot", function () {
  let signers: Signers;
  let loveKnotContract: LoveKnot;
  let loveKnotContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
      charlie: ethSigners[3],
    };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ loveKnotContract, loveKnotContractAddress } = await deployFixture());
  });

  it("should allow user to submit crush target", async function () {
    const bobUint32 = addressToUint32(await signers.bob.getAddress());

    // Encrypt bob's address as uint32
    const encryptedBobAddr = await fhevm
      .createEncryptedInput(loveKnotContractAddress, signers.alice.address)
      .add32(bobUint32)
      .encrypt();

    const tx = await loveKnotContract
      .connect(signers.alice)
      .submitCrush(encryptedBobAddr.handles[0], encryptedBobAddr.inputProof);
    await tx.wait();

    // Verify user is registered
    const isRegistered = await loveKnotContract.isUserRegistered(signers.alice.address);
    expect(isRegistered).to.be.true;

    // Verify crush target is stored (encrypted, so we can't check the value directly)
    const crushTarget = await loveKnotContract.getCrushTarget(signers.alice.address);
    expect(crushTarget).to.not.eq(ethers.ZeroHash);
  });

  it("should enforce cooldown period", async function () {
    const bobUint32 = addressToUint32(await signers.bob.getAddress());

    const encryptedBobAddr = await fhevm
      .createEncryptedInput(loveKnotContractAddress, signers.alice.address)
      .add32(bobUint32)
      .encrypt();

    // First submission should succeed
    let tx = await loveKnotContract
      .connect(signers.alice)
      .submitCrush(encryptedBobAddr.handles[0], encryptedBobAddr.inputProof);
    await tx.wait();

    // Second submission immediately after should fail
    await expect(
      loveKnotContract
        .connect(signers.alice)
        .submitCrush(encryptedBobAddr.handles[0], encryptedBobAddr.inputProof)
    ).to.be.revertedWith("LoveKnot: Cooldown period not elapsed");
  });

  it("should enforce daily attempt limit", async function () {
    const bobUint32 = addressToUint32(await signers.bob.getAddress());
    const charlieUint32 = addressToUint32(await signers.charlie.getAddress());

    // Submit MAX_DAILY_ATTEMPTS times
    for (let i = 0; i < 10; i++) {
      const targetUint32 = i % 2 === 0 ? bobUint32 : charlieUint32;
      const encryptedTarget = await fhevm
        .createEncryptedInput(loveKnotContractAddress, signers.alice.address)
        .add32(targetUint32)
        .encrypt();

      // Skip cooldown by manipulating time (in test environment)
      // Note: This requires hardhat network time manipulation
      await ethers.provider.send("evm_increaseTime", [3600]); // Increase by 1 hour

      const tx = await loveKnotContract
        .connect(signers.alice)
        .submitCrush(encryptedTarget.handles[0], encryptedTarget.inputProof);
      await tx.wait();
    }

    // 11th attempt should fail
    const encryptedTarget = await fhevm
      .createEncryptedInput(loveKnotContractAddress, signers.alice.address)
      .add32(bobUint32)
      .encrypt();

    await ethers.provider.send("evm_increaseTime", [3600]);

    await expect(
      loveKnotContract
        .connect(signers.alice)
        .submitCrush(encryptedTarget.handles[0], encryptedTarget.inputProof)
    ).to.be.revertedWith("LoveKnot: Daily attempt limit reached");
  });

  it("should return 0 when no match found", async function () {
    const bobUint32 = addressToUint32(await signers.bob.getAddress());
    const charlieUint32 = addressToUint32(await signers.charlie.getAddress());

    // Alice submits Bob as crush
    const encryptedBobAddr = await fhevm
      .createEncryptedInput(loveKnotContractAddress, signers.alice.address)
      .add32(bobUint32)
      .encrypt();

    let tx = await loveKnotContract
      .connect(signers.alice)
      .submitCrush(encryptedBobAddr.handles[0], encryptedBobAddr.inputProof);
    await tx.wait();

    // Bob submits Charlie as crush (not Alice)
    const encryptedCharlieAddr = await fhevm
      .createEncryptedInput(loveKnotContractAddress, signers.bob.address)
      .add32(charlieUint32)
      .encrypt();

    tx = await loveKnotContract
      .connect(signers.bob)
      .submitCrush(encryptedCharlieAddr.handles[0], encryptedCharlieAddr.inputProof);
    await tx.wait();

    // Alice checks match with Bob (should return 0 - no match)
    // Send transaction to check match
    const checkTx = await loveKnotContract.connect(signers.alice).checkMatch(signers.bob.address);
    await checkTx.wait();
    
    // Get result from view function
    const matchResultHandle = await loveKnotContract.getMatchResult(signers.alice.address, signers.bob.address);
    const clearResult = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      matchResultHandle,
      loveKnotContractAddress,
      signers.alice,
    );

    expect(clearResult).to.eq(0);
  });

  it("should return 1 when mutual match found", async function () {
    const aliceUint32 = addressToUint32(await signers.alice.getAddress());
    const bobUint32 = addressToUint32(await signers.bob.getAddress());

    // Alice submits Bob as crush
    const encryptedBobAddr = await fhevm
      .createEncryptedInput(loveKnotContractAddress, signers.alice.address)
      .add32(bobUint32)
      .encrypt();

    let tx = await loveKnotContract
      .connect(signers.alice)
      .submitCrush(encryptedBobAddr.handles[0], encryptedBobAddr.inputProof);
    await tx.wait();

    // Bob submits Alice as crush
    const encryptedAliceAddr = await fhevm
      .createEncryptedInput(loveKnotContractAddress, signers.bob.address)
      .add32(aliceUint32)
      .encrypt();

    tx = await loveKnotContract
      .connect(signers.bob)
      .submitCrush(encryptedAliceAddr.handles[0], encryptedAliceAddr.inputProof);
    await tx.wait();

    // Alice checks match with Bob (should return 1 - match found)
    // Send transaction to check match
    const checkTx = await loveKnotContract.connect(signers.alice).checkMatch(signers.bob.address);
    await checkTx.wait();
    
    // Get result from view function
    const matchResultHandle = await loveKnotContract.getMatchResult(signers.alice.address, signers.bob.address);
    const clearResult = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      matchResultHandle,
      loveKnotContractAddress,
      signers.alice,
    );

    expect(clearResult).to.eq(1);
  });

  it("should prevent checking match with yourself", async function () {
    const bobUint32 = addressToUint32(await signers.bob.getAddress());

    const encryptedBobAddr = await fhevm
      .createEncryptedInput(loveKnotContractAddress, signers.alice.address)
      .add32(bobUint32)
      .encrypt();

    const tx = await loveKnotContract
      .connect(signers.alice)
      .submitCrush(encryptedBobAddr.handles[0], encryptedBobAddr.inputProof);
    await tx.wait();

    // Try to check match with yourself
    await expect(
      loveKnotContract.connect(signers.alice).checkMatch(signers.alice.address)
    ).to.be.revertedWith("LoveKnot: Cannot check match with yourself");
  });

  it("should return correct remaining attempts", async function () {
    const bobUint32 = addressToUint32(await signers.bob.getAddress());

    // Initially should have MAX_DAILY_ATTEMPTS remaining
    let remaining = await loveKnotContract.getRemainingAttempts(signers.alice.address);
    expect(remaining).to.eq(10);

    // Submit once
    const encryptedBobAddr = await fhevm
      .createEncryptedInput(loveKnotContractAddress, signers.alice.address)
      .add32(bobUint32)
      .encrypt();

    const tx = await loveKnotContract
      .connect(signers.alice)
      .submitCrush(encryptedBobAddr.handles[0], encryptedBobAddr.inputProof);
    await tx.wait();

    // Should have 9 remaining
    remaining = await loveKnotContract.getRemainingAttempts(signers.alice.address);
    expect(remaining).to.eq(9);
  });
});

