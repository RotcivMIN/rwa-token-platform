import { expect } from "chai";
import { ethers } from "hardhat";

/**
 * Comprehensive test suite for RWAToken.sol
 *
 * Contract spec:
 *   ERC20 + Ownable (OZ v5) + Pausable
 *   Whitelist-gated transfers, mint, burn
 *   tryTransfer — non-reverting alternative to transfer
 *
 * 18 test cases across 6 categories
 */
describe("RWAToken", function () {
  let rwaToken: any; // typechain-types will be generated after first compile
  let owner: any;
  let addr1: any;
  let addr2: any;
  let addr3: any;

  const TOKEN_NAME = "RWA ETF Gold";
  const TOKEN_SYMBOL = "RWAG";
  const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1M tokens

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    const RWATokenFactory = await ethers.getContractFactory("RWAToken");
    rwaToken = await RWATokenFactory.deploy(TOKEN_NAME, TOKEN_SYMBOL, INITIAL_SUPPLY, owner.address);
    await rwaToken.waitForDeployment();
  });

  // ================================================================
  //  1. DEPLOYMENT — 4 tests
  // ================================================================
  describe("Deployment", function () {
    it("Should deploy with correct name, symbol, and totalSupply", async function () {
      expect(await rwaToken.name()).to.equal(TOKEN_NAME);
      expect(await rwaToken.symbol()).to.equal(TOKEN_SYMBOL);
      expect(await rwaToken.totalSupply()).to.equal(INITIAL_SUPPLY);
      // All initial supply minted to admin (owner)
      expect(await rwaToken.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
    });

    it("Should auto-whitelist admin on deployment", async function () {
      expect(await rwaToken.isWhitelisted(owner.address)).to.be.true;
      // Whitelist count should be at least 1 (admin)
      expect(await rwaToken.getWhitelistCount()).to.equal(1);
    });

    it("Should revert if initialSupply is 0", async function () {
      const RWATokenFactory = await ethers.getContractFactory("RWAToken");
      await expect(RWATokenFactory.deploy(TOKEN_NAME, TOKEN_SYMBOL, 0, owner.address)).to.be.reverted;
    });

    it("Should revert if admin is address(0)", async function () {
      const RWATokenFactory = await ethers.getContractFactory("RWAToken");
      await expect(RWATokenFactory.deploy(TOKEN_NAME, TOKEN_SYMBOL, INITIAL_SUPPLY, ethers.ZeroAddress)).to.be.reverted;
    });
  });

  // ================================================================
  //  2. WHITELIST MANAGEMENT — 4 tests
  // ================================================================
  describe("Whitelist Management", function () {
    it("Should allow owner to add address to whitelist", async function () {
      expect(await rwaToken.isWhitelisted(addr1.address)).to.be.false;

      await rwaToken.addToWhitelist(addr1.address);

      expect(await rwaToken.isWhitelisted(addr1.address)).to.be.true;
      expect(await rwaToken.getWhitelistCount()).to.equal(2); // admin + addr1
    });

    it("Should allow owner to remove address from whitelist", async function () {
      await rwaToken.addToWhitelist(addr1.address);
      expect(await rwaToken.isWhitelisted(addr1.address)).to.be.true;

      await rwaToken.removeFromWhitelist(addr1.address);

      expect(await rwaToken.isWhitelisted(addr1.address)).to.be.false;
      expect(await rwaToken.getWhitelistCount()).to.equal(1); // only admin
    });

    it("Should revert when non-owner tries to add to whitelist", async function () {
      // Non-admin, non-owner should revert with custom message
      await expect(rwaToken.connect(addr1).addToWhitelist(addr2.address)).to.be.revertedWith(
        "RWAToken: caller is not admin",
      );
    });

    it("Should emit WhitelistUpdated event on add and remove", async function () {
      // Add → WhitelistUpdated(address, true)
      await expect(rwaToken.addToWhitelist(addr1.address))
        .to.emit(rwaToken, "WhitelistUpdated")
        .withArgs(addr1.address, true);

      // Remove → WhitelistUpdated(address, false)
      await expect(rwaToken.removeFromWhitelist(addr1.address))
        .to.emit(rwaToken, "WhitelistUpdated")
        .withArgs(addr1.address, false);
    });
  });

  // ================================================================
  //  3. TRANSFER — 3 tests
  // ================================================================
  describe("Transfer", function () {
    const transferAmount = ethers.parseEther("1000");

    beforeEach(async function () {
      // Whitelist addr1 so owner can transfer tokens to it for test setup
      await rwaToken.addToWhitelist(addr1.address);
    });

    it("Should succeed between two whitelisted addresses", async function () {
      // Whitelist addr2 as the receiver
      await rwaToken.addToWhitelist(addr2.address);

      // owner → addr1
      await rwaToken.transfer(addr1.address, transferAmount);
      expect(await rwaToken.balanceOf(addr1.address)).to.equal(transferAmount);

      // addr1 → addr2
      await rwaToken.connect(addr1).transfer(addr2.address, transferAmount);
      expect(await rwaToken.balanceOf(addr2.address)).to.equal(transferAmount);
      expect(await rwaToken.balanceOf(addr1.address)).to.equal(0);
    });

    it("Should revert if sender is not whitelisted (after removal)", async function () {
      // Transfer tokens to addr1 first
      await rwaToken.transfer(addr1.address, transferAmount);

      // Now remove addr1 from whitelist
      await rwaToken.removeFromWhitelist(addr1.address);

      // Whitelist addr2 as potential receiver
      await rwaToken.addToWhitelist(addr2.address);

      // addr1 (not whitelisted) → addr2 (whitelisted) should revert
      await expect(rwaToken.connect(addr1).transfer(addr2.address, transferAmount)).to.be.reverted;
    });

    it("Should revert if receiver is not whitelisted", async function () {
      // addr2 is NOT whitelisted
      // owner (whitelisted) → addr2 (not whitelisted) should revert
      await expect(rwaToken.transfer(addr2.address, transferAmount)).to.be.reverted;
    });
  });

  // ================================================================
  //  4. tryTransfer — 3 tests
  // ================================================================
  describe("tryTransfer", function () {
    const transferAmount = ethers.parseEther("500");

    beforeEach(async function () {
      await rwaToken.addToWhitelist(addr1.address);
      // Give addr1 some tokens for testing
      await rwaToken.transfer(addr1.address, transferAmount);
    });

    it("Should succeed between whitelisted addresses and return true", async function () {
      await rwaToken.addToWhitelist(addr2.address);

      // Use staticCall to read the return value, then execute
      const result = await rwaToken.connect(addr1).tryTransfer.staticCall(addr2.address, transferAmount);
      expect(result).to.be.true;

      // Actually execute the transfer
      await rwaToken.connect(addr1).tryTransfer(addr2.address, transferAmount);
      expect(await rwaToken.balanceOf(addr2.address)).to.equal(transferAmount);
    });

    it("Should return false and emit TransactionBlocked when receiver is not whitelisted", async function () {
      // addr2 is NOT whitelisted
      const result = await rwaToken.connect(addr1).tryTransfer.staticCall(addr2.address, transferAmount);
      expect(result).to.be.false;

      // Execute and check event
      await expect(rwaToken.connect(addr1).tryTransfer(addr2.address, transferAmount)).to.emit(
        rwaToken,
        "TransactionBlocked",
      );

      // Balance should NOT have changed
      expect(await rwaToken.balanceOf(addr1.address)).to.equal(transferAmount);
      expect(await rwaToken.balanceOf(addr2.address)).to.equal(0);

      // Blocked transaction counter should increment
      expect(await rwaToken.getBlockedTransactionCount()).to.be.gt(0);
    });

    it("Should NOT revert even when transfer is blocked (key difference from transfer)", async function () {
      // addr3 is NOT whitelisted — tryTransfer must NOT revert
      // This is the critical behavioral difference: transfer() reverts, tryTransfer() doesn't
      await expect(rwaToken.connect(addr1).tryTransfer(addr3.address, transferAmount)).to.not.be.reverted;

      // Verify regular transfer DOES revert in the same scenario for contrast
      await expect(rwaToken.connect(addr1).transfer(addr3.address, transferAmount)).to.be.reverted;
    });
  });

  // ================================================================
  //  5. MINT / BURN — 3 tests
  // ================================================================
  describe("Mint and Burn", function () {
    const mintAmount = ethers.parseEther("50000");
    const burnAmount = ethers.parseEther("10000");

    beforeEach(async function () {
      await rwaToken.addToWhitelist(addr1.address);
    });

    it("Should allow owner to mint to a whitelisted address", async function () {
      const supplyBefore = await rwaToken.totalSupply();

      await expect(rwaToken.mint(addr1.address, mintAmount))
        .to.emit(rwaToken, "TokensMinted")
        .withArgs(addr1.address, mintAmount, "Owner minting");

      expect(await rwaToken.balanceOf(addr1.address)).to.equal(mintAmount);
      expect(await rwaToken.totalSupply()).to.equal(supplyBefore + mintAmount);
    });

    it("Should allow owner to burn from a whitelisted address", async function () {
      // Mint first so addr1 has tokens to burn
      await rwaToken.mint(addr1.address, mintAmount);
      const supplyAfterMint = await rwaToken.totalSupply();

      await expect(rwaToken.burn(addr1.address, burnAmount))
        .to.emit(rwaToken, "TokensBurned")
        .withArgs(addr1.address, burnAmount, "Owner burning");

      expect(await rwaToken.balanceOf(addr1.address)).to.equal(mintAmount - burnAmount);
      expect(await rwaToken.totalSupply()).to.equal(supplyAfterMint - burnAmount);
    });

    it("Should revert when minting to a non-whitelisted address", async function () {
      // addr2 is NOT whitelisted
      await expect(rwaToken.mint(addr2.address, mintAmount)).to.be.reverted;
    });
  });

  // ================================================================
  //  6. PAUSE / UNPAUSE — 2 tests
  // ================================================================
  describe("Pause", function () {
    const transferAmount = ethers.parseEther("100");

    beforeEach(async function () {
      await rwaToken.addToWhitelist(addr1.address);
      await rwaToken.addToWhitelist(addr2.address);
      // Give addr1 some tokens
      await rwaToken.transfer(addr1.address, transferAmount);
    });

    it("Should block transfers when paused", async function () {
      await rwaToken.pause();

      // Standard transfer should fail when paused
      // OZ v5 Pausable reverts with EnforcedPause()
      await expect(rwaToken.connect(addr1).transfer(addr2.address, transferAmount)).to.be.revertedWithCustomError(
        rwaToken,
        "EnforcedPause",
      );
    });

    it("Should resume transfers after unpause", async function () {
      // Pause then unpause
      await rwaToken.pause();
      await rwaToken.unpause();

      // Transfer should work again
      await rwaToken.connect(addr1).transfer(addr2.address, transferAmount);
      expect(await rwaToken.balanceOf(addr2.address)).to.equal(transferAmount);
    });
  });

  // ================================================================
  //  7. ADMIN MANAGEMENT — 4 tests
  // ================================================================
  describe("Admin Management", function () {
    it("Should allow owner to add an admin (whitelist is independent)", async function () {
      await rwaToken.addAdmin(addr1.address);
      expect(await rwaToken.isAdmin(addr1.address)).to.be.true;
      // Admin and whitelist are decoupled — admin must be whitelisted separately
      expect(await rwaToken.isWhitelisted(addr1.address)).to.be.false;
    });

    it("Should allow admin to perform operational functions (mint, whitelist, pause)", async function () {
      await rwaToken.addAdmin(addr1.address);

      // Admin can whitelist
      await rwaToken.connect(addr1).addToWhitelist(addr2.address);
      expect(await rwaToken.isWhitelisted(addr2.address)).to.be.true;

      // Admin can mint
      const mintAmount = ethers.parseEther("1000");
      await rwaToken.connect(addr1).mint(addr2.address, mintAmount);
      expect(await rwaToken.balanceOf(addr2.address)).to.equal(mintAmount);

      // Admin can pause/unpause
      await rwaToken.connect(addr1).pause();
      expect(await rwaToken.paused()).to.be.true;
      await rwaToken.connect(addr1).unpause();
      expect(await rwaToken.paused()).to.be.false;
    });

    it("Should NOT allow admin to add/remove other admins", async function () {
      await rwaToken.addAdmin(addr1.address);
      // Admin cannot add another admin — only owner can
      await expect(rwaToken.connect(addr1).addAdmin(addr2.address)).to.be.revertedWithCustomError(
        rwaToken,
        "OwnableUnauthorizedAccount",
      );
    });

    it("Should allow owner to remove admin", async function () {
      await rwaToken.addAdmin(addr1.address);
      expect(await rwaToken.isAdmin(addr1.address)).to.be.true;

      await rwaToken.removeAdmin(addr1.address);
      expect(await rwaToken.isAdmin(addr1.address)).to.be.false;

      // Removed admin can no longer mint
      await expect(rwaToken.connect(addr1).mint(addr2.address, ethers.parseEther("100"))).to.be.revertedWith(
        "RWAToken: caller is not admin",
      );
    });
  });
});
